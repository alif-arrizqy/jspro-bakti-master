import { FastifyRequest, FastifyReply } from "fastify";
import { historyGamasService } from "../services/history-gamas.service";
import type { HistoryGamasQueryParams } from "../types/history-gamas.types";
import { slaLogger } from "../utils/logger";
import { z } from "zod";

const createHistoryGamasSchema = z.object({
    date: z.string(),
    description: z.string().nullable().optional(),
});

const updateHistoryGamasSchema = z.object({
    date: z.string().optional(),
    description: z.string().nullable().optional(),
});

export class HistoryGamasController {
    /**
     * Create History Gamas
     */
    static async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = createHistoryGamasSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await historyGamasService.create(parsed.data);
            if (!result) {
                return reply.status(400).send({
                    success: false,
                    error: "Failed to create History Gamas",
                });
            }
            return reply.send({ success: true, message: "History Gamas created successfully" });
        } catch (error) {
            slaLogger.error({ error }, "Error creating History Gamas");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create data",
            });
        }
    }

    /**
     * Get all History Gamas
     */
    static async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as HistoryGamasQueryParams;
            const result = await historyGamasService.getAll(query);
            return reply.send({
                success: true,
                ...result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting History Gamas");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Get History Gamas by ID
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

            const result = await historyGamasService.getById(id);
            if (!result) {
                return reply.status(404).send({
                    success: false,
                    error: "History Gamas not found",
                });
            }

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting History Gamas by ID");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get data",
            });
        }
    }

    /**
     * Update History Gamas by ID
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

            const parsed = updateHistoryGamasSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid request body",
                    details: parsed.error.flatten(),
                });
            }

            const result = await historyGamasService.update(id, parsed.data);
            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error updating History Gamas");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update data",
            });
        }
    }

    /**
     * Delete History Gamas by ID
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

            const result = await historyGamasService.delete(id);
            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error deleting History Gamas");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete data",
            });
        }
    }
}

