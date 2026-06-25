import dayjs from "dayjs";
import { config } from "../config/env.js";
import { timescaleService } from "../services/timescale.service.js";
import { sitesClientService } from "../services/sites-client.service.js";
import { connectivitySnapshotService } from "../services/connectivity-snapshot.service.js";
import type { SiteItem, UptimeSummary, UptimeMode, SiteStatus, MasterSite } from "../types/index.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

type SiteDailyMetrics = {
    logsReceived: number;
    lastUpdate: Date | null;
    voltage: number | null;
};

function isToday(dateStr: string): boolean {
    return dateStr === dayjs().format("YYYY-MM-DD");
}

function calcUptimePct(logsReceived: number, isRealtime: boolean): number {
    const expectedFullDay = config.query.expectedLogsPerDay;
    if (isRealtime) {
        const now = new Date();
        const hoursPassed = now.getHours() + now.getMinutes() / 60;
        const expectedSoFar = Math.max(1, Math.round((hoursPassed / 24) * expectedFullDay));
        return Math.min(100, Math.round((logsReceived / expectedSoFar) * 100));
    }
    return Math.min(100, Math.round((logsReceived / expectedFullDay) * 100));
}

function calcUptimeDuration(pct: number, isRealtime: boolean): string | null {
    if (pct <= 0) return null;
    let baseMinutes = 24 * 60;
    if (isRealtime) {
        const now = new Date();
        baseMinutes = now.getHours() * 60 + now.getMinutes();
    }
    const totalMinutes = Math.round((pct / 100) * baseMinutes);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function buildGrafanaUrl(siteId: string, dateStr: string): string | null {
    if (!config.grafana.baseUrl) return null;
    const from = dayjs(dateStr).startOf("day").valueOf();
    const to = dayjs(dateStr).endOf("day").valueOf();
    return `${config.grafana.baseUrl}?var-${config.grafana.siteVar}=${siteId}&from=${from}&to=${to}`;
}

function connectivityReferenceMs(dateStr: string): number {
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`).getTime();
    if (isToday(dateStr)) {
        return Math.min(Date.now(), endOfDay);
    }
    return endOfDay;
}

function determineConnectivityStatus(dateStr: string, lastUpdate: Date | null): "online" | "offline" {
    if (!lastUpdate) return "offline";
    if (lastUpdate.toISOString().split("T")[0] !== dateStr) return "offline";
    const refMs = connectivityReferenceMs(dateStr);
    return refMs - lastUpdate.getTime() < TWO_HOURS_MS ? "online" : "offline";
}

function determineStatus(mode: UptimeMode, lastUpdate: Date | null, uptimePct: number): SiteStatus {
    if (mode === "realtime") {
        return determineConnectivityStatus(dayjs().format("YYYY-MM-DD"), lastUpdate) === "online"
            ? "online"
            : "offline";
    }
    if (uptimePct === 100) return "healthy";
    if (uptimePct > 70) return "warning";
    return "critical";
}

function resolveSiteMetrics(
    mode: UptimeMode,
    dbData: SiteDailyMetrics | undefined,
): { pct: number; lastUpdate: Date | null; voltageMv: number | null } {
    const logsReceived = dbData?.logsReceived ?? 0;
    const pct = calcUptimePct(logsReceived, mode === "realtime");
    return {
        pct,
        lastUpdate: dbData?.lastUpdate ?? null,
        voltageMv: dbData?.voltage ?? null,
    };
}

async function buildDailyMap(
    sites: MasterSite[],
    date: string,
    mode: UptimeMode,
): Promise<Map<string, SiteDailyMetrics>> {
    const dailyMap = new Map<string, SiteDailyMetrics>();

    if (mode === "realtime") {
        const counts = await timescaleService.getRealtimeDayCounts(date);
        const latests = await timescaleService.getRealtimeLatest(sites.map((s) => s.siteId));
        const latestMap = new Map(latests.map((r) => [r.site_id, r]));

        for (const site of sites) {
            dailyMap.set(site.siteId, {
                logsReceived: counts.get(site.siteId) ?? 0,
                lastUpdate: latestMap.get(site.siteId)?.last_update ?? null,
                voltage: latestMap.get(site.siteId)?.last_pack_voltage_mv ?? null,
            });
        }
    } else {
        const rows = await timescaleService.getDailySummary(date);
        for (const r of rows) {
            dailyMap.set(r.site_id, {
                logsReceived: Number(r.total_logs_received),
                lastUpdate: r.last_update,
                voltage: r.last_pack_voltage_mv,
            });
        }
    }

    return dailyMap;
}

export const uptimeController = {
    async getSummary(dateParam?: string): Promise<UptimeSummary> {
        const date = dateParam ?? dayjs().format("YYYY-MM-DD");
        const mode: UptimeMode = isToday(date) ? "realtime" : "historical";
        const sites = await sitesClientService.getAllSites();
        const dailyMap = await buildDailyMap(sites, date, mode);

        let onlineCount = 0;
        let offlineCount = 0;
        let healthyCount = 0;
        let warningCount = 0;
        let criticalCount = 0;
        let totalUptime = 0;

        for (const site of sites) {
            const { pct, lastUpdate } = resolveSiteMetrics(mode, dailyMap.get(site.siteId));
            totalUptime += pct;

            const status = determineStatus(mode, lastUpdate, pct);
            const connectivityStatus = determineConnectivityStatus(date, lastUpdate);
            if (connectivityStatus === "online") onlineCount++;
            else offlineCount++;

            if (mode === "historical") {
                if (status === "healthy") healthyCount++;
                else if (status === "warning") warningCount++;
                else criticalCount++;
            }
        }

        const totalSites = sites.length;
        const avgUptime = totalSites > 0 ? Math.round((totalUptime / totalSites) * 10) / 10 : 0;

        const summary: UptimeSummary = {
            totalSites,
            avgUptime,
            mode,
            onlineCount,
            offlineCount,
        };
        if (mode === "historical") {
            summary.healthyCount = healthyCount;
            summary.warningCount = warningCount;
            summary.criticalCount = criticalCount;
        }

        return summary;
    },

    async getSites(params: {
        date?: string;
        batteryType?: string;
        search?: string;
        uptimeHealth?: string;
    }): Promise<SiteItem[]> {
        const date = params.date ?? dayjs().format("YYYY-MM-DD");
        const mode: UptimeMode = isToday(date) ? "realtime" : "historical";
        const sites = await sitesClientService.getAllSites();
        const dailyMap = await buildDailyMap(sites, date, mode);

        const siteIds = sites.map((s) => s.siteId);
        const probeSnapshots = await connectivitySnapshotService.getMany(siteIds);

        let result: SiteItem[] = sites.map((site) => {
            const { pct, lastUpdate, voltageMv } = resolveSiteMetrics(
                mode,
                dailyMap.get(site.siteId),
            );
            const status = determineStatus(mode, lastUpdate, pct);
            const connectivityStatus = determineConnectivityStatus(date, lastUpdate);
            const probe = probeSnapshots.get(site.siteId);

            return {
                siteId: site.siteId,
                siteName: site.siteName,
                batteryType: site.batteryType,
                lastUpdate: lastUpdate?.toISOString() ?? null,
                uptimePercentage: pct,
                uptimeDuration: calcUptimeDuration(pct, mode === "realtime"),
                status,
                connectivityStatus,
                batteryVoltageV: voltageMv != null ? voltageMv / 100 : null,
                pingLatencyMs: probe?.latencyMs ?? null,
                connectivityReachable: probe?.reachable ?? false,
                connectivityProbedAt: probe?.probedAt ?? null,
                grafanaUrl: buildGrafanaUrl(site.siteId, date),
            };
        });

        if (params.batteryType && params.batteryType !== "all") {
            result = result.filter((s) => s.batteryType === params.batteryType);
        }
        if (params.search) {
            const q = params.search.toLowerCase();
            result = result.filter(
                (s) => s.siteId.toLowerCase().includes(q) || s.siteName.toLowerCase().includes(q)
            );
        }
        if (params.uptimeHealth) {
            if (params.uptimeHealth === "100") {
                result = result.filter((s) => s.uptimePercentage === 100);
            } else if (params.uptimeHealth === "95") {
                result = result.filter((s) => s.uptimePercentage <= 95 && s.uptimePercentage > 70);
            } else if (params.uptimeHealth === "70") {
                result = result.filter((s) => s.uptimePercentage <= 70);
            }
        }

        result.sort((a, b) => {
            if (a.uptimePercentage !== b.uptimePercentage) {
                return a.uptimePercentage - b.uptimePercentage;
            }
            return a.siteName.localeCompare(b.siteName);
        });
        return result;
    },
};
