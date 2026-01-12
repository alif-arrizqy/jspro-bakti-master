export interface SiteUpInput {
    siteId: string;
    siteName?: string | null;
}

export interface SiteUpResponse {
    id: number;
    siteId: string;
    siteName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SiteUpQueryParams {
    page?: number;
    limit?: number;
    siteId?: string;
}

export interface NmsSiteUpItem {
    site_id_name: string;
    name: string;
    terminal_id?: string | null; // For fallback mapping
}

export interface NmsSiteUpResponse {
    message: string;
    total: number | null;
    result: NmsSiteUpItem[];
}

