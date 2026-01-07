import { PrismaClient as MqttCollectorClient, MessageStatus } from "@prisma/mqtt-collector-client";
import { PrismaClient as DataLoggersClient } from "@prisma/data-loggers-client";
import { dbLogger } from "../utils/logger";
import { mqttCollectorDb, dataLoggersDb } from "../config/prisma";

// Database Service Class
export class DatabaseService {
    private mqttCollector: MqttCollectorClient;
    private dataLoggers: DataLoggersClient;

    constructor() {
        this.mqttCollector = mqttCollectorDb;
        this.dataLoggers = dataLoggersDb;
    }

    /**
     * Connect to both databases and verify connections
     */
    async connect(): Promise<void> {
        try {
            // Connect to mqtt_collector_db
            await this.mqttCollector.$connect();
            await this.mqttCollector.$queryRaw`SELECT 1`;
            dbLogger.info("Connected to mqtt_collector_db");

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
        await this.mqttCollector.$disconnect();
        dbLogger.info("Disconnected from mqtt_collector_db");

        await this.dataLoggers.$disconnect();
        dbLogger.info("Disconnected from data_loggers_db");
    }

    // ============================================================
    // MQTT Collector DB Operations (mqtt_collector_db)
    // ============================================================

    /**
     * Get pending messages for processing
     */
    async getPendingMessages(limit: number = 100) {
        return await this.mqttCollector.mqttMessage.findMany({
            where: {
                status: MessageStatus.PENDING,
            },
            take: limit,
            orderBy: {
                receivedAt: "asc",
            },
        });
    }

    /**
     * Get failed messages for retry (with retry count less than max)
     */
    async getFailedMessagesForRetry(maxRetryCount: number, limit: number = 50) {
        return await this.mqttCollector.mqttMessage.findMany({
            where: {
                status: MessageStatus.FAILED,
                retryCount: {
                    lt: maxRetryCount,
                },
            },
            take: limit,
            orderBy: {
                receivedAt: "asc",
            },
        });
    }

    /**
     * Update message status to SENT
     */
    async markMessageAsSent(id: bigint): Promise<void> {
        await this.mqttCollector.mqttMessage.update({
            where: { id },
            data: {
                status: MessageStatus.SENT,
                processedAt: new Date(),
            },
        });
        dbLogger.debug({ id: id.toString() }, "Message marked as SENT");
    }

    /**
     * Update message status to FAILED
     */
    async markMessageAsFailed(id: bigint, errorMessage: string): Promise<void> {
        await this.mqttCollector.mqttMessage.update({
            where: { id },
            data: {
                status: MessageStatus.FAILED,
                errorMessage,
                retryCount: { increment: 1 },
            },
        });
        dbLogger.warn({ id: id.toString(), errorMessage }, "Message marked as FAILED");
    }

    /**
     * Get processing statistics from mqtt_collector_db
     */
    async getProcessingStats() {
        const [pending, sent, failed] = await Promise.all([
            this.mqttCollector.mqttMessage.count({ where: { status: MessageStatus.PENDING } }),
            this.mqttCollector.mqttMessage.count({ where: { status: MessageStatus.SENT } }),
            this.mqttCollector.mqttMessage.count({ where: { status: MessageStatus.FAILED } }),
        ]);

        return { pending, sent, failed };
    }

    // ============================================================
    // Data Loggers DB Operations (data_loggers_db)
    // ============================================================

    /**
     * Insert SCC data logger record
     */
    async insertSccData(data: {
        siteId: string;
        prCode?: string | null;
        timestamp: Date;
        batteryVoltage?: number | null;
        cpuTemp?: number | null;
        load1?: number | null;
        load2?: number | null;
        load3?: number | null;
        pv1Current?: number | null;
        pv2Current?: number | null;
        pv3Current?: number | null;
        pv1Voltage?: number | null;
        pv2Voltage?: number | null;
        pv3Voltage?: number | null;
        edl1?: number | null;
        edl2?: number | null;
        edl3?: number | null;
        eh1?: number | null;
        eh2?: number | null;
        eh3?: number | null;
    }): Promise<bigint> {
        const result = await this.dataLoggers.sccDataLogger.create({
            data: {
                siteId: data.siteId,
                prCode: data.prCode,
                timestamp: data.timestamp,
                batteryVoltage: data.batteryVoltage,
                cpuTemp: data.cpuTemp,
                load1: data.load1,
                load2: data.load2,
                load3: data.load3,
                pv1Current: data.pv1Current,
                pv2Current: data.pv2Current,
                pv3Current: data.pv3Current,
                pv1Voltage: data.pv1Voltage,
                pv2Voltage: data.pv2Voltage,
                pv3Voltage: data.pv3Voltage,
                edl1: data.edl1,
                edl2: data.edl2,
                edl3: data.edl3,
                eh1: data.eh1,
                eh2: data.eh2,
                eh3: data.eh3,
            },
        });

        dbLogger.debug(
            { id: result.id.toString(), siteId: data.siteId },
            "Inserted SCC data to data_loggers_db"
        );
        return result.id;
    }

    /**
     * Insert cell voltage data and return the ID
     */
    async insertCellVoltageData(cellVoltages: number[]): Promise<bigint> {
        const result = await this.dataLoggers.cellBatteryData.create({
            data: {
                cell1: cellVoltages[0] ?? null,
                cell2: cellVoltages[1] ?? null,
                cell3: cellVoltages[2] ?? null,
                cell4: cellVoltages[3] ?? null,
                cell5: cellVoltages[4] ?? null,
                cell6: cellVoltages[5] ?? null,
                cell7: cellVoltages[6] ?? null,
                cell8: cellVoltages[7] ?? null,
                cell9: cellVoltages[8] ?? null,
                cell10: cellVoltages[9] ?? null,
                cell11: cellVoltages[10] ?? null,
                cell12: cellVoltages[11] ?? null,
                cell13: cellVoltages[12] ?? null,
                cell14: cellVoltages[13] ?? null,
                cell15: cellVoltages[14] ?? null,
                cell16: cellVoltages[15] ?? null,
            },
        });

        dbLogger.debug({ id: result.id.toString() }, "Inserted cell voltage data to data_loggers_db");
        return result.id;
    }

    /**
     * Insert battery data logger record
     */
    async insertBatteryData(data: {
        siteId: string;
        prCode?: string | null;
        timestamp: Date;
        batteryType?: string | null;
        slaveId?: number | null;
        pcbCode?: string | null;
        sn1Code?: string | null;
        port?: string | null;
        counter?: number | null;
        packVoltage?: number | null;
        packCurrent?: number | null;
        remainingCapacity?: number | null;
        averageCellTemperature?: number | null;
        environmentTemperature?: number | null;
        soc?: number | null;
        soh?: number | null;
        fullCapacity?: number | null;
        cycleCount?: number | null;
        cellVoltageId?: bigint | null;
        maxCellVoltage?: number | null;
        minCellVoltage?: number | null;
        cellDifference?: number | null;
        maxCellTemperature?: number | null;
        minCellTemperature?: number | null;
        fetTemperature?: number | null;
        ambientTemperature?: number | null;
        remainingChargingTime?: number | null;
        remainingDischargingTime?: number | null;
        cellTemperature1?: number | null;
        cellTemperature2?: number | null;
        cellTemperature3?: number | null;
        warningFlag?: string[];
        protectFlag?: string[];
        faultFlag?: string[];
        errorMessages?: string[];
    }): Promise<bigint> {
        const result = await this.dataLoggers.batteryDataLogger.create({
            data: {
                siteId: data.siteId,
                prCode: data.prCode,
                timestamp: data.timestamp,
                batteryType: data.batteryType,
                slaveId: data.slaveId,
                pcbCode: data.pcbCode,
                sn1Code: data.sn1Code,
                port: data.port,
                counter: data.counter,
                packVoltage: data.packVoltage,
                packCurrent: data.packCurrent,
                remainingCapacity: data.remainingCapacity,
                averageCellTemperature: data.averageCellTemperature,
                environmentTemperature: data.environmentTemperature,
                soc: data.soc,
                soh: data.soh,
                fullCapacity: data.fullCapacity,
                cycleCount: data.cycleCount,
                cellVoltageId: data.cellVoltageId,
                maxCellVoltage: data.maxCellVoltage,
                minCellVoltage: data.minCellVoltage,
                cellDifference: data.cellDifference,
                maxCellTemperature: data.maxCellTemperature,
                minCellTemperature: data.minCellTemperature,
                fetTemperature: data.fetTemperature,
                ambientTemperature: data.ambientTemperature,
                remainingChargingTime: data.remainingChargingTime,
                remainingDischargingTime: data.remainingDischargingTime,
                cellTemperature1: data.cellTemperature1,
                cellTemperature2: data.cellTemperature2,
                cellTemperature3: data.cellTemperature3,
                warningFlag: data.warningFlag ?? [],
                protectFlag: data.protectFlag ?? [],
                faultFlag: data.faultFlag ?? [],
                errorMessages: data.errorMessages ?? [],
            },
        });

        dbLogger.debug(
            { id: result.id.toString(), siteId: data.siteId, slaveId: data.slaveId },
            "Inserted battery data to data_loggers_db"
        );
        return result.id;
    }

    // ============================================================
    // Health Check
    // ============================================================

    /**
     * Health check for both databases
     */
    async healthCheck(): Promise<{ mqttCollector: boolean; dataLoggers: boolean }> {
        let mqttCollectorHealthy = false;
        let dataLoggersHealthy = false;

        try {
            await this.mqttCollector.$queryRaw`SELECT 1`;
            mqttCollectorHealthy = true;
        } catch (error) {
            dbLogger.error({ error }, "mqtt_collector_db health check failed");
        }

        try {
            await this.dataLoggers.$queryRaw`SELECT 1`;
            dataLoggersHealthy = true;
        } catch (error) {
            dbLogger.error({ error }, "data_loggers_db health check failed");
        }

        return {
            mqttCollector: mqttCollectorHealthy,
            dataLoggers: dataLoggersHealthy,
        };
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();
