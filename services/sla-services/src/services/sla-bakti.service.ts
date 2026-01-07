import dayjs from "dayjs";
import { databaseService } from "./database.service";
import { sitesService } from "./sites.service";
import { cacheService, CacheService } from "./cache.service";
import { slaLogger } from "../utils/logger";
import { parseSlaBaktiExcel, ParsedSlaBaktiRow } from "../utils/excel.util";
import type * as SlaBaktiTypes from "../types/sla-bakti.types";

import type { PaginatedResponse } from "../types/common.types";

export class SlaBaktiService {
    /**
     * Calculate SLA status based on SLA value
     * Rules:
     * - sla = 0 : Very Bad
     * - sla > 95.5 : Meet SLA
     * - 75 <= sla <= 95.5 : Fair
     * - 70 <= sla < 75 : Poor
     * - 0 < sla < 70 : Bad
     */
    private calculateSlaStatus(sla: number): "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor" {
        if (sla === 0) {
            return "Very Bad";
        } else if (sla > 95.5) {
            return "Meet SLA";
        } else if (sla >= 75) {
            return "Fair";
        } else if (sla >= 70) {
            return "Poor";
        } else {
            return "Bad";
        }
    }
    /**
     * Parse uploaded Excel file and return preview data
     * Filter siteId berdasarkan valid sites dari sites service
     * Returns preview (without validData for performance) and validDataForSave separately
     */
    async uploadPreview(fileBuffer: Buffer): Promise<{
        preview: SlaBaktiTypes.UploadPreviewResponse;
        validDataForSave: SlaBaktiTypes.SlaBaktiInput[];
    }> {
        const prisma = databaseService.getSlaClient();

        // Parse Excel file
        const parseResult = await parseSlaBaktiExcel(fileBuffer);
        slaLogger.info({ parsed: parseResult.data.length, errors: parseResult.errors.length }, "Excel parsed");

        // Get valid siteIds from sites service
        let validSiteIds: Set<string>;
        try {
            validSiteIds = await sitesService.getValidSiteIdsCached();
            slaLogger.info({ totalValidSites: validSiteIds.size }, "Fetched valid siteIds");
        } catch (error) {
            slaLogger.error({ error }, "Failed to fetch valid siteIds, proceeding without siteId validation");
            // Jika gagal fetch, lanjutkan tanpa filter (atau bisa throw error jika diperlukan)
            // Untuk sekarang, kita lanjutkan tanpa filter
            validSiteIds = new Set();
        }

        // Check for duplicates in database and filter by valid siteIds
        const validData: ParsedSlaBaktiRow[] = [];
        const duplicates: Array<{ date: string; siteId: string; siteName: string }> = [];
        const invalidSiteIds: Array<{ date: string; siteId: string; siteName: string; message: string }> = [];

        // First, filter by valid siteIds
        const rowsWithValidSiteId = parseResult.data.filter((row) => {
            if (validSiteIds.size > 0 && !validSiteIds.has(row.siteId)) {
                invalidSiteIds.push({
                    date: dayjs(row.date).format("YYYY-MM-DD"),
                    siteId: row.siteId,
                    siteName: row.siteName,
                    message: `SiteId '${row.siteId}' tidak ditemukan atau tidak aktif di sites service`,
                });
                return false;
            }
            return true;
        });

        // Batch check for duplicates (much more efficient than checking one by one)
        if (rowsWithValidSiteId.length > 0) {
            // Prepare all siteId + date pairs for batch check
            const dateSitePairs = rowsWithValidSiteId.map((row) => ({
                siteId: row.siteId,
                date: row.date,
            }));

            // Get all existing records in one query (based on siteId + date combination)
            // This ensures that same siteId with different dates are treated as different records
            const existingRecords = await prisma.slaBakti.findMany({
                where: {
                    OR: dateSitePairs.map((pair) => ({
                        siteId: pair.siteId,
                        date: pair.date,
                    })),
                },
                select: {
                    siteId: true,
                    date: true,
                },
            });

            // Create a Set for fast lookup
            const existingSet = new Set(
                existingRecords.map((r) => `${r.siteId}-${dayjs(r.date).format("YYYY-MM-DD")}`)
            );

            slaLogger.info(
                {
                    totalRows: rowsWithValidSiteId.length,
                    existingCount: existingRecords.length,
                    uniqueDates: Array.from(new Set(rowsWithValidSiteId.map((r) => dayjs(r.date).format("YYYY-MM-DD")))).length,
                },
                "Checking duplicates in uploadPreview"
            );

            // Filter duplicates and valid data
            for (const row of rowsWithValidSiteId) {
                const key = `${row.siteId}-${dayjs(row.date).format("YYYY-MM-DD")}`;
                if (existingSet.has(key)) {
                    duplicates.push({
                        date: dayjs(row.date).format("YYYY-MM-DD"),
                        siteId: row.siteId,
                        siteName: row.siteName,
                    });
                } else {
                    validData.push(row);
                }
            }

            slaLogger.info(
                {
                    valid: validData.length,
                    duplicates: duplicates.length,
                    dates: Array.from(new Set(validData.map((r) => dayjs(r.date).format("YYYY-MM-DD")))).sort(),
                },
                "UploadPreview duplicate check completed"
            );
        }

        // Prepare validDataForSave
        const validDataForSave: SlaBaktiTypes.SlaBaktiInput[] = validData.map((row) => ({
            date: new Date(row.date),
            siteId: row.siteId,
            prCode: row.prCode,
            sla: row.sla,
            powerUptime: row.powerUptime,
            powerDowntime: row.powerDowntime,
            statusSla: row.statusSla,
        }));

        return {
            preview: {
                summary: {
                    total: parseResult.data.length + parseResult.errors.length,
                    valid: validData.length,
                    duplicate: duplicates.length,
                    invalid: parseResult.errors.length,
                    invalidSiteId: invalidSiteIds.length,
                },
                validData: [], // Will be populated after save with date and inserted count
                duplicates,
                errors: parseResult.errors,
            },
            validDataForSave,
        };
    }

    /**
     * Confirm and save data to database
     * Returns inserted count per date for summary
     */
    async confirmSave(data: SlaBaktiTypes.SlaBaktiInput[]): Promise<SlaBaktiTypes.ConfirmSaveResponse & { validData: Array<{ date: string; inserted: number }> }> {
        const prisma = databaseService.getSlaClient();
        let inserted = 0;
        let skipped = 0;

        if (data.length === 0) {
            return { inserted: 0, skipped: 0, validData: [] };
        }

        // Track inserted count per date
        const insertedByDate = new Map<string, number>();

        // Use transaction with increased timeout for large batches
        // Timeout: 30 seconds (30000ms) - enough for large file uploads
        // Calculate timeout based on data size: 30s base + 1s per 100 records
        const timeoutMs = Math.max(30000, 30000 + Math.ceil(data.length / 100) * 1000);
        
        await prisma.$transaction(
            async (tx) => {
                // Batch check for duplicates first (more efficient than checking one by one)
                const dateSitePairs = data.map((row) => ({
                    siteId: row.siteId,
                    date: new Date(row.date),
                }));

                // Get all existing records in one query
                const existingRecords = await tx.slaBakti.findMany({
                    where: {
                        OR: dateSitePairs.map((pair) => ({
                            siteId: pair.siteId,
                            date: pair.date,
                        })),
                    },
                    select: {
                        siteId: true,
                        date: true,
                    },
                });

                // Create a Set for fast lookup
                const existingSet = new Set(
                    existingRecords.map((r) => `${r.siteId}-${dayjs(r.date).format("YYYY-MM-DD")}`)
                );

                // Filter out duplicates and prepare data for batch insert
                const dataToInsert = data.filter((row) => {
                    const key = `${row.siteId}-${dayjs(row.date).format("YYYY-MM-DD")}`;
                    if (existingSet.has(key)) {
                        skipped++;
                        return false;
                    }
                    return true;
                });

                // Batch insert using createMany (much faster than individual creates)
                if (dataToInsert.length > 0) {
                    // Process in chunks of 1000 to avoid query size limits
                    const chunkSize = 1000;
                    for (let i = 0; i < dataToInsert.length; i += chunkSize) {
                        const chunk = dataToInsert.slice(i, i + chunkSize);
                        try {
                            // Use createMany with skipDuplicates for safety (handles race conditions)
                            // We already filtered duplicates above, so most should insert successfully
                            await tx.slaBakti.createMany({
                                data: chunk.map((row) => ({
                                    date: new Date(row.date),
                                    siteId: row.siteId,
                                    prCode: row.prCode,
                                    sla: row.sla,
                                    powerUptime: row.powerUptime,
                                    powerDowntime: row.powerDowntime,
                                    statusSla: row.statusSla,
                                })),
                                skipDuplicates: true, // Safety: skip if duplicate exists (race condition)
                            });
                            
                            // Count inserted per date
                            // Since we already filtered duplicates, we count all in chunk as inserted
                            // If there are race conditions, skipDuplicates handles them silently
                            for (const row of chunk) {
                                const dateKey = dayjs(row.date).format("YYYY-MM-DD");
                                insertedByDate.set(dateKey, (insertedByDate.get(dateKey) || 0) + 1);
                                inserted++;
                            }
                        } catch (error) {
                            slaLogger.error({ error, chunkSize: chunk.length, offset: i }, "Failed to insert chunk");
                            // If createMany fails, try individual inserts for this chunk
                            for (const row of chunk) {
                                try {
                                    await tx.slaBakti.create({
                                        data: {
                                            date: new Date(row.date),
                                            siteId: row.siteId,
                                            prCode: row.prCode,
                                            sla: row.sla,
                                            powerUptime: row.powerUptime,
                                            powerDowntime: row.powerDowntime,
                                            statusSla: row.statusSla,
                                        },
                                    });
                                    const dateKey = dayjs(row.date).format("YYYY-MM-DD");
                                    insertedByDate.set(dateKey, (insertedByDate.get(dateKey) || 0) + 1);
                                    inserted++;
                                } catch (err: any) {
                                    // Check if error is due to duplicate (unique constraint)
                                    if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
                                        skipped++;
                                        slaLogger.debug({ row }, "Row skipped (duplicate)");
                                    } else {
                                        slaLogger.error({ error: err, row }, "Failed to insert row");
                                        skipped++;
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                timeout: timeoutMs, // Dynamic timeout based on data size
            }
        );

        slaLogger.info({ inserted, skipped, total: data.length }, "SLA Bakti data saved");

        // Convert insertedByDate map to array format
        const validData = Array.from(insertedByDate.entries())
            .map(([date, inserted]) => ({ date, inserted }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Invalidate cache for uploaded dates
        if (validData.length > 0) {
            const dates = validData.map((d) => d.date);
            const minDate = dates.reduce((a, b) => (a < b ? a : b));
            const maxDate = dates.reduce((a, b) => (a > b ? a : b));
            
            try {
                await cacheService.invalidateByDateRange(minDate, maxDate);
                slaLogger.info({ dates: [minDate, maxDate] }, "Cache invalidated for uploaded dates");
            } catch (error) {
                slaLogger.warn({ error }, "Failed to invalidate cache, but data saved successfully");
            }
        }

        return { inserted, skipped, validData };
    }

    /**
     * Get all SLA Bakti data with filters and pagination
     */
    async getAll(params: {
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<SlaBaktiTypes.SlaBaktiResponse>> {
        const prisma = databaseService.getSlaClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (params.startDate && params.endDate) {
            where.date = {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate),
            };
        } else if (params.startDate) {
            where.date = { gte: new Date(params.startDate) };
        } else if (params.endDate) {
            where.date = { lte: new Date(params.endDate) };
        }

        const [data, total] = await Promise.all([
            prisma.slaBakti.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ date: "asc" }],
            }),
            prisma.slaBakti.count({ where }),
        ]);

        return {
            data: data.map(this.formatResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get SLA Bakti data by Site ID with filters and pagination
     */
    async getBySiteId(
        siteId: string,
        params: {
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<SlaBaktiTypes.SlaBaktiResponse>> {
        const prisma = databaseService.getSlaClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = { siteId };
        if (params.startDate && params.endDate) {
            where.date = {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate),
            };
        } else if (params.startDate) {
            where.date = { gte: new Date(params.startDate) };
        } else if (params.endDate) {
            where.date = { lte: new Date(params.endDate) };
        }

        const [data, total] = await Promise.all([
            prisma.slaBakti.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: "desc" },
            }),
            prisma.slaBakti.count({ where }),
        ]);

        return {
            data: data.map(this.formatResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Delete by date range
     */
    async deleteByDateRange(startDate: string, endDate: string): Promise<{ deleted: number }> {
        const prisma = databaseService.getSlaClient();

        const result = await prisma.slaBakti.deleteMany({
            where: {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });

        slaLogger.info({ startDate, endDate, deleted: result.count }, "SLA Bakti data deleted by date range");

        return { deleted: result.count };
    }

    /**
     * Delete by Site ID (optionally with date range)
     */
    async deleteBySiteId(
        siteId: string,
        params?: { startDate?: string; endDate?: string }
    ): Promise<{ deleted: number }> {
        const prisma = databaseService.getSlaClient();

        const where: any = { siteId };
        if (params?.startDate && params?.endDate) {
            where.date = {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate),
            };
        }

        const result = await prisma.slaBakti.deleteMany({ where });

        slaLogger.info({ siteId, ...params, deleted: result.count }, "SLA Bakti data deleted by site ID");

        return { deleted: result.count };
    }

    /**
     * Format database record to response format
     */
    private formatResponse(record: any): SlaBaktiTypes.SlaBaktiResponse {
        return {
            id: record.id,
            date: dayjs(record.date).format("YYYY-MM-DD"),
            siteId: record.siteId,
            prCode: record.prCode,
            sla: record.sla,
            powerUptime: record.powerUptime,
            powerDowntime: record.powerDowntime,
            statusSla: record.statusSla,
            createdAt: dayjs(record.createdAt).toISOString(),
            updatedAt: dayjs(record.updatedAt).toISOString(),
        };
    }

    /**
     * Create SLA Report with problems
     * If report already exists for this siteId + date, add problems to existing report
     * Otherwise, create new report
     */
    async createSlaReport(data: SlaBaktiTypes.SlaReportInput): Promise<SlaBaktiTypes.SlaReportResponse> {
        const prisma = databaseService.getSlaClient();
        
        // Check if report already exists
        const existingReport = await (prisma.slaReport.findFirst as any)({
            where: {
                siteId: data.siteId,
                date: new Date(data.date),
            },
            include: {
                problems: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        let result: any;

        if (existingReport) {
            // Report exists: add new problems to existing report
            if (data.problems && data.problems.length > 0) {
                await (prisma as any).slaReportProblem.createMany({
                    data: data.problems.map((p) => ({
                        reportId: existingReport.id,
                        pic: p.pic ?? null,
                        problem: p.problem ?? null,
                        notes: p.notes ?? null,
                    })),
                    skipDuplicates: true,
                });
            }

            // Update prCode if provided
            if (data.prCode !== undefined) {
                await prisma.slaReport.update({
                    where: { id: existingReport.id },
                    data: { prCode: data.prCode ?? null },
                });
            }

            // Fetch updated report with all problems
            result = await (prisma.slaReport.findUnique as any)({
                where: { id: existingReport.id },
                include: {
                    problems: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            });
        } else {
            // Report doesn't exist: create new report with problems
            result = await (prisma.slaReport.create as any)({
                data: {
                    date: new Date(data.date),
                    siteId: data.siteId,
                    prCode: data.prCode ?? null,
                    problems: {
                        create: (data.problems || []).map((p) => ({
                            pic: p.pic ?? null,
                            problem: p.problem ?? null,
                            notes: p.notes ?? null,
                        })),
                    },
                },
                include: {
                    problems: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            });
        }

        const formattedResult = this.formatSlaReportResponse(result);

        // Invalidate cache for the report date
        try {
            const reportDate = dayjs(data.date).format("YYYY-MM-DD");
            await cacheService.invalidateByDateRange(reportDate, reportDate);
            slaLogger.debug({ date: reportDate }, "Cache invalidated for SLA report creation");
        } catch (error) {
            slaLogger.warn({ error }, "Failed to invalidate cache after creating SLA report");
        }

        return formattedResult;
    }

    /**
     * Get SLA Reports with filters
     */
    async getSlaReports(params: SlaBaktiTypes.SlaReportQueryParams): Promise<PaginatedResponse<SlaBaktiTypes.SlaReportResponse>> {
        const prisma = databaseService.getSlaClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (params.startDate && params.endDate) {
            where.date = {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate),
            };
        } else if (params.startDate) {
            where.date = { gte: new Date(params.startDate) };
        } else if (params.endDate) {
            where.date = { lte: new Date(params.endDate) };
        }

        if (params.siteId) {
            where.siteId = params.siteId;
        }

        if (params.prCode) {
            where.prCode = params.prCode;
        }

        // Filter by PIC in problems (if provided)
        if (params.pic) {
            where.problems = {
                some: {
                    pic: params.pic,
                },
            };
        }

        const [data, total] = await Promise.all([
            (prisma.slaReport.findMany as any)({
                where,
                skip,
                take: limit,
                include: {
                    problems: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            }),
            prisma.slaReport.count({ where }),
        ]);

        return {
            data: data.map((record: any) => this.formatSlaReportResponse(record)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Update SLA Report by ID
     */
    async updateSlaReport(id: number, data: SlaBaktiTypes.SlaReportUpdateInput): Promise<SlaBaktiTypes.SlaReportResponse> {
        const prisma = databaseService.getSlaClient();
        
        // Build update data object
        const updateData: any = {};
        
        if (data.date !== undefined) {
            updateData.date = new Date(data.date);
        }
        if (data.siteId !== undefined) {
            updateData.siteId = data.siteId;
        }
        if (data.prCode !== undefined) {
            updateData.prCode = data.prCode ?? null;
        }

        // Handle problems update: delete all existing and create new ones
        if (data.problems !== undefined) {
            // Delete all existing problems
            await (prisma as any).slaReportProblem.deleteMany({
                where: { reportId: id },
            });
            // Create new problems
            updateData.problems = {
                create: data.problems.map((p) => ({
                    pic: p.pic ?? null,
                    problem: p.problem ?? null,
                    notes: p.notes ?? null,
                })),
            };
        }

        // Get existing report to know the date before update
        const existingReport = await (prisma.slaReport.findUnique as any)({
            where: { id },
            select: { date: true },
        });

        const result = await (prisma.slaReport.update as any)({
            where: { id },
            data: updateData,
            include: {
                problems: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        const formattedResult = this.formatSlaReportResponse(result);

        // Invalidate cache for the report date(s)
        try {
            const datesToInvalidate = new Set<string>();
            
            // Add original date
            if (existingReport?.date) {
                datesToInvalidate.add(dayjs(existingReport.date).format("YYYY-MM-DD"));
            }
            
            // Add new date if changed
            if (data.date) {
                datesToInvalidate.add(dayjs(data.date).format("YYYY-MM-DD"));
            } else if (result.date) {
                datesToInvalidate.add(dayjs(result.date).format("YYYY-MM-DD"));
            }

            for (const date of datesToInvalidate) {
                await cacheService.invalidateByDateRange(date, date);
            }
            
            slaLogger.debug({ dates: Array.from(datesToInvalidate) }, "Cache invalidated for SLA report update");
        } catch (error) {
            slaLogger.warn({ error }, "Failed to invalidate cache after updating SLA report");
        }

        return formattedResult;
    }

    /**
     * Delete SLA Problem by ID
     */
    async deleteSlaReport(id: number): Promise<{ deleted: number }> {
        const prisma = databaseService.getSlaClient();
        const result = await (prisma as any).slaReportProblem.delete({ where: { id } });
        return { deleted: result.count };
    }

    /**
     * Format SLA Report database record to response format
     */
    private formatSlaReportResponse(record: any): SlaBaktiTypes.SlaReportResponse {
        return {
            id: record.id,
            date: dayjs(record.date).format("YYYY-MM-DD"),
            siteId: record.siteId,
            prCode: record.prCode,
            problems: (record.problems || []).map((p: any) => ({
                id: p.id,
                reportId: p.reportId,
                pic: p.pic,
                problem: p.problem,
                notes: p.notes,
                createdAt: dayjs(p.createdAt).toISOString(),
                updatedAt: dayjs(p.updatedAt).toISOString(),
            })),
            createdAt: dayjs(record.createdAt).toISOString(),
            updatedAt: dayjs(record.updatedAt).toISOString(),
        };
    }

    /**
     * Get daily SLA chart data for all sites
     */
    async getDailyChart(params: SlaBaktiTypes.SlaChartDailyParams): Promise<SlaBaktiTypes.SlaChartDailyResponse> {
        const cacheKey = CacheService.getDailyChartKey(params.startDate, params.endDate);
        const ttl = CacheService.calculateTTL(params.startDate, params.endDate);

        return cacheService.get(
            cacheKey,
            async () => {
                const prisma = databaseService.getSlaClient();

                const startDate = new Date(params.startDate);
                const endDate = new Date(params.endDate);

                // Get all SLA data in date range
                const data = await prisma.slaBakti.findMany({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: {
                        date: true,
                        sla: true,
                    },
                    orderBy: {
                        date: "asc",
                    },
                });

                // Group by date and calculate average
                const dailyMap = new Map<string, { total: number; count: number }>();

                for (const record of data) {
                    if (record.sla !== null) {
                        const dateStr = dayjs(record.date).format("YYYY-MM-DD");
                        const existing = dailyMap.get(dateStr) || { total: 0, count: 0 };
                        dailyMap.set(dateStr, {
                            total: existing.total + record.sla,
                            count: existing.count + 1,
                        });
                    }
                }

                // Convert to array format
                const result = Array.from(dailyMap.entries())
                    .map(([date, { total, count }]) => ({
                        date,
                        value: count > 0 ? Number(Math.round(total / count)) : 0,
                    }))
                    .sort((a, b) => a.date.localeCompare(b.date));

                return { data: result };
            },
            ttl
        );
    }

    /**
     * Get daily SLA chart data filtered by battery version
     */
    async getDailyChartByBatteryVersion(params: SlaBaktiTypes.SlaChartBatteryVersionParams): Promise<SlaBaktiTypes.SlaChartDailyResponse> {
        const cacheKey = CacheService.getDailyChartBatteryKey(
            params.startDate,
            params.endDate,
            params.batteryVersion
        );
        const ttl = CacheService.calculateTTL(params.startDate, params.endDate);

        return cacheService.get(
            cacheKey,
            async () => {
                const prisma = databaseService.getSlaClient();

                // Get site IDs for this battery version
                slaLogger.debug({ batteryVersion: params.batteryVersion }, "Fetching siteIds by battery version for daily chart");
                const siteIds = await sitesService.getSiteIdsByBatteryVersion(params.batteryVersion);
                const siteIdsArray = Array.from(siteIds);

                slaLogger.debug({ 
                    batteryVersion: params.batteryVersion,
                    siteIdsCount: siteIdsArray.length,
                    siteIdsSample: siteIdsArray.slice(0, 5)
                }, "SiteIds fetched for battery version in daily chart");

                if (siteIdsArray.length === 0) {
                    slaLogger.warn({ batteryVersion: params.batteryVersion }, "No siteIds found for battery version in daily chart");
                    return { data: [] };
                }

                const startDate = new Date(params.startDate);
                const endDate = new Date(params.endDate);

                // Get SLA data filtered by site IDs
                const data = await prisma.slaBakti.findMany({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                        siteId: {
                            in: siteIdsArray,
                        },
                    },
                    select: {
                        date: true,
                        sla: true,
                    },
                    orderBy: {
                        date: "asc",
                    },
                });

                // Group by date and calculate average
                const dailyMap = new Map<string, { total: number; count: number }>();

                for (const record of data) {
                    if (record.sla !== null) {
                        const dateStr = dayjs(record.date).format("YYYY-MM-DD");
                        const existing = dailyMap.get(dateStr) || { total: 0, count: 0 };
                        dailyMap.set(dateStr, {
                            total: existing.total + record.sla,
                            count: existing.count + 1,
                        });
                    }
                }

                // Convert to array format
                const result = Array.from(dailyMap.entries())
                    .map(([date, { total, count }]) => ({
                        date,
                        value: count > 0 ? Number(Math.round(total / count)) : 0,
                    }))
                    .sort((a, b) => a.date.localeCompare(b.date));

                return { data: result };
            },
            ttl
        );
    }

    /**
     * Get weekly SLA chart data
     */
    async getWeeklyChart(params: SlaBaktiTypes.SlaChartDailyParams): Promise<SlaBaktiTypes.SlaChartWeeklyResponse> {
        const cacheKey = CacheService.getWeeklyChartKey(params.startDate, params.endDate);
        const ttl = CacheService.calculateTTL(params.startDate, params.endDate);

        return cacheService.get(
            cacheKey,
            async () => {
                const prisma = databaseService.getSlaClient();

                const startDate = new Date(params.startDate);
                const endDate = new Date(params.endDate);

                // Get all SLA data in date range
                const data = await prisma.slaBakti.findMany({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: {
                        date: true,
                        sla: true,
                    },
                    orderBy: {
                        date: "asc",
                    },
                });

                // Group by week - always 4 weeks per month
                // Week 1 = days 0-6 (7 days), Week 2 = days 7-13 (7 days), Week 3 = days 14-20 (7 days), Week 4 = days 21+ (remaining days)
                const weekMap = new Map<number, { total: number; count: number }>();
                const startDateDayjs = dayjs(startDate);

                for (const record of data) {
                    if (record.sla !== null) {
                        const date = dayjs(record.date);
                        const daysDiff = date.diff(startDateDayjs, "day");
                        
                        // Calculate week number: first 3 weeks have 7 days each, week 4 gets all remaining days
                        let weekNumber: number;
                        if (daysDiff < 21) {
                            // Week 1-3: each has 7 days
                            weekNumber = Math.floor(daysDiff / 7) + 1;
                        } else {
                            // Week 4: all remaining days (day 21+)
                            weekNumber = 4;
                        }

                        const existing = weekMap.get(weekNumber) || { total: 0, count: 0 };
                        weekMap.set(weekNumber, {
                            total: existing.total + record.sla,
                            count: existing.count + 1,
                        });
                    }
                }

                // Convert to array format with week names, only include weeks that have data
                const weeks = Array.from(weekMap.entries())
                    .map(([weekNumber, { total, count }]) => ({
                        name: `minggu ke-${weekNumber}`,
                        value: count > 0 ? Number((total / count).toFixed(1)) : 0,
                        weekNumber,
                    }))
                    .sort((a, b) => a.weekNumber - b.weekNumber);

                return {
                    data: weeks.map(({ name, value }) => ({ name, value })),
                };
            },
            ttl
        );
    }

    /**
     * Calculate downtime string from power downtime in hours
     */
    /**
     * Get date range for problem data
     * Rules:
     * - Normal (tanggal 2+): startDate = tanggal 1 bulan sekarang, endDate = akhir bulan sekarang
     * - Edge case (tanggal 1): startDate = tanggal 1 bulan sebelumnya, endDate = akhir bulan sebelumnya
     */
    private getProblemDateRange(endDate: Date): { startDate: Date; endDate: Date } {
        const end = dayjs(endDate);
        const today = dayjs();
        
        // Determine target month
        let targetMonth = end;
        
        // If endDate is the 1st of current month, use previous month
        if (end.date() === 1 && today.isSame(end, 'month')) {
            targetMonth = end.subtract(1, 'month');
        }
        
        const startDate = targetMonth.startOf('month').toDate();
        const problemEndDate = targetMonth.endOf('month').toDate();
        
        return { startDate, endDate: problemEndDate };
    }

    private calculateDowntime(powerDowntime: number): string {
        if (powerDowntime === 0) return "";

        const days = Math.floor(powerDowntime / 24);
        const hours = Math.floor(powerDowntime % 24);
        const minutes = Math.floor((powerDowntime % 1) * 60);

        if (days >= 4) {
            return "Lebih Dari 4 Hari";
        } else if (days > 0) {
            return `${days} Hari`;
        } else if (hours > 0) {
            return `${hours} jam ${minutes} menit`;
        } else {
            return `${minutes} menit`;
        }
    }

    /**
     * Get daily detail report (for WhatsApp)
     * Compare 2 consecutive days
     */
    async getDailyDetailReport(params: SlaBaktiTypes.SlaDetailDailyParams): Promise<SlaBaktiTypes.SlaDailyDetailResponse> {
        const cacheKey = CacheService.getDailyDetailKey(params.startDate, params.endDate);
        const ttl = CacheService.calculateTTL(params.startDate, params.endDate);

        return cacheService.get(
            cacheKey,
            async () => {
                const prisma = databaseService.getSlaClient();
                const startDate = new Date(params.startDate);
                const endDate = new Date(params.endDate);

        // Validate: endDate - startDate must be 1 day
        const daysDiff = Math.abs(dayjs(endDate).diff(dayjs(startDate), "day"));
        if (daysDiff !== 1) {
            throw new Error("Daily detail report requires exactly 1 day difference between startDate and endDate");
        }

        // Get SLA data for both dates
        const [dataNow, dataBefore] = await Promise.all([
            prisma.slaBakti.findMany({
                where: {
                    date: endDate,
                },
            }),
            prisma.slaBakti.findMany({
                where: {
                    date: startDate,
                },
            }),
        ]);

        // Get reports for problem and downtime info
        const reports = await prisma.slaReport.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                problems: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1, // Get latest problem
                },
            },
        });

        // Get problem reports with monthly range (tanggal 1 sampai akhir bulan)
        // Calculate problem date range: startDate = tanggal 1, endDate = akhir bulan
        const problemDateRange = this.getProblemDateRange(endDate);
        const problemReports = await prisma.slaReport.findMany({
            where: {
                date: {
                    gte: problemDateRange.startDate,
                    lte: problemDateRange.endDate,
                },
            },
            include: {
                problems: {
                    orderBy: {
                        createdAt: 'desc', // Get latest problem first
                    },
                    take: 1, // Only take the latest problem per report
                },
            },
            orderBy: {
                date: 'desc', // Sort by date descending to get latest first
            },
        });

        // Create map of latest problem per siteId
        // If a site has multiple problems in the month, take the latest one (by date and createdAt)
        const problemMap = new Map<string, string>();
        for (const report of problemReports) {
            if (report.problems && report.problems.length > 0 && !problemMap.has(report.siteId)) {
                // Only set if not already in map (since we sorted by date desc, first occurrence is latest)
                // Get the latest problem text
                const latestProblem = report.problems[0];
                if (latestProblem.problem) {
                    problemMap.set(report.siteId, latestProblem.problem);
                }
            }
        }

        // Get site names mapping from sites service
        let siteNameMap = new Map<string, string>();
        try {
            siteNameMap = await sitesService.getSiteIdToNameMapCached();
            // Fallback: if siteName not found, use siteId
            const allSiteIds = new Set<string>();
            dataNow.forEach((d) => {
                allSiteIds.add(d.siteId);
                if (!siteNameMap.has(d.siteId)) {
                    siteNameMap.set(d.siteId, d.siteId);
                }
            });
            dataBefore.forEach((d) => {
                allSiteIds.add(d.siteId);
                if (!siteNameMap.has(d.siteId)) {
                    siteNameMap.set(d.siteId, d.siteId);
                }
            });
        } catch (error) {
            slaLogger.error({ error }, "Failed to fetch site names, using siteId as fallback");
            // If failed, use siteId as siteName
            dataNow.forEach((d) => siteNameMap.set(d.siteId, d.siteId));
            dataBefore.forEach((d) => siteNameMap.set(d.siteId, d.siteId));
        }

        // Create report map by siteId and date
        const reportMap = new Map<string, any>();
        for (const report of reports) {
            const key = `${report.siteId}-${dayjs(report.date).format("YYYY-MM-DD")}`;
            reportMap.set(key, report);
        }

        // Calculate overall summary
        const totalSites = new Set(dataNow.map((d) => d.siteId)).size;
        const validSlaNow = dataNow.filter((d) => d.sla !== null && d.sla !== undefined);
        const slaNow =
            validSlaNow.length > 0 ? validSlaNow.reduce((sum, d) => sum + (d.sla || 0), 0) / validSlaNow.length : 0;

        const validSlaBefore = dataBefore.filter((d) => d.sla !== null && d.sla !== undefined);
        const slaBefore =
            validSlaBefore.length > 0
                ? validSlaBefore.reduce((sum, d) => sum + (d.sla || 0), 0) / validSlaBefore.length
                : 0;

        const slaDiff = slaNow - slaBefore;
        const summaryMessage = `Dear team, berikut SLA Sundaya (${totalSites} Site) pada tanggal ${params.endDate} Terdapat ${slaDiff >= 0 ? "kenaikan" : "penurunan"} sebesar ${Math.abs(slaDiff).toFixed(2)} % dari periode sebelumnya`;

        // Group by battery version
        const batteryVersions: ("talis5" | "mix" | "jspro")[] = ["talis5", "mix", "jspro"];
        const batteryVersionData: Record<string, any> = {};

        for (const version of batteryVersions) {
            try {
                const siteIds = await sitesService.getSiteIdsByBatteryVersion(version);
                const versionSiteIds = Array.from(siteIds);

                const versionDataNow = dataNow.filter((d) => versionSiteIds.includes(d.siteId));
                const versionDataBefore = dataBefore.filter((d) => versionSiteIds.includes(d.siteId));

                const versionSites = new Set(versionDataNow.map((d) => d.siteId));
                const validVersionSlaNow = versionDataNow.filter((d) => d.sla !== null && d.sla !== undefined);
                const versionAvgSlaNow =
                    validVersionSlaNow.length > 0
                        ? validVersionSlaNow.reduce((sum, d) => sum + (d.sla || 0), 0) / validVersionSlaNow.length
                        : 0;
                const validVersionSlaBefore = versionDataBefore.filter((d) => d.sla !== null && d.sla !== undefined);
                const versionAvgSlaBefore =
                    validVersionSlaBefore.length > 0
                        ? validVersionSlaBefore.reduce((sum, d) => sum + (d.sla || 0), 0) / validVersionSlaBefore.length
                        : 0;
                const versionSlaDiff = versionAvgSlaNow - versionAvgSlaBefore;

                const versionNames: Record<string, string> = {
                    talis5: "Talis5 Full",
                    mix: "Talis5 Mix",
                    jspro: "JSPro",
                };

                const versionMessage = `Sundaya ${versionNames[version]} (${versionSites.size} Site) pada tanggal ${dayjs(params.endDate).format("DD/MM/YYYY")} Terdapat ${versionSlaDiff >= 0 ? "kenaikan" : "penurunan"} sebesar ${Math.abs(versionSlaDiff).toFixed(2)} %`;

                // Categorize sites
                const downSla: any[] = [];
                const underSla: any[] = [];
                const dropSla: any[] = [];
                const upSla: any[] = [];

                for (const record of versionDataNow) {
                    const reportKey = `${record.siteId}-${params.endDate}`;
                    const report = reportMap.get(reportKey);
                    // Get problem from monthly range first (latest problem), fallback to report problem (1 day range)
                    const problemFromMonthlyRange = problemMap.get(record.siteId) || "";
                    // Get problem from report (1 day range) - from problems relation
                    const problemFromReport = report?.problems && report.problems.length > 0 
                        ? report.problems[0].problem || "" 
                        : "";
                    const problem = problemFromMonthlyRange || problemFromReport;
                    const downtime = this.calculateDowntime(record.powerDowntime || 0);
                    const siteName = siteNameMap.get(record.siteId) || record.siteId;

                    const prevRecord = versionDataBefore.find((d) => d.siteId === record.siteId);

                    if (record.sla === null || record.sla === 0) {
                        if (prevRecord && (prevRecord.sla === null || prevRecord.sla === 0)) {
                            downSla.push({
                                date: params.endDate,
                                sla: 0,
                                slaUnit: "%",
                                downtime,
                                problem,
                                site: siteName,
                                battery_version: version,
                            });
                        }
                    } else if (record.sla < 95) {
                        if (prevRecord && (prevRecord.sla === null || prevRecord.sla === 0 || prevRecord.sla < 95)) {
                            if (prevRecord.sla === null || prevRecord.sla === 0) {
                                downSla.push({
                                    date: params.endDate,
                                    sla: Number(record.sla.toFixed(2)),
                                    slaUnit: "%",
                                    downtime,
                                    problem,
                                    site: siteName,
                                    battery_version: version,
                                });
                            } else {
                                underSla.push({
                                    date: params.endDate,
                                    sla: Number(record.sla.toFixed(2)),
                                    slaUnit: "%",
                                    downtime,
                                    problem,
                                    site: siteName,
                                    battery_version: version,
                                });
                            }
                        } else {
                            underSla.push({
                                date: params.endDate,
                                sla: Number(record.sla.toFixed(2)),
                                slaUnit: "%",
                                downtime,
                                problem,
                                site: siteName,
                                battery_version: version,
                            });
                        }
                    }

                    if (prevRecord && prevRecord.sla !== null && record.sla !== null) {
                        if (record.sla < prevRecord.sla) {
                            dropSla.push({
                                date: params.endDate,
                                slaBefore: Number(prevRecord.sla.toFixed(2)),
                                slaNow: Number(record.sla.toFixed(2)),
                                slaUnit: "%",
                                downtime,
                                problem,
                                site: siteName,
                                battery_version: version,
                            });
                        } else if (record.sla > prevRecord.sla) {
                            upSla.push({
                                date: params.endDate,
                                slaBefore: Number(prevRecord.sla.toFixed(2)),
                                slaNow: Number(record.sla.toFixed(2)),
                                slaUnit: "%",
                                downtime: "",
                                problem: "",
                                site: siteName,
                                battery_version: version,
                            });
                        }
                    }
                }

                batteryVersionData[version] = {
                    name: versionNames[version],
                    summary: {
                        totalSites: versionSites.size,
                        sla: Number(versionAvgSlaNow.toFixed(2)),
                        slaUnit: "%",
                    },
                    message: versionMessage,
                    downSla,
                    underSla,
                    dropSla,
                    upSla,
                };
            } catch (error) {
                slaLogger.error({ error, version }, "Error processing battery version in daily detail report");
                // Continue with empty data for this version
                const versionNames: Record<string, string> = {
                    talis5: "Talis5 Full",
                    mix: "Talis5 Mix",
                    jspro: "JSPro",
                };
                batteryVersionData[version] = {
                    name: versionNames[version],
                    message: "",
                    downSla: [],
                    underSla: [],
                    dropSla: [],
                    upSla: [],
                };
            }
        }

        return {
            report: {
                dateNow: params.endDate,
                dateBefore: params.startDate,
                totalSite: totalSites,
                slaNow: Number(slaNow.toFixed(2)),
                slaBefore: Number(slaBefore.toFixed(2)),
                slaUnit: "%",
                message: summaryMessage,
                detail: {
                    batteryVersion: {
                        talis5: batteryVersionData.talis5 || { name: "Talis5 Full", message: "", downSla: [], underSla: [], dropSla: [], upSla: [] },
                        mix: batteryVersionData.mix || { name: "Talis5 Mix", message: "", downSla: [], underSla: [], dropSla: [], upSla: [] },
                        jspro: batteryVersionData.jspro || { name: "JSPro", message: "", downSla: [], underSla: [], dropSla: [], upSla: [] },
                    },
                },
            },
        };
            },
            ttl
        );
    }

    /**
     * Get monthly summary report (from 1st of month)
     * Calculate average SLA from startDate (must be 1st) to endDate
     */
    async getMonthlySummaryReport(params: SlaBaktiTypes.SlaDetailMonthlyParams): Promise<SlaBaktiTypes.SlaMonthlySummaryResponse> {
        const cacheKey = CacheService.getMonthlySummaryKey(params.startDate, params.endDate);
        const ttl = CacheService.calculateMonthlyTTL(params.startDate);

        return cacheService.get(
            cacheKey,
            async () => {
                const startDate = new Date(params.startDate);
        
        // Validate: startDate must be 1st of month
        if (startDate.getDate() !== 1) {
            throw new Error("Monthly summary report requires startDate to be the 1st of the month");
        }

        const endDate = new Date(params.endDate);
        const prisma = databaseService.getSlaClient();

        // Get all SLA data from startDate to endDate for average calculation
        const allSlaData = await prisma.slaBakti.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // Get latest date for dateNow
        const dates = Array.from(new Set(allSlaData.map((d) => dayjs(d.date).format("YYYY-MM-DD")))).sort(
            (a, b) => b.localeCompare(a)
        );
        const dateNow = dates[0] || dayjs().format("YYYY-MM-DD");

        // Get latest day data to count total sites
        const dataNow = allSlaData.filter((d) => dayjs(d.date).format("YYYY-MM-DD") === dateNow);

        // Calculate average SLA from startDate to endDate (overall)
        const validSlaAll = allSlaData.filter((d) => d.sla !== null && d.sla !== undefined);
        const slaAverage =
            validSlaAll.length > 0
                ? validSlaAll.reduce((sum, d) => sum + (d.sla || 0), 0) / validSlaAll.length
                : 0;

        // Calculate overall summary
        const totalSites = new Set(dataNow.map((d) => d.siteId)).size;

        // Group by battery version
        const batteryVersions: ("talis5" | "mix" | "jspro")[] = ["talis5", "mix", "jspro"];
        const batteryVersionData: Record<string, any> = {};

        for (const version of batteryVersions) {
            try {
                slaLogger.debug({ version }, "Fetching siteIds by battery version for monthly summary");
                const siteIds = await sitesService.getSiteIdsByBatteryVersion(version);
                const versionSiteIds = Array.from(siteIds);
                
                slaLogger.debug({ 
                    version, 
                    siteIdsCount: versionSiteIds.length,
                    siteIdsSample: versionSiteIds.slice(0, 5)
                }, "SiteIds fetched for battery version");

                if (versionSiteIds.length === 0) {
                    slaLogger.warn({ version }, "No siteIds found for battery version");
                }

                const versionAllData = allSlaData.filter((d) => versionSiteIds.includes(d.siteId));
                const versionDataNow = dataNow.filter((d) => versionSiteIds.includes(d.siteId));

                slaLogger.debug({ 
                    version,
                    versionAllDataCount: versionAllData.length,
                    versionDataNowCount: versionDataNow.length
                }, "Filtered SLA data by battery version");

                const versionSites = new Set(versionDataNow.map((d) => d.siteId));
                
                // Calculate average for this version from startDate to endDate
                const validVersionAll = versionAllData.filter((d) => d.sla !== null && d.sla !== undefined);
                const versionAvgSla =
                    validVersionAll.length > 0
                        ? validVersionAll.reduce((sum, d) => sum + (d.sla || 0), 0) / validVersionAll.length
                        : 0;

                const versionNames: Record<string, string> = {
                    talis5: "Talis5 Full",
                    mix: "Talis5 Mix",
                    jspro: "JSPro",
                };

                batteryVersionData[version] = {
                    name: versionNames[version],
                    summary: {
                        totalSites: versionSites.size,
                        sla: Number(versionAvgSla.toFixed(2)),
                        slaUnit: "%",
                        slaStatus: this.calculateSlaStatus(versionAvgSla),
                    },
                };
                
                slaLogger.info({ 
                    version,
                    totalSites: versionSites.size,
                    avgSla: versionAvgSla
                }, "Battery version data processed successfully");
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
                slaLogger.error({ error: errorDetails, version }, `Error processing battery version in monthly summary report: ${errorMessage}`);
                // Continue with empty data for this version
                const versionNames: Record<string, string> = {
                    talis5: "Talis5 Full",
                    mix: "Talis5 Mix",
                    jspro: "JSPro",
                };
                batteryVersionData[version] = {
                    name: versionNames[version],
                    summary: {
                        totalSites: 0,
                        sla: 0,
                        slaUnit: "%",
                        slaStatus: "Very Bad" as const,
                    },
                };
            }
        }

        return {
            summary: {
                dateNow,
                totalSite: totalSites,
                sla: Number(slaAverage.toFixed(2)),
                slaUnit: "%",
                slaStatus: this.calculateSlaStatus(slaAverage),
            },
            detail: {
                talis5: batteryVersionData.talis5 || { 
                    name: "Talis5 Full", 
                    summary: { totalSites: 0, sla: 0, slaUnit: "%", slaStatus: "Very Bad" as const } 
                },
                mix: batteryVersionData.mix || { 
                    name: "Talis5 Mix", 
                    summary: { totalSites: 0, sla: 0, slaUnit: "%", slaStatus: "Very Bad" as const } 
                },
                jspro: batteryVersionData.jspro || { 
                    name: "JSPro", 
                    summary: { totalSites: 0, sla: 0, slaUnit: "%", slaStatus: "Very Bad" as const } 
                },
            },
        };
            },
            ttl
        );
    }

    /**
     * Get master SLA data with summary and site details
     */
    async getMaster(params: SlaBaktiTypes.SlaMasterParams): Promise<SlaBaktiTypes.SlaMasterResponse> {
        // Normalize parameters to ensure consistent cache keys
        const normalizedParams = {
            ...params,
            siteName: params.siteName?.trim() || undefined,
            siteId: params.siteId?.trim() || undefined,
            // Ensure province is normalized (capitalize first letter)
            province: params.province ? (params.province.charAt(0).toUpperCase() + params.province.slice(1).toLowerCase()) as "Maluku" | "Papua" : undefined,
        };
        
        const cacheKey = CacheService.getMasterKey(normalizedParams);
        const ttl = CacheService.calculateTTL(normalizedParams.startDate, normalizedParams.endDate);
        
        slaLogger.debug({ cacheKey, params: normalizedParams }, "Getting master SLA data with cache key");

        return cacheService.get(
            cacheKey,
            async () => {
                const prisma = databaseService.getSlaClient();
                const startDate = new Date(normalizedParams.startDate);
                const endDate = new Date(normalizedParams.endDate);
                const page = normalizedParams.page || 1;
                // Use limit from request, default to 50 if not provided
                // Allow up to 200 items per page for better flexibility
                const limit = normalizedParams.limit && normalizedParams.limit > 0 ? Math.min(normalizedParams.limit, 200) : 50;
                const skip = (page - 1) * limit;

                // Get all SLA data in date range
                const slaData = await prisma.slaBakti.findMany({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: {
                        date: true,
                        siteId: true,
                        sla: true,
                    },
                    orderBy: {
                        date: "asc",
                    },
                });

                // Get all SLA reports in date range with problems
                const slaReports = await (prisma.slaReport.findMany as any)({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    include: {
                        problems: {
                            orderBy: {
                                createdAt: "asc",
                            },
                        },
                    },
                    orderBy: {
                        date: "desc",
                    },
                });

                // Get site details from sites service
                let siteDetailsMap: Map<string, any>;
                try {
                    siteDetailsMap = await sitesService.getSiteDetailsCached();
                } catch (error) {
                    slaLogger.error({ error }, "Failed to fetch site details, using empty map");
                    siteDetailsMap = new Map();
                }

                // Group SLA data by site and date
                const siteSlaMap = new Map<string, Map<string, number[]>>(); // siteId -> date -> sla values
                const allDailySlaMap = new Map<string, number[]>(); // date -> sla values for overall average

                for (const record of slaData) {
                    if (record.sla !== null && record.sla !== undefined) {
                        const dateStr = dayjs(record.date).format("YYYY-MM-DD");
                        
                        // Per site
                        if (!siteSlaMap.has(record.siteId)) {
                            siteSlaMap.set(record.siteId, new Map());
                        }
                        const siteDateMap = siteSlaMap.get(record.siteId)!;
                        if (!siteDateMap.has(dateStr)) {
                            siteDateMap.set(dateStr, []);
                        }
                        siteDateMap.get(dateStr)!.push(record.sla);

                        // Overall daily
                        if (!allDailySlaMap.has(dateStr)) {
                            allDailySlaMap.set(dateStr, []);
                        }
                        allDailySlaMap.get(dateStr)!.push(record.sla);
                    }
                }

                // Group problems by site (from sla_report_problem)
                const siteProblemsMap = new Map<string, Array<{ date: string; pic: string | null; problem: string | null; notes: string | null }>>();
                for (const report of slaReports) {
                    const dateStr = dayjs(report.date).format("YYYY-MM-DD");
                    if (!siteProblemsMap.has(report.siteId)) {
                        siteProblemsMap.set(report.siteId, []);
                    }
                    // Add all problems from this report
                    for (const problem of report.problems || []) {
                        siteProblemsMap.get(report.siteId)!.push({
                            date: dateStr,
                            pic: problem.pic,
                            problem: problem.problem,
                            notes: problem.notes,
                        });
                    }
                }

                // Build sites array with calculations
                const sites: SlaBaktiTypes.SlaMasterResponse["sites"] = [];
                const allSiteIds = Array.from(new Set(slaData.map((d) => d.siteId)));

                for (const siteId of allSiteIds) {
                    const siteDetail = siteDetailsMap.get(siteId);
                    if (!siteDetail) {
                        // Skip sites not found in sites service
                        continue;
                    }

                    // Apply filters
                    if (normalizedParams.siteId && !siteId.toLowerCase().includes(normalizedParams.siteId.toLowerCase())) {
                        continue;
                    }
                    if (normalizedParams.siteName && !siteDetail.siteName?.toLowerCase().includes(normalizedParams.siteName.toLowerCase())) {
                        continue;
                    }
                    if (normalizedParams.batteryVersion) {
                        const siteBatteryVersion = siteDetail.batteryVersion?.toLowerCase();
                        const filterBatteryVersion = normalizedParams.batteryVersion.toLowerCase();
                        if (siteBatteryVersion !== filterBatteryVersion) {
                            continue;
                        }
                    }

                    // Apply province filter with mapping
                    if (normalizedParams.province) {
                        const siteProvince = siteDetail.province?.toUpperCase() || "";
                        let shouldInclude = false;

                        if (normalizedParams.province === "Maluku") {
                            // Maluku includes MALUKU and MALUKU UTARA
                            shouldInclude = siteProvince === "MALUKU" || siteProvince === "MALUKU UTARA";
                        } else if (normalizedParams.province === "Papua") {
                            // Papua includes PAPUA BARAT, PAPUA BARAT DAYA, PAPUA SELATAN
                            shouldInclude = siteProvince === "PAPUA BARAT" 
                                || siteProvince === "PAPUA BARAT DAYA" 
                                || siteProvince === "PAPUA SELATAN";
                        }

                        if (!shouldInclude) {
                            continue;
                        }
                    }

                    const siteDateMap = siteSlaMap.get(siteId) || new Map();
                    
                    // Calculate daily SLA for this site
                    const dailySla: Array<{ date: string; sla: number; slaUnit: string; slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor" }> = [];
                    const allDates = Array.from(allDailySlaMap.keys()).sort();
                    for (const dateStr of allDates) {
                        const slaValues = siteDateMap.get(dateStr) || [];
                        if (slaValues.length > 0) {
                            const avgSla = slaValues.reduce((sum: number, val: number) => sum + val, 0) / slaValues.length;
                            dailySla.push({
                                date: dateStr,
                                sla: Number(avgSla.toFixed(2)),
                                slaUnit: "%",
                                slaStatus: this.calculateSlaStatus(avgSla),
                            });
                        }
                    }

                    // Calculate average SLA for this site
                    const allSiteSlaValues: number[] = [];
                    for (const slaValues of siteDateMap.values()) {
                        allSiteSlaValues.push(...slaValues);
                    }
                    const siteSlaAverage = allSiteSlaValues.length > 0
                        ? allSiteSlaValues.reduce((sum, val) => sum + val, 0) / allSiteSlaValues.length
                        : 0;

                    // Determine status
                    const status: "Potensi SP" | "Clear SP" = siteSlaAverage < 75 ? "Potensi SP" : "Clear SP";
                    const slaStatus = this.calculateSlaStatus(siteSlaAverage);

                    // Apply status filter
                    if (normalizedParams.statusSP !== undefined) {
                        if (normalizedParams.statusSP === "Potensi SP" && status !== "Potensi SP") {
                            continue;
                        }
                        if (normalizedParams.statusSP === "Clear SP" && status !== "Clear SP") {
                            continue;
                        }
                    }

                    // Apply slaStatus filter
                    if (normalizedParams.slaStatus !== undefined && slaStatus !== normalizedParams.slaStatus) {
                        continue;
                    }

                    // Apply SLA range filter
                    if (normalizedParams.slaMin !== undefined && siteSlaAverage < normalizedParams.slaMin) {
                        continue;
                    }
                    if (normalizedParams.slaMax !== undefined && siteSlaAverage > normalizedParams.slaMax) {
                        continue;
                    }

                    // Get problems for this site
                    const problems = siteProblemsMap.get(siteId) || [];
                    
                    // Apply PIC filter on problems
                    let filteredProblems = problems;
                    if (normalizedParams.pic) {
                        filteredProblems = problems.filter((p) => p.pic === normalizedParams.pic);
                    }

                    // If PIC filter is applied and no problems match, skip this site
                    if (normalizedParams.pic && filteredProblems.length === 0) {
                        continue;
                    }

                    sites.push({
                        siteId,
                        siteName: siteDetail.siteName || siteId,
                        province: siteDetail.province || null,
                        batteryVersion: siteDetail.batteryVersion || null,
                        talisInstalled: siteDetail.talisInstalled ? dayjs(siteDetail.talisInstalled).format("YYYY-MM-DD") : null,
                        problem: filteredProblems.map((p) => ({
                            date: p.date,
                            pic: p.pic as "VSAT" | "POWER" | null,
                            problem: p.problem,
                            notes: p.notes,
                        })),
                        siteSla: {
                            slaAverage: Number(siteSlaAverage.toFixed(2)),
                            slaUnit: "%",
                            slaStatus,
                            dailySla,
                            statusSP: status,
                        },
                    });
                }

                // Calculate overall average SLA
                const allSlaValues: number[] = [];
                for (const slaValues of allDailySlaMap.values()) {
                    allSlaValues.push(...slaValues);
                }
                const overallSlaAverage = allSlaValues.length > 0
                    ? allSlaValues.reduce((sum, val) => sum + val, 0) / allSlaValues.length
                    : 0;

                // Calculate daily average SLA for summary
                const slaAverageDaily: Array<{ date: string; sla: number; slaUnit: string; slaStatus: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor" }> = [];
                for (const [dateStr, slaValues] of allDailySlaMap.entries()) {
                    if (slaValues.length > 0) {
                        const avgSla = slaValues.reduce((sum, val) => sum + val, 0) / slaValues.length;
                        slaAverageDaily.push({
                            date: dateStr,
                            sla: Number(avgSla.toFixed(2)),
                            slaUnit: "%",
                            slaStatus: this.calculateSlaStatus(avgSla),
                        });
                    }
                }
                slaAverageDaily.sort((a, b) => a.date.localeCompare(b.date));

                // Apply pagination
                const total = sites.length;
                const paginatedSites = sites.slice(skip, skip + limit);

                return {
                    summary: {
                        slaAverage: Number(overallSlaAverage.toFixed(2)),
                        slaUnit: "%",
                        slaAverageDaily,
                    },
                    sites: paginatedSites,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            ttl
        );
    }
}

// Export singleton instance
export const slaBaktiService = new SlaBaktiService();

