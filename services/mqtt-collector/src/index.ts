// src/index.ts

import { appLogger } from "./utils/logger";
import { config } from "./config/env";
import { databaseService } from "./services/database.service";
import { mqttService } from "./services/mqtt.service";

// ============================================================
// Application Class
// ============================================================

class Application {
    private isShuttingDown = false;

    /**
     * Start the application
     */
    async start(): Promise<void> {
        try {
            appLogger.info(
                {
                    nodeEnv: config.app.nodeEnv,
                    logLevel: config.app.logLevel,
                },
                "Starting MQTT Collector Service"
            );

            // Connect to database
            appLogger.info("Connecting to database...");
            await databaseService.connect();

            // Connect to MQTT broker
            appLogger.info("Connecting to MQTT broker...");
            await mqttService.connect();

            // Setup graceful shutdown handlers
            this.setupShutdownHandlers();

            // Log initial statistics
            await this.logStatistics();

            // Setup periodic statistics logging (every 5 minutes)
            setInterval(() => this.logStatistics(), 5 * 60 * 1000);

            appLogger.info("🚀 MQTT Collector Service started successfully");
            appLogger.info(
                {
                    broker: config.mqtt.brokerUrl,
                    topic: config.mqtt.topicPattern,
                    qos: config.mqtt.qos,
                },
                "Service configuration"
            );
        } catch (error) {
            appLogger.error({ error }, "Failed to start application");
            await this.shutdown(1);
        }
    }

    /**
     * Log service statistics
     */
    private async logStatistics(): Promise<void> {
        try {
            const [mqttStatus, dbStats, dbHealth] = await Promise.all([
                mqttService.getStatus(),
                databaseService.getDatabaseStats(),
                databaseService.healthCheck(),
            ]);

            appLogger.info(
                {
                    mqtt: mqttStatus,
                    database: {
                        healthy: dbHealth,
                        stats: dbStats,
                    },
                },
                "Service statistics"
            );
        } catch (error) {
            appLogger.error({ error }, "Failed to get statistics");
        }
    }

    /**
     * Setup graceful shutdown handlers
     */
    private setupShutdownHandlers(): void {
        // Handle SIGINT (Ctrl+C)
        process.on("SIGINT", async () => {
            appLogger.info("Received SIGINT signal");
            await this.shutdown(0);
        });

        // Handle SIGTERM (Docker, systemd)
        process.on("SIGTERM", async () => {
            appLogger.info("Received SIGTERM signal");
            await this.shutdown(0);
        });

        // Handle uncaught exceptions
        process.on("uncaughtException", async (error) => {
            appLogger.error({ error }, "Uncaught exception");
            await this.shutdown(1);
        });

        // Handle unhandled promise rejections
        process.on("unhandledRejection", async (reason, promise) => {
            appLogger.error(
                {
                    reason,
                    promise,
                },
                "Unhandled promise rejection"
            );
            await this.shutdown(1);
        });
    }

    /**
     * Graceful shutdown
     */
    private async shutdown(exitCode: number = 0): Promise<void> {
        if (this.isShuttingDown) {
            appLogger.warn("Shutdown already in progress");
            return;
        }

        this.isShuttingDown = true;
        appLogger.info("Starting graceful shutdown...");

        try {
            // Disconnect from MQTT broker
            appLogger.info("Disconnecting from MQTT broker...");
            await mqttService.disconnect();

            // Log final statistics
            await this.logStatistics();

            // Disconnect from database
            appLogger.info("Disconnecting from database...");
            await databaseService.disconnect();

            appLogger.info("✅ Graceful shutdown completed");
            process.exit(exitCode);
        } catch (error) {
            appLogger.error({ error }, "Error during shutdown");
            process.exit(1);
        }
    }
}

// ============================================================
// Start Application
// ============================================================

const app = new Application();
app.start();
