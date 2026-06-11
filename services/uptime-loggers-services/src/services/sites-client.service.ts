import axios from "axios";
import { config } from "../config/env.js";
import { sitesLogger } from "../utils/logger.js";
import { timescaleService } from "./timescale.service.js";
import type { MasterSite, BatteryType, SiteStatusFilter } from "../types/index.js";

interface SitesCache {
    data: MasterSite[];
    expiresAt: number;
}

const cacheByStatus = new Map<string, SitesCache>();

function normalizeBatteryType(raw: string | undefined | null): BatteryType {
    if (!raw) return "jspro";
    const lower = raw.toLowerCase();
    if (lower.includes("talis")) return "talis5";
    return "jspro";
}

async function getFallbackSitesFromDb(): Promise<MasterSite[]> {
    try {
        const prisma = timescaleService.getClient();
        const rows = await prisma.$queryRawUnsafe<{ site_id: string }[]>(
            `SELECT DISTINCT site_id FROM battery_data.battery_data_loggers ORDER BY site_id`
        );
        const sites: MasterSite[] = rows.map((r: { site_id: string }) => ({
            siteId: r.site_id,
            siteName: r.site_id,
            batteryType: r.site_id.toLowerCase().includes("talis") ? "talis5" as BatteryType : "jspro" as BatteryType,
            ipSnmp: null,
            ipGwGs: null,
        }));
        sitesLogger.info({ count: sites.length }, "Fallback: loaded sites from database");
        return sites;
    } catch (err: any) {
        sitesLogger.error({ err: err.message }, "Fallback: failed to query sites from DB");
        return [];
    }
}

function cacheKeyForStatus(status: SiteStatusFilter): string {
    return status === "all" ? "all" : status;
}

function mapRawSite(s: any): MasterSite {
    return {
        siteId: s.siteId ?? s.site_id ?? s.id ?? "",
        siteName: s.siteName ?? s.site_name ?? s.name ?? "",
        batteryType: normalizeBatteryType(s.batteryType ?? s.battery_type ?? s.batteryVersion),
        ipSnmp: s.ipSnmp ?? s.ip_snmp ?? s.detail?.ipSnmp ?? null,
        ipGwGs: s.ipGwGs ?? s.ip_gw_gs ?? s.detail?.ipGatewayGs ?? null,
        statusSites: s.statusSites ?? s.status_sites ?? null,
    };
}

async function fetchSites(status: SiteStatusFilter): Promise<MasterSite[]> {
    const now = Date.now();
    const cacheKey = cacheKeyForStatus(status);
    const cached = cacheByStatus.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cached.data;
    }

    try {
        const timeout = config.services.sitesTimeoutMs;
        const params: Record<string, string | number> = { limit: 100 };
        if (status !== "all") {
            params.status = status;
        }

        const response = await axios.get(config.services.sitesUrl, {
            timeout,
            params,
        });

        const rawSites: any[] = response.data?.data?.data ?? response.data?.data ?? [];
        const sites: MasterSite[] = rawSites.map(mapRawSite);

        cacheByStatus.set(cacheKey, {
            data: sites,
            expiresAt: now + config.services.sitesCacheTtlMs,
        });

        sitesLogger.info(
            { count: sites.length, statusFilter: status },
            "Sites cache refreshed from sites-services",
        );
        return sites;
    } catch (err: any) {
        sitesLogger.warn({ err: err.message, statusFilter: status }, "sites-services unavailable, using fallback");
        if (cached) return cached.data;

        const fallback = await getFallbackSitesFromDb();
        if (fallback.length > 0) {
            cacheByStatus.set(cacheKey, {
                data: fallback,
                expiresAt: now + config.services.sitesCacheTtlMs,
            });
        }
        return fallback;
    }
}

export const sitesClientService = {
    async getAllSites(): Promise<MasterSite[]> {
        return fetchSites("all");
    },

    async getSitesForProbe(): Promise<MasterSite[]> {
        return fetchSites(config.probe.siteStatus);
    },

    invalidateCache() {
        cacheByStatus.clear();
    },
};
