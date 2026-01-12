// ============================================================
// SLA Bakti Types
// ============================================================

export interface SlaBaktiInput {
    date: Date;
    siteId: string;
    prCode?: string | null;
    sla?: number | null;
    powerUptime?: number | null;
    powerDowntime?: number | null;
    statusSla?: string | null;
}

export interface SlaBaktiResponse {
    id: number;
    date: string;
    siteId: string;
    prCode: string | null;
    sla: number | null;
    powerUptime: number | null;
    powerDowntime: number | null;
    statusSla: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UploadPreviewResponse {
    summary: {
        total: number;
        valid: number;
        duplicate: number;
        invalid: number;
        invalidSiteId: number; // Jumlah row dengan siteId yang tidak valid
    };
    validData: Array<{
        date: string;
        inserted: number;
    }>;
    duplicates: Array<{
        date: string;
        siteId: string;
        siteName: string;
    }>;
    errors: Array<{
        row: number;
        message: string;
    }>;
}

export interface ConfirmSaveResponse {
    inserted: number;
    skipped: number;
}

export type PicType = "VSAT" | "POWER" | "SNMP";

export interface SlaReportProblemInput {
    pic?: string | null;
    problem?: string | null;
    notes?: string | null;
}

export interface SlaReportProblemResponse {
    id: number;
    reportId: number;
    pic: string | null;
    problem: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SlaReportInput {
    date: string;
    siteId: string;
    prCode?: string | null;
    problems?: SlaReportProblemInput[];
}

export interface SlaReportResponse {
    id: number;
    date: string;
    siteId: string;
    prCode: string | null;
    problems: SlaReportProblemResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface SlaReportUpdateInput {
    date?: string;
    siteId?: string;
    prCode?: string | null;
    problems?: SlaReportProblemInput[];
}

export interface SlaReportQueryParams {
    startDate?: string;
    endDate?: string;
    siteId?: string;
    prCode?: string;
    pic?: PicType;
    page?: number;
    limit?: number;
}

// ============================================================
// SLA Report Chart Types
// ============================================================

export interface SlaChartDailyParams {
    startDate: string;
    endDate: string;
}

export interface SlaChartDailyItem {
    date: string;
    value: number;
}

export interface SlaChartDailyResponse {
    data: SlaChartDailyItem[];
}

export interface SlaChartBatteryVersionParams {
    startDate: string;
    endDate: string;
    batteryVersion: "talis5" | "mix" | "jspro";
}

export interface SlaChartWeeklyItem {
    name: string;
    value: number;
}

export interface SlaChartWeeklyResponse {
    data: SlaChartWeeklyItem[];
}

// ============================================================
// SLA Detail Report Types (Daily & Monthly)
// ============================================================

export interface SlaDetailDailyParams {
    startDate: string;
    endDate: string;
}

export interface SlaDetailMonthlyParams {
    startDate: string; // Must be 1st of month
    endDate: string;
}

// Battery version detail types (used by SlaDailyDetailResponse)
export interface SlaSummarySiteItem {
    date: string;
    sla: number;
    slaUnit: string;
    downtime: string;
    problem?: string | null;
    site: string;
    batteryVersion: "talis5" | "mix" | "jspro";  // Changed from battery_version to batteryVersion (camelCase)
}

export interface SlaSummaryDropUpItem {
    date: string;
    slaBefore: number;
    slaNow: number;
    slaUnit: string;
    downtime: string;
    problem?: string | null;
    site: string;
    batteryVersion: "talis5" | "mix" | "jspro";  // Changed from battery_version to batteryVersion (camelCase)
}

export interface SlaSummaryBatteryVersion {
    name: string;
    summary?: {
        totalSites: number;
        sla: number;
        slaUnit: string;
    };
    message: string;
    downSla: SlaSummarySiteItem[];
    underSla: SlaSummarySiteItem[];
    dropSla: SlaSummaryDropUpItem[];
    upSla: SlaSummaryDropUpItem[];
}

export interface SlaDailyDetailResponse {
    report: {
        dateNow: string;
        dateBefore: string;
        totalSite: number;
        slaNow: number;
        slaBefore: number;
        slaUnit: string;
        message: string;
        detail: {
            batteryVersion: {
                talis5: SlaSummaryBatteryVersion;
                mix: SlaSummaryBatteryVersion;
                jspro: SlaSummaryBatteryVersion;
            };
        };
    };
    slaBelow95: SlaBelow95Section;
}

// ============================================================
// SLA Below 95.5% Section Types
// ============================================================

// Site item for SLA Below 95.5% section (output format)
export interface SlaBelow95SiteOutput {
    sla: number;                    // slaAverage renamed to sla
    site: string;                   // siteName renamed to site
    downtime: string;               // downtimeDisplay renamed to downtime
    problem: string | null;
    batteryVersion: "talis5" | "mix" | "jspro";  // Always present, not null
    statusSP: "Potensi SP" | "Clear SP";  // Status SP based on SLA < 75
}

// Battery version detail for SLA Below 95.5% section
export interface SlaBelow95BatteryVersionDetail {
    name: string;                   // "Talis5 Full", "Talis5 Mix", "JS Pro"
    totalSites: number;
    sites: SlaBelow95SiteOutput[];
}

// SLA Below 95.5% Section (final output structure)
export interface SlaBelow95Section {
    message: string;                // "Dear team, berikut site yang memiliki SLA avg dibawah 95.5% pada tanggal {endDate}"
    totalSites: number;
    detail: {
        batteryVersion: {
            talis5: SlaBelow95BatteryVersionDetail;
            mix: SlaBelow95BatteryVersionDetail;
            jspro: SlaBelow95BatteryVersionDetail;
        };
    };
}

export interface SlaMonthlySummaryResponse {
    summary: {
        dateNow: string;
        totalSite: number;
        sla: number;
        slaUnit: string;
        slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
    };
    detail: {
        talis5: {
            name: string;
            summary: {
                totalSites: number;
                sla: number;
                slaUnit: string;
                slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
            };
        };
        mix: {
            name: string;
            summary: {
                totalSites: number;
                sla: number;
                slaUnit: string;
                slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
            };
        };
        jspro: {
            name: string;
            summary: {
                totalSites: number;
                sla: number;
                slaUnit: string;
                slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
            };
        };
    };
}

// ============================================================
// SLA Master Data Types
// ============================================================

export interface SlaMasterParams {
    startDate: string;
    endDate: string;
    siteId?: string;
    siteName?: string;
    batteryVersion?: "talis5" | "mix" | "jspro";
    statusSP?: "Potensi SP" | "Clear SP";
    slaStatus?: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
    slaMin?: number;
    slaMax?: number;
    province?: "Maluku" | "Papua";
    pic?: "VSAT" | "POWER" | "SNMP";
    page?: number;
    limit?: number;
}

export interface SlaMasterProblemItem {
    date: string;
    pic: "VSAT" | "POWER" | "SNMP" | null;
    problem: string | null;
    notes: string | null;
}

export interface SlaMasterDailySla {
    date: string;
    sla: number;
    slaUnit: string;
    slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
}

export interface SlaMasterSiteSla {
    slaAverage: number;
    slaUnit: string;
    slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
    dailySla: SlaMasterDailySla[];
    statusSP: "Potensi SP" | "Clear SP";
}

export interface SlaMasterSiteItem {
    siteId: string;
    siteName: string;
    province: string | null;
    batteryVersion: string | null;
    talisInstalled: string | null;
    problem: SlaMasterProblemItem[];
    siteSla: SlaMasterSiteSla;
}

export interface SlaMasterResponse {
    summary: {
        slaAverage: number;
        slaUnit: string;
        slaAverageDaily: SlaMasterDailySla[];
    };
    sites: SlaMasterSiteItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

