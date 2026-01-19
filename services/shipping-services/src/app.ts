import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import path from "path";
import { config } from "./config/env";
import { appLogger } from "./utils/logger";
import { registerRoutes } from "./routes";
import prisma from "./config/prisma";
import { cacheService } from "./services/cache.service";

const swaggerDescription = `
## Shipping Service REST API

API untuk mengelola data Shipping Spare Part dan Retur Spare Part.

### Fitur Utama:
- **Address Management**: CRUD untuk alamat pengiriman
- **Problem Master**: CRUD untuk master problem
- **Shipping Spare Part**: Tracking pengiriman spare part dengan status (REQUEST_GUDANG, PROSES_KIRIM, SELESAI)
- **Retur Spare Part**: Management pengembalian spare part
- **Excel Export**: Export data shipping dan retur ke Excel

### Response Format:
Semua response menggunakan format standar:
\`\`\`json
{
  "success": true/false,
  "data": {...}
}
\`\`\`
`;

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: false,
    });

    await fastify.register(cors, {
        origin: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });

    // Register multipart for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB max
        },
    });

    await fastify.register(swagger, {
        openapi: {
            info: {
                title: "Shipping Service API",
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
                {
                    name: "Health",
                    description: "Health check endpoints",
                },
                {
                    name: "Address",
                    description: "Address management (CRUD operations)",
                },
                {
                    name: "Problem Master",
                    description: "Problem master management (CRUD operations)",
                },
                {
                    name: "Shipping Spare Part",
                    description: "Shipping spare part tracking and management",
                },
                {
                    name: "Retur Spare Part",
                    description: "Retur spare part management",
                },
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

    await registerRoutes(fastify, config.app.apiPrefix);

    // Serve uploaded files statically
    await fastify.register(fastifyStatic, {
        root: path.join(process.cwd(), "uploads"),
        prefix: "/uploads/",
    });

    fastify.setErrorHandler((error: any, request, reply) => {
        appLogger.error({ error, url: request.url, method: request.method }, "Request error");

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
    appLogger.info("Starting Shipping Service...");
    appLogger.info({ port: config.app.port, env: config.app.nodeEnv }, "Configuration loaded");

    try {
        // Test database connection
        await prisma.$connect();
        appLogger.info("Database connected");

        const app = await buildApp();

        await app.listen({
            port: config.app.port,
            host: config.app.host,
        });

        const serverUrl = `http://${config.app.host}:${config.app.port}`;
        const docsUrl = `${serverUrl}/docs`;

        appLogger.info(`🚀 Shipping Service running at ${serverUrl}`);
        appLogger.info(`📚 Swagger UI available at ${docsUrl}`);
    } catch (error) {
        appLogger.fatal({ error }, "Failed to start Shipping Service");
        process.exit(1);
    }
}

async function shutdown(signal: string) {
    appLogger.info({ signal }, "Received shutdown signal");

    try {
        await prisma.$disconnect();
        appLogger.info("Database connections closed");
    } catch (error) {
        appLogger.error({ error }, "Error during shutdown");
    }

    try {
        await cacheService.disconnect();
        appLogger.info("Cache connections closed");
    } catch (error) {
        appLogger.error({ error }, "Error closing cache connections");
    }

    appLogger.info("Shipping Service shutdown complete");
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
    appLogger.fatal({ error }, "Uncaught exception");
    shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
    appLogger.fatal({ reason, promise }, "Unhandled rejection");
    shutdown("unhandledRejection");
});

main();

