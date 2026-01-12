import dayjs from "dayjs";
import { databaseService } from "./database.service";
import { nmsApiService } from "./nms-api.service";
import { sitesService } from "./sites.service";
import { siteDownLogger } from "../utils/logger";
import type * as SiteDownTypes from "../types/site-down.types";
import type { PaginatedResponse } from "../types/common.types";

export class SiteDownService {
    /**
     * Get all site downtime data with pagination
     */
    async getAll(params: SiteDownTypes.SiteDowntimeQueryParams): Promise<PaginatedResponse<SiteDownTypes.SiteDowntimeResponse>> {
        const prisma = databaseService.getSiteDownClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (params.siteId) {
            where.siteId = params.siteId;
        }

        const [data, total] = await Promise.all([
            prisma.siteDowntime.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    downSeconds: "desc", // Sort by longest downtime first
                },
            }),
            prisma.siteDowntime.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map((record) => ({
                id: record.id,
                siteId: record.siteId,
                siteName: record.siteName,
                downSince: record.downSince.toISOString(),
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
        };
    }

    /**
     * Get site downtime by siteId
     */
    async getBySiteId(siteId: string): Promise<SiteDownTypes.SiteDowntimeResponse | null> {
        const prisma = databaseService.getSiteDownClient();

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
            downSince: record.downSince.toISOString(),
            downSeconds: record.downSeconds,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Create or update site downtime (upsert)
     */
    async upsert(data: SiteDownTypes.SiteDowntimeInput): Promise<SiteDownTypes.SiteDowntimeResponse> {
        const prisma = databaseService.getSiteDownClient();

        const record = await prisma.siteDowntime.upsert({
            where: { siteId: data.siteId },
            update: {
                siteName: data.siteName ?? undefined,
                downSince: data.downSince,
                downSeconds: data.downSeconds ?? undefined,
            },
            create: {
                siteId: data.siteId,
                siteName: data.siteName ?? null,
                downSince: data.downSince,
                downSeconds: data.downSeconds ?? null,
            },
        });

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            downSince: record.downSince.toISOString(),
            downSeconds: record.downSeconds,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Update site downtime
     */
    async update(siteId: string, data: Partial<SiteDownTypes.SiteDowntimeInput>): Promise<SiteDownTypes.SiteDowntimeResponse> {
        const prisma = databaseService.getSiteDownClient();

        const updateData: any = {};
        if (data.siteName !== undefined) updateData.siteName = data.siteName;
        if (data.downSince) updateData.downSince = data.downSince;
        if (data.downSeconds !== undefined) updateData.downSeconds = data.downSeconds;

        const record = await prisma.siteDowntime.update({
            where: { siteId },
            data: updateData,
        });

        return {
            id: record.id,
            siteId: record.siteId,
            siteName: record.siteName,
            downSince: record.downSince.toISOString(),
            downSeconds: record.downSeconds,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    /**
     * Delete site downtime
     */
    async delete(siteId: string): Promise<void> {
        const prisma = databaseService.getSiteDownClient();
        await prisma.siteDowntime.delete({
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
            siteDownLogger.info("Starting sync from NMS API");
            
            // Step 1: Fetch data from NMS API
            const nmsData = await nmsApiService.fetchSiteDownData();
            siteDownLogger.info({ totalFromNms: nmsData.length }, "Fetched data from NMS API");

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
                        downSince: new Date(item.down_since),
                        downSeconds: item.down_seconds,
                    };

                    await this.upsert(data);

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

            siteDownLogger.info(
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
            siteDownLogger.error({ error }, "Failed to sync from NMS");
            throw error;
        }
    }
}

// Export singleton instance
export const siteDownService = new SiteDownService();

