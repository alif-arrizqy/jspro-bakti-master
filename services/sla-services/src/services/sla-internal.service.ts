import dayjs from "dayjs";
import { databaseService } from "./database.service";
import { slaLogger } from "../utils/logger";
import { generateSlaInternalExcel } from "../utils/excel.util";
import type {
    SlaInternalSummaryResponse,
    SlaInternalDailyResponse,
    SummaryQueryResult,
    DailyQueryResult,
} from "../types/sla-internal.types";

// ============================================================
// SLA Internal Service
// ============================================================

export class SlaInternalService {
    /**
     * SLA 1: Get summary/average data for date range
     * Can query single site or all sites
     */
    async getSummary(params: {
        startDate: string;
        endDate: string;
        siteId?: string;
    }): Promise<SlaInternalSummaryResponse[]> {
        const prisma = databaseService.getDataLoggersClient();
        const startDate = new Date(params.startDate);
        const endDate = new Date(params.endDate);

        // Calculate expected records based on date range (5 min interval = 288 per day)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const expectedRecordsPerSite = daysDiff * 288; // 288 records per day (5 min interval)

        let results: SummaryQueryResult[];

        if (params.siteId) {
            // Query for single site
            results = await prisma.$queryRaw<SummaryQueryResult[]>`
                SELECT 
                    site_id,
                    pr_code,
                    COUNT(*) as total_records,
                    AVG(battery_voltage) as avg_battery_voltage,
                    AVG(load1) as avg_vsat_current,
                    AVG(load2) as avg_bts_current,
                    SUM(COALESCE(eh1, 0) + COALESCE(eh2, 0) + COALESCE(eh3, 0)) as total_eh,
                    SUM(ABS(COALESCE(edl1, 0)) + ABS(COALESCE(edl2, 0)) + ABS(COALESCE(edl3, 0))) as total_edl
                FROM scc_data_loggers
                WHERE site_id = ${params.siteId}
                  AND timestamp >= ${startDate}
                  AND timestamp <= ${endDate}
                GROUP BY site_id, pr_code
            `;
        } else {
            // Query for all sites
            results = await prisma.$queryRaw<SummaryQueryResult[]>`
                SELECT 
                    site_id,
                    pr_code,
                    COUNT(*) as total_records,
                    AVG(battery_voltage) as avg_battery_voltage,
                    AVG(load1) as avg_vsat_current,
                    AVG(load2) as avg_bts_current,
                    SUM(COALESCE(eh1, 0) + COALESCE(eh2, 0) + COALESCE(eh3, 0)) as total_eh,
                    SUM(ABS(COALESCE(edl1, 0)) + ABS(COALESCE(edl2, 0)) + ABS(COALESCE(edl3, 0))) as total_edl
                FROM scc_data_loggers
                WHERE timestamp >= ${startDate}
                  AND timestamp <= ${endDate}
                GROUP BY site_id, pr_code
                ORDER BY site_id
            `;
        }

        return results.map((row) => {
            const totalRecords = Number(row.total_records);
            const uptimeMinutes = totalRecords * 5; // Each record = 5 minutes
            const expectedMinutes = expectedRecordsPerSite * 5;
            const unknownMinutes = Math.max(0, expectedMinutes - uptimeMinutes);
            const upPercentage = expectedMinutes > 0 ? (uptimeMinutes / expectedMinutes) * 100 : 0;
            const unknownPercentage = expectedMinutes > 0 ? (unknownMinutes / expectedMinutes) * 100 : 0;

            return {
                siteId: row.site_id,
                prCode: row.pr_code,
                siteName: null, // Can be joined with site info table if needed
                lc: null, // Can be added if available
                totalRecords,
                uptimeMinutes,
                unknownMinutes,
                upPercentage: Math.round(upPercentage * 100) / 100,
                unknownPercentage: Math.round(unknownPercentage * 100) / 100,
                avgBatteryVoltage: row.avg_battery_voltage ? Math.round(row.avg_battery_voltage * 100) / 100 : null,
            };
        });
    }

    /**
     * SLA 2: Get daily average data for a specific site
     */
    async getDaily(params: {
        startDate: string;
        endDate: string;
        siteId: string;
    }): Promise<SlaInternalDailyResponse[]> {
        const prisma = databaseService.getDataLoggersClient();
        const startDate = new Date(params.startDate);
        const endDate = new Date(params.endDate);

        const results = await prisma.$queryRaw<DailyQueryResult[]>`
            SELECT 
                site_id,
                pr_code,
                DATE(timestamp) as date,
                COUNT(*) as record_count,
                AVG(battery_voltage) as avg_battery_voltage,
                AVG(load1) as avg_vsat_current,
                AVG(load2) as avg_bts_current,
                SUM(COALESCE(eh1, 0)) as total_eh1,
                SUM(COALESCE(eh2, 0)) as total_eh2,
                SUM(COALESCE(eh3, 0)) as total_eh3,
                SUM(ABS(COALESCE(edl1, 0))) as total_edl1,
                SUM(ABS(COALESCE(edl2, 0))) as total_edl2,
                SUM(ABS(COALESCE(edl3, 0))) as total_edl3
            FROM scc_data_loggers
            WHERE site_id = ${params.siteId}
              AND timestamp >= ${startDate}
              AND timestamp <= ${endDate}
            GROUP BY site_id, pr_code, DATE(timestamp)
            ORDER BY date
        `;

        return results.map((row) => ({
            siteId: row.site_id,
            prCode: row.pr_code,
            siteName: null,
            date: dayjs(row.date).format("YYYY-MM-DD"),
            uptimeMinutes: Number(row.record_count) * 5,
            avgBatteryVoltage: row.avg_battery_voltage ? Math.round(row.avg_battery_voltage * 100) / 100 : null,
            avgVsatCurrent: row.avg_vsat_current ? Math.round(row.avg_vsat_current * 1000) / 1000 : null,
            avgBtsCurrent: row.avg_bts_current ? Math.round(row.avg_bts_current * 1000) / 1000 : null,
            totalEh1: row.total_eh1 ? Math.round(row.total_eh1 * 100) / 100 : null,
            totalEh2: row.total_eh2 ? Math.round(row.total_eh2 * 100) / 100 : null,
            totalEh3: row.total_eh3 ? Math.round(row.total_eh3 * 100) / 100 : null,
            totalEdl1: row.total_edl1 ? Math.round(row.total_edl1 * 100) / 100 : null,
            totalEdl2: row.total_edl2 ? Math.round(row.total_edl2 * 100) / 100 : null,
            totalEdl3: row.total_edl3 ? Math.round(row.total_edl3 * 100) / 100 : null,
        }));
    }

    /**
     * SLA 3: Export raw data to Excel file
     */
    async exportToExcel(params: {
        startDate: string;
        endDate: string;
        siteId: string;
    }): Promise<{ buffer: Buffer; filename: string }> {
        const prisma = databaseService.getDataLoggersClient();
        const startDate = new Date(params.startDate);
        const endDate = new Date(params.endDate);

        slaLogger.info({ ...params }, "Exporting SLA Internal data to Excel");

        // Fetch all data for the site within date range
        const data = await prisma.sccDataLogger.findMany({
            where: {
                siteId: params.siteId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                timestamp: "asc",
            },
        });

        slaLogger.info({ records: data.length }, "Data fetched for export");

        // Transform data for Excel
        const excelData = data.map((row) => ({
            timestamp: row.timestamp,
            siteId: row.siteId,
            batteryVoltage: row.batteryVoltage,
            vsatCurrent: row.load1,
            btsCurrent: row.load2,
            pv1Current: row.pv1Current,
            pv2Current: row.pv2Current,
            pv3Current: row.pv3Current,
            pv1Voltage: row.pv1Voltage,
            pv2Voltage: row.pv2Voltage,
            pv3Voltage: row.pv3Voltage,
            eh1: row.eh1,
            eh2: row.eh2,
            eh3: row.eh3,
            edl1: row.edl1,
            edl2: row.edl2,
            edl3: row.edl3,
        }));

        // Generate Excel file
        const buffer = await generateSlaInternalExcel(excelData, params.siteId, params.startDate, params.endDate);

        const filename = `SLA3_${params.siteId}_${params.startDate}_to_${params.endDate}.xlsx`;

        return { buffer, filename };
    }
}

// Export singleton instance
export const slaInternalService = new SlaInternalService();

