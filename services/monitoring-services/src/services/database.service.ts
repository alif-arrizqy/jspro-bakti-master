import { PrismaClient as SiteDownClient } from "@prisma/site-down-client";
import { dbLogger } from "../utils/logger";
import { siteDownDb } from "../config/prisma";

// Database Service Class
export class DatabaseService {
    private siteDown: SiteDownClient;

    constructor() {
        this.siteDown = siteDownDb;
    }

    /**
     * Get Site Down Database client
     */
    getSiteDownClient(): SiteDownClient {
        return this.siteDown;
    }

    /**
     * Connect to database and verify connection
     */
    async connect(): Promise<void> {
        try {
            await this.siteDown.$connect();
            await this.siteDown.$queryRaw`SELECT 1`;
            dbLogger.info("Connected to site_down_db");
        } catch (error) {
            dbLogger.error({ error }, "Failed to connect to database");
            throw error;
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect(): Promise<void> {
        await this.siteDown.$disconnect();
        dbLogger.info("Disconnected from site_down_db");
    }

    /**
     * Health check for database
     */
    async healthCheck(): Promise<{ siteDownDb: boolean }> {
        let siteDownHealthy = false;

        try {
            await this.siteDown.$queryRaw`SELECT 1`;
            siteDownHealthy = true;
        } catch (error) {
            dbLogger.error({ error }, "site_down_db health check failed");
        }

        return {
            siteDownDb: siteDownHealthy,
        };
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();

