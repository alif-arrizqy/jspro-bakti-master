import { config } from "../config/env";
import { slaLogger } from "../utils/logger";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export interface SiteDowntimeData {
    siteId: string;
    downSince: string;
    downSeconds: number | null;
}

interface MonitoringServiceResponse {
    success: boolean;
    data: Array<{
        id: number;
        siteId: string;
        siteName: string;
        downSince: string;
        downSeconds: number | null;
        createdAt: string;
        updatedAt: string;
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class SiteDownService {
    private cache: Map<string, SiteDowntimeData> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private allSitesCache: Map<string, SiteDowntimeData> | null = null;
    private allSitesCacheExpiry: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async fetchAllSiteDowntime(): Promise<Map<string, SiteDowntimeData>> {
        // Check cache first
        const now = Date.now();
        if (this.allSitesCache && now < this.allSitesCacheExpiry) {
            slaLogger.debug({ cachedCount: this.allSitesCache.size }, "Using cached all site downtime data");
            return this.allSitesCache;
        }

        // If no monitoring service URL configured, log warning and return empty map
        if (!config.services.monitoringServiceUrl) {
            slaLogger.warn({ 
                envVar: "MONITORING_SERVICE_URL",
                configValue: config.services.monitoringServiceUrl 
            }, "MONITORING_SERVICE_URL is not configured in environment variables, cannot fetch site downtime data. Please set MONITORING_SERVICE_URL in .env file");
            return new Map();
        }

        const siteMap = new Map<string, SiteDowntimeData>();
        let page = 1;
        const limit = 100;
        let hasMore = true;

        try {
            while (hasMore) {
                const url = `${config.services.monitoringServiceUrl}/api/v1/monitoring/site-down/?page=${page}&limit=${limit}`;
                slaLogger.info({ url, page }, "Fetching site downtime from monitoring service");

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    slaLogger.error({ 
                        status: response.status, 
                        statusText: response.statusText, 
                        url,
                        page 
                    }, "Failed to fetch site downtime from monitoring service");
                    throw new Error(`Failed to fetch site downtime: ${response.status} ${response.statusText}`);
                }

                const result = (await response.json()) as MonitoringServiceResponse;
                
                // Validate response structure
                if (!result || typeof result !== 'object') {
                    slaLogger.warn({ result, url, page }, "Invalid response from monitoring service: not an object");
                    break;
                }

                // Response structure: { success: true, data: [...], pagination: {...} }
                if (!result.success) {
                    slaLogger.warn({ result, url, page }, "Monitoring service returned success=false");
                    break;
                }

                if (!Array.isArray(result.data)) {
                    slaLogger.warn({ result, url, page }, "Invalid response structure from monitoring service: data is not an array");
                    break;
                }

                const sitesArray = result.data;
                const pagination = result.pagination;

                // Process sites
                for (const item of sitesArray) {
                    if (item && item.siteId && item.downSince) {
                        // downSeconds can be 0 or null, both are valid
                        siteMap.set(item.siteId, {
                            siteId: item.siteId,
                            downSince: item.downSince,
                            downSeconds: item.downSeconds ?? null,
                        });
                    } else {
                        slaLogger.debug({ 
                            item, 
                            hasSiteId: !!item?.siteId, 
                            hasDownSince: !!item?.downSince 
                        }, "Skipping invalid site downtime item");
                    }
                }

                // Check if there are more pages
                if (pagination) {
                    hasMore = page < pagination.totalPages;
                    slaLogger.debug({ 
                        page, 
                        totalPages: pagination.totalPages,
                        sitesInPage: sitesArray.length,
                        totalSites: siteMap.size 
                    }, "Fetched site downtime page");
                } else {
                    // If no pagination info, assume only one page if we got less than limit
                    hasMore = sitesArray.length >= limit;
                    slaLogger.debug({ 
                        page, 
                        sitesInPage: sitesArray.length,
                        totalSites: siteMap.size,
                        hasMore 
                    }, "Fetched site downtime page (no pagination info)");
                }

                page++;
            }

            // Cache the result
            this.allSitesCache = siteMap;
            this.allSitesCacheExpiry = now + this.CACHE_TTL;

            slaLogger.info({ 
                totalSites: siteMap.size,
                totalPages: page - 1,
                sampleSites: Array.from(siteMap.keys()).slice(0, 10),
                monitoringServiceUrl: config.services.monitoringServiceUrl
            }, "Successfully fetched all site downtime from monitoring service");
            
            return siteMap;
        } catch (error) {
            const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
            slaLogger.error({ 
                error: errorDetails, 
                monitoringServiceUrl: config.services.monitoringServiceUrl,
                url: `${config.services.monitoringServiceUrl}/api/v1/monitoring/site-down/`
            }, "Failed to fetch all site downtime from monitoring service");
            return new Map();
        }
    }

    /**
     * Get site downtime data from monitoring service
     * Uses the all-sites cache for better performance
     */
    async getSiteDowntime(siteId: string): Promise<SiteDowntimeData | null> {
        // Check individual cache first
        const cached = this.cache.get(siteId);
        const expiry = this.cacheExpiry.get(siteId);
        if (cached && expiry && expiry > Date.now()) {
            return cached;
        }

        // Fetch all sites (with caching)
        const allSites = await this.fetchAllSiteDowntime();
        const siteData = allSites.get(siteId);

        if (siteData) {
            // Cache individual result
            this.cache.set(siteId, siteData);
            this.cacheExpiry.set(siteId, Date.now() + this.CACHE_TTL);
            return siteData;
        }

        return null;
    }

    /**
     * Calculate downtime in days from downSince to targetDate
     * Uses date-only comparison to avoid timezone issues
     * Example: downSince = "2026-01-09 05:48:28.731 +0700" and targetDate = 2026-01-11
     * Result: 2 days (from Jan 9 to Jan 11)
     * 
     * Calculation: targetDate - downSince in calendar days
     * Extracts date part (YYYY-MM-DD) from both dates and calculates difference
     */
    calculateDowntimeDays(downSince: string, targetDate: Date): number {
        try {
            // Parse downSince (can be ISO string with timezone like "2026-01-09 05:48:28.731 +0700")
            // dayjs will parse the date correctly, preserving the date part
            const downDate = dayjs(downSince);
            // Parse targetDate (Date object)
            const target = dayjs(targetDate);
            
            // Extract date only (YYYY-MM-DD) from the original date strings
            // This preserves the calendar date regardless of timezone
            // For downSince: extract date part from the original string if possible, otherwise use parsed date
            let downDateOnly: string;
            if (downSince.includes("T") || downSince.includes(" ")) {
                // If it's an ISO string, extract date part before space or T
                const datePart = downSince.split(/[T ]/)[0];
                downDateOnly = datePart; // Should be "YYYY-MM-DD"
            } else {
                downDateOnly = downDate.format("YYYY-MM-DD");
            }
            
            // For targetDate, use formatted date
            const targetDateOnly = target.format("YYYY-MM-DD");
            
            // Parse as date-only strings to ensure consistent calculation
            // Use strict parsing to avoid timezone issues
            const downDateParsed = dayjs(downDateOnly, "YYYY-MM-DD", true);
            const targetDateParsed = dayjs(targetDateOnly, "YYYY-MM-DD", true);
            
            // Calculate difference in days
            // diff returns the number of full days between the two dates
            const days = targetDateParsed.diff(downDateParsed, "day");
            
            slaLogger.info({ 
                downSince, 
                downDateOriginal: downDate.format("YYYY-MM-DD HH:mm:ss Z"),
                downDateOnly,
                downDateParsed: downDateParsed.format("YYYY-MM-DD"),
                targetDateOriginal: target.format("YYYY-MM-DD HH:mm:ss Z"),
                targetDateOnly,
                targetDateParsed: targetDateParsed.format("YYYY-MM-DD"),
                calculatedDays: days
            }, "Calculating downtime days from downSince to targetDate");
            
            const result = Math.max(0, days);
            return result;
        } catch (error) {
            slaLogger.error({ error, downSince, targetDate: targetDate.toISOString() }, "Error calculating downtime days");
            return 0;
        }
    }
}

// Export singleton instance
export const siteDownService = new SiteDownService();

