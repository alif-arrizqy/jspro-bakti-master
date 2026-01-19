import { FastifyRequest, FastifyReply } from "fastify";
import { problemMasterService } from "../services/problem-master.service";
import {
    ProblemMasterCreateSchema,
    ProblemMasterUpdateSchema,
    ProblemMasterQuerySchema,
    ProblemMasterIdParamSchema,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";

export class ProblemMasterController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ProblemMasterQuerySchema.parse(request.query);
            const result = await problemMasterService.getAll(query);
            return reply.send({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting problems");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get problems",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ProblemMasterIdParamSchema.parse(request.params);
            const problem = await problemMasterService.getById(params.id);
            return reply.send({
                success: true,
                data: problem,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting problem by ID");
            const status = error instanceof Error && error.message === "Problem not found" ? 404 : 500;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get problem",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = ProblemMasterCreateSchema.parse(request.body);
            const problem = await problemMasterService.create(data);
            return reply.status(201).send({
                success: true,
                data: problem,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error creating problem");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create problem",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ProblemMasterIdParamSchema.parse(request.params);
            const data = ProblemMasterUpdateSchema.parse(request.body);
            const problem = await problemMasterService.update(params.id, data);
            return reply.send({
                success: true,
                data: problem,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error updating problem");
            const status = error instanceof Error && error.message === "Problem not found" ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update problem",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ProblemMasterIdParamSchema.parse(request.params);
            await problemMasterService.delete(params.id);
            return reply.send({
                success: true,
                message: "Problem deleted successfully",
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error deleting problem");
            const status = error instanceof Error && error.message.includes("not found") ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete problem",
            });
        }
    }
}

export const problemMasterController = new ProblemMasterController();

