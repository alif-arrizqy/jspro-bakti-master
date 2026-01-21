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
import { generateShippingSparePartPDF } from "../utils/pdf.util";
import { sitesService } from "./sites.service";

export class ShippingSparePartService {
    async getAll(query: ShippingSparePartQuery) {
        const { page, limit, status, site_id, address_id, problem_id, province, cluster, startDate, endDate, search } = query;
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
            ...(province && {
                address: {
                    province: province,
                },
            }),
            ...(cluster && {
                address: province
                    ? {
                          province: province,
                          cluster: { contains: cluster, mode: "insensitive" },
                      }
                    : {
                          cluster: { contains: cluster, mode: "insensitive" },
                      },
            }),
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

        // Get unique site_ids and fetch site data from sites-service
        const uniqueSiteIds = [...new Set(data.map((item) => item.site_id).filter((id): id is string => !!id))];
        const siteDataMap = new Map<string, { site_name: string; pr_code: string | null }>();

        // Fetch site data for all unique site_ids in parallel
        await Promise.all(
            uniqueSiteIds.map(async (siteId) => {
                try {
                    const siteInfo = await sitesService.getSiteById(siteId);
                    if (siteInfo) {
                        siteDataMap.set(siteId, {
                            site_name: siteInfo.siteName || "",
                            pr_code: siteInfo.prCode || null,
                        });
                    }
                } catch (error) {
                    shippingLogger.warn({ error, siteId }, "Failed to fetch site data from sites-service");
                }
            })
        );

        // Transform data to plain objects - ensure proper serialization (nested structure)
        const transformedData = data.map((item) => {
            if (!item) return null;
            const siteData = item.site_id ? siteDataMap.get(item.site_id) : null;

            return {
                id: Number(item.id),
                date: item.date ? new Date(item.date).toISOString().split("T")[0] : null,
                site: {
                    site_id: item.site_id ? String(item.site_id) : null,
                    site_name: siteData?.site_name || null,
                    pr_code: siteData?.pr_code || null,
                },
                address: item.address
                    ? {
                        address_id: Number(item.address.id),
                        province: String(item.address.province || ""),
                        cluster: item.address.cluster ? String(item.address.cluster) : null,
                        address_shipping: String(item.address.address_shipping || ""),
                    }
                    : null,
                sparepart_note: item.sparepart_note ? String(item.sparepart_note) : null,
                problem: item.problem
                    ? {
                        problem_id: Number(item.problem.id),
                        problem_name: String(item.problem.problem_name || ""),
                    }
                    : null,
                ticket: {
                    ticket_number: item.ticket_number ? String(item.ticket_number) : null,
                    ticket_image: item.ticket_image ? String(item.ticket_image) : null,
                },
                resi: {
                    resi_number: item.resi_number ? String(item.resi_number) : null,
                    resi_image: item.resi_image ? String(item.resi_image) : null,
                },
                status: item.status ? String(item.status) : null,
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

        // Fetch site data from sites-service if site_id exists
        let siteData: { site_name: string; pr_code: string | null } | null = null;
        if (shipping.site_id) {
            try {
                const siteInfo = await sitesService.getSiteById(shipping.site_id);
                if (siteInfo) {
                    siteData = {
                        site_name: siteInfo.siteName || "",
                        pr_code: siteInfo.prCode || null,
                    };
                }
            } catch (error) {
                shippingLogger.warn({ error, siteId: shipping.site_id }, "Failed to fetch site data from sites-service");
            }
        }

        return this.transformShipping(shipping, siteData);
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

        // Fetch site data from sites-service if site_id exists
        let siteData: { site_name: string; pr_code: string | null } | null = null;
        if (shipping.site_id) {
            try {
                const siteInfo = await sitesService.getSiteById(shipping.site_id);
                if (siteInfo) {
                    siteData = {
                        site_name: siteInfo.siteName || "",
                        pr_code: siteInfo.prCode || null,
                    };
                }
            } catch (error) {
                shippingLogger.warn({ error, siteId: shipping.site_id }, "Failed to fetch site data from sites-service");
            }
        }

        return this.transformShipping(shipping, siteData);
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

        // Delete old resi_image if updating with new image
        // Only delete if there's a new image and it's different from the existing one
        if (data.resi_image && existing.resi_image && data.resi_image !== existing.resi_image) {
            try {
                await deleteImageFile(existing.resi_image);
                shippingLogger.info({ shippingId: id, oldImage: existing.resi_image }, "Old resi image deleted");
            } catch (error) {
                shippingLogger.warn({ error, shippingId: id, imagePath: existing.resi_image }, "Failed to delete old resi image, continuing with update");
            }
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

        // Fetch site data from sites-service if site_id exists
        let siteData: { site_name: string; pr_code: string | null } | null = null;
        if (shipping.site_id) {
            try {
                const siteInfo = await sitesService.getSiteById(shipping.site_id);
                if (siteInfo) {
                    siteData = {
                        site_name: siteInfo.siteName || "",
                        pr_code: siteInfo.prCode || null,
                    };
                }
            } catch (error) {
                shippingLogger.warn({ error, siteId: shipping.site_id }, "Failed to fetch site data from sites-service");
            }
        }

        return this.transformShipping(shipping, siteData);
    }

    async delete(id: number) {
        const shipping = await prisma.shippingSparePart.findUnique({
            where: { id },
        });

        if (!shipping) {
            throw new Error("Shipping spare part not found");
        }

        // Delete associated images before deleting record
        const deletePromises: Promise<void>[] = [];

        if (shipping.ticket_image) {
            deletePromises.push(
                deleteImageFile(shipping.ticket_image).catch((error) => {
                    shippingLogger.warn({ error, shippingId: id, image: shipping.ticket_image }, "Failed to delete ticket image");
                })
            );
        }

        if (shipping.resi_image) {
            deletePromises.push(
                deleteImageFile(shipping.resi_image).catch((error) => {
                    shippingLogger.warn({ error, shippingId: id, image: shipping.resi_image }, "Failed to delete resi image");
                })
            );
        }

        // Wait for all image deletions to complete (or fail)
        await Promise.allSettled(deletePromises);

        await prisma.shippingSparePart.delete({
            where: { id },
        });

        shippingLogger.info({ shippingId: id }, "Shipping deleted");
    }

    async getStatistics(query?: { site_id?: string; startDate?: string; endDate?: string }) {
        const { site_id, startDate, endDate } = query || {};

        // Build base where clause for filtering
        const baseWhere: Prisma.ShippingSparePartWhereInput = {
            ...(site_id && { site_id }),
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
        };

        // Get counts for each status
        const [requestGudang, prosesKirim, selesai, total] = await Promise.all([
            prisma.shippingSparePart.count({
                where: {
                    ...baseWhere,
                    status: "REQUEST_GUDANG",
                },
            }),
            prisma.shippingSparePart.count({
                where: {
                    ...baseWhere,
                    status: "PROSES_KIRIM",
                },
            }),
            prisma.shippingSparePart.count({
                where: {
                    ...baseWhere,
                    status: "SELESAI",
                },
            }),
            prisma.shippingSparePart.count({
                where: baseWhere,
            }),
        ]);

        return {
            request_gudang: Number(requestGudang),
            proses_kirim: Number(prosesKirim),
            selesai: Number(selesai),
            total: Number(total),
        };
    }

    async exportToExcel(query: ShippingSparePartQuery) {
        // Get all data without pagination for export
        const { status, site_id, address_id, problem_id, province, cluster, startDate, endDate, search } = query;

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
            ...(province && {
                address: {
                    province: province,
                },
            }),
            ...(cluster && {
                address: province
                    ? {
                          province: province,
                          cluster: { contains: cluster, mode: "insensitive" },
                      }
                    : {
                          cluster: { contains: cluster, mode: "insensitive" },
                      },
            }),
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

        // Get unique site_ids and fetch site data from sites-service
        const uniqueSiteIds = [...new Set(data.map((item) => item.site_id).filter((id): id is string => !!id))];
        const siteDataMap = new Map<string, { site_name: string; pr_code: string | null }>();

        // Fetch site data for all unique site_ids in parallel
        await Promise.all(
            uniqueSiteIds.map(async (siteId) => {
                try {
                    const siteInfo = await sitesService.getSiteById(siteId);
                    if (siteInfo) {
                        siteDataMap.set(siteId, {
                            site_name: siteInfo.siteName || "",
                            pr_code: siteInfo.prCode || null,
                        });
                    }
                } catch (error) {
                    shippingLogger.warn({ error, siteId }, "Failed to fetch site data from sites-service");
                }
            })
        );

        // Transform data to include site data
        const transformedData = data.map((item) => {
            const siteData = item.site_id ? siteDataMap.get(item.site_id) : null;
            return {
                ...item,
                site_name: siteData?.site_name || null,
                pr_code: siteData?.pr_code || null,
            };
        });

        const buffer = await generateShippingSparePartExcel(transformedData, {
            startDate: query.startDate,
            endDate: query.endDate,
            status: Array.isArray(query.status) ? query.status : query.status ? [query.status] : undefined,
            province: query.province,
        });
        const filename = this.generateExportFilename(query);

        return { buffer, filename };
    }

    async exportToPDF(query: ShippingSparePartQuery) {
        // Get all data without pagination for export
        const { status, site_id, address_id, problem_id, province, cluster, startDate, endDate, search } = query;

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
            ...(province && {
                address: {
                    province: province,
                },
            }),
            ...(cluster && {
                address: province
                    ? {
                          province: province,
                          cluster: { contains: cluster, mode: "insensitive" },
                      }
                    : {
                          cluster: { contains: cluster, mode: "insensitive" },
                      },
            }),
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

        // Get unique site_ids and fetch site data from sites-service
        const uniqueSiteIds = [...new Set(data.map((item) => item.site_id).filter((id): id is string => !!id))];
        const siteDataMap = new Map<string, { site_name: string; pr_code: string | null }>();

        // Fetch site data for all unique site_ids in parallel
        await Promise.all(
            uniqueSiteIds.map(async (siteId) => {
                try {
                    const siteInfo = await sitesService.getSiteById(siteId);
                    if (siteInfo) {
                        siteDataMap.set(siteId, {
                            site_name: siteInfo.siteName || "",
                            pr_code: siteInfo.prCode || null,
                        });
                    }
                } catch (error) {
                    shippingLogger.warn({ error, siteId }, "Failed to fetch site data from sites-service");
                }
            })
        );

        // Transform data to include site data
        const transformedData = data.map((item) => {
            const siteData = item.site_id ? siteDataMap.get(item.site_id) : null;
            return {
                ...item,
                site_name: siteData?.site_name || null,
                pr_code: siteData?.pr_code || null,
            };
        });

        const buffer = await generateShippingSparePartPDF(transformedData, {
            startDate: query.startDate,
            endDate: query.endDate,
            status: Array.isArray(query.status) ? query.status : query.status ? [query.status] : undefined,
            province: query.province,
        });
        const filename = this.generateExportFilename(query).replace('.xlsx', '.pdf');

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

    private transformShipping(shipping: any, siteData?: { site_name: string; pr_code: string | null } | null) {
        if (!shipping) {
            throw new Error("Shipping data is null or undefined");
        }

        // Ensure proper serialization with explicit type conversions
        // Create plain object with nested structure (versi 2)
        const result: any = {
            id: Number(shipping.id) || 0,
            date: shipping.date ? new Date(shipping.date).toISOString().split("T")[0] : null,
            site: {
                site_id: shipping.site_id ? String(shipping.site_id) : null,
                site_name: siteData?.site_name || null,
                pr_code: siteData?.pr_code || null,
            },
            address: shipping.address
                ? {
                    address_id: Number(shipping.address.id) || 0,
                    province: String(shipping.address.province || ""),
                    cluster: shipping.address.cluster ? String(shipping.address.cluster) : null,
                    address_shipping: String(shipping.address.address_shipping || ""),
                }
                : null,
            sparepart_note: shipping.sparepart_note ? String(shipping.sparepart_note) : null,
            problem: shipping.problem
                ? {
                    problem_id: Number(shipping.problem.id) || 0,
                    problem_name: String(shipping.problem.problem_name || ""),
                }
                : null,
            ticket: {
                ticket_number: shipping.ticket_number ? String(shipping.ticket_number) : null,
                ticket_image: shipping.ticket_image ? String(shipping.ticket_image) : null,
            },
            resi: {
                resi_number: shipping.resi_number ? String(shipping.resi_number) : null,
                resi_image: shipping.resi_image ? String(shipping.resi_image) : null,
            },
            status: shipping.status ? String(shipping.status) : null,
            created_at: shipping.created_at ? new Date(shipping.created_at).toISOString() : null,
            updated_at: shipping.updated_at ? new Date(shipping.updated_at).toISOString() : null,
        };

        return result;
    }
}

export const shippingSparePartService = new ShippingSparePartService();

