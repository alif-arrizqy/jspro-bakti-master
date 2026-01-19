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

        return {
            data: data.map(this.transformAddress),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
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
        return {
            id: address.id,
            province: address.province,
            cluster: address.cluster,
            address_shipping: address.address_shipping,
            created_at: address.created_at.toISOString(),
            updated_at: address.updated_at.toISOString(),
        };
    }
}

export const addressService = new AddressService();

