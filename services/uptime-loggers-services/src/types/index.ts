export type BatteryType = "jspro" | "talis5";
export type SiteStatusFilter = "all" | "terestrial" | "non_terestrial";
export type SiteStatus = "online" | "offline" | "healthy" | "warning" | "critical";
export type ConnectivityStatus = "online" | "offline";
export type UptimeMode = "realtime" | "historical";

export interface SiteItem {
    siteId: string;
    siteName: string;
    batteryType: BatteryType;
    lastUpdate: string | null;
    uptimePercentage: number;
    uptimeDuration: string | null;
    status: SiteStatus;
    connectivityStatus: ConnectivityStatus;
    batteryVoltageV: number | null;
    pingLatencyMs: number | null;
    connectivityReachable: boolean;
    connectivityProbedAt: string | null;
    grafanaUrl: string | null;
}

export interface UptimeSummary {
    totalSites: number;
    avgUptime: number;
    mode: UptimeMode;
    onlineCount?: number;
    offlineCount?: number;
    healthyCount?: number;
    warningCount?: number;
    criticalCount?: number;
}

export interface PullingLogItem {
    id: string;
    timestamp: string;
    siteId: string;
    siteName: string;
    batteryType: BatteryType;
    result: "success" | "failed";
    errorMessage?: string;
}

export interface PullingLogsSummary {
    totalLogs: number;
    successCount: number;
    failedCount: number;
    successRate: number;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface MasterSite {
    siteId: string;
    siteName: string;
    batteryType: BatteryType;
    ipSnmp?: string | null;
    ipGwGs?: string | null;
    statusSites?: string | null;
}

export interface ConnectivitySnapshot {
    latencyMs: number | null;
    reachable: boolean;
    probedAt: string | null;
    targetIp: string | null;
    probeMethod: "tcp" | "icmp";
}

export interface DailySummaryRow {
    site_id: string;
    day: Date;
    last_update: Date | null;
    total_logs_received: number | bigint;
    last_pack_voltage_mv: number | null;
}
