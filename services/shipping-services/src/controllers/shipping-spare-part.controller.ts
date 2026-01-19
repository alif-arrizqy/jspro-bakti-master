import { FastifyRequest, FastifyReply } from "fastify";
import { shippingSparePartService } from "../services/shipping-spare-part.service";
import {
    ShippingSparePartCreateSchema,
    ShippingSparePartUpdateSchema,
    ShippingSparePartQuerySchema,
    ShippingSparePartIdParamSchema,
    ShippingExportQuerySchema,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";
import { processImageUpload } from "../utils/file-upload.util";

export class ShippingSparePartController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingSparePartQuerySchema.parse(request.query);
            const result = await shippingSparePartService.getAll(query);
            return reply.send({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting shipping spare parts");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get shipping spare parts",
            });
        }
    }

    async getActive(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingSparePartQuerySchema.omit({ status: true }).parse(request.query);
            const result = await shippingSparePartService.getActive(query);
            return reply.send({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting active shipping spare parts");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get active shipping spare parts",
            });
        }
    }

    async getHistory(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingSparePartQuerySchema.omit({ status: true }).parse(request.query);
            const result = await shippingSparePartService.getHistory(query);
            return reply.send({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting shipping history");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get shipping history",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ShippingSparePartIdParamSchema.parse(request.params);
            const shipping = await shippingSparePartService.getById(params.id);
            return reply.send({
                success: true,
                data: shipping,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting shipping by ID");
            const status = error instanceof Error && error.message === "Shipping spare part not found" ? 404 : 500;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get shipping spare part",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Handle multipart form data
            const parts = request.parts();
            const fields: Record<string, any> = {};
            let ticketImageFile: any = null;

            for await (const part of parts) {
                if (part.type === "file" && part.fieldname === "ticket_image") {
                    ticketImageFile = part;
                } else if (part.type === "field") {
                    fields[part.fieldname] = part.value;
                }
            }

            // Process ticket image upload
            let ticketImageUrl: string | null = null;
            if (ticketImageFile) {
                ticketImageUrl = await processImageUpload(ticketImageFile, "ticket");
            }

            // Parse and validate data
            const data = ShippingSparePartCreateSchema.parse({
                ...fields,
                ticket_image: ticketImageUrl,
            });

            const shipping = await shippingSparePartService.create(data);
            return reply.status(201).send({
                success: true,
                data: shipping,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error creating shipping spare part");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create shipping spare part",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ShippingSparePartIdParamSchema.parse(request.params);

            // Handle multipart form data
            const parts = request.parts();
            const fields: Record<string, any> = {};
            let resiImageFile: any = null;

            for await (const part of parts) {
                if (part.type === "file" && part.fieldname === "resi_image") {
                    resiImageFile = part;
                } else if (part.type === "field") {
                    fields[part.fieldname] = part.value;
                }
            }

            // Process resi image upload
            let resiImageUrl: string | null = null;
            if (resiImageFile) {
                resiImageUrl = await processImageUpload(resiImageFile, "resi");
            }

            // Parse and validate data
            const data = ShippingSparePartUpdateSchema.parse({
                ...fields,
                resi_image: resiImageUrl !== null ? resiImageUrl : fields.resi_image,
            });

            const shipping = await shippingSparePartService.update(params.id, data);
            return reply.send({
                success: true,
                data: shipping,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error updating shipping spare part");
            const status =
                error instanceof Error && error.message === "Shipping spare part not found"
                    ? 404
                    : error instanceof Error && error.message.includes("Invalid status transition")
                    ? 400
                    : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update shipping spare part",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ShippingSparePartIdParamSchema.parse(request.params);
            await shippingSparePartService.delete(params.id);
            return reply.send({
                success: true,
                message: "Shipping spare part deleted successfully",
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error deleting shipping spare part");
            const status = error instanceof Error && error.message.includes("not found") ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete shipping spare part",
            });
        }
    }

    async exportToExcel(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingExportQuerySchema.parse(request.query);
            const { buffer, filename } = await shippingSparePartService.exportToExcel(query);

            reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);
            return reply.send(buffer);
        } catch (error) {
            shippingLogger.error({ error }, "Error exporting shipping spare parts to Excel");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to export to Excel",
            });
        }
    }
}

export const shippingSparePartController = new ShippingSparePartController();

