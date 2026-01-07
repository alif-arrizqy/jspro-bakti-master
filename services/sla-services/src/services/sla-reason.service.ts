import dayjs from "dayjs";
import { databaseService } from "./database.service";
import { slaLogger } from "../utils/logger";
import type {
    SlaReasonInput,
    SlaReasonResponse,
    SlaReasonQueryParams,
    BatteryVersionReasonInput,
    BatteryVersionReasonResponse,
} from "../types/sla-reason.types";

export class SlaReasonService {
    /**
     * Create SLA Reason
     */
    async create(data: SlaReasonInput): Promise<SlaReasonResponse> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.slaReason.create({
            data: {
                reason: data.reason,
            },
        });
        return this.formatResponse(result);
    }

    /**
     * Get all SLA Reasons with filters and pagination
     */
    async getAll(params: SlaReasonQueryParams = {}): Promise<{
        data: SlaReasonResponse[];
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
        if (params.search) {
            where.reason = {
                contains: params.search,
                mode: "insensitive",
            };
        }

        const [data, total] = await Promise.all([
            prisma.slaReason.findMany({
                where,
                skip,
                take: limit,
                orderBy: { reason: "asc" },
            }),
            prisma.slaReason.count({ where }),
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
     * Get SLA Reason by ID
     */
    async getById(id: number): Promise<SlaReasonResponse | null> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.slaReason.findUnique({
            where: { id },
        });
        return result ? this.formatResponse(result) : null;
    }

    /**
     * Update SLA Reason by ID
     */
    async update(id: number, data: Partial<SlaReasonInput>): Promise<SlaReasonResponse> {
        const prisma = databaseService.getSlaClient();
        
        const updateData: any = {};
        if (data.reason !== undefined) {
            updateData.reason = data.reason;
        }

        const result = await prisma.slaReason.update({
            where: { id },
            data: updateData,
        });

        return this.formatResponse(result);
    }

    /**
     * Delete SLA Reason by ID
     */
    async delete(id: number): Promise<{ deleted: number }> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.slaReason.delete({
            where: { id },
        });
        slaLogger.info({ id }, "SLA Reason deleted");
        return { deleted: 1 };
    }

    /**
     * Add reason to battery version
     */
    async addBatteryVersionReason(data: BatteryVersionReasonInput): Promise<BatteryVersionReasonResponse> {
        const prisma = databaseService.getSlaClient();
        
        // Default to current month if period not provided (format: YYYY-MM)
        const period = data.period || dayjs().format("YYYY-MM");
        
        const result = await prisma.batteryVersionReason.create({
            data: {
                batteryVersion: data.batteryVersion,
                reasonId: data.reasonId,
                period: period,
            },
            include: {
                reason: true,
            },
        });
        return {
            id: result.id,
            batteryVersion: result.batteryVersion,
            reasonId: result.reasonId,
            period: result.period,
            reason: this.formatResponse(result.reason),
            createdAt: dayjs(result.createdAt).toISOString(),
        };
    }

    /**
     * Remove reason from battery version
     */
    async removeBatteryVersionReason(id: number): Promise<{ deleted: number }> {
        const prisma = databaseService.getSlaClient();
        const result = await prisma.batteryVersionReason.delete({
            where: { id },
        });
        slaLogger.info({ id }, "Battery Version Reason deleted");
        return { deleted: 1 };
    }

    /**
     * Get reasons by battery version
     */
    async getReasonsByBatteryVersion(
        batteryVersion: string,
        params?: { startDate?: string; endDate?: string; period?: string }
    ): Promise<SlaReasonResponse[]> {
        const prisma = databaseService.getSlaClient();
        
        // Build where clause
        const where: any = {
            batteryVersion,
        };
        
        // If period is provided, filter by period (more efficient than date range)
        if (params?.period) {
            where.period = params.period;
        } else {
            // If no period but date range provided, filter by createdAt
            // Otherwise, default to current month period
            if (params?.startDate || params?.endDate) {
                where.createdAt = {};
                if (params.startDate) {
                    where.createdAt.gte = new Date(params.startDate);
                }
                if (params.endDate) {
                    // Set endDate to end of day
                    const endDate = new Date(params.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = endDate;
                }
            } else {
                // Default to current month if no filters provided
                where.period = dayjs().format("YYYY-MM");
            }
        }
        
        const results = await prisma.batteryVersionReason.findMany({
            where,
            include: {
                reason: true,
            },
            orderBy: {
                reason: {
                    reason: "asc",
                },
            },
        });
        return results.map((r) => this.formatResponse(r.reason));
    }

    /**
     * Format database record to response format
     */
    private formatResponse(record: any): SlaReasonResponse {
        return {
            id: record.id,
            reason: record.reason,
            createdAt: dayjs(record.createdAt).toISOString(),
            updatedAt: dayjs(record.updatedAt).toISOString(),
        };
    }
}

// Export singleton instance
export const slaReasonService = new SlaReasonService();

