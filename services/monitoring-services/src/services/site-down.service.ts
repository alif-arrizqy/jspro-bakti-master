import { databaseService } from "./database.service";
import { nmsApiService } from "./nms-api.service";
import { sitesService } from "./sites.service";
import { siteDownLogger } from "../utils/logger";
import type * as SiteDownTypes from "../types/site-down.types";

export class SiteDownService {
    /**
     * Get all site downtime data with pagination
     */
    async getAll(params: SiteDownTypes.SiteDowntimeQueryParams): Promise<SiteDownTypes.SiteDowntimeListResponse> {
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

        const [data, total, totalSitesDown] = await Promise.all([
            prisma.siteDowntime.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    downSeconds: "desc", // Sort by longest downtime first
                },
            }),
            prisma.siteDowntime.count({ where }),
            prisma.siteDowntime.count(),
        ]);

        // Get total sites count with error handling
        let totalSites = 0;
        try {
            totalSites = await sitesService.getTotalSitesCount();
        } catch (error) {
            siteDownLogger.warn({ error }, "Failed to get total sites count, using 0 as fallback");
        }

        const totalPages = Math.ceil(total / limit);
        const percentageSitesDown = totalSites > 0 ? Number(((totalSitesDown / totalSites) * 100).toFixed(2)) : 0;
        
        const summary: SiteDownTypes.SiteDowntimeSummary = {
            totalSites,
            totalSitesDown,
            percentageSitesDown,
        };

        siteDownLogger.debug(
            { totalSites, totalSitesDown, percentageSitesDown },
            "Generated summary for site downtime"
        );

        return {
            data: data.map((record) => ({
                id: record.id,
                siteId: record.siteId,
                siteName: record.siteName,
                downSince: record.downSince?.toISOString() ?? null,
                downSeconds: record.downSeconds,
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
     * Get site downtime by siteId
     */
    async getBySiteId(siteId: string): Promise<SiteDownTypes.SiteDowntimeResponse | null> {
        const prisma = databaseService.getMonitoringClient();

        const record = await prisma.siteDowntime.findUnique({
            where: { siteId },
        });

        if (!record) {
            return null;
        }

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            downSince: record.downSince?.toISOString() ?? null,
            downSeconds: record.downSeconds,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Create or update site downtime (upsert)
     */
    async upsert(data: SiteDownTypes.SiteDowntimeInput): Promise<SiteDownTypes.SiteDowntimeResponse> {
        const prisma = databaseService.getMonitoringClient();

        const createData: any = {
            siteId: data.siteId,
            siteName: data.siteName ?? null,
            downSeconds: data.downSeconds ?? null,
        };
        if (data.downSince !== undefined && data.downSince !== null) {
            createData.downSince = data.downSince;
        } else {
            createData.downSince = null;
        }

        const updateData: any = {};
        if (data.siteName !== undefined) updateData.siteName = data.siteName;
        if (data.downSince !== undefined) updateData.downSince = data.downSince;
        if (data.downSeconds !== undefined) updateData.downSeconds = data.downSeconds;

        const record = await prisma.siteDowntime.upsert({
            where: { siteId: data.siteId },
            update: updateData,
            create: createData,
        });

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            downSince: record.downSince?.toISOString() ?? null,
            downSeconds: record.downSeconds,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Update site downtime
     */
    async update(siteId: string, data: Partial<SiteDownTypes.SiteDowntimeInput>): Promise<SiteDownTypes.SiteDowntimeResponse> {
        const prisma = databaseService.getMonitoringClient();

        const updateData: any = {};
        if (data.siteName !== undefined) updateData.siteName = data.siteName;
        if (data.downSince !== undefined) updateData.downSince = data.downSince;
        if (data.downSeconds !== undefined) updateData.downSeconds = data.downSeconds;

        const record = await prisma.siteDowntime.update({
            where: { siteId },
            data: updateData,
        });

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            downSince: record.downSince?.toISOString() ?? null,
            downSeconds: record.downSeconds,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Delete site downtime
     */
    async delete(siteId: string): Promise<void> {
        const prisma = databaseService.getMonitoringClient();
        await prisma.siteDowntime.delete({
            where: { siteId },
        });
    }


    async syncFromNms(): Promise<{ inserted: number; updated: number; errors: number; skipped: number; deleted: number }> {
        let inserted = 0;
        let updated = 0;
        let errors = 0;
        let skipped = 0;
        let deleted = 0;

        try {
            siteDownLogger.info("Starting sync from NMS API");
            
            // Step 1: Fetch data from NMS API
            const nmsData = (await nmsApiService.fetchSiteData("down")) as SiteDownTypes.NmsSiteDownItem[];
            siteDownLogger.info({ totalFromNms: nmsData.length }, "Fetched data from NMS API");

            // Track all successfully processed siteIds from API
            const processedSiteIds = new Set<string>();

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
                        siteDownLogger.debug(
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

                    const data: SiteDownTypes.SiteDowntimeInput = {
                        siteId: mappedSiteId, // Use mapped siteId from sites-service
                        siteName: item.name,
                        downSince: item.down_since ? new Date(item.down_since) : null,
                        downSeconds: item.down_seconds ?? null,
                    };

                    await this.upsert(data);
                    processedSiteIds.add(mappedSiteId); // Track successfully processed siteId

                    if (existing) {
                        updated++;
                        siteDownLogger.debug(
                            { siteId: mappedSiteId, nmsSiteId: item.site_id_name },
                            "Updated site downtime"
                        );
                    } else {
                        inserted++;
                        siteDownLogger.debug(
                            { siteId: mappedSiteId, nmsSiteId: item.site_id_name },
                            "Inserted new site downtime"
                        );
                    }

                    // Log if mapping was applied (different from original)
                    if (mappedSiteId !== item.site_id_name) {
                        siteDownLogger.debug(
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
                    siteDownLogger.error(
                        { 
                            error, 
                            nmsSiteId: item.site_id_name, 
                            nmsTerminalId: item.terminal_id,
                            siteName: item.name 
                        },
                        "Failed to upsert site downtime"
                    );
                }
            }

            // Step 6: Delete records that are no longer in API (site is up again)
            // Only delete if we have successfully processed at least one site from API
            if (processedSiteIds.size > 0) {
                const prisma = databaseService.getMonitoringClient();
                const deleteResult = await prisma.siteDowntime.deleteMany({
                    where: {
                        siteId: {
                            notIn: Array.from(processedSiteIds),
                        },
                    },
                });
                deleted = deleteResult.count;

                if (deleted > 0) {
                    siteDownLogger.info(
                        { deleted, processedSiteIds: processedSiteIds.size },
                        "Deleted site downtime records that are no longer in API (sites are up again)"
                    );
                }
            } else {
                siteDownLogger.warn(
                    "No sites were successfully processed from API, skipping deletion of old records"
                );
            }

            siteDownLogger.info(
                { 
                    inserted, 
                    updated, 
                    errors, 
                    skipped,
                    deleted,
                    total: nmsData.length,
                    processed: inserted + updated 
                },
                "Sync from NMS completed"
            );
            return { inserted, updated, errors, skipped, deleted };
        } catch (error) {
            siteDownLogger.error({ error }, "Failed to sync from NMS");
            throw error;
        }
    }
}

// Export singleton instance
export const siteDownService = new SiteDownService();

