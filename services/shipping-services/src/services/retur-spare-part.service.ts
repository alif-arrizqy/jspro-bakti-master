import { Prisma } from "@prisma/shipping-client";
import prisma from "../config/prisma";
import type { ReturSparePartCreate, ReturSparePartUpdate, ReturSparePartQuery } from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";
import { deleteImageFile } from "../utils/file-upload.util";
import { generateReturSparePartExcel } from "../utils/excel.util";

export class ReturSparePartService {
    async getAll(query: ReturSparePartQuery) {
        const { page, limit, startDate, endDate, shipper, source_spare_part, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.ReturSparePartWhereInput = {
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
            ...(shipper && { shipper: { contains: shipper, mode: "insensitive" } }),
            ...(source_spare_part && {
                source_spare_part: { contains: source_spare_part, mode: "insensitive" },
            }),
            ...(search && { notes: { contains: search, mode: "insensitive" } }),
        };

        const [data, total] = await Promise.all([
            prisma.returSparePart.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
            }),
            prisma.returSparePart.count({ where }),
        ]);

        // Transform data to plain objects - ensure proper serialization (following address/problem-master pattern)
        const transformedData = data.map((item) => {
            if (!item) return null;
            return {
                id: Number(item.id),
                date: item.date ? new Date(item.date).toISOString().split("T")[0] : null,
                shipper: String(item.shipper || ""),
                source_spare_part: String(item.source_spare_part || ""),
                list_spare_part: item.list_spare_part ? String(item.list_spare_part) : null, // Now string, not JSON
                image: item.image ? String(item.image) : null,
                notes: item.notes ? String(item.notes) : null,
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

    async getById(id: number) {
        const retur = await prisma.returSparePart.findUnique({
            where: { id },
        });

        if (!retur) {
            throw new Error("Retur spare part not found");
        }

        return this.transformRetur(retur);
    }

    async create(data: ReturSparePartCreate) {
        const retur = await prisma.returSparePart.create({
            data: {
                date: new Date(data.date),
                shipper: String(data.shipper),
                source_spare_part: String(data.source_spare_part),
                list_spare_part: data.list_spare_part ? String(data.list_spare_part) : null, // Now string, not JSON
                image: data.image ? String(data.image) : null, // Image is now single URL string
                notes: data.notes ? String(data.notes) : null,
            },
        });

        shippingLogger.info({ returId: retur.id }, "Retur created");
        return this.transformRetur(retur);
    }

    async update(id: number, data: ReturSparePartUpdate) {
        const existing = await prisma.returSparePart.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error("Retur spare part not found");
        }

        // Delete old image if updating
        if (data.image && existing.image && data.image !== existing.image) {
            // Image is now single URL string (not JSON)
            const oldImageUrl = typeof existing.image === "string" ? existing.image : null;
            if (oldImageUrl) {
                await deleteImageFile(oldImageUrl);
            }
        }

        const retur = await prisma.returSparePart.update({
            where: { id },
            data: {
                ...(data.date && { date: new Date(data.date) }),
                ...(data.shipper && { shipper: String(data.shipper) }),
                ...(data.source_spare_part && { source_spare_part: String(data.source_spare_part) }),
                ...(data.list_spare_part !== undefined && {
                    list_spare_part: data.list_spare_part ? String(data.list_spare_part) : null, // Now string, not JSON
                }),
                ...(data.image !== undefined && {
                    image: data.image ? String(data.image) : null, // Image is now single URL string
                }),
                ...(data.notes !== undefined && { notes: data.notes ? String(data.notes) : null }),
            },
        });

        shippingLogger.info({ returId: id }, "Retur updated");
        return this.transformRetur(retur);
    }

    async delete(id: number) {
        const retur = await prisma.returSparePart.findUnique({
            where: { id },
        });

        if (!retur) {
            throw new Error("Retur spare part not found");
        }

        // Delete associated image (now single URL string)
        if (retur.image) {
            const imageUrl = typeof retur.image === "string" ? retur.image : null;
            if (imageUrl) {
                await deleteImageFile(imageUrl);
            }
        }

        await prisma.returSparePart.delete({
            where: { id },
        });

        shippingLogger.info({ returId: id }, "Retur deleted");
    }

    async exportToExcel(query: ReturSparePartQuery) {
        // Get all data without pagination for export
        const { startDate, endDate, shipper, source_spare_part, search } = query;

        const where: Prisma.ReturSparePartWhereInput = {
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
            ...(shipper && { shipper: { contains: shipper, mode: "insensitive" } }),
            ...(source_spare_part && {
                source_spare_part: { contains: source_spare_part, mode: "insensitive" },
            }),
            ...(search && { notes: { contains: search, mode: "insensitive" } }),
        };

        const data = await prisma.returSparePart.findMany({
            where,
            orderBy: { date: "desc" },
        });

        const buffer = await generateReturSparePartExcel(data);
        const filename = this.generateExportFilename(query);

        return { buffer, filename };
    }

    private generateExportFilename(query: ReturSparePartQuery): string {
        const date = new Date().toISOString().split("T")[0];
        let filename = `Retur_Spare_Part_${date}`;

        if (query.startDate && query.endDate) {
            filename = `Retur_Spare_Part_${query.startDate}_to_${query.endDate}`;
        } else if (query.startDate) {
            filename = `Retur_Spare_Part_from_${query.startDate}`;
        } else if (query.endDate) {
            filename = `Retur_Spare_Part_until_${query.endDate}`;
        }

        return `${filename}.xlsx`;
    }

    private transformRetur(retur: any) {
        if (!retur) {
            throw new Error("Retur data is null or undefined");
        }
        
        // Ensure proper serialization with explicit type conversions
        // Create plain object to avoid serialization issues
        const result: any = {
            id: Number(retur.id) || 0,
            date: retur.date ? new Date(retur.date).toISOString().split("T")[0] : null,
            shipper: String(retur.shipper || ""),
            source_spare_part: String(retur.source_spare_part || ""),
            list_spare_part: retur.list_spare_part ? String(retur.list_spare_part) : null, // Now string, not JSON
            image: retur.image ? String(retur.image) : null, // Image is now single URL string
            notes: retur.notes ? String(retur.notes) : null,
            created_at: retur.created_at ? new Date(retur.created_at).toISOString() : null,
            updated_at: retur.updated_at ? new Date(retur.updated_at).toISOString() : null,
        };

        return result;
    }
}

export const returSparePartService = new ReturSparePartService();

