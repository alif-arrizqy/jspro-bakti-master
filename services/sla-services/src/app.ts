import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config/env";
import { appLogger } from "./utils/logger";
import { registerRoutes } from "./routes";
import { slaBaktiSwaggerSchemas } from "./schemas/sla-bakti.schema";
import { slaInternalSwaggerSchemas } from "./schemas/sla-internal.schema";
import { databaseService } from "./services/database.service";

const swaggerDescription = `
## SLA Service REST API

API untuk mengelola data SLA Bakti dan SLA Internal.

### Fitur Utama:
- **SLA Bakti**: Upload Excel file, preview data, dan CRUD operations untuk data SLA Bakti
- **SLA Internal - SLA 1**: Summary data dari data loggers berdasarkan range date
- **SLA Internal - SLA 2**: Daily average data dari data loggers berdasarkan range date
- **SLA Internal - SLA 3**: Export data ke Excel file (.xlsx) dari data loggers

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

    await fastify.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    });

    await fastify.register(swagger, {
        openapi: {
            info: {
                title: "SLA Service API",
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
                    name: "SLA Bakti",
                    description: "SLA Bakti data management (upload from Excel, CRUD operations)",
                },
                {
                    name: "SLA Internal",
                    description: "SLA Internal data queries (summary, daily, export)",
                },
            ],
            components: {
                schemas: {
                    ...(slaBaktiSwaggerSchemas as Record<string, any>),
                    ...(slaInternalSwaggerSchemas as Record<string, any>),
                },
            },
        },
        transform: ({ schema, url }) => {
            if (url.includes("/upload")) {
                return {
                    schema: {
                        ...schema,
                        requestBody: {
                            required: true,
                            content: {
                                "multipart/form-data": {
                                    schema: {
                                        type: "object",
                                        required: ["file"],
                                        properties: {
                                            file: {
                                                oneOf: [
                                                    {
                                                        type: "string",
                                                        format: "binary",
                                                        description: "Excel file (.xlsx) to upload (single file)",
                                                    },
                                                    {
                                                        type: "array",
                                                        items: {
                                                            type: "string",
                                                            format: "binary",
                                                        },
                                                        description: "Excel files (.xlsx) to upload (multiple files)",
                                                    },
                                                ],
                                                description: "Excel file(s) (.xlsx) to upload. Can upload single or multiple files.",
                                            },
                                        },
                                    },
                                    encoding: {
                                        file: {
                                            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    url,
                };
            }
            return { schema, url };
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
    appLogger.info("Starting SLA Service...");
    appLogger.info({ port: config.app.port, env: config.app.nodeEnv }, "Configuration loaded");

    try {
        await databaseService.connect();

        const app = await buildApp();

        await app.listen({
            port: config.app.port,
            host: config.app.host,
        });

        const serverUrl = `http://${config.app.host}:${config.app.port}`;
        const docsUrl = `${serverUrl}/docs`;
        
        appLogger.info(`🚀 SLA Service running at ${serverUrl}`);
        appLogger.info(`📚 Swagger UI available at ${docsUrl}`);
    } catch (error) {
        appLogger.fatal({ error }, "Failed to start SLA Service");
        process.exit(1);
    }
}

async function shutdown(signal: string) {
    appLogger.info({ signal }, "Received shutdown signal");

    try {
        await databaseService.disconnect();
        appLogger.info("Database connections closed");
    } catch (error) {
        appLogger.error({ error }, "Error during shutdown");
    }

    appLogger.info("SLA Service shutdown complete");
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
