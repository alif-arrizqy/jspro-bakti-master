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
import { ResponseHelper } from "../utils/response.util";

export class ShippingSparePartController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingSparePartQuerySchema.parse(request.query);
            const result = await shippingSparePartService.getAll(query);
            return ResponseHelper.successWithPagination(
                reply,
                "Shipping spare parts retrieved successfully",
                result.data,
                result.pagination
            );
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get shipping spare parts", {
                logger: shippingLogger,
                context: "Error getting shipping spare parts",
            });
        }
    }

    async getActive(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingSparePartQuerySchema.omit({ status: true }).parse(request.query);
            const result = await shippingSparePartService.getActive(query);
            return ResponseHelper.successWithPagination(
                reply,
                "Active shipping spare parts retrieved successfully",
                result.data,
                result.pagination
            );
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get active shipping spare parts", {
                logger: shippingLogger,
                context: "Error getting active shipping spare parts",
            });
        }
    }

    async getHistory(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingSparePartQuerySchema.omit({ status: true }).parse(request.query);
            const result = await shippingSparePartService.getHistory(query);
            return ResponseHelper.successWithPagination(
                reply,
                "Shipping history retrieved successfully",
                result.data,
                result.pagination
            );
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get shipping history", {
                logger: shippingLogger,
                context: "Error getting shipping history",
            });
        }
    }

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ShippingSparePartIdParamSchema.parse(request.params);
            const shipping = await shippingSparePartService.getById(params.id);
            return ResponseHelper.success(reply, "Shipping spare part retrieved successfully", shipping);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get shipping spare part", {
                logger: shippingLogger,
                context: "Error getting shipping by ID",
            });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const fields: Record<string, any> = {};
            let ticketImageUrl: string | null = null;
            const parts = request.parts();

            for await (const part of parts) {
                try {
                    if (part.type === "file") {
                        if (part.fieldname === "ticket_image") {
                            try {
                                ticketImageUrl = await processImageUpload(part, "ticket");
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

            const dataToValidate: Record<string, any> = {
                ...fields,
                ticket_image: ticketImageUrl,
            };

            if (dataToValidate.address_id) {
                dataToValidate.address_id = Number(dataToValidate.address_id);
            }
            if (dataToValidate.problem_id) {
                dataToValidate.problem_id = Number(dataToValidate.problem_id);
            }

            let data;
            try {
                data = ShippingSparePartCreateSchema.parse(dataToValidate);
            } catch (error: any) {
                shippingLogger.error({ error: error.errors || error.message }, "Validation error");
                return ResponseHelper.error(
                    reply,
                    `Validation error: ${error.errors ? JSON.stringify(error.errors) : error.message}`,
                    400
                );
            }

            const shipping = await shippingSparePartService.create(data);
            return ResponseHelper.success(reply, "Shipping spare part created successfully", shipping, 201);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to create shipping spare part", {
                logger: shippingLogger,
                context: "Error creating shipping spare part",
            });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ShippingSparePartIdParamSchema.parse(request.params);
            const parts = request.parts();
            const fields: Record<string, any> = {};
            let resiImageUrl: string | null = null;

            for await (const part of parts) {
                try {
                    if (part.type === "file") {
                        if (part.fieldname === "resi_image") {
                            try {
                                resiImageUrl = await processImageUpload(part, "resi");
                            } catch (uploadError: any) {
                                shippingLogger.error({ error: uploadError.message }, "Error processing resi image upload");
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

            const data = ShippingSparePartUpdateSchema.parse({
                ...fields,
                resi_image: resiImageUrl !== null ? resiImageUrl : fields.resi_image,
            });

            const shipping = await shippingSparePartService.update(params.id, data);
            return ResponseHelper.success(reply, "Shipping spare part updated successfully", shipping);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to update shipping spare part", {
                logger: shippingLogger,
                context: "Error updating shipping spare part",
            });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const params = ShippingSparePartIdParamSchema.parse(request.params);
            await shippingSparePartService.delete(params.id);
            return ResponseHelper.success(reply, "Shipping spare part deleted successfully");
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to delete shipping spare part", {
                logger: shippingLogger,
                context: "Error deleting shipping spare part",
            });
        }
    }

    async getStatistics(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as { site_id?: string; startDate?: string; endDate?: string };
            const statistics = await shippingSparePartService.getStatistics(query);
            return ResponseHelper.success(reply, "Statistics retrieved successfully", statistics);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to get statistics", {
                logger: shippingLogger,
                context: "Error getting shipping statistics",
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
            return ResponseHelper.handleError(reply, error, "Failed to export to Excel", {
                logger: shippingLogger,
                context: "Error exporting shipping spare parts to Excel",
            });
        }
    }

    async exportToPDF(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = ShippingExportQuerySchema.parse(request.query);
            const { buffer, filename } = await shippingSparePartService.exportToPDF(query);

            reply.header("Content-Type", "application/pdf");
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);
            return reply.send(buffer);
        } catch (error) {
            return ResponseHelper.handleError(reply, error, "Failed to export to PDF", {
                logger: shippingLogger,
                context: "Error exporting shipping spare parts to PDF",
            });
        }
    }
}

export const shippingSparePartController = new ShippingSparePartController();

