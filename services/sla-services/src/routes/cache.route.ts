import { FastifyInstance } from "fastify";
import { CacheController } from "../controllers/cache.controller";

// ============================================================
// Cache Routes
// ============================================================

export async function cacheRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // POST /api/v1/cache/refresh - Refresh cache by date range
    // --------------------------------------------------------
    fastify.post(
        "/refresh",
        {
            schema: {
                tags: ["Cache"],
                summary: "Refresh cache by date range",
                description: "Invalidate and refresh Redis cache for the specified date range. If no date range is provided, it will use the dashboard date range logic (tanggal 1 = bulan sebelumnya, tanggal 2+ = bulan ini).",
                body: {
                    type: "object",
                    properties: {
                        startDate: {
                            type: "string",
                            description: "Start date in YYYY-MM-DD format (optional)",
                            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                        },
                        endDate: {
                            type: "string",
                            description: "End date in YYYY-MM-DD format (optional)",
                            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    message: { type: "string" },
                                    startDate: { type: "string" },
                                    endDate: { type: "string" },
                                },
                            },
                        },
                    },
                    400: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                            details: { type: "object" },
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
        CacheController.refreshCache
    );
}

