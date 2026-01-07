import { slaLogger } from "../utils/logger";
import { config } from "../config/env";
import type {
    SiteInfo,
    SiteDetailInfo,
    SitesApiResponse,
} from "../types/sites.types";

// Sites Service
// Service untuk mengambil valid siteIds dari sites service

export class SitesService {
    private readonly sitesServiceUrl: string;

    constructor() {
        // URL sites service dari config
        this.sitesServiceUrl = config.services.sitesServiceUrl;
    }

    /**
     * Format siteName: replace underscore with space and convert to uppercase
     * Example: "site_name" -> "SITE NAME"
     */
    private formatSiteName(siteName: string | undefined | null): string {
        if (!siteName) {
            return "";
        }
        return siteName.replace(/_/g, " ").toUpperCase();
    }

    /**
     * Get all valid siteIds from sites service endpoint
     * Mengambil semua siteId yang aktif dari endpoint /api/v1/sites
     */
    async getValidSiteIds(): Promise<Set<string>> {
        try {
            const validSiteIds = new Set<string>();
            let page = 1;
            const limit = 20;
            let hasMore = true;

            while (hasMore) {
                const url = `${this.sitesServiceUrl}/api/v1/sites/?page=${page}&limit=${limit}&isActive=true&sortBy=siteName&sortOrder=asc`;
                
                slaLogger.debug({ url, page }, "Fetching sites from API");

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch sites: ${response.status} ${response.statusText}`);
                }

                const data = (await response.json()) as SitesApiResponse;
                
                // Log response for debugging
                slaLogger.debug({ responseData: data }, "Sites service response");

                if (!data.success) {
                    throw new Error(`Sites service returned error: ${data.message || "Unknown error"}`);
                }

                // Handle different response structures
                const sitesArray = data.data?.data || (data.data as any) || [];
                
                if (!Array.isArray(sitesArray)) {
                    slaLogger.error({ data }, "Invalid response structure from sites service");
                    throw new Error("Invalid response format from sites service: expected array of sites");
                }

                // Extract siteIds
                for (const site of sitesArray) {
                    if (site.siteId) {
                        validSiteIds.add(site.siteId);
                    }
                }

                // Check if there are more pages
                const pagination = data.data?.pagination || data.pagination;
                hasMore = pagination ? page < pagination.totalPages : false;
                page++;
                slaLogger.debug(
                    { 
                        page: page - 1, 
                        totalPages: pagination?.totalPages || 1,
                        sitesInPage: sitesArray.length,
                        totalValidSites: validSiteIds.size 
                    },
                    "Fetched sites page"
                );
            }

            slaLogger.info({ totalValidSites: validSiteIds.size }, "Successfully fetched all valid siteIds");
            return validSiteIds;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            slaLogger.error({ error: errorDetails }, `Failed to fetch valid siteIds from sites service: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get valid siteIds with caching (optional)
     * Bisa ditambahkan caching untuk mengurangi request ke sites service
     */
    private cache: { siteIds: Set<string>; timestamp: number } | null = null;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async getValidSiteIdsCached(): Promise<Set<string>> {
        const now = Date.now();

        // Check cache
        if (this.cache && now - this.cache.timestamp < this.CACHE_TTL) {
            slaLogger.debug("Using cached siteIds");
            return this.cache.siteIds;
        }

        // Fetch fresh data
        const siteIds = await this.getValidSiteIds();
        this.cache = { siteIds, timestamp: now };

        return siteIds;
    }

    /**
     * Get sites by battery version
     * Mengambil siteIds berdasarkan battery version dari sites service
     */
    async getSiteIdsByBatteryVersion(batteryVersion: "talis5" | "mix" | "jspro"): Promise<Set<string>> {
        try {
            const siteIds = new Set<string>();
            let page = 1;
            const limit = 20;
            let hasMore = true;

            while (hasMore) {
                const url = `${this.sitesServiceUrl}/api/v1/sites/?page=${page}&limit=${limit}&isActive=true&batteryVersion=${batteryVersion}&sortBy=siteName&sortOrder=asc`;
            
                slaLogger.debug({ url, batteryVersion, page }, "Fetching sites by battery version");

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch sites by battery version: ${response.status} ${response.statusText}`);
                }

                const data = (await response.json()) as SitesApiResponse;
                
                slaLogger.debug({ responseData: data, batteryVersion, page }, "Sites service response by battery version");

                if (!data?.success) {
                    throw new Error(`Sites service returned error: ${data.message || "Unknown error"}`);
                }

                // Handle different response structures
                // Response structure: { success: true, data: { data: [...], pagination: {...} } }
                const responseData = data.data;
                const sitesArray = responseData?.data || [];
                const pagination = responseData?.pagination;
                
                if (!Array.isArray(sitesArray)) {
                    slaLogger.error({ 
                        data, 
                        responseData, 
                        sitesArrayType: typeof sitesArray,
                        batteryVersion 
                    }, "Invalid response structure from sites service");
                    throw new Error("Invalid response format from sites service: expected array of sites");
                }

                // Extract siteIds
                for (const site of sitesArray) {
                    if (site && site.siteId) {
                        siteIds.add(site.siteId);
                    }
                }

                // Check if there are more pages
                if (pagination) {
                    hasMore = page < pagination.totalPages;
                } else {
                    // If no pagination info, assume no more pages if current page has no data
                    hasMore = sitesArray.length > 0;
                }
                page++;

                slaLogger.debug(
                    { 
                        page: page - 1, 
                        totalPages: pagination?.totalPages || 1,
                        sitesInPage: sitesArray.length,
                        totalSites: siteIds.size 
                    },
                    "Fetched sites page by battery version"
                );
            }

            slaLogger.info({ batteryVersion, totalSites: siteIds.size }, "Successfully fetched siteIds by battery version");
            return siteIds;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            slaLogger.error({ error: errorDetails, batteryVersion }, `Failed to fetch siteIds by battery version: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get all sites with battery version mapping
     * Mengambil semua sites dengan mapping siteId -> batteryVersion
     */
    async getSitesWithBatteryVersion(): Promise<Map<string, "talis5" | "mix" | "jspro" | null>> {
        try {
            const siteMap = new Map<string, "talis5" | "mix" | "jspro" | null>();
            let page = 1;
            const limit = 20;
            let hasMore = true;

            while (hasMore) {
                const url = `${this.sitesServiceUrl}/api/v1/sites/?page=${page}&limit=${limit}&isActive=true&sortBy=siteName&sortOrder=asc`;
                
                slaLogger.debug({ url, page }, "Fetching sites with battery version from API");

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch sites: ${response.status} ${response.statusText}`);
                }

                const data = (await response.json()) as SitesApiResponse;
                
                slaLogger.debug({ responseData: data, page }, "Sites service response with battery version");

                if (!data.success) {
                    throw new Error(`Sites service returned error: ${data.message || "Unknown error"}`);
                }

                // Handle different response structures
                const sitesArray = data.data?.data || (data.data as any) || [];
                
                if (!Array.isArray(sitesArray)) {
                    slaLogger.error({ data }, "Invalid response structure from sites service");
                    throw new Error("Invalid response format from sites service: expected array of sites");
                }

                // Extract siteIds and battery versions
                for (const site of sitesArray) {
                    if (site.siteId) {
                        siteMap.set(site.siteId, site.batteryVersion || site.detail?.batteryVersion || null);
                    }
                }

                // Check if there are more pages
                const pagination = data.data?.pagination || data.pagination;
                hasMore = pagination ? page < pagination.totalPages : false;
                page++;

                slaLogger.debug(
                    { 
                        page: page - 1, 
                        totalPages: pagination?.totalPages || 1,
                        sitesInPage: sitesArray.length,
                        totalSites: siteMap.size 
                    },
                    "Fetched sites page"
                );
            }

            slaLogger.info({ totalSites: siteMap.size }, "Successfully fetched all sites with battery version");
            return siteMap;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            slaLogger.error({ error: errorDetails }, `Failed to fetch sites with battery version: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get sites with battery version (cached)
     */
    private sitesCache: { siteMap: Map<string, "talis5" | "mix" | "jspro" | null>; timestamp: number } | null = null;

    async getSitesWithBatteryVersionCached(): Promise<Map<string, "talis5" | "mix" | "jspro" | null>> {
        const now = Date.now();

        // Check cache
        if (this.sitesCache && now - this.sitesCache.timestamp < this.CACHE_TTL) {
            slaLogger.debug("Using cached sites with battery version");
            return this.sitesCache.siteMap;
        }

        // Fetch fresh data
        const siteMap = await this.getSitesWithBatteryVersion();
        this.sitesCache = { siteMap, timestamp: now };

        return siteMap;
    }

    /**
     * Get siteId to siteName mapping
     * Mengambil mapping siteId -> siteName dari sites service
     */
    async getSiteIdToNameMap(): Promise<Map<string, string>> {
        try {
            const siteNameMap = new Map<string, string>();
            let page = 1;
            const limit = 20;
            let hasMore = true;

            while (hasMore) {
                const url = `${this.sitesServiceUrl}/api/v1/sites/?page=${page}&limit=${limit}&isActive=true&sortBy=siteName&sortOrder=asc`;
                
                slaLogger.debug({ url, page }, "Fetching sites for name mapping from API");

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch sites: ${response.status} ${response.statusText}`);
                }

                const data = (await response.json()) as SitesApiResponse;
                
                slaLogger.debug({ responseData: data, page }, "Sites service response for name mapping");

                if (!data.success) {
                    throw new Error(`Sites service returned error: ${data.message || "Unknown error"}`);
                }

                // Handle different response structures
                const sitesArray = data.data?.data || (data.data as any) || [];
                
                if (!Array.isArray(sitesArray)) {
                    slaLogger.error({ data }, "Invalid response structure from sites service");
                    throw new Error("Invalid response format from sites service: expected array of sites");
                }

                // Extract siteIds and siteNames
                for (const site of sitesArray) {
                    if (site.siteId) {
                        const formattedSiteName = this.formatSiteName(site.siteName);
                        siteNameMap.set(site.siteId, formattedSiteName);
                    }
                }

                // Check if there are more pages
                const pagination = data.data?.pagination || data.pagination;
                hasMore = pagination ? page < pagination.totalPages : false;
                page++;

                slaLogger.debug(
                    { 
                        page: page - 1, 
                        totalPages: pagination?.totalPages || 1,
                        sitesInPage: sitesArray.length,
                        totalSites: siteNameMap.size 
                    },
                    "Fetched sites page for name mapping"
                );
            }

            slaLogger.info({ totalSites: siteNameMap.size }, "Successfully fetched all siteId to siteName mapping");
            return siteNameMap;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            slaLogger.error({ error: errorDetails }, `Failed to fetch siteId to siteName mapping: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get siteId to siteName mapping (cached)
     */
    private siteNameCache: { siteNameMap: Map<string, string>; timestamp: number } | null = null;

    async getSiteIdToNameMapCached(): Promise<Map<string, string>> {
        const now = Date.now();

        // Check cache
        if (this.siteNameCache && now - this.siteNameCache.timestamp < this.CACHE_TTL) {
            slaLogger.debug("Using cached siteId to siteName mapping");
            return this.siteNameCache.siteNameMap;
        }

        // Fetch fresh data
        const siteNameMap = await this.getSiteIdToNameMap();
        this.siteNameCache = { siteNameMap, timestamp: now };

        return siteNameMap;
    }

    /**
     * Get site details with province and talisInstalled
     */
    async getSiteDetails(): Promise<Map<string, SiteDetailInfo>> {
        try {
            const siteDetailsMap = new Map<string, SiteDetailInfo>();
            let page = 1;
            let hasMore = true;

            slaLogger.info("Fetching site details with province and talisInstalled from sites service...");

            while (hasMore) {
                const response = await fetch(
                    `${this.sitesServiceUrl}/api/v1/sites?page=${page}&limit=80&isActive=true&sortBy=siteName&sortOrder=asc`
                );

                if (!response.ok) {
                    throw new Error(`Sites service returned ${response.status}`);
                }

                const data = (await response.json()) as SitesApiResponse;

                if (!data.success) {
                    throw new Error("Failed to fetch sites");
                }

                // Handle both nested and flat data structure
                const sitesArray = data.data?.data || data.data;

                if (!sitesArray || !Array.isArray(sitesArray)) {
                    throw new Error("Invalid response format from sites service");
                }

                // Extract site details
                for (const site of sitesArray) {
                    if (site.siteId) {
                        siteDetailsMap.set(site.siteId, {
                            siteId: site.siteId,
                            siteName: this.formatSiteName(site.siteName),
                            province: site.detail.province || null,
                            batteryVersion: site.batteryVersion || null,
                            talisInstalled: site.detail.talisInstalled || null,
                        });
                    }
                }

                // Check if there are more pages
                const pagination = data.data?.pagination || data.pagination;
                hasMore = pagination ? page < pagination.totalPages : false;
                page++;

                slaLogger.debug(
                    {
                        page: page - 1,
                        totalPages: pagination?.totalPages || 1,
                        sitesInPage: sitesArray.length,
                        totalSites: siteDetailsMap.size,
                    },
                    "Fetched sites page for details"
                );
            }

            slaLogger.info({ totalSites: siteDetailsMap.size }, "Successfully fetched all site details");
            return siteDetailsMap;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            slaLogger.error({ error: errorDetails }, `Failed to fetch site details: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get site details (cached)
     */
    private siteDetailsCache: { siteDetailsMap: Map<string, SiteDetailInfo>; timestamp: number } | null = null;

    async getSiteDetailsCached(): Promise<Map<string, SiteDetailInfo>> {
        const now = Date.now();

        // Check cache
        if (this.siteDetailsCache && now - this.siteDetailsCache.timestamp < this.CACHE_TTL) {
            slaLogger.debug("Using cached site details");
            return this.siteDetailsCache.siteDetailsMap;
        }

        // Fetch fresh data
        const siteDetailsMap = await this.getSiteDetails();
        this.siteDetailsCache = { siteDetailsMap, timestamp: now };

        return siteDetailsMap;
    }

    /**
     * Clear cache (useful for testing or when sites are updated)
     */
    clearCache(): void {
        this.cache = null;
        this.sitesCache = null;
        this.siteNameCache = null;
        this.siteDetailsCache = null;
        slaLogger.debug("SiteIds, sites, siteName, and site details cache cleared");
    }
}

// Export singleton instance
export const sitesService = new SitesService();

