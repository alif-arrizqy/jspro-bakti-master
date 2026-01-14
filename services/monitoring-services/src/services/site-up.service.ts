import { databaseService } from "./database.service";
import { nmsApiService } from "./nms-api.service";
import { sitesService } from "./sites.service";
import { siteUpLogger } from "../utils/logger";
import type * as SiteUpTypes from "../types/site-up.types";

export class SiteUpService {
    /**
     * Get all site up data with pagination
     */
    async getAll(params: SiteUpTypes.SiteUpQueryParams): Promise<SiteUpTypes.SiteUpListResponse> {
        const prisma = databaseService.getMonitoringClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (params.siteId) {
            where.siteId = params.siteId;
        }
        if (params.siteName) {
            where.siteName = {
                contains: params.siteName,
                mode: 'insensitive', // Case-insensitive search
            };
        }

        const [data, total, totalSitesUp] = await Promise.all([
            prisma.siteUp.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    updatedAt: "desc", // Sort by most recently updated first
                },
            }),
            prisma.siteUp.count({ where }),
            prisma.siteUp.count(),
        ]);

        // Get total sites count with error handling
        let totalSites = 0;
        try {
            totalSites = await sitesService.getTotalSitesCount();
        } catch (error) {
            siteUpLogger.warn({ error }, "Failed to get total sites count, using 0 as fallback");
        }

        const totalPages = Math.ceil(total / limit);
        const percentageSitesUp = totalSites > 0 ? Number(((totalSitesUp / totalSites) * 100).toFixed(2)) : 0;
        
        const summary: SiteUpTypes.SiteUpSummary = {
            totalSites,
            totalSitesUp,
            percentageSitesUp,
        };

        siteUpLogger.debug(
            { totalSites, totalSitesUp, percentageSitesUp },
            "Generated summary for site up"
        );

        return {
            data: data.map((record) => ({
                id: record.id,
                siteId: record.siteId,
                siteName: record.siteName,
                createdAt: record.createdAt.toISOString(),
                updatedAt: record.updatedAt.toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
            summary,
        };
    }

    /**
     * Get site up by siteId
     */
    async getBySiteId(siteId: string): Promise<SiteUpTypes.SiteUpResponse | null> {
        const prisma = databaseService.getMonitoringClient();

        const record = await prisma.siteUp.findUnique({
            where: { siteId },
        });

        if (!record) {
            return null;
        }

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Create or update site up (upsert)
     */
    async upsert(data: SiteUpTypes.SiteUpInput): Promise<SiteUpTypes.SiteUpResponse> {
        const prisma = databaseService.getMonitoringClient();

        const record = await prisma.siteUp.upsert({
            where: { siteId: data.siteId },
            update: {
                siteName: data.siteName ?? undefined,
            },
            create: {
                siteId: data.siteId,
                siteName: data.siteName ?? null,
            },
        });

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Update site up
     */
    async update(siteId: string, data: Partial<SiteUpTypes.SiteUpInput>): Promise<SiteUpTypes.SiteUpResponse> {
        const prisma = databaseService.getMonitoringClient();

        const updateData: any = {};
        if (data.siteName !== undefined) updateData.siteName = data.siteName;

        const record = await prisma.siteUp.update({
            where: { siteId },
            data: updateData,
        });

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Delete site up
     */
    async delete(siteId: string): Promise<void> {
        const prisma = databaseService.getMonitoringClient();
        await prisma.siteUp.delete({
            where: { siteId },
        });
    }

    /**
     * Fetch data from NMS API and upsert to database
     * Only processes sites that exist in sites-service
     * Flow:
     * 1. Fetch data from NMS API
     * 2. Map NMS site_id_name to sites-service siteId
     * 3. Only process sites that exist in sites-service (skip others)
     * 4. Insert/update to database
     */
    async syncFromNms(): Promise<{ inserted: number; updated: number; errors: number; skipped: number }> {
        let inserted = 0;
        let updated = 0;
        let errors = 0;
        let skipped = 0;

        try {
            siteUpLogger.info("Starting sync from NMS API");
            
            // Step 1: Fetch data from NMS API
            const nmsData = (await nmsApiService.fetchSiteData("up")) as SiteUpTypes.NmsSiteUpItem[];
            siteUpLogger.info({ totalFromNms: nmsData.length }, "Fetched data from NMS API");

            // Step 2: Process each NMS site
            for (const item of nmsData) {
                try {
                    // Step 3: Map NMS site_id_name to sites-service siteId
                    // Returns null if site not found in sites-service
                    const mappedSiteId = await sitesService.mapNmsSiteIdToSiteServiceSiteId(
                        item.site_id_name,
                        item.terminal_id
                    );

                    // Step 4: Skip if site not found in sites-service
                    if (!mappedSiteId) {
                        skipped++;
                        siteUpLogger.debug(
                            { 
                                nmsSiteId: item.site_id_name, 
                                nmsTerminalId: item.terminal_id,
                                siteName: item.name 
                            },
                            "Site not found in sites-service, skipping"
                        );
                        continue;
                    }

                    // Step 5: Site exists in sites-service, proceed with insert/update
                    // Check if site exists in database (using mapped siteId)
                    const existing = await this.getBySiteId(mappedSiteId);

                    const data: SiteUpTypes.SiteUpInput = {
                        siteId: mappedSiteId, // Use mapped siteId from sites-service
                        siteName: item.name,
                    };

                    await this.upsert(data);

                    if (existing) {
                        updated++;
                        siteUpLogger.debug(
                            { siteId: mappedSiteId, nmsSiteId: item.site_id_name },
                            "Updated site up"
                        );
                    } else {
                        inserted++;
                        siteUpLogger.debug(
                            { siteId: mappedSiteId, nmsSiteId: item.site_id_name },
                            "Inserted new site up"
                        );
                    }

                    // Log if mapping was applied (different from original)
                    if (mappedSiteId !== item.site_id_name) {
                        siteUpLogger.debug(
                            { 
                                nmsSiteId: item.site_id_name, 
                                nmsTerminalId: item.terminal_id,
                                mappedSiteId 
                            },
                            "Applied site mapping (site_id_name != siteId)"
                        );
                    }
                } catch (error) {
                    errors++;
                    siteUpLogger.error(
                        { 
                            error, 
                            nmsSiteId: item.site_id_name, 
                            nmsTerminalId: item.terminal_id,
                            siteName: item.name 
                        },
                        "Failed to upsert site up"
                    );
                }
            }

            siteUpLogger.info(
                { 
                    inserted, 
                    updated, 
                    errors, 
                    skipped, 
                    total: nmsData.length,
                    processed: inserted + updated 
                },
                "Sync from NMS completed"
            );
            return { inserted, updated, errors, skipped };
        } catch (error) {
            siteUpLogger.error({ error }, "Failed to sync from NMS");
            throw error;
        }
    }
}

// Export singleton instance
export const siteUpService = new SiteUpService();

