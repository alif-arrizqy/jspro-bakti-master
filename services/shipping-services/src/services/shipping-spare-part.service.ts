import { Prisma } from "@prisma/shipping-client";
import prisma from "../config/prisma";
import type {
    ShippingSparePartCreate,
    ShippingSparePartUpdate,
    ShippingSparePartQuery,
} from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";
import { deleteImageFile } from "../utils/file-upload.util";
import { generateShippingSparePartExcel } from "../utils/excel.util";
import { sitesService } from "./sites.service";

export class ShippingSparePartService {
    async getAll(query: ShippingSparePartQuery) {
        const { page, limit, status, site_id, address_id, problem_id, startDate, endDate, search } = query;
        const skip = (page - 1) * limit;

        // Handle status filter (can be single or array)
        let statusFilter: Prisma.ShippingSparePartWhereInput["status"] | undefined;
        if (status) {
            if (Array.isArray(status)) {
                statusFilter = { in: status };
            } else {
                statusFilter = status;
            }
        }

        const where: Prisma.ShippingSparePartWhereInput = {
            ...(statusFilter && { status: statusFilter }),
            ...(site_id && { site_id }),
            ...(address_id && { address_id }),
            ...(problem_id && { problem_id }),
            ...(startDate &&
                endDate && {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
            ...(startDate &&
                !endDate && {
                    date: {
                        gte: new Date(startDate),
                    },
                }),
            ...(!startDate &&
                endDate && {
                    date: {
                        lte: new Date(endDate),
                    },
                }),
            ...(search && {
                OR: [
                    { ticket_number: { contains: search, mode: "insensitive" } },
                    { sparepart_note: { contains: search, mode: "insensitive" } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            prisma.shippingSparePart.findMany({
                where,
                skip,
                take: limit,
                include: {
                    address: true,
                    problem: true,
                },
                orderBy: { created_at: "desc" },
            }),
            prisma.shippingSparePart.count({ where }),
        ]);

        // Transform data to plain objects - ensure proper serialization (following address/problem-master pattern)
        const transformedData = data.map((item) => {
            if (!item) return null;
            return {
                id: Number(item.id),
                date: item.date ? new Date(item.date).toISOString().split("T")[0] : null,
                site_id: item.site_id ? String(item.site_id) : null,
                address_id: item.address_id ? Number(item.address_id) : null,
                address: item.address
                    ? {
                          id: Number(item.address.id),
                          province: String(item.address.province || ""),
                          cluster: item.address.cluster ? String(item.address.cluster) : null,
                          address_shipping: String(item.address.address_shipping || ""),
                      }
                    : null,
                sparepart_note: item.sparepart_note ? String(item.sparepart_note) : null,
                problem_id: item.problem_id ? Number(item.problem_id) : null,
                problem: item.problem
                    ? {
                          id: Number(item.problem.id),
                          problem_name: String(item.problem.problem_name || ""),
                      }
                    : null,
                ticket_number: item.ticket_number ? String(item.ticket_number) : null,
                ticket_image: item.ticket_image ? String(item.ticket_image) : null,
                status: item.status ? String(item.status) : null,
                resi_number: item.resi_number ? String(item.resi_number) : null,
                resi_image: item.resi_image ? String(item.resi_image) : null,
                created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
                updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null,
            };
        }).filter((item) => item !== null);

        return {
            data: transformedData,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: Number(total),
                totalPages: Math.ceil(Number(total) / Number(limit)),
            },
        };
    }

    async getActive(query: Omit<ShippingSparePartQuery, "status">) {
        return this.getAll({
            ...query,
            status: ["REQUEST_GUDANG", "PROSES_KIRIM"],
        });
    }

    async getHistory(query: Omit<ShippingSparePartQuery, "status">) {
        return this.getAll({
            ...query,
            status: "SELESAI",
        });
    }

    async getById(id: number) {
        const shipping = await prisma.shippingSparePart.findUnique({
            where: { id },
            include: {
                address: true,
                problem: true,
            },
        });

        if (!shipping) {
            throw new Error("Shipping spare part not found");
        }

        return this.transformShipping(shipping);
    }

    async create(data: ShippingSparePartCreate) {
        // Validate foreign keys exist
        await this.validateForeignKeys(data.address_id, data.problem_id);

        if (data.site_id) {
            await sitesService.validateSiteId(data.site_id);
        }

        const shipping = await prisma.shippingSparePart.create({
            data: {
                date: new Date(data.date),
                site_id: data.site_id,
                address_id: data.address_id,
                sparepart_note: data.sparepart_note || null,
                problem_id: data.problem_id,
                ticket_number: data.ticket_number || null,
                ticket_image: data.ticket_image || null,
                status: data.status,
                resi_number: data.resi_number || null,
                resi_image: data.resi_image || null,
            },
            include: {
                address: true,
                problem: true,
            },
        });

        shippingLogger.info({ shippingId: shipping.id, status: shipping.status }, "Shipping created");
        return this.transformShipping(shipping);
    }

    async update(id: number, data: ShippingSparePartUpdate) {
        const existing = await prisma.shippingSparePart.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error("Shipping spare part not found");
        }

        // Validate status transition
        if (data.status) {
            this.validateStatusTransition(existing.status, data.status);
        }

        // If updating to PROSES_KIRIM, require resi_number and resi_image
        if (data.status === "PROSES_KIRIM") {
            if (!data.resi_number) {
                throw new Error("resi_number is required when status is PROSES_KIRIM");
            }
            if (!data.resi_image) {
                throw new Error("resi_image is required when status is PROSES_KIRIM");
            }
        }

        // Delete old resi_image if updating
        if (data.resi_image && existing.resi_image && data.resi_image !== existing.resi_image) {
            await deleteImageFile(existing.resi_image);
        }

        const shipping = await prisma.shippingSparePart.update({
            where: { id },
            data: {
                ...(data.resi_number !== undefined && { resi_number: data.resi_number }),
                ...(data.resi_image !== undefined && { resi_image: data.resi_image }),
                ...(data.status && { status: data.status }),
            },
            include: {
                address: true,
                problem: true,
            },
        });

        shippingLogger.info({ shippingId: id, status: shipping.status }, "Shipping updated");
        return this.transformShipping(shipping);
    }

    async delete(id: number) {
        const shipping = await prisma.shippingSparePart.findUnique({
            where: { id },
        });

        if (!shipping) {
            throw new Error("Shipping spare part not found");
        }

        // Delete associated images
        if (shipping.ticket_image) {
            await deleteImageFile(shipping.ticket_image);
        }
        if (shipping.resi_image) {
            await deleteImageFile(shipping.resi_image);
        }

        await prisma.shippingSparePart.delete({
            where: { id },
        });

        shippingLogger.info({ shippingId: id }, "Shipping deleted");
    }

    async exportToExcel(query: ShippingSparePartQuery) {
        // Get all data without pagination for export
        const { status, site_id, address_id, problem_id, startDate, endDate, search } = query;

        let statusFilter: Prisma.ShippingSparePartWhereInput["status"] | undefined;
        if (status) {
            if (Array.isArray(status)) {
                statusFilter = { in: status };
            } else {
                statusFilter = status;
            }
        }

        const where: Prisma.ShippingSparePartWhereInput = {
            ...(statusFilter && { status: statusFilter }),
            ...(site_id && { site_id }),
            ...(address_id && { address_id }),
            ...(problem_id && { problem_id }),
            ...(startDate &&
                endDate && {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
            ...(startDate &&
                !endDate && {
                    date: {
                        gte: new Date(startDate),
                    },
                }),
            ...(!startDate &&
                endDate && {
                    date: {
                        lte: new Date(endDate),
                    },
                }),
            ...(search && {
                OR: [
                    { ticket_number: { contains: search, mode: "insensitive" } },
                    { sparepart_note: { contains: search, mode: "insensitive" } },
                ],
            }),
        };

        const data = await prisma.shippingSparePart.findMany({
            where,
            include: {
                address: true,
                problem: true,
            },
            orderBy: { date: "desc" },
        });

        const buffer = await generateShippingSparePartExcel(data, query);
        const filename = this.generateExportFilename(query);

        return { buffer, filename };
    }

    private validateStatusTransition(currentStatus: string, newStatus: string) {
        const validTransitions: Record<string, string[]> = {
            REQUEST_GUDANG: ["PROSES_KIRIM"],
            PROSES_KIRIM: ["SELESAI"],
            SELESAI: [], // Cannot transition from SELESAI
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
            throw new Error(
                `Invalid status transition: cannot change from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(", ") || "none"}`
            );
        }
    }

    private async validateForeignKeys(addressId: number, problemId: number) {
        const [address, problem] = await Promise.all([
            prisma.address.findUnique({ where: { id: addressId } }),
            prisma.problemMaster.findUnique({ where: { id: problemId } }),
        ]);

        if (!address) {
            throw new Error(`Address with id ${addressId} not found`);
        }
        if (!problem) {
            throw new Error(`Problem with id ${problemId} not found`);
        }
    }

    private generateExportFilename(query: ShippingSparePartQuery): string {
        const date = new Date().toISOString().split("T")[0];
        let filename = `Shipping_Spare_Part_${date}`;

        if (query.startDate && query.endDate) {
            filename = `Shipping_Spare_Part_${query.startDate}_to_${query.endDate}`;
        } else if (query.startDate) {
            filename = `Shipping_Spare_Part_from_${query.startDate}`;
        } else if (query.endDate) {
            filename = `Shipping_Spare_Part_until_${query.endDate}`;
        }

        return `${filename}.xlsx`;
    }

    private transformShipping(shipping: any) {
        if (!shipping) {
            throw new Error("Shipping data is null or undefined");
        }
        
        // Ensure proper serialization with explicit type conversions
        // Create plain object to avoid serialization issues
        const result: any = {
            id: Number(shipping.id) || 0,
            date: shipping.date ? new Date(shipping.date).toISOString().split("T")[0] : null,
            site_id: shipping.site_id ? String(shipping.site_id) : null,
            address_id: shipping.address_id ? Number(shipping.address_id) : null,
            sparepart_note: shipping.sparepart_note ? String(shipping.sparepart_note) : null,
            problem_id: shipping.problem_id ? Number(shipping.problem_id) : null,
            ticket_number: shipping.ticket_number ? String(shipping.ticket_number) : null,
            ticket_image: shipping.ticket_image ? String(shipping.ticket_image) : null,
            status: shipping.status ? String(shipping.status) : null,
            resi_number: shipping.resi_number ? String(shipping.resi_number) : null,
            resi_image: shipping.resi_image ? String(shipping.resi_image) : null,
            created_at: shipping.created_at ? new Date(shipping.created_at).toISOString() : null,
            updated_at: shipping.updated_at ? new Date(shipping.updated_at).toISOString() : null,
        };

        // Handle address relation
        if (shipping.address) {
            result.address = {
                id: Number(shipping.address.id) || 0,
                province: String(shipping.address.province || ""),
                cluster: shipping.address.cluster ? String(shipping.address.cluster) : null,
                address_shipping: String(shipping.address.address_shipping || ""),
            };
        } else {
            result.address = null;
        }

        // Handle problem relation
        if (shipping.problem) {
            result.problem = {
                id: Number(shipping.problem.id) || 0,
                problem_name: String(shipping.problem.problem_name || ""),
            };
        } else {
            result.problem = null;
        }

        return result;
    }
}

export const shippingSparePartService = new ShippingSparePartService();

