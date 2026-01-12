import { FastifyInstance } from "fastify";
import { siteDownRoutes } from "./site-down.route";
import { siteUpRoutes } from "./site-up.route";

export async function registerRoutes(fastify: FastifyInstance, prefix: string) {
    fastify.get(
        "/monitoring/health",
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

    fastify.register(siteDownRoutes, { prefix: `${prefix}/monitoring/site-down` });
    fastify.register(siteUpRoutes, { prefix: `${prefix}/monitoring/site-up` });
}

