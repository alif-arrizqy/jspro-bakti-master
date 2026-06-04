import type { ConnectivitySnapshot } from "../types/index.js";
import { redisQueueService } from "./redis-queue.service.js";
import { config } from "../config/env.js";

const KEY_PREFIX = "connectivity:latest:";

function serializeSnapshot(snap: ConnectivitySnapshot): Record<string, string> {
    return {
        latencyMs: snap.latencyMs != null ? String(snap.latencyMs) : "",
        reachable: snap.reachable ? "1" : "0",
        probedAt: snap.probedAt ?? "",
        targetIp: snap.targetIp ?? "",
        probeMethod: snap.probeMethod,
    };
}

function deserializeSnapshot(data: Record<string, string>): ConnectivitySnapshot | null {
    if (!data || !data.probedAt) return null;
    return {
        latencyMs: data.latencyMs ? Number(data.latencyMs) : null,
        reachable: data.reachable === "1",
        probedAt: data.probedAt || null,
        targetIp: data.targetIp || null,
        probeMethod: (data.probeMethod as "tcp" | "icmp") || "tcp",
    };
}

export const connectivitySnapshotService = {
    async set(siteId: string, snapshot: ConnectivitySnapshot): Promise<void> {
        const redis = redisQueueService.getClient();
        const key = `${KEY_PREFIX}${siteId}`;
        const fields = serializeSnapshot(snapshot);
        await redis.hset(key, fields);
        const ttlSec = Math.ceil(config.probe.cacheTtlMs / 1000);
        await redis.expire(key, ttlSec);
    },

    async get(siteId: string): Promise<ConnectivitySnapshot | null> {
        const redis = redisQueueService.getClient();
        const key = `${KEY_PREFIX}${siteId}`;
        const data = await redis.hgetall(key);
        if (!data || Object.keys(data).length === 0) return null;
        return deserializeSnapshot(data);
    },

    async getMany(siteIds: string[]): Promise<Map<string, ConnectivitySnapshot>> {
        const redis = redisQueueService.getClient();
        const pipeline = redis.pipeline();
        for (const id of siteIds) {
            pipeline.hgetall(`${KEY_PREFIX}${id}`);
        }
        const results = await pipeline.exec();
        const map = new Map<string, ConnectivitySnapshot>();

        if (!results) return map;

        for (let i = 0; i < siteIds.length; i++) {
            const [err, data] = results[i] ?? [];
            if (err || !data) continue;
            const snap = deserializeSnapshot(data as Record<string, string>);
            if (snap) map.set(siteIds[i], snap);
        }
        return map;
    },
};
