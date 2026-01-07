import dayjs from "dayjs";
import { databaseService } from "./database.service";
import { slaLogger } from "../utils/logger";
import type {
    HistoryGamasInput,
    HistoryGamasResponse,
    HistoryGamasQueryParams,
} from "../types/history-gamas.types";

export class HistoryGamasService {
    /**
     * Create History Gamas
     */
    async create(data: HistoryGamasInput): Promise<HistoryGamasResponse> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.historyGamas.create({
            data: {
                date: new Date(data.date),
                description: data.description ?? null,
            },
        });
        return this.formatResponse(result);
    }

    /**
     * Get all History Gamas with filters and pagination
     */
    async getAll(params: HistoryGamasQueryParams): Promise<{
        data: HistoryGamasResponse[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const prisma = databaseService.getSlaClient();
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (params.startDate && params.endDate) {
            where.date = {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate),
            };
        } else if (params.startDate) {
            where.date = { gte: new Date(params.startDate) };
        } else if (params.endDate) {
            where.date = { lte: new Date(params.endDate) };
        }

        const [data, total] = await Promise.all([
            prisma.historyGamas.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            }),
            prisma.historyGamas.count({ where }),
        ]);

        return {
            data: data.map(this.formatResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get History Gamas by ID
     */
    async getById(id: number): Promise<HistoryGamasResponse | null> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.historyGamas.findUnique({
            where: { id },
        });
        return result ? this.formatResponse(result) : null;
    }

    /**
     * Update History Gamas by ID
     */
    async update(id: number, data: Partial<HistoryGamasInput>): Promise<HistoryGamasResponse> {
        const prisma = databaseService.getSlaClient();
        
        const updateData: any = {};
        if (data.date !== undefined) {
            updateData.date = new Date(data.date);
        }
        if (data.description !== undefined) {
            updateData.description = data.description ?? null;
        }

        const result = await prisma.historyGamas.update({
            where: { id },
            data: updateData,
        });

        return this.formatResponse(result);
    }

    /**
     * Delete History Gamas by ID
     */
    async delete(id: number): Promise<{ deleted: number }> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.historyGamas.delete({
            where: { id },
        });
        slaLogger.info({ id }, "History Gamas deleted");
        return { deleted: 1 };
    }

    /**
     * Format database record to response format
     */
    private formatResponse(record: any): HistoryGamasResponse {
        return {
            id: record.id,
            date: dayjs(record.date).format("YYYY-MM-DD"),
            description: record.description,
            createdAt: dayjs(record.createdAt).toISOString(),
            updatedAt: dayjs(record.updatedAt).toISOString(),
        };
    }
}

// Export singleton instance
export const historyGamasService = new HistoryGamasService();

