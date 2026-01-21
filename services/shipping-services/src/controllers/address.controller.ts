import { FastifyRequest, FastifyReply } from "fastify";
import { addressService } from "../services/address.service";
import {
    AddressCreateSchema,
    AddressUpdateSchema,
    AddressQuerySchema,
    AddressIdParamSchema,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";
import { ResponseHelper } from "../utils/response.util";

export class AddressController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = AddressQuerySchema.parse(request.query);
            const result = await addressService.getAll(query);
            return ResponseHelper.successWithPagination(
                reply,
                "Addresses retrieved successfully",
                result.data,
                result.pagination
            );
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get addresses", {
                logger: shippingLogger,
                context: "Error getting addresses",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = AddressIdParamSchema.parse(request.params);
            const address = await addressService.getById(params.id);
            return ResponseHelper.success(reply, "Address retrieved successfully", address);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get address", {
                logger: shippingLogger,
                context: "Error getting address by ID",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = AddressCreateSchema.parse(request.body);
            const address = await addressService.create(data);
            return ResponseHelper.success(reply, "Address created successfully", address, 201);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to create address", {
                logger: shippingLogger,
                context: "Error creating address",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = AddressIdParamSchema.parse(request.params);
            const data = AddressUpdateSchema.parse(request.body);
            const address = await addressService.update(params.id, data);
            return ResponseHelper.success(reply, "Address updated successfully", address);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to update address", {
                logger: shippingLogger,
                context: "Error updating address",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = AddressIdParamSchema.parse(request.params);
            await addressService.delete(params.id);
            return ResponseHelper.success(reply, "Address deleted successfully");
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to delete address", {
                logger: shippingLogger,
                context: "Error deleting address",
            });
        }
    }
}

export const addressController = new AddressController();

