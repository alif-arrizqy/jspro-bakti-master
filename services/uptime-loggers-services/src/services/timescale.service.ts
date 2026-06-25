import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config/env.js";
import { dbLogger } from "../utils/logger.js";
import type { DailySummaryRow } from "../types/index.js";

let prisma: PrismaClient;
let pool: Pool;

export const timescaleService = {
    async connect() {
        pool = new Pool({
            connectionString: config.database.url,
            statement_timeout: config.database.statementTimeoutMs,
        });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
        await prisma.$connect();
        dbLogger.info("Connected to data_loggers_db (TimescaleDB)");
    },

    async disconnect() {
        await prisma.$disconnect();
        await pool.end();
        dbLogger.info("Disconnected from data_loggers_db");
    },

    getClient() {
        return prisma;
    },

    async getDailySummary(date: string): Promise<DailySummaryRow[]> {
        const rows = await prisma.$queryRawUnsafe<DailySummaryRow[]>(
            `SELECT site_id, day, last_update, total_logs_received, last_pack_voltage_mv
             FROM battery_daily_summary
             WHERE day = $1::date`,
            date
        );
        return rows;
    },

    async getRealtimeLatest(siteIds: string[]): Promise<DailySummaryRow[]> {
        if (siteIds.length === 0) return [];

        const today = new Date().toISOString().split("T")[0];
        const rows = await prisma.$queryRawUnsafe<DailySummaryRow[]>(
            `SELECT DISTINCT ON (site_id)
                site_id,
                $1::date AS day,
                timestamp AS last_update,
                0 AS total_logs_received,
                pack_voltage AS last_pack_voltage_mv
             FROM battery_data.battery_data_loggers
             WHERE site_id = ANY($2)
               AND timestamp >= ($1::date::text || ' 00:00:00+07')::timestamptz
             ORDER BY site_id, timestamp DESC`,
            today,
            siteIds
        );
        return rows;
    },

    async getRealtimeDayCounts(date: string): Promise<Map<string, number>> {
        const rows = await prisma.$queryRawUnsafe<{ site_id: string; cnt: bigint }[]>(
            `SELECT site_id, COUNT(*) AS cnt
             FROM battery_data.battery_data_loggers
             WHERE timestamp >= ($1::date::text || ' 00:00:00+07')::timestamptz
               AND timestamp < (($1::date::text || ' 00:00:00+07')::timestamptz + interval '1 day')
             GROUP BY site_id`,
            date
        );
        const map = new Map<string, number>();
        for (const r of rows) {
            map.set(r.site_id, Number(r.cnt));
        }
        return map;
    },
};
