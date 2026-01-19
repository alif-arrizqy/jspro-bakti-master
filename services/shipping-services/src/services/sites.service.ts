import { shippingLogger } from "../utils/logger";
import { config } from "../config/env";
import type { SiteInfo, SitesApiResponse, SiteDetailInfo } from "../types/sites.types";

// Sites Service
// Service untuk mengambil valid siteIds dari sites service

export class SitesService {
    private readonly sitesServiceUrl: string;

    constructor() {
        // URL sites service dari config
        this.sitesServiceUrl = config.services.sitesServiceUrl;
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

                shippingLogger.debug({ url, page }, "Fetching sites from API");

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
                shippingLogger.debug({ responseData: data }, "Sites service response");

                if (!data.success) {
                    throw new Error(`Sites service returned error: ${data.message || "Unknown error"}`);
                }

                // Handle different response structures
                const sitesArray = data.data?.data || (data.data as any) || [];

                if (!Array.isArray(sitesArray)) {
                    shippingLogger.error({ data }, "Invalid response structure from sites service");
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
                shippingLogger.debug(
                    {
                        page: page - 1,
                        totalPages: pagination?.totalPages || 1,
                        sitesInPage: sitesArray.length,
                        totalValidSites: validSiteIds.size,
                    },
                    "Fetched sites page"
                );
            }

            shippingLogger.info({ totalValidSites: validSiteIds.size }, "Successfully fetched all valid siteIds");
            return validSiteIds;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            shippingLogger.error(
                { error: errorDetails },
                `Failed to fetch valid siteIds from sites service: ${errorMessage}`
            );
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
            shippingLogger.debug("Using cached siteIds");
            return this.cache.siteIds;
        }

        // Fetch fresh data
        const siteIds = await this.getValidSiteIds();
        this.cache = { siteIds, timestamp: now };

        return siteIds;
    }

    /**
     * Validate if siteId exists and is active in sites service
     */
    async validateSiteId(siteId: string): Promise<boolean> {
        try {
            const validSiteIds = await this.getValidSiteIdsCached();
            return validSiteIds.has(siteId);
        } catch (error) {
            shippingLogger.warn({ error, siteId }, "Failed to validate siteId, assuming valid");
            // If sites service is down, don't block the operation
            return true;
        }
    }

    /**
     * Get site details by siteId
     */
    async getSiteById(siteId: string): Promise<SiteInfo | null> {
        try {
            const url = `${this.sitesServiceUrl}/api/v1/sites/${siteId}`;

            shippingLogger.debug({ url, siteId }, "Fetching site by ID");

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Failed to fetch site: ${response.status} ${response.statusText}`);
            }

            const data = (await response.json()) as { success: boolean; data?: SiteInfo; message?: string };

            if (!data.success || !data.data) {
                return null;
            }

            return data.data;
        } catch (error) {
            shippingLogger.error({ error, siteId }, "Failed to fetch site by ID");
            return null;
        }
    }

    /**
     * Get site details with caching
     */
    async getSiteDetailsCached(): Promise<Map<string, SiteDetailInfo>> {
        try {
            const siteDetailsMap = new Map<string, SiteDetailInfo>();
            let page = 1;
            const limit = 80;
            let hasMore = true;

            while (hasMore) {
                const url = `${this.sitesServiceUrl}/api/v1/sites?page=${page}&limit=${limit}&isActive=true&sortBy=siteName&sortOrder=asc`;

                shippingLogger.debug({ url, page }, "Fetching site details from sites service");

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Sites service returned ${response.status}`);
                }

                const data = (await response.json()) as SitesApiResponse;

                if (!data.success) {
                    throw new Error("Invalid response format from sites service");
                }

                const sitesArray = data.data?.data || (data.data as any) || [];

                if (!Array.isArray(sitesArray)) {
                    throw new Error("Invalid response format from sites service");
                }

                for (const site of sitesArray) {
                    if (site.siteId) {
                        siteDetailsMap.set(site.siteId, {
                            siteId: site.siteId,
                            siteName: site.siteName || "",
                            province: site.province || null,
                            batteryVersion: site.batteryVersion || null,
                            talisInstalled: site.talisInstalled || null,
                        });
                    }
                }

                const pagination = data.data?.pagination || data.pagination;
                hasMore = pagination ? page < pagination.totalPages : false;
                page++;
            }

            shippingLogger.info({ totalSites: siteDetailsMap.size }, "Fetched site details from sites service");
            return siteDetailsMap;
        } catch (error) {
            shippingLogger.error({ error }, "Failed to fetch site details from sites service");
            throw error;
        }
    }
}

export const sitesService = new SitesService();

