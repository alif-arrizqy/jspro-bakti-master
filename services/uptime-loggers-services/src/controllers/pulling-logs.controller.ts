import dayjs from "dayjs";
import { redisQueueService } from "../services/redis-queue.service.js";
import type { PullingLogItem, PullingLogsSummary, Pagination } from "../types/index.js";

export const pullingLogsController = {
    async getSummary(dateParam?: string): Promise<PullingLogsSummary> {
        const date = dateParam ?? dayjs().format("YYYY-MM-DD");
        return redisQueueService.getSummary(date);
    },

    async getLogs(params: {
        date?: string;
        batteryType?: string;
        result?: string;
        search?: string;
        page: number;
        limit: number;
    }): Promise<{ items: PullingLogItem[]; pagination: Pagination }> {
        const date = params.date ?? dayjs().format("YYYY-MM-DD");
        const { items, total } = await redisQueueService.getAllLogs({
            date,
            batteryType: params.batteryType,
            result: params.result,
            search: params.search,
            page: params.page,
            limit: params.limit,
        });

        return {
            items,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    },
};
