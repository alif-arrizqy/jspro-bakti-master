import { FastifyRequest, FastifyReply } from "fastify";
import { cacheService } from "../services/cache.service";
import { slaLogger } from "../utils/logger";
import { z } from "zod";

// Schema for refresh cache request
const refreshCacheSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
}).optional();

export class CacheController {
    /**
     * Refresh cache by date range
     * POST /api/v1/cache/refresh
     */
    static async refreshCache(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Parse request body (optional - if not provided, will use dashboard date range logic)
            const body = request.body as { startDate?: string; endDate?: string } | undefined;
            
            let startDate: string;
            let endDate: string;

            if (body?.startDate && body?.endDate) {
                // Validate if provided
                const parsed = refreshCacheSchema.safeParse(body);
                if (!parsed.success) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid date format. Use YYYY-MM-DD format",
                        details: parsed.error.flatten(),
                    });
                }
                startDate = body.startDate;
                endDate = body.endDate;
            } else {
                // If not provided, calculate based on current date
                // Rules: tanggal 1 = bulan sebelumnya (full month), tanggal 2+ = bulan ini (full month)
                const today = new Date();
                const currentDay = today.getDate();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth(); // 0-based

                if (currentDay === 1) {
                    // Tanggal 1 = bulan sebelumnya (full month)
                    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
                    
                    startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
                    endDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                } else {
                    // Tanggal 2+ = bulan ini (full month)
                    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
                    
                    startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
                    endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                }
            }

            slaLogger.info({ startDate, endDate }, "Refreshing cache for date range");

            // Invalidate cache by date range
            await cacheService.invalidateByDateRange(startDate, endDate);

            return reply.send({
                success: true,
                data: {
                    message: "Cache refreshed successfully",
                    startDate,
                    endDate,
                },
            });
        } catch (error) {
            slaLogger.error({ error }, "Error refreshing cache");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to refresh cache",
            });
        }
    }
}

