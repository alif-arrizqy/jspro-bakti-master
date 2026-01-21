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
import { ResponseHelper } from "../utils/response.util";

export class ReturSparePartController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ReturSparePartQuerySchema.parse(request.query);
            const result = await returSparePartService.getAll(query);
            return ResponseHelper.successWithPagination(
                reply,
                "Retur spare parts retrieved successfully",
                result.data,
                result.pagination
            );
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get retur spare parts", {
                logger: shippingLogger,
                context: "Error getting retur spare parts",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ReturSparePartIdParamSchema.parse(request.params);
            const retur = await returSparePartService.getById(params.id);
            return ResponseHelper.success(reply, "Retur spare part retrieved successfully", retur);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get retur spare part", {
                logger: shippingLogger,
                context: "Error getting retur by ID",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const fields: Record<string, any> = {};
            let imageUrl: string | null = null;
            const parts = request.parts();

            for await (const part of parts) {
                try {
                    if (part.type === "file") {
                        if (part.fieldname === "image") {
                            try {
                                imageUrl = await processImageUpload(part, "retur");
                            } catch (uploadError: any) {
                                shippingLogger.error({ error: uploadError.message }, "Error processing image upload");
                                return ResponseHelper.error(reply, `Error processing image: ${uploadError.message}`, 400);
                            }
                        } else {
                            await part.toBuffer();
                        }
                    } else if (part.type === "field") {
                        const value = part.value === "" ? null : part.value;
                        fields[part.fieldname] = value;
                    }
                } catch (partError: any) {
                    shippingLogger.error({ error: partError.message, fieldname: part.fieldname }, "Error processing part");
                    throw partError;
                }
            }

            let data;
            try {
                data = ReturSparePartCreateSchema.parse({
                    ...fields,
                    image: imageUrl,
                });
            } catch (error: any) {
                shippingLogger.error({ error: error.errors || error.message }, "Validation error");
                return ResponseHelper.error(
                    reply,
                    `Validation error: ${error.errors ? JSON.stringify(error.errors) : error.message}`,
                    400
                );
            }

            const retur = await returSparePartService.create(data);
            return ResponseHelper.success(reply, "Retur spare part created successfully", retur, 201);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to create retur spare part", {
                logger: shippingLogger,
                context: "Error creating retur spare part",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ReturSparePartIdParamSchema.parse(request.params);
            const parts = request.parts();
            const fields: Record<string, any> = {};
            let imageUrl: string | null = null;

            for await (const part of parts) {
                try {
                    if (part.type === "file") {
                        if (part.fieldname === "image") {
                            try {
                                imageUrl = await processImageUpload(part, "retur");
                            } catch (uploadError: any) {
                                shippingLogger.error({ error: uploadError.message }, "Error processing retur image upload");
                                return ResponseHelper.error(reply, `Error processing image: ${uploadError.message}`, 400);
                            }
                        } else {
                            await part.toBuffer();
                        }
                    } else if (part.type === "field") {
                        const value = part.value === "" ? null : part.value;
                        fields[part.fieldname] = value;
                    }
                } catch (partError: any) {
                    shippingLogger.error({ error: partError.message, fieldname: part.fieldname }, "Error processing part");
                    throw partError;
                }
            }

            const data = ReturSparePartUpdateSchema.parse({
                ...fields,
                ...(imageUrl !== null && { image: imageUrl }),
            });

            const retur = await returSparePartService.update(params.id, data);
            return ResponseHelper.success(reply, "Retur spare part updated successfully", retur);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to update retur spare part", {
                logger: shippingLogger,
                context: "Error updating retur spare part",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ReturSparePartIdParamSchema.parse(request.params);
            await returSparePartService.delete(params.id);
            return ResponseHelper.success(reply, "Retur spare part deleted successfully");
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to delete retur spare part", {
                logger: shippingLogger,
                context: "Error deleting retur spare part",
            });
        }
    }

    async getStatistics(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as { startDate?: string; endDate?: string; shipper?: string; source_spare_part?: string };
            const statistics = await returSparePartService.getStatistics(query);
            return ResponseHelper.success(reply, "Statistics retrieved successfully", statistics);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get statistics", {
                logger: shippingLogger,
                context: "Error getting retur statistics",
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
            return ResponseHelper.handleError(reply, error, "Failed to export to Excel", {
                logger: shippingLogger,
                context: "Error exporting retur spare parts to Excel",
            });
        }
    }

    async exportToPDF(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ReturExportQuerySchema.parse(request.query);
            const { buffer, filename } = await returSparePartService.exportToPDF(query);

            reply.header("Content-Type", "application/pdf");
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);
            return reply.send(buffer);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to export to PDF", {
                logger: shippingLogger,
                context: "Error exporting retur spare parts to PDF",
            });
        }
    }
}

export const returSparePartController = new ReturSparePartController();

