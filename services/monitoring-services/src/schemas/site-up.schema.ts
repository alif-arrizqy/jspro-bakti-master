import { z } from "zod";

// ============================================================
// Site Up Request/Response Schemas for Swagger
// ============================================================

// Query params for list
export const siteUpQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1).describe("Page number"),
    limit: z.coerce.number().min(1).max(130).default(20).describe("Items per page"),
    siteId: z.string().optional().describe("Filter by Site ID"),
});

// Params for site ID routes
export const siteUpIdParamSchema = z.object({
    siteId: z.string().describe("Site ID"),
});

// Create/Update body
export const siteUpBodySchema = z.object({
    siteId: z.string().describe("Site ID"),
    siteName: z.string().nullable().optional().describe("Site Name"),
});

// Update body (PATCH)
export const siteUpUpdateSchema = z.object({
    siteName: z.string().nullable().optional().describe("Site Name"),
});

// ============================================================
// Swagger Schema Definitions
// ============================================================

export const siteUpSwaggerSchemas = {
    SiteUpResponse: {
        type: "object",
        properties: {
            id: { type: "integer" },
            siteId: { type: "string" },
            siteName: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    PaginatedSiteUpResponse: {
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
        },
    },
};

