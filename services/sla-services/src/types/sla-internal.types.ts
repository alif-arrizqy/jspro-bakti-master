// ============================================================
// SLA Internal Service Types
// ============================================================

export interface SlaInternalSummaryParams {
    startDate: string;
    endDate: string;
    siteId?: string;
}

export interface SlaInternalSummaryResponse {
    siteId: string;
    prCode: string | null;
    siteName: string | null;
    lc: string | null;
    totalRecords: number;
    uptimeMinutes: number;
    unknownMinutes: number;
    upPercentage: number;
    unknownPercentage: number;
    avgBatteryVoltage: number | null;
}

export interface SlaInternalDailyParams {
    startDate: string;
    endDate: string;
    siteId: string;
}

export interface SlaInternalDailyResponse {
    siteId: string;
    prCode: string | null;
    siteName: string | null;
    date: string;
    uptimeMinutes: number;
    avgBatteryVoltage: number | null;
    avgVsatCurrent: number | null;
    avgBtsCurrent: number | null;
    totalEh1: number | null;
    totalEh2: number | null;
    totalEh3: number | null;
    totalEdl1: number | null;
    totalEdl2: number | null;
    totalEdl3: number | null;
}

export interface SlaInternalExportParams {
    startDate: string;
    endDate: string;
    siteId: string;
}

// Internal query result types (used only in service)
export interface SummaryQueryResult {
    site_id: string;
    pr_code: string | null;
    total_records: bigint;
    avg_battery_voltage: number | null;
    avg_vsat_current: number | null;
    avg_bts_current: number | null;
    total_eh: number | null;
    total_edl: number | null;
}

export interface DailyQueryResult {
    site_id: string;
    pr_code: string | null;
    date: Date;
    record_count: bigint;
    avg_battery_voltage: number | null;
    avg_vsat_current: number | null;
    avg_bts_current: number | null;
    total_eh1: number | null;
    total_eh2: number | null;
    total_eh3: number | null;
    total_edl1: number | null;
    total_edl2: number | null;
    total_edl3: number | null;
}
