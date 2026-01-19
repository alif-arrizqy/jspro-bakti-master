import { FastifyInstance } from "fastify";
import { addressRoutes } from "./address.route";
import { problemMasterRoutes } from "./problem-master.route";
import { shippingSparePartRoutes } from "./shipping-spare-part.route";
import { returSparePartRoutes } from "./retur-spare-part.route";
import { config } from "../config/env";

export async function registerRoutes(fastify: FastifyInstance, prefix: string) {
    // Health check
    fastify.get(`${prefix}/health`, {
        schema: {
            tags: ["Health"],
            summary: "Health check",
            description: "Check if the service is running",
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return reply.send({
                status: "ok",
                timestamp: new Date().toISOString(),
            });
        },
    });

    // Register routes
    await fastify.register(addressRoutes, { prefix: `${prefix}/address` });
    await fastify.register(problemMasterRoutes, { prefix: `${prefix}/problem-master` });
    await fastify.register(shippingSparePartRoutes, { prefix: `${prefix}/shipping-spare-part` });
    await fastify.register(returSparePartRoutes, { prefix: `${prefix}/retur-spare-part` });
}

