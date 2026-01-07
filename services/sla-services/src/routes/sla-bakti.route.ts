import { FastifyInstance } from "fastify";
import { SlaBaktiController } from "../controllers/sla-bakti.controller";
import { slaBaktiSwaggerSchemas, slaMasterQuerySchema, slaMasterResponseSchema } from "../schemas/sla-bakti.schema";

// ============================================================
// SLA Bakti Routes
// ============================================================

export async function slaBaktiRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // POST /api/sla-bakti/upload - Bulk upload Excel file
    // --------------------------------------------------------
    fastify.post(
        "/upload",
        {
            schema: {
                tags: ["SLA Bakti"],
                summary: "Bulk upload Excel file(s)",
                description: "Upload one or multiple Excel files (.xlsx) at once. Parse, validate, and automatically save valid data to database. Returns combined preview and save results from all files.",
                consumes: ["multipart/form-data"],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    preview: slaBaktiSwaggerSchemas.UploadPreviewResponse,
                                    save: slaBaktiSwaggerSchemas.ConfirmSaveResponse,
                                },
                            },
                        },
                    },
                    400: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                    500: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SlaBaktiController.bulkUpload
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/raw - Get all SLA Bakti raw data
    // --------------------------------------------------------
    fastify.get(
        "/raw",
        {
            schema: {
                tags: ["SLA Bakti - Raw Data"],
                summary: "Get all SLA Bakti raw data",
                description: "Get all SLA Bakti data with optional date range filter and pagination",
                querystring: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                        page: { type: "integer", default: 1, description: "Page number" },
                        limit: { type: "integer", default: 20, description: "Items per page" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaBaktiSwaggerSchemas.PaginatedSlaBaktiResponse.properties.data,
                            pagination: slaBaktiSwaggerSchemas.PaginatedSlaBaktiResponse.properties.pagination,
                        },
                    },
                },
            },
        },
        SlaBaktiController.getAll
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/raw/:siteId - Get SLA Bakti raw data by Site ID
    // --------------------------------------------------------
    fastify.get(
        "/raw/:siteId",
        {
            schema: {
                tags: ["SLA Bakti - Raw Data"],
                summary: "Get SLA Bakti raw data by Site ID",
                description: "Get SLA Bakti data for a specific site with optional date range filter",
                params: {
                    type: "object",
                    required: ["siteId"],
                    properties: {
                        siteId: { type: "string", description: "Site ID (e.g., PAP9999)" },
                    },
                },
                querystring: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                        page: { type: "integer", default: 1 },
                        limit: { type: "integer", default: 20 },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaBaktiSwaggerSchemas.PaginatedSlaBaktiResponse.properties.data,
                            pagination: slaBaktiSwaggerSchemas.PaginatedSlaBaktiResponse.properties.pagination,
                        },
                    },
                },
            },
        },
        SlaBaktiController.getBySiteId
    );

    // --------------------------------------------------------
    // DELETE /api/sla-bakti/raw - Delete raw data by date range
    // --------------------------------------------------------
    fastify.delete(
        "/raw",
        {
            schema: {
                tags: ["SLA Bakti - Raw Data"],
                summary: "Delete SLA Bakti raw data by date range",
                description: "Delete all SLA Bakti data within the specified date range",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaBaktiSwaggerSchemas.DeleteResponse,
                        },
                    },
                },
            },
        },
        SlaBaktiController.deleteByDateRange
    );

    // --------------------------------------------------------
    // DELETE /api/sla-bakti/raw/:siteId - Delete raw data by Site ID
    // --------------------------------------------------------
    fastify.delete(
        "/raw/:siteId",
        {
            schema: {
                tags: ["SLA Bakti - Raw Data"],
                summary: "Delete SLA Bakti raw data by Site ID",
                description: "Delete SLA Bakti data for a specific site, optionally within a date range",
                params: {
                    type: "object",
                    required: ["siteId"],
                    properties: {
                        siteId: { type: "string", description: "Site ID" },
                    },
                },
                querystring: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaBaktiSwaggerSchemas.DeleteResponse,
                        },
                    },
                },
            },
        },
        SlaBaktiController.deleteBySiteId
    );

    // --------------------------------------------------------
    // POST /api/sla-bakti/problems - Create SLA Problem
    // --------------------------------------------------------
    fastify.post(
        "/problems",
        {
            schema: {
                tags: ["SLA Bakti - Problems"],
                summary: "Create SLA Problem",
                description: "Create a new SLA Problem report",
                body: {
                    type: "object",
                    required: ["date", "siteId"],
                    properties: {
                        date: { type: "string", description: "Date (YYYY-MM-DD)" },
                        siteId: { type: "string", description: "Site ID" },
                        prCode: { type: "string", nullable: true, description: "PR Code" },
                        problems: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    pic: { type: "string", enum: ["VSAT", "POWER", "SNMP"], nullable: true, description: "PIC for this problem" },
                                    problem: { type: "string", nullable: true, description: "Problem description" },
                                    notes: { type: "string", nullable: true, description: "Notes for this specific problem" },
                                },
                            },
                            description: "Array of problems. Each problem can have different PIC.",
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        SlaBaktiController.createSlaReport
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/problems - Get SLA Problems with filters
    // --------------------------------------------------------
    fastify.get(
        "/problems",
        {
            schema: {
                tags: ["SLA Bakti - Problems"],
                summary: "Get SLA Problems with filters",
                description: "Get SLA Problems with optional filters: date range, siteId, prCode, pic",
                querystring: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                        siteId: { type: "string", description: "Site ID filter" },
                        prCode: { type: "string", description: "PR Code filter" },
                        pic: { type: "string", enum: ["VSAT", "POWER", "SNMP"], description: "PIC filter (filters reports that have at least one problem with this PIC)" },
                        page: { type: "integer", default: 1, description: "Page number" },
                        limit: { type: "integer", default: 20, description: "Items per page" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaBaktiSwaggerSchemas.PaginatedSlaReportResponse.properties.data,
                            pagination: slaBaktiSwaggerSchemas.PaginatedSlaReportResponse.properties.pagination,
                        },
                    },
                },
            },
        },
        SlaBaktiController.getSlaReports
    );

    // --------------------------------------------------------
    // PATCH /api/sla-bakti/problems/:id - Update SLA Problem
    // --------------------------------------------------------
    fastify.patch(
        "/problems/:id",
        {
            schema: {
                tags: ["SLA Bakti - Problems"],
                summary: "Update SLA Problem",
                description: "Update an existing SLA Problem by ID",
                params: {
                    type: "object",
                    required: ["id"],
                    properties: {
                        id: { type: "integer", description: "Report ID" },
                    },
                },
                body: {
                    type: "object",
                    properties: {
                        date: { type: "string", description: "Date (YYYY-MM-DD)" },
                        siteId: { type: "string", description: "Site ID" },
                        prCode: { type: "string", nullable: true, description: "PR Code" },
                        problems: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    pic: { type: "string", enum: ["VSAT", "POWER", "SNMP"], nullable: true, description: "PIC for this problem" },
                                    problem: { type: "string", nullable: true, description: "Problem description" },
                                    notes: { type: "string", nullable: true, description: "Notes for this specific problem" },
                                },
                            },
                            description: "Array of problems. If provided, will replace all existing problems.",
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaBaktiSwaggerSchemas.SlaReportResponse,
                        },
                    },
                },
            },
        },
        SlaBaktiController.updateSlaReport
    );

    // --------------------------------------------------------
    // DELETE /api/sla-bakti/problems - Delete SLA Problems
    // --------------------------------------------------------
    fastify.delete(
        "/problems/:id",
        {
            schema: {
                tags: ["SLA Bakti - Problems"],
                summary: "Delete SLA Problems",
                description: "Delete SLA Problems",
                params: {
                    type: "object",
                    required: ["id"],
                    properties: {
                        id: { type: "integer", description: "Problem ID" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        SlaBaktiController.deleteSlaReport
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/daily/chart/all-sites - Get daily SLA chart for all sites
    // --------------------------------------------------------
    fastify.get(
        "/daily/chart/all-sites",
        {
            schema: {
                tags: ["SLA Bakti - Daily"],
                summary: "Get daily SLA all Sites chart data",
                description: "Get daily average SLA data for all sites for chart visualization",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        date: { type: "string" },
                                        value: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaBaktiController.getDailyChart
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/daily/chart/battery/:batteryVersion - Get daily SLA chart by battery version
    // Parameterized route must be defined after all static routes
    // --------------------------------------------------------
    fastify.get(
        "/daily/chart/battery/:batteryVersion",
        {
            schema: {
                tags: ["SLA Bakti - Daily"],
                summary: "Get daily SLA chart data by battery version",
                description: "Get daily average SLA data filtered by battery version for chart visualization",
                params: {
                    type: "object",
                    required: ["batteryVersion"],
                    properties: {
                        batteryVersion: {
                            type: "string",
                            enum: ["talis5", "mix", "jspro"],
                            description: "Battery version",
                        },
                    },
                },
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        date: { type: "string" },
                                        value: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaBaktiController.getDailyChartByBatteryVersion
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/weekly/chart/all-sites - Get weekly SLA chart
    // --------------------------------------------------------
    fastify.get(
        "/weekly/chart/all-sites",
        {
            schema: {
                tags: ["SLA Bakti - Weekly"],
                summary: "Get weekly SLA chart data",
                description: "Get weekly average SLA data for all sites for chart visualization",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        value: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaBaktiController.getWeeklyChart
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/daily/report - Get daily report of sites
    // --------------------------------------------------------
    fastify.get(
        "/daily/report",
        {
            schema: {
                tags: ["SLA Bakti - Daily"],
                summary: "Get daily report of sites",
                description: "Get daily detail report comparing 2 consecutive days for WhatsApp notification",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD), must be 1 day before endDate" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                additionalProperties: true,
                            },
                        },
                    },
                },
            },
        },
        SlaBaktiController.getDailyDetailReport
    );

    // --------------------------------------------------------
    // GET /api/sla-bakti/monthly/summary - Get monthly summary report
    // --------------------------------------------------------
    fastify.get(
        "/monthly/summary",
        {
            schema: {
                tags: ["SLA Bakti - Monthly"],
                summary: "Get monthly summary report",
                description: "Get monthly summary report with average SLA for the specified month. Provide month and year (e.g., '2025-12' or 'desember 2025'). Start date will be automatically set to 1st of month and end date to last day of month.",
                querystring: {
                    type: "object",
                    required: ["period"],
                    properties: {
                        period: { type: "string", description: "Month and year in format 'YYYY-MM' (e.g., '2025-12') or 'month year' in Indonesian (e.g., 'desember 2025')" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                additionalProperties: true,
                            },
                        },
                    },
                    400: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                    500: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SlaBaktiController.getMonthlySummaryReport
    );

    // --------------------------------------------------------
    // GET /api/v1/sla-bakti/master - Get master SLA data
    // --------------------------------------------------------
    fastify.get(
        "/master",
        {
            schema: {
                tags: ["SLA Bakti - Master Data"],
                summary: "Get master SLA data",
                description: "Get master SLA data with summary, daily averages, and site details with filtering options",
                querystring: slaMasterQuerySchema,
                response: {
                    200: slaMasterResponseSchema,
                    400: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                    500: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SlaBaktiController.getMaster
    );
}

