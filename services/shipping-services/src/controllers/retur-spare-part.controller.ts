import { FastifyRequest, FastifyReply } from "fastify";
import { returSparePartService } from "../services/retur-spare-part.service";
import {
    ReturSparePartCreateSchema,
    ReturSparePartUpdateSchema,
    ReturSparePartQuerySchema,
    ReturSparePartIdParamSchema,
    ReturExportQuerySchema,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";
import { processImageUpload } from "../utils/file-upload.util";

export class ReturSparePartController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ReturSparePartQuerySchema.parse(request.query);
            const result = await returSparePartService.getAll(query);
            return reply.send({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting retur spare parts");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get retur spare parts",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ReturSparePartIdParamSchema.parse(request.params);
            const retur = await returSparePartService.getById(params.id);
            return reply.send({
                success: true,
                data: retur,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error getting retur by ID");
            const status = error instanceof Error && error.message === "Retur spare part not found" ? 404 : 500;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get retur spare part",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Handle multipart form data
            const parts = request.parts();
            const fields: Record<string, any> = {};
            let imageFile: any = null;

            for await (const part of parts) {
                if (part.type === "file" && part.fieldname === "image") {
                    imageFile = part;
                } else if (part.type === "field") {
                    // Parse JSON fields
                    if (part.fieldname === "list_spare_part") {
                        try {
                            fields[part.fieldname] = JSON.parse(part.value);
                        } catch {
                            fields[part.fieldname] = part.value;
                        }
                    } else {
                        fields[part.fieldname] = part.value;
                    }
                }
            }

            // Process image upload
            let imageUrl: string | null = null;
            if (imageFile) {
                imageUrl = await processImageUpload(imageFile, "retur");
            }

            // Parse and validate data
            const data = ReturSparePartCreateSchema.parse({
                ...fields,
                image: imageUrl,
            });

            const retur = await returSparePartService.create(data);
            return reply.status(201).send({
                success: true,
                data: retur,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error creating retur spare part");
            return reply.status(400).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create retur spare part",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ReturSparePartIdParamSchema.parse(request.params);

            // Handle multipart form data
            const parts = request.parts();
            const fields: Record<string, any> = {};
            let imageFile: any = null;

            for await (const part of parts) {
                if (part.type === "file" && part.fieldname === "image") {
                    imageFile = part;
                } else if (part.type === "field") {
                    // Parse JSON fields
                    if (part.fieldname === "list_spare_part") {
                        try {
                            fields[part.fieldname] = JSON.parse(part.value);
                        } catch {
                            fields[part.fieldname] = part.value;
                        }
                    } else {
                        fields[part.fieldname] = part.value;
                    }
                }
            }

            // Process image upload
            let imageUrl: string | null = undefined;
            if (imageFile) {
                imageUrl = await processImageUpload(imageFile, "retur");
            }

            // Parse and validate data
            const data = ReturSparePartUpdateSchema.parse({
                ...fields,
                ...(imageUrl !== null && { image: imageUrl }),
            });

            const retur = await returSparePartService.update(params.id, data);
            return reply.send({
                success: true,
                data: retur,
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error updating retur spare part");
            const status = error instanceof Error && error.message === "Retur spare part not found" ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update retur spare part",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ReturSparePartIdParamSchema.parse(request.params);
            await returSparePartService.delete(params.id);
            return reply.send({
                success: true,
                message: "Retur spare part deleted successfully",
            });
        } catch (error) {
            shippingLogger.error({ error }, "Error deleting retur spare part");
            const status = error instanceof Error && error.message.includes("not found") ? 404 : 400;
            return reply.status(status).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete retur spare part",
            });
        }
    }

    async exportToExcel(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ReturExportQuerySchema.parse(request.query);
            const { buffer, filename } = await returSparePartService.exportToExcel(query);

            reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);
            return reply.send(buffer);
        } catch (error) {
            shippingLogger.error({ error }, "Error exporting retur spare parts to Excel");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to export to Excel",
            });
        }
    }
}

export const returSparePartController = new ReturSparePartController();

