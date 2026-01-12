import { FastifyRequest, FastifyReply } from "fastify";
import { siteUpService } from "../services/site-up.service";
import {
    siteUpQuerySchema,
    siteUpIdParamSchema,
    siteUpBodySchema,
    siteUpUpdateSchema,
} from "../schemas/site-up.schema";
import { siteUpLogger } from "../utils/logger";

export class SiteUpController {
    /**
     * Get all site up data
     */
    static async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = siteUpQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid query parameters",
                    details: parsed.error.flatten(),
                });
            }

            const result = await siteUpService.getAll(parsed.data);

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            siteUpLogger.error({ error }, "Error getting site up data");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Get site up by Site ID
     */
    static async getBySiteId(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteUpIdParamSchema.safeParse(request.params);

            if (!paramsParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid site ID",
                });
            }

            const result = await siteUpService.getBySiteId(paramsParsed.data.siteId);

            if (!result) {
                return reply.status(404).send({
                    success: false,
                    error: "Site up not found",
                });
            }

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            siteUpLogger.error({ error }, "Error getting site up by site ID");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Create or update site up (upsert)
     */
    static async upsert(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = siteUpBodySchema.safeParse(request.body);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const data = {
                siteId: parsed.data.siteId,
                siteName: parsed.data.siteName ?? null,
            };

            const result = await siteUpService.upsert(data);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            siteUpLogger.error({ error }, "Error upserting site up");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to upsert data",
            });
        }
    }

    /**
     * Update site up
     */
    static async update(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteUpIdParamSchema.safeParse(request.params);
            const bodyParsed = siteUpUpdateSchema.safeParse(request.body);

            if (!paramsParsed.success || !bodyParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid parameters or request body",
                    details: {
                        params: paramsParsed.success ? undefined : paramsParsed.error.flatten(),
                        body: bodyParsed.success ? undefined : bodyParsed.error.flatten(),
                    },
                });
            }

            const updateData: any = {};
            if (bodyParsed.data.siteName !== undefined) updateData.siteName = bodyParsed.data.siteName;

            const result = await siteUpService.update(paramsParsed.data.siteId, updateData);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error: any) {
            if (error.code === "P2025") {
                return reply.status(404).send({
                    success: false,
                    error: "Site up not found",
                });
            }
            siteUpLogger.error({ error }, "Error updating site up");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update data",
            });
        }
    }

    /**
     * Delete site up
     */
    static async delete(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteUpIdParamSchema.safeParse(request.params);

            if (!paramsParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid site ID",
                });
            }

            await siteUpService.delete(paramsParsed.data.siteId);

            return reply.send({
                success: true,
                message: "Site up deleted successfully",
            });
        } catch (error: any) {
            if (error.code === "P2025") {
                return reply.status(404).send({
                    success: false,
                    error: "Site up not found",
                });
            }
            siteUpLogger.error({ error }, "Error deleting site up");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete data",
            });
        }
    }

    /**
     * Sync data from NMS API (manual trigger)
     */
    static async syncFromNms(request: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await siteUpService.syncFromNms();

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            siteUpLogger.error({ error }, "Error syncing from NMS");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to sync from NMS",
            });
        }
    }
}

