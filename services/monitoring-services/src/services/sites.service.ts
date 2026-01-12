import axios from "axios";
import { config } from "../config/env";
import { siteDownLogger } from "../utils/logger";

/**
 * Site mapping from sites-service
 * Maps NMS site_id_name to sites-service siteId
 */
interface SiteMapping {
    siteId: string; // sites-service siteId
    siteName: string;
    terminalId?: string | null;
}

interface SitesApiResponse {
    success: boolean;
    data: {
        data: Array<{
            siteId: string;
            siteName: string;
            terminalId?: string | null;
        }>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

/**
 * Service untuk mapping site_id dari NMS ke siteId dari sites-service
 */
export class SitesService {
    private readonly sitesServiceUrl: string | undefined;
    private siteMappingCache: Map<string, SiteMapping> | null = null;
    private terminalIdMappingCache: Map<string, string> | null = null; // terminalId -> siteId
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    constructor() {
        this.sitesServiceUrl = config.services.sitesServiceUrl;
    }

    /**
     * Fetch all sites from sites-service and create mapping
     * Mapping strategy:
     * 1. Direct match: site_id_name (NMS) == siteId (sites-service)
     * 2. Fallback: match via terminalId if available
     */
    async getSiteMapping(): Promise<Map<string, SiteMapping>> {
        if (!this.sitesServiceUrl) {
            siteDownLogger.warn("SITES_SERVICE_URL is not configured. Skipping site mapping.");
            return new Map();
        }

        // Check cache
        const now = Date.now();
        if (this.siteMappingCache && now - this.cacheTimestamp < this.CACHE_TTL) {
            siteDownLogger.debug("Using cached site mapping");
            return this.siteMappingCache;
        }

        try {
            const siteMap = new Map<string, SiteMapping>();
            const terminalIdMap = new Map<string, string>(); // terminalId -> siteId
            let page = 1;
            const limit = 100;
            let hasMore = true;

            siteDownLogger.info("Fetching site mapping from sites-service...");

            while (hasMore) {
                const url = `${this.sitesServiceUrl}/api/v1/sites?page=${page}&limit=${limit}&isActive=true&sortBy=siteName&sortOrder=asc`;

                const response = await axios.get<SitesApiResponse>(url, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                });

                if (!response.data.success) {
                    throw new Error(`Sites service returned error: ${response.data}`);
                }
                
                const sitesArray = response.data.data.data || [];
                // Create mapping: siteId -> SiteMapping
                // Also create terminalId -> siteId mapping for fallback
                for (const site of sitesArray) {
                    if (site.siteId) {
                        siteMap.set(site.siteId, {
                            siteId: site.siteId,
                            siteName: site.siteName,
                            terminalId: site.terminalId || null,
                        });

                        // Create terminalId mapping if available
                        if (site.terminalId) {
                            terminalIdMap.set(site.terminalId, site.siteId);
                        }
                    }
                }

                // Check if there are more pages
                const pagination = response.data.data.pagination;
                hasMore = pagination ? page < pagination.totalPages : false;
                page++;

                siteDownLogger.debug({
                    page: page - 1,
                    totalPages: pagination?.totalPages || 1,
                    sitesInPage: sitesArray.length,
                    totalMappings: siteMap.size,
                    terminalIdMappings: terminalIdMap.size,
                }, "Fetched sites page for mapping");
            }

            // Cache the mappings
            this.siteMappingCache = siteMap;
            this.terminalIdMappingCache = terminalIdMap;
            this.cacheTimestamp = now;

            siteDownLogger.info(
                { totalMappings: siteMap.size, terminalIdMappings: terminalIdMap.size },
                "Successfully fetched site mapping"
            );
            return siteMap;
        } catch (error) {
            siteDownLogger.error({ error }, "Failed to fetch site mapping from sites-service");
            // Return empty map on error, but log warning
            return new Map();
        }
    }

    /**
     * Map NMS site_id_name to sites-service siteId
     * Returns the mapped siteId if found, otherwise returns null
     * 
     * @param nmsSiteIdName - site_id_name from NMS API
     * @param nmsTerminalId - terminal_id from NMS API (optional, for fallback mapping)
     * @returns siteId from sites-service if found, null otherwise
     */
    async mapNmsSiteIdToSiteServiceSiteId(
        nmsSiteIdName: string,
        nmsTerminalId?: string | null
    ): Promise<string | null> {
        if (!this.sitesServiceUrl) {
            // If sites-service is not configured, return null (skip)
            siteDownLogger.warn("SITES_SERVICE_URL is not configured. Cannot validate site.");
            return null;
        }

        try {
            const siteMap = await this.getSiteMapping();

            // Strategy 1: Direct match by siteId (site_id_name == siteId)
            if (siteMap.has(nmsSiteIdName)) {
                const mapping = siteMap.get(nmsSiteIdName)!;
                siteDownLogger.debug(
                    { nmsSiteIdName, mappedSiteId: mapping.siteId },
                    "Mapped NMS site_id_name to sites-service siteId (direct match)"
                );
                return mapping.siteId;
            }

            // Strategy 2: Fallback - Match by terminalId
            if (nmsTerminalId && this.terminalIdMappingCache) {
                if (this.terminalIdMappingCache.has(nmsTerminalId)) {
                    const mappedSiteId = this.terminalIdMappingCache.get(nmsTerminalId)!;
                    siteDownLogger.debug(
                        { nmsSiteIdName, nmsTerminalId, mappedSiteId },
                        "Mapped NMS site_id_name to sites-service siteId (via terminalId)"
                    );
                    return mappedSiteId;
                }
            }

            // If no mapping found, return null (site not found in sites-service)
            siteDownLogger.debug(
                { nmsSiteIdName, nmsTerminalId },
                "Site not found in sites-service, will be skipped"
            );
            return null;
        } catch (error) {
            siteDownLogger.error(
                { error, nmsSiteIdName, nmsTerminalId },
                "Error mapping NMS site_id_name"
            );
            return null;
        }
    }

    /**
     * Check if siteId exists in sites-service
     * @param siteId - siteId to check
     * @returns true if site exists in sites-service, false otherwise
     */
    async isSiteIdValid(siteId: string): Promise<boolean> {
        if (!this.sitesServiceUrl) {
            return false;
        }

        try {
            const siteMap = await this.getSiteMapping();
            return siteMap.has(siteId);
        } catch (error) {
            siteDownLogger.error({ error, siteId }, "Error checking if siteId is valid");
            return false;
        }
    }

    /**
     * Clear cache (useful for testing or when sites are updated)
     */
    clearCache(): void {
        this.siteMappingCache = null;
        this.terminalIdMappingCache = null;
        this.cacheTimestamp = 0;
        siteDownLogger.debug("Site mapping cache cleared");
    }
}

// Export singleton instance
export const sitesService = new SitesService();

