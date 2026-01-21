import { Prisma } from "@prisma/shipping-client";
import prisma from "../config/prisma";
import type { ProblemMasterCreate, ProblemMasterUpdate, ProblemMasterQuery } from "../schemas/shipping.schema";
import { shippingLogger } from "../utils/logger";

export class ProblemMasterService {
    async getAll(query: ProblemMasterQuery) {
        const { page, limit, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.ProblemMasterWhereInput = {
            ...(search && {
                problem_name: { contains: search, mode: "insensitive" },
            }),
        };

        const [data, total] = await Promise.all([
            prisma.problemMaster.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
            }),
            prisma.problemMaster.count({ where }),
        ]);

        // Transform data to plain objects - ensure proper serialization
        const transformedData = data.map((item) => {
            if (!item) return null;
            return {
                id: Number(item.id),
                problem_name: String(item.problem_name || ""),
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
        const problem = await prisma.problemMaster.findUnique({
            where: { id },
        });

        if (!problem) {
            throw new Error("Problem not found");
        }

        return this.transformProblem(problem);
    }

    async create(data: ProblemMasterCreate) {
        const problem = await prisma.problemMaster.create({
            data: {
                problem_name: data.problem_name,
            },
        });

        shippingLogger.info({ problemId: problem.id }, "Problem created");
        return this.transformProblem(problem);
    }

    async update(id: number, data: ProblemMasterUpdate) {
        const problem = await prisma.problemMaster.update({
            where: { id },
            data: {
                ...(data.problem_name && { problem_name: data.problem_name }),
            },
        });

        shippingLogger.info({ problemId: id }, "Problem updated");
        return this.transformProblem(problem);
    }

    async delete(id: number) {
        // Check if problem is used in shipping_spare_part
        const shippingCount = await prisma.shippingSparePart.count({
            where: { problem_id: id },
        });

        if (shippingCount > 0) {
            throw new Error(`Cannot delete problem: used in ${shippingCount} shipping record(s)`);
        }

        await prisma.problemMaster.delete({
            where: { id },
        });

        shippingLogger.info({ problemId: id }, "Problem deleted");
    }

    private transformProblem(problem: any) {
        if (!problem) {
            throw new Error("Problem data is null or undefined");
        }
        
        // Ensure proper serialization
        return {
            id: Number(problem.id),
            problem_name: String(problem.problem_name || ""),
            created_at: problem.created_at ? new Date(problem.created_at).toISOString() : null,
            updated_at: problem.updated_at ? new Date(problem.updated_at).toISOString() : null,
        };
    }
}

export const problemMasterService = new ProblemMasterService();

