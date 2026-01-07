import { FastifyInstance } from "fastify";
import { SlaInternalController } from "../controllers/sla-internal.controller";
import { slaInternalSwaggerSchemas } from "../schemas/sla-internal.schema";

// ============================================================
// SLA Internal Routes
// ============================================================

export async function slaInternalRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // GET /api/sla-internal/summary - SLA 1: Average summary
    // --------------------------------------------------------
    fastify.get(
        "/summary",
        {
            schema: {
                tags: ["SLA Internal"],
                summary: "Get SLA summary (SLA 1)",
                description:
                    "Get average/summary data for all sites or a specific site within date range. Returns uptime, unknown time, percentages, and battery voltage average.",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                        siteId: { type: "string", description: "Site ID (optional, if not provided returns all sites)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaInternalSwaggerSchemas.SlaInternalSummaryListResponse.properties.data,
                        },
                    },
                },
            },
        },
        SlaInternalController.getSummary
    );

    // --------------------------------------------------------
    // GET /api/sla-internal/daily - SLA 2: Daily average
    // --------------------------------------------------------
    fastify.get(
        "/daily",
        {
            schema: {
                tags: ["SLA Internal"],
                summary: "Get daily SLA data (SLA 2)",
                description:
                    "Get daily average data for a specific site within date range. Returns daily uptime, battery voltage, currents, and energy data.",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate", "siteId"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                        siteId: { type: "string", description: "Site ID (required)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: slaInternalSwaggerSchemas.SlaInternalDailyListResponse.properties.data,
                        },
                    },
                },
            },
        },
        SlaInternalController.getDaily
    );

    // --------------------------------------------------------
    // GET /api/sla-internal/export - SLA 3: Export to Excel
    // --------------------------------------------------------
    fastify.get(
        "/export",
        {
            schema: {
                tags: ["SLA Internal"],
                summary: "Export SLA data to Excel (SLA 3)",
                description:
                    "Export raw 5-minute interval data to Excel file for a specific site within date range. Returns downloadable .xlsx file.",
                querystring: {
                    type: "object",
                    required: ["startDate", "endDate", "siteId"],
                    properties: {
                        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                        siteId: { type: "string", description: "Site ID (required)" },
                    },
                },
                produces: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
                response: {
                    200: {
                        description: "Excel file download",
                        type: "string",
                        format: "binary",
                    },
                },
            },
        },
        SlaInternalController.export
    );
}

