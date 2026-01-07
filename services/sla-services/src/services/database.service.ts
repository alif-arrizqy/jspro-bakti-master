import { PrismaClient as SlaClient } from "@prisma/sla-client";
import { PrismaClient as DataLoggersClient } from "@prisma/data-loggers-client";
import { dbLogger } from "../utils/logger";
import { slaDb, dataLoggersDb } from "../config/prisma";

// Database Service Class
export class DatabaseService {
    private sla: SlaClient;
    private dataLoggers: DataLoggersClient;

    constructor() {
        this.sla = slaDb;
        this.dataLoggers = dataLoggersDb;
    }

    /**
     * Get SLA Database client
     */
    getSlaClient(): SlaClient {
        return this.sla;
    }

    /**
     * Get Data Loggers Database client (read-only)
     */
    getDataLoggersClient(): DataLoggersClient {
        return this.dataLoggers;
    }

    /**
     * Connect to both databases and verify connections
     */
    async connect(): Promise<void> {
        try {
            // Connect to sla_db
            await this.sla.$connect();
            await this.sla.$queryRaw`SELECT 1`;
            dbLogger.info("Connected to sla_db");

            // Connect to data_loggers_db
            await this.dataLoggers.$connect();
            await this.dataLoggers.$queryRaw`SELECT 1`;
            dbLogger.info("Connected to data_loggers_db");

            dbLogger.info("All database connections verified");
        } catch (error) {
            dbLogger.error({ error }, "Failed to connect to database(s)");
            throw error;
        }
    }

    /**
     * Disconnect from both databases
     */
    async disconnect(): Promise<void> {
        await this.sla.$disconnect();
        dbLogger.info("Disconnected from sla_db");

        await this.dataLoggers.$disconnect();
        dbLogger.info("Disconnected from data_loggers_db");
    }

    /**
     * Health check for both databases
     */
    async healthCheck(): Promise<{ slaDb: boolean; dataLoggersDb: boolean }> {
        let slaHealthy = false;
        let dataLoggersHealthy = false;

        try {
            await this.sla.$queryRaw`SELECT 1`;
            slaHealthy = true;
        } catch (error) {
            dbLogger.error({ error }, "sla_db health check failed");
        }

        try {
            await this.dataLoggers.$queryRaw`SELECT 1`;
            dataLoggersHealthy = true;
        } catch (error) {
            dbLogger.error({ error }, "data_loggers_db health check failed");
        }

        return {
            slaDb: slaHealthy,
            dataLoggersDb: dataLoggersHealthy,
        };
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();

