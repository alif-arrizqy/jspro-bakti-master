import { FastifyRequest, FastifyReply } from "fastify";
import { slaInternalService } from "../services/sla-internal.service";
import {
    slaInternalSummaryQuerySchema,
    slaInternalDailyQuerySchema,
    slaInternalExportQuerySchema,
} from "../schemas/sla-internal.schema";
import { slaLogger } from "../utils/logger";

// ============================================================
// SLA Internal Controller
// ============================================================

export class SlaInternalController {
    /**
     * Get SLA summary (SLA 1)
     */
    static async getSummary(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = slaInternalSummaryQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate and endDate are required",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaInternalService.getSummary(parsed.data);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting SLA summary");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get summary data",
            });
        }
    }

    /**
     * Get daily SLA data (SLA 2)
     */
    static async getDaily(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = slaInternalDailyQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate, endDate, and siteId are required",
                    details: parsed.error.flatten(),
                });
            }

            const result = await slaInternalService.getDaily(parsed.data);

            return reply.send({
                success: true,
                data: result,
            });
        } catch (error) {
            slaLogger.error({ error }, "Error getting daily SLA data");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get daily data",
            });
        }
    }

    /**
     * Export SLA data to Excel
     */
    static async export(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parsed = slaInternalExportQuerySchema.safeParse(request.query);

            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: "startDate, endDate, and siteId are required",
                    details: parsed.error.flatten(),
                });
            }

            const { buffer, filename } = await slaInternalService.exportToExcel(parsed.data);

            // Set headers for file download
            reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            reply.header("Content-Disposition", `attachment; filename="${filename}"`);

            return reply.send(buffer);
        } catch (error) {
            slaLogger.error({ error }, "Error exporting SLA data");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : "Failed to export data",
            });
        }
    }
}

