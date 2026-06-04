import axios from "axios";
import { config } from "../config/env.js";
import { sitesLogger } from "../utils/logger.js";
import { timescaleService } from "./timescale.service.js";
import type { MasterSite, BatteryType } from "../types/index.js";

interface SitesCache {
    data: MasterSite[];
    expiresAt: number;
}

let cache: SitesCache | null = null;

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
        const sites: MasterSite[] = rows.map((r) => ({
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

export const sitesClientService = {
    async getAllSites(): Promise<MasterSite[]> {
        const now = Date.now();
        if (cache && cache.expiresAt > now) {
            return cache.data;
        }

        try {
            const timeout = config.services.sitesTimeoutMs;
            const response = await axios.get(config.services.sitesUrl, {
                timeout,
                params: { limit: 100 },
            });

            const rawSites: any[] = response.data?.data?.data ?? response.data?.data ?? [];

            const sites: MasterSite[] = rawSites.map((s: any) => ({
                siteId: s.siteId ?? s.site_id ?? s.id ?? "",
                siteName: s.siteName ?? s.site_name ?? s.name ?? "",
                batteryType: normalizeBatteryType(s.batteryType ?? s.battery_type ?? s.batteryVersion),
                ipSnmp: s.ipSnmp ?? s.ip_snmp ?? s.detail?.ipSnmp ?? null,
                ipGwGs: s.ipGwGs ?? s.ip_gw_gs ?? s.detail?.ipGatewayGs ?? null,
            }));

            cache = {
                data: sites,
                expiresAt: now + config.services.sitesCacheTtlMs,
            };

            sitesLogger.info({ count: sites.length }, "Sites cache refreshed from sites-services");
            return sites;
        } catch (err: any) {
            sitesLogger.warn({ err: err.message }, "sites-services unavailable, using fallback");
            if (cache) return cache.data;

            const fallback = await getFallbackSitesFromDb();
            if (fallback.length > 0) {
                cache = {
                    data: fallback,
                    expiresAt: now + config.services.sitesCacheTtlMs,
                };
            }
            return fallback;
        }
    },

    invalidateCache() {
        cache = null;
    },
};
