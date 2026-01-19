import { FastifyRequest, FastifyReply } from "fastify";
import { addressService } from "../services/address.service";
import {
    AddressCreateSchema,
    AddressUpdateSchema,
    AddressQuerySchema,
    AddressIdParamSchema,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";

export class AddressController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = AddressQuerySchema.parse(request.query);
            const result = await addressService.getAll(query);
            return reply.send({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting addresses");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get addresses",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = AddressIdParamSchema.parse(request.params);
            const address = await addressService.getById(params.id);
            return reply.send({
                success: true,
                data: address,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting address by ID");
            const status = error instanceof Error && error.message === "Address not found" ? 404 : 500;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get address",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = AddressCreateSchema.parse(request.body);
            const address = await addressService.create(data);
            return reply.status(201).send({
                success: true,
                data: address,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error creating address");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create address",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = AddressIdParamSchema.parse(request.params);
            const data = AddressUpdateSchema.parse(request.body);
            const address = await addressService.update(params.id, data);
            return reply.send({
                success: true,
                data: address,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error updating address");
            const status = error instanceof Error && error.message === "Address not found" ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update address",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = AddressIdParamSchema.parse(request.params);
            await addressService.delete(params.id);
            return reply.send({
                success: true,
                message: "Address deleted successfully",
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error deleting address");
            const status = error instanceof Error && error.message.includes("not found") ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete address",
            });
        }
    }
}

export const addressController = new AddressController();

