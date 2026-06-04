import { FastifyInstance } from "fastify";
import {
    uptimeSummaryQuerySchema,
    uptimeSitesQuerySchema,
    pullingLogsSummaryQuerySchema,
    pullingLogsQuerySchema,
} from "../schemas/uptime.schema.js";
import { uptimeController } from "../controllers/uptime.controller.js";
import { pullingLogsController } from "../controllers/pulling-logs.controller.js";
import { connectivityProbeJob } from "../jobs/connectivity-probe.job.js";

export async function monitoringRoutes(fastify: FastifyInstance) {
    // GET /uptime/summary
    fastify.get("/uptime/summary", {
        schema: {
            tags: ["Uptime"],
            summary: "Get uptime summary (realtime or historical)",
            querystring: {
                type: "object",
                properties: {
                    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                },
            },
        },
        handler: async (request, reply) => {
            const query = uptimeSummaryQuerySchema.parse(request.query);
            const data = await uptimeController.getSummary(query.date);
            return { success: true, data };
        },
    });

    // GET /uptime/sites
    fastify.get("/uptime/sites", {
        schema: {
            tags: ["Uptime"],
            summary: "Get all sites with uptime, voltage, and connectivity",
            querystring: {
                type: "object",
                properties: {
                    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    batteryType: { type: "string", enum: ["all", "jspro", "talis5"] },
                    search: { type: "string" },
                    uptimeHealth: { type: "string", enum: ["100", "95", "70"] },
                },
            },
        },
        handler: async (request, reply) => {
            const query = uptimeSitesQuerySchema.parse(request.query);
            const data = await uptimeController.getSites(query);
            return { success: true, data };
        },
    });

    // GET /pulling-logs/summary
    fastify.get("/pulling-logs/summary", {
        schema: {
            tags: ["Pulling Logs"],
            summary: "Get pulling logs summary (success/failed counts)",
            querystring: {
                type: "object",
                properties: {
                    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                },
            },
        },
        handler: async (request, reply) => {
            const query = pullingLogsSummaryQuerySchema.parse(request.query);
            const data = await pullingLogsController.getSummary(query.date);
            return { success: true, data };
        },
    });

    // GET /pulling-logs
    fastify.get("/pulling-logs", {
        schema: {
            tags: ["Pulling Logs"],
            summary: "Get pulling logs with pagination and filters",
            querystring: {
                type: "object",
                properties: {
                    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    batteryType: { type: "string", enum: ["all", "jspro", "talis5"] },
                    result: { type: "string", enum: ["all", "success", "failed"] },
                    search: { type: "string" },
                    page: { type: "string" },
                    limit: { type: "string" },
                },
            },
        },
        handler: async (request, reply) => {
            const query = pullingLogsQuerySchema.parse(request.query);
            const { items, pagination } = await pullingLogsController.getLogs(query);
            return { success: true, data: items, pagination };
        },
    });

    // POST /uptime/probe/run (dev trigger)
    fastify.post("/uptime/probe/run", {
        schema: {
            tags: ["Uptime"],
            summary: "Manually trigger connectivity probe (dev only)",
        },
        handler: async (request, reply) => {
            await connectivityProbeJob.runManual();
            return { success: true, data: { message: "Probe completed" } };
        },
    });
}
