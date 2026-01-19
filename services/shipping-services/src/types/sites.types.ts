// Sites Service Types

export interface SiteInfo {
    siteId: string;
    siteName: string;
    prCode?: string | null;
    isActive?: boolean;
    batteryVersion?: string | null;
    province?: string | null;
    talisInstalled?: string | null;
}

export interface SitesApiResponse {
    success: boolean;
    message?: string;
    data?: {
        data: SiteInfo[];
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

export interface SiteDetailInfo {
    siteId: string;
    siteName: string;
    province: string | null;
    batteryVersion: string | null;
    talisInstalled: string | null;
}

