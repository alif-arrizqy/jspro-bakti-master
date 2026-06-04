import Redis from "ioredis";
import { config } from "../config/env.js";
import { redisLogger } from "../utils/logger.js";
import type { PullingLogItem, BatteryType } from "../types/index.js";

let redis: Redis;

function parseFields(id: string, fields: string[]): PullingLogItem {
    const row: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
        row[fields[i]] = fields[i + 1] ?? "";
    }
    const batteryType: BatteryType =
        (row.type ?? "").toLowerCase().includes("talis") ? "talis5" : "jspro";

    return {
        id,
        timestamp: row.ts ?? "",
        siteId: row.siteId ?? "",
        siteName: row.siteName ?? "",
        batteryType,
        result: (row.result === "success" ? "success" : "failed") as "success" | "failed",
        errorMessage: row.errorMessage || undefined,
    };
}

async function scanSiteIds(): Promise<string[]> {
    const idsFromSet = await redis.smembers("logger:sites");
    if (idsFromSet.length > 0) return idsFromSet;

    const siteIds: string[] = [];
    let cursor = "0";
    do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "logger:stream:*", "COUNT", 100);
        for (const key of keys) {
            const siteId = key.replace("logger:stream:", "");
            if (siteId) siteIds.push(siteId);
        }
        cursor = nextCursor;
    } while (cursor !== "0");
    return [...new Set(siteIds)];
}

export const redisQueueService = {
    connect() {
        redis = new Redis(config.redis.url, { maxRetriesPerRequest: 2 });
        redis.on("connect", () => redisLogger.info("Redis connected"));
        redis.on("error", (err) => redisLogger.error({ err }, "Redis error"));
    },

    disconnect() {
        redis.disconnect();
    },

    getClient() {
        return redis;
    },

    async getLogsBySite(siteId: string, limit: number): Promise<PullingLogItem[]> {
        const key = `logger:stream:${siteId}`;
        const items = await redis.xrevrange(key, "+", "-", "COUNT", limit);
        return items.map(([id, fields]) => parseFields(id, fields));
    },

    async getAllLogs(options: {
        date?: string;
        batteryType?: string;
        result?: string;
        search?: string;
        page: number;
        limit: number;
    }): Promise<{ items: PullingLogItem[]; total: number }> {
        const siteIds = await scanSiteIds();
        const sampleLimit = config.query.summarySampleLimitPerSite;

        const allLogs: PullingLogItem[] = [];
        const batches = await Promise.all(
            siteIds.map((siteId) => this.getLogsBySite(siteId, sampleLimit))
        );
        for (const logs of batches) {
            allLogs.push(...logs);
        }

        allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        let filtered = allLogs;

        if (options.date) {
            filtered = filtered.filter((l) => l.timestamp.startsWith(options.date!));
        }
        if (options.batteryType && options.batteryType !== "all") {
            filtered = filtered.filter((l) => l.batteryType === options.batteryType);
        }
        if (options.result && options.result !== "all") {
            filtered = filtered.filter((l) => l.result === options.result);
        }
        if (options.search) {
            const q = options.search.toLowerCase();
            filtered = filtered.filter(
                (l) =>
                    l.siteId.toLowerCase().includes(q) ||
                    l.siteName.toLowerCase().includes(q)
            );
        }

        const total = filtered.length;
        const start = (options.page - 1) * options.limit;
        const items = filtered.slice(start, start + options.limit);

        return { items, total };
    },

    async getSummary(date?: string): Promise<{
        totalLogs: number;
        successCount: number;
        failedCount: number;
        successRate: number;
    }> {
        const siteIds = await scanSiteIds();
        const sampleLimit = config.query.summarySampleLimitPerSite;

        let total = 0;
        let success = 0;
        let failed = 0;

        const batches = await Promise.all(
            siteIds.map((siteId) => this.getLogsBySite(siteId, sampleLimit))
        );

        for (const logs of batches) {
            for (const item of logs) {
                if (date && !item.timestamp.startsWith(date)) continue;
                total++;
                if (item.result === "success") success++;
                else failed++;
            }
        }

        return {
            totalLogs: total,
            successCount: success,
            failedCount: failed,
            successRate: total > 0 ? Math.round((success / total) * 10000) / 100 : 0,
        };
    },
};
