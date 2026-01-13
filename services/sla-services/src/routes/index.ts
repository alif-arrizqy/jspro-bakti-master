import { FastifyInstance } from "fastify";
import { slaBaktiRoutes } from "./sla-bakti.route";
import { slaInternalRoutes } from "./sla-internal.route";
import { historyGamasRoutes } from "./history-gamas.route";
import { slaReasonRoutes } from "./sla-reason.route";
import { cacheRoutes } from "./cache.route";

export async function registerRoutes(fastify: FastifyInstance, prefix: string) {
    fastify.get(
        "/health",
        {
            schema: {
                tags: ["Health"],
                summary: "Health check",
                description: "Check if the service is running and database connections are healthy",
                response: {
                    200: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            timestamp: { type: "string" },
                            uptime: { type: "number" },
                        },
                    },
                },
            },
        },
        async () => {
            return {
                status: "ok",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            };
        }
    );

    fastify.register(slaBaktiRoutes, { prefix: `${prefix}/sla-bakti` });
    fastify.register(slaInternalRoutes, { prefix: `${prefix}/sla-internal` });
    fastify.register(historyGamasRoutes, { prefix: `${prefix}/history-gamas` });
    fastify.register(slaReasonRoutes, { prefix: `${prefix}/sla-reason` });
    fastify.register(cacheRoutes, { prefix: `${prefix}/cache` });
}
