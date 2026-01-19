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

        return {
            data: data.map(this.transformRetur),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
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
                shipper: data.shipper,
                source_spare_part: data.source_spare_part,
                list_spare_part: data.list_spare_part as any,
                image: data.image ? (typeof data.image === "string" ? JSON.parse(data.image) : data.image) : null,
                notes: data.notes || null,
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
            // If existing.image is JSON, extract URL
            let oldImageUrl: string | null = null;
            try {
                const oldImage = typeof existing.image === "string" ? JSON.parse(existing.image) : existing.image;
                if (Array.isArray(oldImage) && oldImage.length > 0) {
                    oldImageUrl = oldImage[0];
                } else if (typeof oldImage === "string") {
                    oldImageUrl = oldImage;
                }
            } catch {
                // Ignore parse errors
            }

            if (oldImageUrl) {
                await deleteImageFile(oldImageUrl);
            }
        }

        const retur = await prisma.returSparePart.update({
            where: { id },
            data: {
                ...(data.date && { date: new Date(data.date) }),
                ...(data.shipper && { shipper: data.shipper }),
                ...(data.source_spare_part && { source_spare_part: data.source_spare_part }),
                ...(data.list_spare_part && { list_spare_part: data.list_spare_part as any }),
                ...(data.image !== undefined && {
                    image: data.image
                        ? typeof data.image === "string"
                            ? JSON.parse(data.image)
                            : data.image
                        : null,
                }),
                ...(data.notes !== undefined && { notes: data.notes }),
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

        // Delete associated image
        if (retur.image) {
            try {
                const imageData = typeof retur.image === "string" ? JSON.parse(retur.image) : retur.image;
                if (Array.isArray(imageData)) {
                    for (const imageUrl of imageData) {
                        await deleteImageFile(imageUrl);
                    }
                } else if (typeof imageData === "string") {
                    await deleteImageFile(imageData);
                }
            } catch {
                // Ignore errors
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
        return {
            id: retur.id,
            date: retur.date.toISOString().split("T")[0],
            shipper: retur.shipper,
            source_spare_part: retur.source_spare_part,
            list_spare_part: retur.list_spare_part,
            image: retur.image,
            notes: retur.notes,
            created_at: retur.created_at.toISOString(),
            updated_at: retur.updated_at.toISOString(),
        };
    }
}

export const returSparePartService = new ReturSparePartService();

