import { Prisma } from "@prisma/shipping-client";
import prisma from "../config/prisma";
import type { AddressCreate, AddressUpdate, AddressQuery } from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";

export class AddressService {
    async getAll(query: AddressQuery) {
        const { page, limit, province, cluster } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.AddressWhereInput = {
            ...(province && { province }),
            ...(cluster && { cluster: { contains: cluster, mode: "insensitive" } }),
        };

        const [data, total] = await Promise.all([
            prisma.address.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
            }),
            prisma.address.count({ where }),
        ]);

        // Transform data to plain objects - ensure proper serialization
        const transformedData = data.map((item) => {
            if (!item) return null;
            return {
                id: Number(item.id),
                province: String(item.province || ""),
                cluster: item.cluster ? String(item.cluster) : null,
                address_shipping: String(item.address_shipping || ""),
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
        const address = await prisma.address.findUnique({
            where: { id },
        });

        if (!address) {
            throw new Error("Address not found");
        }

        return this.transformAddress(address);
    }

    async create(data: AddressCreate) {
        const address = await prisma.address.create({
            data: {
                province: data.province,
                cluster: data.cluster || null,
                address_shipping: data.address_shipping,
            },
        });

        shippingLogger.info({ addressId: address.id }, "Address created");
        return this.transformAddress(address);
    }

    async update(id: number, data: AddressUpdate) {
        const address = await prisma.address.update({
            where: { id },
            data: {
                ...(data.province && { province: data.province }),
                ...(data.cluster !== undefined && { cluster: data.cluster }),
                ...(data.address_shipping && { address_shipping: data.address_shipping }),
            },
        });

        shippingLogger.info({ addressId: id }, "Address updated");
        return this.transformAddress(address);
    }

    async delete(id: number) {
        // Check if address is used in shipping_spare_part
        const shippingCount = await prisma.shippingSparePart.count({
            where: { address_id: id },
        });

        if (shippingCount > 0) {
            throw new Error(`Cannot delete address: used in ${shippingCount} shipping record(s)`);
        }

        await prisma.address.delete({
            where: { id },
        });

        shippingLogger.info({ addressId: id }, "Address deleted");
    }

    private transformAddress(address: any) {
        if (!address) {
            throw new Error("Address data is null or undefined");
        }
        
        // Ensure proper serialization
        return {
            id: Number(address.id),
            province: String(address.province || ""),
            cluster: address.cluster ? String(address.cluster) : null,
            address_shipping: String(address.address_shipping || ""),
            created_at: address.created_at ? new Date(address.created_at).toISOString() : null,
            updated_at: address.updated_at ? new Date(address.updated_at).toISOString() : null,
        };
    }
}

export const addressService = new AddressService();

