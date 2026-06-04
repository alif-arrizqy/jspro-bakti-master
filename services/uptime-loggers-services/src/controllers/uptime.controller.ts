import dayjs from "dayjs";
import { config } from "../config/env.js";
import { timescaleService } from "../services/timescale.service.js";
import { sitesClientService } from "../services/sites-client.service.js";
import { connectivitySnapshotService } from "../services/connectivity-snapshot.service.js";
import type { SiteItem, UptimeSummary, UptimeMode, SiteStatus } from "../types/index.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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

function buildGrafanaUrl(siteId: string): string | null {
    if (!config.grafana.baseUrl) return null;
    return `${config.grafana.baseUrl}?var-${config.grafana.siteVar}=${siteId}`;
}

function connectivityReferenceMs(dateStr: string): number {
    const endOfDay = dayjs(dateStr).endOf("day").valueOf();
    if (isToday(dateStr)) {
        return Math.min(Date.now(), endOfDay);
    }
    return endOfDay;
}

function determineConnectivityStatus(dateStr: string, lastUpdate: Date | null): "online" | "offline" {
    if (!lastUpdate) return "offline";
    if (dayjs(lastUpdate).format("YYYY-MM-DD") !== dateStr) return "offline";
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

/** Deterministic pseudo-random 0..maxInclusive from site + date + salt (stable per refresh). */
function seededUnit(siteId: string, date: string, salt: string): number {
    const key = `${siteId}:${date}:${salt}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
}

function useDevMockUptime(): boolean {
    return config.app.isDevelopment;
}

function mockUptimePct(siteId: string, date: string, isRealtime: boolean): number {
    const u = seededUnit(siteId, date, "pct");
    if (isRealtime) {
        const maxPct = 97;
        const minPct = 58;
        return Math.round(minPct + u * (maxPct - minPct));
    }
    const maxPct = 100;
    const minPct = 32;
    return Math.round(minPct + u * (maxPct - minPct));
}

function mockLastUpdate(siteId: string, date: string, isRealtime: boolean, uptimePct: number): Date {
    const now = Date.now();
    const u = seededUnit(siteId, date, "lastUpdate");
    if (isRealtime) {
        if (uptimePct >= 75) {
            const minutesAgo = 5 + Math.floor(u * 85);
            return new Date(now - minutesAgo * 60 * 1000);
        }
        const hoursAgo = 3 + Math.floor(u * 6);
        return new Date(now - hoursAgo * 60 * 60 * 1000);
    }
    const dayEnd = new Date(`${date}T23:30:00`);
    const minutesBeforeEnd = Math.floor(u * 180);
    return new Date(dayEnd.getTime() - minutesBeforeEnd * 60 * 1000);
}

function mockVoltageMv(siteId: string, date: string): number {
    const u = seededUnit(siteId, date, "voltage");
    return 5100 + Math.round(u * 400);
}

function mockPingLatencyMs(siteId: string, date: string, status: SiteStatus): number | null {
    if (status === "offline" || status === "critical") return null;
    const u = seededUnit(siteId, date, "latency");
    return 18 + Math.round(u * 140);
}

function resolveSiteMetrics(
    siteId: string,
    date: string,
    mode: UptimeMode,
    dbData: { logsReceived: number; lastUpdate: Date | null; voltage: number | null } | undefined,
): { pct: number; lastUpdate: Date | null; voltageMv: number | null } {
    if (useDevMockUptime()) {
        const isRealtime = mode === "realtime";
        const pct = mockUptimePct(siteId, date, isRealtime);
        const lastUpdate = mockLastUpdate(siteId, date, isRealtime, pct);
        return { pct, lastUpdate, voltageMv: mockVoltageMv(siteId, date) };
    }

    const logsReceived = dbData?.logsReceived ?? 0;
    const pct = calcUptimePct(logsReceived, mode === "realtime");
    return {
        pct,
        lastUpdate: dbData?.lastUpdate ?? null,
        voltageMv: dbData?.voltage ?? null,
    };
}

export const uptimeController = {
    async getSummary(dateParam?: string): Promise<UptimeSummary> {
        const date = dateParam ?? dayjs().format("YYYY-MM-DD");
        const mode: UptimeMode = isToday(date) ? "realtime" : "historical";
        const sites = await sitesClientService.getAllSites();

        let dailyMap = new Map<string, { logsReceived: number; lastUpdate: Date | null; voltage: number | null }>();

        if (!useDevMockUptime()) {
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
        }

        let onlineCount = 0;
        let offlineCount = 0;
        let healthyCount = 0;
        let warningCount = 0;
        let criticalCount = 0;
        let totalUptime = 0;

        for (const site of sites) {
            const { pct, lastUpdate } = resolveSiteMetrics(
                site.siteId,
                date,
                mode,
                dailyMap.get(site.siteId),
            );
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

        let dailyMap = new Map<string, { logsReceived: number; lastUpdate: Date | null; voltage: number | null }>();

        if (!useDevMockUptime()) {
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
        }

        const siteIds = sites.map((s) => s.siteId);
        const probeSnapshots = useDevMockUptime()
            ? new Map()
            : await connectivitySnapshotService.getMany(siteIds);

        let result: SiteItem[] = sites.map((site) => {
            const { pct, lastUpdate, voltageMv } = resolveSiteMetrics(
                site.siteId,
                date,
                mode,
                dailyMap.get(site.siteId),
            );
            const status = determineStatus(mode, lastUpdate, pct);
            const connectivityStatus = determineConnectivityStatus(date, lastUpdate);
            const probe = probeSnapshots.get(site.siteId);
            const pingLatencyMs = useDevMockUptime()
                ? mockPingLatencyMs(site.siteId, date, connectivityStatus === "online" ? "online" : "offline")
                : (probe?.latencyMs ?? null);

            return {
                siteId: site.siteId,
                siteName: site.siteName,
                batteryType: site.batteryType,
                lastUpdate: lastUpdate?.toISOString() ?? null,
                uptimePercentage: pct,
                uptimeDuration: calcUptimeDuration(pct, mode === "realtime"),
                status,
                connectivityStatus,
                batteryVoltageV: voltageMv != null ? Math.round(voltageMv / 100) / 10 : null,
                pingLatencyMs,
                connectivityReachable: useDevMockUptime()
                    ? pingLatencyMs != null
                    : (probe?.reachable ?? false),
                connectivityProbedAt: useDevMockUptime() ? new Date().toISOString() : (probe?.probedAt ?? null),
                grafanaUrl: buildGrafanaUrl(site.siteId),
            };
        });

        // Filters
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
