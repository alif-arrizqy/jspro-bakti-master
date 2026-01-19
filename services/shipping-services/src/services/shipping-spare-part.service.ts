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

        return {
            data: data.map(this.transformShipping),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
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

        // Validate site_id exists in sites service (optional, don't block if service is down)
        if (data.site_id) {
            const isValidSite = await sitesService.validateSiteId(data.site_id);
            if (!isValidSite) {
                shippingLogger.warn({ siteId: data.site_id }, "Site ID not found or inactive in sites service");
                // Don't throw error, just log warning
            }
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
        return {
            id: shipping.id,
            date: shipping.date.toISOString().split("T")[0],
            site_id: shipping.site_id,
            address_id: shipping.address_id,
            address: shipping.address
                ? {
                      id: shipping.address.id,
                      province: shipping.address.province,
                      cluster: shipping.address.cluster,
                      address_shipping: shipping.address.address_shipping,
                  }
                : null,
            sparepart_note: shipping.sparepart_note,
            problem_id: shipping.problem_id,
            problem: shipping.problem
                ? {
                      id: shipping.problem.id,
                      problem_name: shipping.problem.problem_name,
                  }
                : null,
            ticket_number: shipping.ticket_number,
            ticket_image: shipping.ticket_image,
            status: shipping.status,
            resi_number: shipping.resi_number,
            resi_image: shipping.resi_image,
            created_at: shipping.created_at.toISOString(),
            updated_at: shipping.updated_at.toISOString(),
        };
    }
}

export const shippingSparePartService = new ShippingSparePartService();

