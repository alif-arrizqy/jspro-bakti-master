import { PrismaClient as MonitoringClient } from "@prisma/monitoring-client";
import { dbLogger } from "../utils/logger";
import { monitoringDb } from "../config/prisma";

// Database Service Class
export class DatabaseService {
    private monitoring: MonitoringClient;

    constructor() {
        this.monitoring = monitoringDb;
    }

    /**
     * Get Monitoring Database client
     */
    getMonitoringClient(): MonitoringClient {
        return this.monitoring;
    }

    /**
     * Get Site Down Database client (deprecated - uses monitoring client)
     * @deprecated Use getMonitoringClient() instead
     */
    getSiteDownClient(): MonitoringClient {
        return this.monitoring;
    }

    /**
     * Connect to database and verify connection
     */
    async connect(): Promise<void> {
        try {
            await this.monitoring.$connect();
            await this.monitoring.$queryRaw`SELECT 1`;
            dbLogger.info("Connected to monitoring_db");
        } catch (error) {
            dbLogger.error({ error }, "Failed to connect to database");
            throw error;
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect(): Promise<void> {
        await this.monitoring.$disconnect();
        dbLogger.info("Disconnected from monitoring_db");
    }

    /**
     * Health check for database
     */
    async healthCheck(): Promise<{ monitoringDb: boolean }> {
        let monitoringHealthy = false;

        try {
            await this.monitoring.$queryRaw`SELECT 1`;
            monitoringHealthy = true;
        } catch (error) {
            dbLogger.error({ error }, "monitoring_db health check failed");
        }

        return {
            monitoringDb: monitoringHealthy,
        };
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();

