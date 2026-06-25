import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config/env.js";
import { appLogger } from "./utils/logger.js";
import { monitoringRoutes } from "./routes/monitoring.routes.js";
import { timescaleService } from "./services/timescale.service.js";
import { redisQueueService } from "./services/redis-queue.service.js";
import { connectivityProbeJob } from "./jobs/connectivity-probe.job.js";

const swaggerDescription = `
## Uptime & Loggers Monitoring Service API

Backend untuk dasbor Uptime & Loggers pada ecc-master-dash.

### Endpoints:
- **Uptime Summary & Sites**: Data uptime historis/realtime untuk ~81 site
- **Pulling Logs**: Status operasi penarikan data logger (Redis Streams)
- **Connectivity Probe**: Ping latency & reachability (internal job, merged ke uptime/sites)

### Response Format:
\`\`\`json
{ "success": true, "data": {...}, "pagination": {...} }
\`\`\`
`;

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({ logger: false });

    await fastify.register(cors, {
        origin: config.cors.allowAll
            ? true
            : (origin, cb) => {
                  if (!origin || config.cors.origins.includes(origin)) {
                      cb(null, true);
                      return;
                  }
                  appLogger.warn({ origin, allowed: config.cors.origins }, "CORS origin rejected");
                  cb(null, false);
              },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
    });

    await fastify.register(swagger, {
        openapi: {
            info: {
                title: "Uptime & Loggers Monitoring API",
                description: swaggerDescription,
                version: "1.0.0",
                contact: {
                    name: "Sundaya Development Team",
                    email: "dev@sundaya.com",
                },
            },
            servers: [
                {
                    url: `http://${config.app.host}:${config.app.port}`,
                    description: `${config.app.nodeEnv} server`,
                },
            ],
            tags: [
                { name: "Health", description: "Health check" },
                { name: "Uptime", description: "Site uptime monitoring" },
                { name: "Pulling Logs", description: "Pulling logs status" },
            ],
        },
    });

    await fastify.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: true,
            displayRequestDuration: true,
        },
        staticCSP: true,
    });

    // Health check
    fastify.get("/health", {
        schema: { tags: ["Health"], summary: "Service health check" },
        handler: async () => ({
            status: "ok",
            service: "uptime-loggers-services",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        }),
    });

    // Monitoring routes
    await fastify.register(monitoringRoutes, {
        prefix: `${config.app.apiPrefix}/monitoring`,
    });

    fastify.setErrorHandler((error: any, request, reply) => {
        appLogger.error({ error: error.message, url: request.url, method: request.method }, "Request error");

        if (error.name === "ZodError") {
            return reply.status(400).send({
                success: false,
                error: "Validation error",
                details: error.issues,
            });
        }

        reply.status(error.statusCode || 500).send({
            success: false,
            error: error.message || "Internal Server Error",
        });
    });

    fastify.setNotFoundHandler((request, reply) => {
        reply.status(404).send({
            success: false,
            error: `Route ${request.method} ${request.url} not found`,
        });
    });

    return fastify;
}

async function main() {
    appLogger.info("Starting Uptime & Loggers Monitoring Service...");

    try {
        await timescaleService.connect();
        redisQueueService.connect();

        const app = await buildApp();

        await app.listen({
            port: config.app.port,
            host: config.app.host,
        });

        connectivityProbeJob.start();

        const serverUrl = `http://${config.app.host}:${config.app.port}`;
        appLogger.info(`Uptime Loggers Service running at ${serverUrl}`);
        appLogger.info(`Swagger UI at ${serverUrl}/docs`);
    } catch (error) {
        appLogger.fatal({ error }, "Failed to start service");
        process.exit(1);
    }
}

async function shutdown(signal: string) {
    appLogger.info({ signal }, "Shutting down...");
    try {
        connectivityProbeJob.stop();
        redisQueueService.disconnect();
        await timescaleService.disconnect();
    } catch (error) {
        appLogger.error({ error }, "Error during shutdown");
    }
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
    appLogger.fatal({ error }, "Uncaught exception");
    shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
    appLogger.fatal({ reason }, "Unhandled rejection");
    shutdown("unhandledRejection");
});

main();
