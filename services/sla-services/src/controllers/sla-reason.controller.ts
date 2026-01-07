import { FastifyRequest, FastifyReply } from "fastify";
import { slaReasonService } from "../services/sla-reason.service";
import type { SlaReasonQueryParams } from "../types/sla-reason.types";
import { slaLogger } from "../utils/logger";
import { z } from "zod";

const createSlaReasonSchema = z.object({
    reason: z.string().min(1),
});

const updateSlaReasonSchema = z.object({
    reason: z.string().min(1).optional(),
});

const addBatteryVersionReasonSchema = z.object({
    batteryVersion: z.string(),
    reasonId: z.number(),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format").optional(), // Format: YYYY-MM
});

export class SlaReasonController {
    /**
     * Create SLA Reason
     */
    static async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = createSlaReasonSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaReasonService.create(parsed.data);
            if (!result) {
                return reply.status(400).send({
                    success: false,
                    error: "Failed to create SLA Reason",
                });
            }
            return reply.send({ 
                success: true, 
                message: "SLA Reason created successfully",
                data: result
            });
        } catch (error: any) {
            if (error.code === "P2002") {
                return reply.status(400).send({
                    success: false,
                    error: "Reason already exists",
                });
            }
            slaLogger.error({ error }, "Error creating SLA Reason");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create data",
            });
        }
    }

    /**
     * Get all SLA Reasons
     */
    static async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as SlaReasonQueryParams;
            const result = await slaReasonService.getAll(query);
            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting SLA Reasons");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Get SLA Reason by ID
     */
    static async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid ID",
                });
            }

            const result = await slaReasonService.getById(id);
            if (!result) {
                return reply.status(404).send({
                    success: false,
                    error: "SLA Reason not found",
                });
            }

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting SLA Reason by ID");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Update SLA Reason by ID
     */
    static async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid ID",
                });
            }

            const parsed = updateSlaReasonSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaReasonService.update(id, parsed.data);
            return reply.send({
                success: true,
                data: result,
            });
        } catch (error: any) {
            if (error.code === "P2002") {
                return reply.status(400).send({
                    success: false,
                    error: "Reason already exists",
                });
            }
            slaLogger.error({ error }, "Error updating SLA Reason");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update data",
            });
        }
    }

    /**
     * Delete SLA Reason by ID
     */
    static async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid ID",
                });
            }

            const result = await slaReasonService.delete(id);
            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error deleting SLA Reason");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete data",
            });
        }
    }

    /**
     * Add reason to battery version
     */
    static async addBatteryVersionReason(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = addBatteryVersionReasonSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaReasonService.addBatteryVersionReason(parsed.data);
            if (!result) {
                return reply.status(400).send({
                    success: false,
                    error: "Failed to add battery version reason",
                });
            }
            return reply.send({ 
                success: true,
                message: "Battery version added successfully",
                data: result
            });
        } catch (error: any) {
            if (error.code === "P2002") {
                return reply.status(400).send({
                    success: false,
                    error: "Battery version reason already exists",
                });
            }
            slaLogger.error({ error }, "Error adding battery version reason");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to add battery version reason",
            });
        }
    }

    /**
     * Remove reason from battery version
     */
    static async removeBatteryVersionReason(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid ID",
                });
            }

            const result = await slaReasonService.removeBatteryVersionReason(id);
            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error removing battery version reason");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to remove battery version reason",
            });
        }
    }

    /**
     * Get reasons by battery version
     */
    static async getReasonsByBatteryVersion(
        request: FastifyRequest<{ 
            Params: { batteryVersion: string };
            Querystring: { startDate?: string; endDate?: string; period?: string };
        }>, 
        reply: FastifyReply
    ) {
        try {
            const { batteryVersion } = request.params;
            const { startDate, endDate, period } = request.query;
            const result = await slaReasonService.getReasonsByBatteryVersion(batteryVersion, { startDate, endDate, period });
            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting reasons by battery version");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }
}

