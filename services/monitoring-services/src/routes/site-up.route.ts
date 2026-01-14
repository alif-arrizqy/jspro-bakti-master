import { FastifyInstance } from "fastify";
import { SiteUpController } from "../controllers/site-up.controller";
import { siteUpSwaggerSchemas } from "../schemas/site-up.schema";

// ============================================================
// Site Up Routes
// ============================================================

export async function siteUpRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // GET /api/site-up - Get all site up data
    // --------------------------------------------------------
    fastify.get(
        "/",
        {
            schema: {
                tags: ["Site Up"],
                summary: "Get all site up data",
                description: "Get all site up data with optional filters and pagination",
                querystring: {
                    type: "object",
                    properties: {
                        page: { type: "integer", default: 1, description: "Page number" },
                        limit: { type: "integer", default: 20, description: "Items per page" },
                        siteId: { type: "string", description: "Filter by Site ID" },
                        siteName: { type: "string", description: "Filter by Site Name (case-insensitive search)" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: siteUpSwaggerSchemas.SiteUpResponse,
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
                                    totalSitesUp: { type: "integer", description: "Total number of sites currently up" },
                                    percentageSitesUp: { type: "number", description: "Percentage of sites up" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SiteUpController.getAll
    );

    // --------------------------------------------------------
    // GET /api/site-up/:siteId - Get site up by Site ID
    // --------------------------------------------------------
    fastify.get(
        "/:siteId",
        {
            schema: {
                tags: ["Site Up"],
                summary: "Get site up by Site ID",
                description: "Get site up data for a specific site",
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
                            data: siteUpSwaggerSchemas.SiteUpResponse,
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
        SiteUpController.getBySiteId
    );

    // --------------------------------------------------------
    // POST /api/site-up - Create or update site up (upsert)
    // --------------------------------------------------------
    fastify.post(
        "/",
        {
            schema: {
                tags: ["Site Up"],
                summary: "Create or update site up",
                description: "Create new site up or update existing one (upsert by siteId)",
                body: {
                    type: "object",
                    required: ["siteId"],
                    properties: {
                        siteId: { type: "string", description: "Site ID" },
                        siteName: { type: "string", nullable: true, description: "Site Name" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: siteUpSwaggerSchemas.SiteUpResponse,
                        },
                    },
                },
            },
        },
        SiteUpController.upsert
    );

    // --------------------------------------------------------
    // PATCH /api/site-up/:siteId - Update site up
    // --------------------------------------------------------
    fastify.patch(
        "/:siteId",
        {
            schema: {
                tags: ["Site Up"],
                summary: "Update site up",
                description: "Update existing site up by Site ID",
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
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: siteUpSwaggerSchemas.SiteUpResponse,
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
        SiteUpController.update
    );

    // --------------------------------------------------------
    // DELETE /api/site-up/:siteId - Delete site up
    // --------------------------------------------------------
    fastify.delete(
        "/:siteId",
        {
            schema: {
                tags: ["Site Up"],
                summary: "Delete site up",
                description: "Delete site up by Site ID",
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
        SiteUpController.delete
    );

    // --------------------------------------------------------
    // POST /api/site-up/sync - Sync data from NMS API
    // --------------------------------------------------------
    fastify.post(
        "/sync",
        {
            schema: {
                tags: ["Site Up"],
                summary: "Sync data from NMS API",
                description: "Manually trigger sync from NMS API to update site up data",
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
        SiteUpController.syncFromNms
    );
}

