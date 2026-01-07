// ============================================================
// Sites Service Types
// ============================================================

export interface SiteInfo {
    id: string;
    siteId: string;
    siteName?: string;
    batteryVersion?: "talis5" | "mix" | "jspro" | null;
    [key: string]: any;
}

export interface SiteDetailInfo {
    siteId: string;
    siteName: string;
    province: string | null;
    batteryVersion: string | null;
    talisInstalled: string | null;
}

export interface SitesApiResponse {
    success: boolean;
    message: string;
    data: {
        data: Array<SiteInfo>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

