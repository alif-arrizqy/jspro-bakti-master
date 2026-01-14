import { z } from "zod";

// ============================================================
// Site Down Request/Response Schemas for Swagger
// ============================================================

// Query params for list
export const siteDowntimeQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1).describe("Page number"),
    limit: z.coerce.number().min(1).max(100).default(20).describe("Items per page"),
    siteId: z.string().optional().describe("Filter by Site ID"),
    siteName: z.string().optional().describe("Filter by Site Name (case-insensitive search)"),
});

// Params for site ID routes
export const siteIdParamSchema = z.object({
    siteId: z.string().describe("Site ID"),
});

// Create/Update body
export const siteDowntimeBodySchema = z.object({
    siteId: z.string().describe("Site ID"),
    siteName: z.string().nullable().optional().describe("Site Name"),
    downSince: z.string().datetime().describe("Down since date (ISO 8601 format)"),
    downSeconds: z.number().nullable().optional().describe("Down duration in seconds"),
});

// Update body (PATCH)
export const siteDowntimeUpdateSchema = z.object({
    siteName: z.string().nullable().optional().describe("Site Name"),
    downSince: z.string().datetime().optional().describe("Down since date (ISO 8601 format)"),
    downSeconds: z.number().nullable().optional().describe("Down duration in seconds"),
});

// ============================================================
// Swagger Schema Definitions
// ============================================================

export const siteDownSwaggerSchemas = {
    SiteDowntimeResponse: {
        type: "object",
        properties: {
            id: { type: "integer" },
            siteId: { type: "string" },
            siteName: { type: "string", nullable: true },
            downSince: { type: "string", format: "date-time" },
            downSeconds: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    PaginatedSiteDowntimeResponse: {
        type: "object",
        properties: {
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        siteId: { type: "string" },
                        siteName: { type: "string", nullable: true },
                        downSince: { type: "string", format: "date-time" },
                        downSeconds: { type: "integer", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
            },
            pagination: {
                type: "object",
                properties: {
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    total: { type: "integer" },
                    totalPages: { type: "integer" },
                },
            },
            summary: {
                type: "object",
                properties: {
                    totalSites: { type: "integer", description: "Total number of active sites from sites-service" },
                    totalSitesDown: { type: "integer", description: "Total number of sites currently down" },
                    percentageSitesDown: { type: "number", description: "Percentage of sites down" },
                },
            },
        },
    },
};

