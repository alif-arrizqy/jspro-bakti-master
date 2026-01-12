import { FastifyInstance } from "fastify";
import { SiteDownController } from "../controllers/site-down.controller";
import { siteDownSwaggerSchemas } from "../schemas/site-down.schema";

// ============================================================
// Site Down Routes
// ============================================================

export async function siteDownRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // GET /api/site-down - Get all site downtime data
    // --------------------------------------------------------
    fastify.get(
        "/",
        {
            schema: {
                tags: ["Site Down"],
                summary: "Get all site downtime data",
                description: "Get all site downtime data with optional filters and pagination",
                querystring: {
                    type: "object",
                    properties: {
                        page: { type: "integer", default: 1, description: "Page number" },
                        limit: { type: "integer", default: 20, description: "Items per page" },
                        siteId: { type: "string", description: "Filter by Site ID" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: siteDownSwaggerSchemas.SiteDowntimeResponse,
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
                },
            },
        },
        SiteDownController.getAll
    );

    // --------------------------------------------------------
    // GET /api/site-down/:siteId - Get site downtime by Site ID
    // --------------------------------------------------------
    fastify.get(
        "/:siteId",
        {
            schema: {
                tags: ["Site Down"],
                summary: "Get site downtime by Site ID",
                description: "Get site downtime data for a specific site",
                params: {
                    type: "object",
                    required: ["siteId"],
                    properties: {
                        siteId: { type: "string", description: "Site ID" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: siteDownSwaggerSchemas.SiteDowntimeResponse,
                        },
                    },
                    404: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SiteDownController.getBySiteId
    );

    // --------------------------------------------------------
    // POST /api/site-down - Create or update site downtime (upsert)
    // --------------------------------------------------------
    fastify.post(
        "/",
        {
            schema: {
                tags: ["Site Down"],
                summary: "Create or update site downtime",
                description: "Create new site downtime or update existing one (upsert by siteId)",
                body: {
                    type: "object",
                    required: ["siteId", "downSince"],
                    properties: {
                        siteId: { type: "string", description: "Site ID" },
                        siteName: { type: "string", nullable: true, description: "Site Name" },
                        downSince: { type: "string", format: "date-time", description: "Down since date (ISO 8601)" },
                        downSeconds: { type: "integer", nullable: true, description: "Down duration in seconds" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: siteDownSwaggerSchemas.SiteDowntimeResponse,
                        },
                    },
                },
            },
        },
        SiteDownController.upsert
    );

    // --------------------------------------------------------
    // PATCH /api/site-down/:siteId - Update site downtime
    // --------------------------------------------------------
    fastify.patch(
        "/:siteId",
        {
            schema: {
                tags: ["Site Down"],
                summary: "Update site downtime",
                description: "Update existing site downtime by Site ID",
                params: {
                    type: "object",
                    required: ["siteId"],
                    properties: {
                        siteId: { type: "string", description: "Site ID" },
                    },
                },
                body: {
                    type: "object",
                    properties: {
                        siteName: { type: "string", nullable: true, description: "Site Name" },
                        downSince: { type: "string", format: "date-time", description: "Down since date (ISO 8601)" },
                        downSeconds: { type: "integer", nullable: true, description: "Down duration in seconds" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: siteDownSwaggerSchemas.SiteDowntimeResponse,
                        },
                    },
                    404: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SiteDownController.update
    );

    // --------------------------------------------------------
    // DELETE /api/site-down/:siteId - Delete site downtime
    // --------------------------------------------------------
    fastify.delete(
        "/:siteId",
        {
            schema: {
                tags: ["Site Down"],
                summary: "Delete site downtime",
                description: "Delete site downtime by Site ID",
                params: {
                    type: "object",
                    required: ["siteId"],
                    properties: {
                        siteId: { type: "string", description: "Site ID" },
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
                    404: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SiteDownController.delete
    );

    // --------------------------------------------------------
    // POST /api/site-down/sync - Sync data from NMS API
    // --------------------------------------------------------
    fastify.post(
        "/sync",
        {
            schema: {
                tags: ["Site Down"],
                summary: "Sync data from NMS API",
                description: "Manually trigger sync from NMS API to update site downtime data",
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    inserted: { type: "integer" },
                                    updated: { type: "integer" },
                                    errors: { type: "integer" },
                                    skipped: { type: "integer" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SiteDownController.syncFromNms
    );
}

