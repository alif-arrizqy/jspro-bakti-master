import { appLogger, processorLogger } from "./utils/logger";
import { databaseService } from "./services/database.service";
import { processorService } from "./services/processor.service";
import { config } from "./config/env";

// ============================================================
// Main Application Entry Point
// ============================================================

let isShuttingDown = false;
let processingInterval: NodeJS.Timeout | null = null;

/**
 * Main processing loop
 */
async function runProcessingLoop(): Promise<void> {
    if (isShuttingDown) return;

    try {
        // Process pending messages
        const pendingResult = await processorService.processPendingBatch();

        if (pendingResult.totalProcessed > 0) {
            appLogger.info(
                {
                    pending: pendingResult.totalProcessed,
                    successful: pendingResult.successful,
                    failed: pendingResult.failed,
                },
                "Pending messages processed"
            );
        }

        // Process failed retries (less frequently)
        const retryResult = await processorService.processFailedRetries();

        if (retryResult.totalProcessed > 0) {
            appLogger.info(
                {
                    retries: retryResult.totalProcessed,
                    successful: retryResult.successful,
                    failed: retryResult.failed,
                },
                "Failed messages retried"
            );
        }
    } catch (error) {
        appLogger.error({ error }, "Error in processing loop");
    }
}

/**
 * Start the processing service
 */
async function startService(): Promise<void> {
    appLogger.info("Starting Data Processing Service...");
    appLogger.info({ config: config.processing }, "Processing configuration");

    try {
        // Connect to database
        await databaseService.connect();

        // Get initial stats
        const stats = await databaseService.getProcessingStats();
        appLogger.info(
            { pending: stats.pending, sent: stats.sent, failed: stats.failed },
            "Initial message statistics"
        );

        // Start processing loop
        appLogger.info(
            { intervalMs: config.processing.pollingIntervalMs },
            "Starting processing loop"
        );

        // Run immediately once
        await runProcessingLoop();

        // Then run at interval
        processingInterval = setInterval(
            runProcessingLoop,
            config.processing.pollingIntervalMs
        );

        appLogger.info("Data Processing Service started successfully");
    } catch (error) {
        appLogger.error({ error }, "Failed to start service");
        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    appLogger.info({ signal }, "Received shutdown signal");

    // Stop processing interval
    if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null;
    }

    // Disconnect from database
    try {
        await databaseService.disconnect();
        appLogger.info("Database disconnected");
    } catch (error) {
        appLogger.error({ error }, "Error disconnecting from database");
    }

    appLogger.info("Data Processing Service shutdown complete");
    process.exit(0);
}

// ============================================================
// Signal Handlers
// ============================================================

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

// ============================================================
// Start Application
// ============================================================

startService();

