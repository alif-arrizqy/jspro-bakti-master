import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config/env";
import { appLogger } from "./utils/logger";
import { registerRoutes } from "./routes";
import { siteDownSwaggerSchemas } from "./schemas/site-down.schema";
import { databaseService } from "./services/database.service";
import { schedulerService } from "./services/scheduler.service";

const swaggerDescription = `
## Site Down Monitoring Service REST API

API untuk monitoring site down dari NMS Semeru.

### Fitur Utama:
- **Site Down Monitoring**: Fetch data site down dari NMS API setiap 1 jam
- **CRUD Operations**: Create, Read, Update, Delete untuk data site downtime
- **Manual Sync**: Trigger manual sync dari NMS API

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

    await fastify.register(swagger, {
        openapi: {
            info: {
                title: "Site Down Monitoring Service API",
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
                    name: "Site Down",
                    description: "Site down monitoring and management",
                },
            ],
            components: {
                schemas: {
                    ...(siteDownSwaggerSchemas as Record<string, any>),
                },
            },
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
    appLogger.info("Starting Site Down Monitoring Service...");
    appLogger.info({ port: config.app.port, env: config.app.nodeEnv }, "Configuration loaded");

    try {
        await databaseService.connect();

        const app = await buildApp();

        await app.listen({
            port: config.app.port,
            host: config.app.host,
        });

        // Start scheduler
        schedulerService.start();

        const serverUrl = `http://${config.app.host}:${config.app.port}`;
        const docsUrl = `${serverUrl}/docs`;
        
        appLogger.info(`🚀 Site Down Monitoring Service running at ${serverUrl}`);
        appLogger.info(`📚 Swagger UI available at ${docsUrl}`);
    } catch (error) {
        appLogger.fatal({ error }, "Failed to start Site Down Monitoring Service");
        process.exit(1);
    }
}

async function shutdown(signal: string) {
    appLogger.info({ signal }, "Received shutdown signal");

    try {
        schedulerService.stop();
        await databaseService.disconnect();
        appLogger.info("Database connections closed");
    } catch (error) {
        appLogger.error({ error }, "Error during shutdown");
    }

    appLogger.info("Site Down Monitoring Service shutdown complete");
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

