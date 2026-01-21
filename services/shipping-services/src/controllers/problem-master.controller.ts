import { FastifyRequest, FastifyReply } from "fastify";
import { problemMasterService } from "../services/problem-master.service";
import {
    ProblemMasterCreateSchema,
    ProblemMasterUpdateSchema,
    ProblemMasterQuerySchema,
    ProblemMasterIdParamSchema,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";
import { ResponseHelper } from "../utils/response.util";

export class ProblemMasterController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ProblemMasterQuerySchema.parse(request.query);
            const result = await problemMasterService.getAll(query);
            return ResponseHelper.successWithPagination(
                reply,
                "Problems retrieved successfully",
                result.data,
                result.pagination
            );
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get problems", {
                logger: shippingLogger,
                context: "Error getting problems",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ProblemMasterIdParamSchema.parse(request.params);
            const problem = await problemMasterService.getById(params.id);
            return ResponseHelper.success(reply, "Problem retrieved successfully", problem);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get problem", {
                logger: shippingLogger,
                context: "Error getting problem by ID",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = ProblemMasterCreateSchema.parse(request.body);
            const problem = await problemMasterService.create(data);
            return ResponseHelper.success(reply, "Problem created successfully", problem, 201);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to create problem", {
                logger: shippingLogger,
                context: "Error creating problem",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ProblemMasterIdParamSchema.parse(request.params);
            const data = ProblemMasterUpdateSchema.parse(request.body);
            const problem = await problemMasterService.update(params.id, data);
            return ResponseHelper.success(reply, "Problem updated successfully", problem);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to update problem", {
                logger: shippingLogger,
                context: "Error updating problem",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ProblemMasterIdParamSchema.parse(request.params);
            await problemMasterService.delete(params.id);
            return ResponseHelper.success(reply, "Problem deleted successfully");
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to delete problem", {
                logger: shippingLogger,
                context: "Error deleting problem",
            });
        }
    }
}

export const problemMasterController = new ProblemMasterController();

