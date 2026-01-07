import { PrismaClient } from "@prisma/client";
import { dbLogger } from "../utils/logger";
import { MqttMessage, parseTimestamp } from "../types/message.types";
import prisma from "../config/prisma";

export class DatabaseService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    /**
     * Connect to database and verify connection
     */
    async connect(): Promise<void> {
        try {
            await this.prisma.$connect();
            dbLogger.info("Connected to PostgreSQL database");

            // Test query
            await this.prisma.$queryRaw`SELECT 1`;
            dbLogger.info("Database connection verified");
        } catch (error) {
            dbLogger.error({ error }, "Failed to connect to database");
            throw error;
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
        dbLogger.info("Disconnected from database");
    }

    /**
     * Save MQTT message to staging table
     */
    async saveMqttMessage(
        message: MqttMessage,
        topic: string
    ): Promise<bigint> {
        try {
            const messageTimestamp = parseTimestamp(message.timestamp);

            const result = await this.prisma.mqttMessage.create({
                data: {
                    siteId: message.sites.site_id,
                    dataType: message.data_type,
                    payload: message as object,
                    messageTimestamp,
                    mqttTopic: topic,
                    host: message.host,
                    status: "PENDING",
                },
            });

            dbLogger.info(
                {
                    id: result.id.toString(),
                    siteId: result.siteId,
                    dataType: result.dataType,
                },
                "Saved message to staging"
            );

            return result.id;
        } catch (error) {
            dbLogger.error(
                {
                    error,
                    siteId: message.sites.site_id,
                    dataType: message.data_type,
                },
                "Failed to save message to staging"
            );
            throw error;
        }
    }

    /**
     * Get pending messages count
     */
    async getPendingCount(): Promise<number> {
        return await this.prisma.mqttMessage.count({
            where: { status: "PENDING" },
        });
    }

    /**
     * Get statistics per site
     */
    async getSiteStatistics(siteId?: string) {
        const where = siteId ? { siteId } : {};

        const stats = await this.prisma.mqttMessage.groupBy({
            by: ["siteId", "dataType", "status"],
            where,
            _count: true,
            orderBy: {
                siteId: "asc",
            },
        });

        return stats;
    }

    /**
     * Get recent messages
     */
    async getRecentMessages(limit: number = 10) {
        return await this.prisma.mqttMessage.findMany({
            take: limit,
            orderBy: {
                receivedAt: "desc",
            },
            select: {
                id: true,
                siteId: true,
                dataType: true,
                status: true,
                receivedAt: true,
                messageTimestamp: true,
            },
        });
    }

    /**
     * Cleanup old sent messages (older than 60 days)
     */
    async cleanupOldMessages(): Promise<number> {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const result = await this.prisma.mqttMessage.deleteMany({
            where: {
                status: "SENT",
                processedAt: {
                    lt: sixtyDaysAgo,
                },
            },
        });

        dbLogger.info({ count: result.count }, "Cleaned up old messages");
        return result.count;
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            dbLogger.error({ error }, "Health check failed");
            return false;
        }
    }

    /**
     * Get database statistics
     */
    async getDatabaseStats() {
        const [
            totalMessages,
            pendingMessages,
            sentMessages,
            failedMessages,
            oldestPending,
            newestMessage,
        ] = await Promise.all([
            this.prisma.mqttMessage.count(),
            this.prisma.mqttMessage.count({ where: { status: "PENDING" } }),
            this.prisma.mqttMessage.count({ where: { status: "SENT" } }),
            this.prisma.mqttMessage.count({ where: { status: "FAILED" } }),
            this.prisma.mqttMessage.findFirst({
                where: { status: "PENDING" },
                orderBy: { receivedAt: "asc" },
                select: { receivedAt: true },
            }),
            this.prisma.mqttMessage.findFirst({
                orderBy: { receivedAt: "desc" },
                select: { receivedAt: true },
            }),
        ]);

        return {
            total: totalMessages,
            pending: pendingMessages,
            sent: sentMessages,
            failed: failedMessages,
            oldestPending: oldestPending?.receivedAt,
            newestMessage: newestMessage?.receivedAt,
        };
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();
