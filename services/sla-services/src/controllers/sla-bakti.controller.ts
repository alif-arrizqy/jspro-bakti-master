import { FastifyRequest, FastifyReply } from "fastify";
import { slaBaktiService } from "../services/sla-bakti.service";
import {
    slaBaktiQuerySchema,
    siteIdParamSchema,
    deleteByDateRangeSchema,
    createSlaReportBodySchema,
    updateSlaReportBodySchema,
    slaReportQuerySchema,
    slaMasterQuerySchema,
} from "../schemas/sla-bakti.schema";
import { slaLogger } from "../utils/logger";

export class SlaBaktiController {
    /**
     * Get all SLA Bakti data
     */
    static async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = slaBaktiQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid query parameters",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaBaktiService.getAll(parsed.data);

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting SLA Bakti data");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Get SLA Bakti by Site ID
     */
    static async getBySiteId(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteIdParamSchema.safeParse(request.params);
            const queryParsed = slaBaktiQuerySchema.safeParse(request.query);

            if (!paramsParsed.success || !queryParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid parameters",
                });
            }

            const result = await slaBaktiService.getBySiteId(paramsParsed.data.siteId, queryParsed.data);

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting SLA Bakti by site ID");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Delete by date range
     */
    static async deleteByDateRange(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = deleteByDateRangeSchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaBaktiService.deleteByDateRange(parsed.data.startDate, parsed.data.endDate);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error deleting SLA Bakti by date range");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete data",
            });
        }
    }

    /**
     * Delete by Site ID
     */
    static async deleteBySiteId(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteIdParamSchema.safeParse(request.params);

            if (!paramsParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid site ID",
                });
            }

            const query = request.query as { startDate?: string; endDate?: string };
            const result = await slaBaktiService.deleteBySiteId(paramsParsed.data.siteId, query);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error deleting SLA Bakti by site ID");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete data",
            });
        }
    }

    /**
     * Create Report
     */
    static async createSlaReport(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = createSlaReportBodySchema.safeParse(request.body);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaBaktiService.createSlaReport(parsed.data);

            return reply.send({ success: true, message: "SLA Report created successfully" });
        } catch (error) {
            slaLogger.error({ error }, "Error creating SLA Report");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create data",
            });
        }
    }

    /**
     * GET SLA Reports with filters
     */
    static async getSlaReports(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = slaReportQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid query parameters",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaBaktiService.getSlaReports(parsed.data);

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting SLA Reports");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Update SLA Report by ID
     */
    static async updateSlaReport(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        try {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid ID",
                });
            }

            const parsed = updateSlaReportBodySchema.safeParse(request.body);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaBaktiService.updateSlaReport(id, parsed.data);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error updating SLA Report");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update data",
            });
        }
    }

    /**
     * Delete SLA Problem by ID
     */
    static async deleteSlaReport(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid ID",
                });
            }

            const result = await slaBaktiService.deleteSlaReport(id);

            return reply.send({
                success: true,
                message: "SLA Problem deleted successfully",
            });
        } catch (error) {
            slaLogger.error({ error }, "Error deleting SLA Problem");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete data",
            });
        }
    }

    /**
     * Bulk upload - combine upload preview and confirm save
     * Supports multiple files upload
     */
    static async bulkUpload(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Get all files from multipart form data
            const files: any[] = [];
            const parts = request.parts();
            
            for await (const part of parts) {
                if (part.type === "file") {
                    const file = part;
                    const buffer = await file.toBuffer();
                    files.push({
                        filename: file.filename,
                        buffer,
                    });
                }
            }

            if (files.length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: "No file uploaded",
                });
            }

            slaLogger.info({ fileCount: files.length }, "Processing multiple files upload");

            // Process all files and combine results
            const allValidDataForSave: any[] = [];
            const allPreviews: any[] = [];
            let totalInserted = 0;
            let totalSkipped = 0;
            const allValidDataByDate = new Map<string, number>();

            // Process each file
            for (const file of files) {
                try {
                    // Get preview and validDataForSave for this file
                    const { preview, validDataForSave } = await slaBaktiService.uploadPreview(file.buffer);
                    
                    // Combine validDataForSave
                    allValidDataForSave.push(...validDataForSave);
                    allPreviews.push({
                        filename: file.filename,
                        ...preview,
                    });
                } catch (error) {
                    slaLogger.error({ error, filename: file.filename }, "Error processing file");
                    allPreviews.push({
                        filename: file.filename,
                        summary: {
                            total: 0,
                            valid: 0,
                            duplicate: 0,
                            invalid: 0,
                            invalidSiteId: 0,
                        },
                        validData: [],
                        duplicates: [],
                        errors: [{ row: 0, message: error instanceof Error ? error.message : "Failed to process file" }],
                    });
                }
            }

            // Save all valid data from all files together
            if (allValidDataForSave.length > 0) {
                const saveResult = await slaBaktiService.confirmSave(allValidDataForSave);
                totalInserted = saveResult.inserted;
                totalSkipped = saveResult.skipped;

                // Combine validData by date from save result
                for (const item of saveResult.validData || []) {
                    allValidDataByDate.set(item.date, (allValidDataByDate.get(item.date) || 0) + item.inserted);
                }
            }

            // Combine summary from all files
            const combinedSummary = {
                total: allPreviews.reduce((sum, p) => sum + (p.summary?.total || 0), 0),
                valid: allPreviews.reduce((sum, p) => sum + (p.summary?.valid || 0), 0),
                duplicate: allPreviews.reduce((sum, p) => sum + (p.summary?.duplicate || 0), 0),
                invalid: allPreviews.reduce((sum, p) => sum + (p.summary?.invalid || 0), 0),
                invalidSiteId: allPreviews.reduce((sum, p) => sum + (p.summary?.invalidSiteId || 0), 0),
            };

            // Combine all duplicates and errors
            const allDuplicates = allPreviews.flatMap((p) => p.duplicates || []);
            const allErrors = allPreviews.flatMap((p) => p.errors || []);

            // Convert validDataByDate to array
            const validData = Array.from(allValidDataByDate.entries())
                .map(([date, inserted]) => ({ date, inserted }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Combined preview
            const combinedPreview = {
                summary: combinedSummary,
                validData,
                duplicates: allDuplicates,
                errors: allErrors,
            };

            return reply.send({
                success: true,
                data: {
                    preview: combinedPreview,
                    save: {
                        inserted: totalInserted,
                        skipped: totalSkipped,
                    },
                },
            });
        } catch (error) {
            slaLogger.error({ error }, "Error in bulk upload");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to upload and save data",
            });
        }
    }

    /**
     * Get daily SLA chart
     */
    static async getDailyChart(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as { startDate: string; endDate: string };
            
            if (!query.startDate || !query.endDate) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                });
            }

            const result = await slaBaktiService.getDailyChart({
                startDate: query.startDate,
                endDate: query.endDate,
            });

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting daily chart");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get chart data",
            });
        }
    }

    /**
     * Get daily SLA chart by battery version
     */
    static async getDailyChartByBatteryVersion(
        request: FastifyRequest<{ Params: { batteryVersion: string } }>,
        reply: FastifyReply
    ) {
        try {
            const { batteryVersion } = request.params;
            const query = request.query as { startDate: string; endDate: string };

            if (!["talis5", "mix", "jspro"].includes(batteryVersion)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid battery version. Must be one of: talis5, mix, jspro",
                });
            }

            if (!query.startDate || !query.endDate) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                });
            }

            const result = await slaBaktiService.getDailyChartByBatteryVersion({
                startDate: query.startDate,
                endDate: query.endDate,
                batteryVersion: batteryVersion as "talis5" | "mix" | "jspro",
            });

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting daily chart by battery version");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get chart data",
            });
        }
    }

    /**
     * Get weekly SLA chart
     */
    static async getWeeklyChart(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as { startDate: string; endDate: string };

            if (!query.startDate || !query.endDate) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                });
            }

            const result = await slaBaktiService.getWeeklyChart({
                startDate: query.startDate,
                endDate: query.endDate,
            });

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting weekly chart");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get chart data",
            });
        }
    }

    /**
     * Get daily detail report (for WhatsApp)
     */
    static async getDailyDetailReport(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as { startDate: string; endDate: string };

            if (!query.startDate || !query.endDate) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                });
            }

            const result = await slaBaktiService.getDailyDetailReport({
                startDate: query.startDate,
                endDate: query.endDate,
            });

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting daily detail report");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get daily detail report",
            });
        }
    }

    /**
     * Parse month and year from period string
     * Supports formats: "2025-12" or "desember 2025"
     */
    private static parseMonthYear(period: string): { year: number; month: number } {
        const monthNames: { [key: string]: number } = {
            januari: 1,
            februari: 2,
            maret: 3,
            april: 4,
            mei: 5,
            juni: 6,
            juli: 7,
            agustus: 8,
            september: 9,
            oktober: 10,
            november: 11,
            desember: 12,
        };

        // Try format "YYYY-MM"
        const yyyyMmMatch = period.match(/^(\d{4})-(\d{1,2})$/);
        if (yyyyMmMatch) {
            const year = parseInt(yyyyMmMatch[1], 10);
            const month = parseInt(yyyyMmMatch[2], 10);
            if (month >= 1 && month <= 12) {
                return { year, month };
            }
        }

        // Try format "month year" (Indonesian)
        const parts = period.trim().toLowerCase().split(/\s+/);
        if (parts.length === 2) {
            const monthName = parts[0];
            const yearStr = parts[1];
            const month = monthNames[monthName];
            const year = parseInt(yearStr, 10);

            if (month && !isNaN(year) && year > 0) {
                return { year, month };
            }
        }

        throw new Error(`Invalid period format. Expected 'YYYY-MM' (e.g., '2025-12') or 'month year' in Indonesian (e.g., 'desember 2025'). Got: ${period}`);
    }

    /**
     * Get last day of month
     */
    private static getLastDayOfMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
    }

    /**
     * Get monthly summary report
     */
    static async getMonthlySummaryReport(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as { period: string };

            if (!query.period) {
                return reply.status(400).send({
                    success: false,
                    error: "period is required. Format: 'YYYY-MM' (e.g., '2025-12') or 'month year' in Indonesian (e.g., 'desember 2025')",
                });
            }

            // Parse month and year from period
            const { year, month } = SlaBaktiController.parseMonthYear(query.period);

            // Calculate startDate (first day of month) and endDate (last day of month)
            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const lastDay = SlaBaktiController.getLastDayOfMonth(year, month);
            const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

            const result = await slaBaktiService.getMonthlySummaryReport({
                startDate,
                endDate,
            });

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting monthly summary report");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get monthly summary report",
            });
        }
    }

    /**
     * Get master SLA data
     */
    static async getMaster(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as {
                startDate: string;
                endDate: string;
                siteId?: string;
                siteName?: string;
                batteryVersion?: "talis5" | "mix" | "jspro";
                statusSP?: "Potensi SP" | "Clear SP";
                slaStatus?: "Meet SLA" | "Very Bad" | "Bad" | "Fair" | "Poor";
                slaMin?: number;
                slaMax?: number;
                province?: "Maluku" | "Papua";
                pic?: "VSAT" | "POWER" | "SNMP";
                page?: number;
                limit?: number;
            };

            if (!query.startDate || !query.endDate) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                });
            }

            // Validate and parse limit
            let limit: number | undefined = undefined;
            if (query.limit !== undefined) {
                const parsedLimit = typeof query.limit === "string" ? parseInt(query.limit, 10) : query.limit;
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    limit = Math.min(parsedLimit, 200); // Max 200
                }
            }

            // Validate and parse page
            let page: number | undefined = undefined;
            if (query.page !== undefined) {
                const parsedPage = typeof query.page === "string" ? parseInt(query.page, 10) : query.page;
                if (!isNaN(parsedPage) && parsedPage > 0) {
                    page = parsedPage;
                }
            }

            const result = await slaBaktiService.getMaster({
                startDate: query.startDate,
                endDate: query.endDate,
                siteId: query.siteId,
                siteName: query.siteName,
                batteryVersion: query.batteryVersion,
                statusSP: query.statusSP,
                slaStatus: query.slaStatus,
                slaMin: query.slaMin,
                slaMax: query.slaMax,
                province: query.province,
                pic: query.pic,
                page: page, // Will use default 1 in service if undefined
                limit: limit, // Will use default 50 in service if undefined
            });

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting master SLA data");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get master SLA data",
            });
        }
    }
}

