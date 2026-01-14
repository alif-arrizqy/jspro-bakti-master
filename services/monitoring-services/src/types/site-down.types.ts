export interface SiteDowntimeInput {
    siteId: string;
    siteName?: string | null;
    downSince?: Date | null;
    downSeconds?: number | null;
}

export interface SiteDowntimeResponse {
    id: number;
    siteId: string;
    siteName: string | null;
    downSince: string | null;
    downSeconds: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface SiteDowntimeQueryParams {
    page?: number;
    limit?: number;
    siteId?: string;
    siteName?: string;
}

export interface SiteDowntimeSummary {
    totalSites: number;
    totalSitesDown: number;
    percentageSitesDown: number;
}

export interface SiteDowntimeListResponse {
    data: SiteDowntimeResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    summary: SiteDowntimeSummary;
}

export interface NmsLoginResponse {
    refresh_token: string;
}

export interface NmsRefreshResponse {
    access_token: string;
}

export interface NmsSiteDownItem {
    site_id_name: string;
    name: string;
    terminal_id?: string | null; // For fallback mapping
    down_since?: string | null; // ISO format: "2026-01-08T00:53:36.426148"
    down_seconds?: number | null; // e.g., 49200
}

export interface NmsSiteDownResponse {
    message: string;
    total: number | null;
    result: NmsSiteDownItem[];
}

