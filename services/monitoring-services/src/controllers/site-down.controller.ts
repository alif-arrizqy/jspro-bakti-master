import { FastifyRequest, FastifyReply } from "fastify";
import { siteDownService } from "../services/site-down.service";
import {
    siteDowntimeQuerySchema,
    siteIdParamSchema,
    siteDowntimeBodySchema,
    siteDowntimeUpdateSchema,
} from "../schemas/site-down.schema";
import { siteDownLogger } from "../utils/logger";

export class SiteDownController {
    /**
     * Get all site downtime data
     */
    static async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = siteDowntimeQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid query parameters",
                    details: parsed.error.flatten(),
                });
            }

            const result = await siteDownService.getAll(parsed.data);

            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            siteDownLogger.error({ error }, "Error getting site downtime data");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Get site downtime by Site ID
     */
    static async getBySiteId(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteIdParamSchema.safeParse(request.params);

            if (!paramsParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid site ID",
                });
            }

            const result = await siteDownService.getBySiteId(paramsParsed.data.siteId);

            if (!result) {
                return reply.status(404).send({
                    success: false,
                    error: "Site downtime not found",
                });
            }

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            siteDownLogger.error({ error }, "Error getting site downtime by site ID");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Create or update site downtime (upsert)
     */
    static async upsert(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = siteDowntimeBodySchema.safeParse(request.body);

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
                downSince: new Date(parsed.data.downSince),
                downSeconds: parsed.data.downSeconds ?? null,
            };

            const result = await siteDownService.upsert(data);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            siteDownLogger.error({ error }, "Error upserting site downtime");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to upsert data",
            });
        }
    }

    /**
     * Update site downtime
     */
    static async update(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteIdParamSchema.safeParse(request.params);
            const bodyParsed = siteDowntimeUpdateSchema.safeParse(request.body);

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
            if (bodyParsed.data.downSince) updateData.downSince = new Date(bodyParsed.data.downSince);
            if (bodyParsed.data.downSeconds !== undefined) updateData.downSeconds = bodyParsed.data.downSeconds;

            const result = await siteDownService.update(paramsParsed.data.siteId, updateData);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error: any) {
            if (error.code === "P2025") {
                return reply.status(404).send({
                    success: false,
                    error: "Site downtime not found",
                });
            }
            siteDownLogger.error({ error }, "Error updating site downtime");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update data",
            });
        }
    }

    /**
     * Delete site downtime
     */
    static async delete(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
        try {
            const paramsParsed = siteIdParamSchema.safeParse(request.params);

            if (!paramsParsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid site ID",
                });
            }

            await siteDownService.delete(paramsParsed.data.siteId);

            return reply.send({
                success: true,
                message: "Site downtime deleted successfully",
            });
        } catch (error: any) {
            if (error.code === "P2025") {
                return reply.status(404).send({
                    success: false,
                    error: "Site downtime not found",
                });
            }
            siteDownLogger.error({ error }, "Error deleting site downtime");
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
            const result = await siteDownService.syncFromNms();

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            siteDownLogger.error({ error }, "Error syncing from NMS");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to sync from NMS",
            });
        }
    }
}

