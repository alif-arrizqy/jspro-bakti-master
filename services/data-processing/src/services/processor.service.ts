import { MqttMessage } from "@prisma/mqtt-collector-client";
import { processorLogger } from "../utils/logger";
import { databaseService } from "./database.service";
import {
    SccMessage,
    SccMessageSchema,
    BatteryMessage,
    BatteryMessageSchema,
    ProcessingResult,
    BatchProcessingResult,
    parseTimestamp,
    safeParseInt,
    parseCellVoltages,
    parseFlags,
} from "../types";
import { config } from "../config/env";

// ============================================================
// Processor Service Class
// ============================================================

export class ProcessorService {
    /**
     * Process a single MQTT message
     */
    async processMessage(message: MqttMessage): Promise<ProcessingResult> {
        const { id, dataType, payload, siteId } = message;

        processorLogger.debug(
            { messageId: id.toString(), dataType, siteId },
            "Processing message"
        );

        try {
            let recordsCreated = 0;

            switch (dataType) {
                case "scc":
                    recordsCreated = await this.processSccMessage(payload);
                    break;

                case "battery":
                    recordsCreated = await this.processBatteryMessage(payload);
                    break;

                default:
                    throw new Error(`Unknown data type: ${dataType}`);
            }

            // Mark message as sent
            await databaseService.markMessageAsSent(id);

            processorLogger.info(
                { messageId: id.toString(), dataType, siteId, recordsCreated },
                "Message processed successfully"
            );

            return {
                success: true,
                messageId: id,
                dataType,
                recordsCreated,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            // Mark message as failed
            await databaseService.markMessageAsFailed(id, errorMessage);

            processorLogger.error(
                { messageId: id.toString(), dataType, siteId, error: errorMessage },
                "Failed to process message"
            );

            return {
                success: false,
                messageId: id,
                dataType,
                recordsCreated: 0,
                error: errorMessage,
            };
        }
    }

    /**
     * Process SCC message payload
     */
    private async processSccMessage(payload: unknown): Promise<number> {
        // Validate payload
        const parseResult = SccMessageSchema.safeParse(payload);
        if (!parseResult.success) {
            throw new Error(`Invalid SCC payload: ${parseResult.error.message}`);
        }

        const sccMessage: SccMessage = parseResult.data;
        const { timestamp, sites, data } = sccMessage;

        // Insert SCC data
        await databaseService.insertSccData({
            siteId: sites.site_id,
            prCode: null, // Will be added later from MQTT message
            timestamp: parseTimestamp(timestamp),
            batteryVoltage: data.battery_voltage ?? null,
            cpuTemp: data.cpu_temp ?? null,
            load1: data.load?.load1 ?? null,
            load2: data.load?.load2 ?? null,
            load3: data.load?.load3 ?? null,
            pv1Current: data.pv?.pv1_current ?? null,
            pv2Current: data.pv?.pv2_current ?? null,
            pv3Current: data.pv?.pv3_current ?? null,
            pv1Voltage: data.pv?.pv1_voltage ?? null,
            pv2Voltage: data.pv?.pv2_voltage ?? null,
            pv3Voltage: data.pv?.pv3_voltage ?? null,
            edl1: data.energy_discharge_load?.edl1 ?? null,
            edl2: data.energy_discharge_load?.edl2 ?? null,
            edl3: data.energy_discharge_load?.edl3 ?? null,
            eh1: data.energy_harvest?.eh1 ?? null,
            eh2: data.energy_harvest?.eh2 ?? null,
            eh3: data.energy_harvest?.eh3 ?? null,
        });

        return 1; // 1 record created
    }

    /**
     * Process Battery message payload
     */
    private async processBatteryMessage(payload: unknown): Promise<number> {
        // Validate payload
        const parseResult = BatteryMessageSchema.safeParse(payload);
        if (!parseResult.success) {
            throw new Error(`Invalid Battery payload: ${parseResult.error.message}`);
        }

        const batteryMessage: BatteryMessage = parseResult.data;
        const { timestamp: messageTimestamp, sites, data: batteryItems } = batteryMessage;

        let recordsCreated = 0;

        // Process each battery pack in the message
        for (const battery of batteryItems) {
            // Parse cell voltages and insert to cell_battery_data
            const cellVoltages = parseCellVoltages(battery.cell_voltage);
            let cellVoltageId: bigint | null = null;

            if (cellVoltages.length > 0) {
                cellVoltageId = await databaseService.insertCellVoltageData(cellVoltages);
            }

            // Parse cell temperatures
            const cellTemps = battery.cell_temperature
                ? battery.cell_temperature.split(",").map((t) => safeParseInt(t.trim()))
                : [];

            // Determine timestamp - use battery item timestamp if available
            const timestamp = battery.timestamp
                ? parseTimestamp(battery.timestamp)
                : parseTimestamp(messageTimestamp);

            // Insert battery data
            await databaseService.insertBatteryData({
                siteId: sites.site_id,
                prCode: null, // Will be added later from MQTT message
                timestamp,
                batteryType: battery.battery_type ?? null,
                slaveId: safeParseInt(battery.slave_id),
                pcbCode: battery.pcb_code ?? null,
                sn1Code: battery.sn1_code ?? null,
                port: battery.port ?? null,
                counter: safeParseInt(battery.counter),
                packVoltage: safeParseInt(battery.pack_voltage),
                packCurrent: safeParseInt(battery.pack_current),
                remainingCapacity: safeParseInt(battery.remaining_capacity),
                averageCellTemperature: safeParseInt(battery.average_cell_temperature),
                environmentTemperature: safeParseInt(battery.environment_temperature),
                soc: safeParseInt(battery.soc),
                soh: safeParseInt(battery.soh),
                fullCapacity: safeParseInt(battery.full_charged_capacity),
                cycleCount: safeParseInt(battery.cycle_count),
                cellVoltageId,
                maxCellVoltage: safeParseInt(battery.max_cell_voltage),
                minCellVoltage: safeParseInt(battery.min_cell_voltage),
                cellDifference: safeParseInt(battery.cell_difference),
                maxCellTemperature: safeParseInt(battery.max_cell_temperature),
                minCellTemperature: safeParseInt(battery.min_cell_temperature),
                fetTemperature: safeParseInt(battery.fet_temperature),
                ambientTemperature: safeParseInt(battery.ambient_temperature),
                remainingChargingTime: safeParseInt(battery.remaining_charge_time),
                remainingDischargingTime: safeParseInt(battery.remaining_discharge_time),
                cellTemperature1: cellTemps[0] ?? null,
                cellTemperature2: cellTemps[1] ?? null,
                cellTemperature3: cellTemps[2] ?? null,
                warningFlag: parseFlags(battery.warning_flag),
                protectFlag: parseFlags(battery.protection_flag),
                faultFlag: parseFlags(battery.fault_status_flag),
                errorMessages: [], // Not in MQTT payload
            });

            recordsCreated++;
        }

        return recordsCreated;
    }

    /**
     * Process a batch of pending messages
     */
    async processPendingBatch(): Promise<BatchProcessingResult> {
        const messages = await databaseService.getPendingMessages(config.processing.batchSize);

        if (messages.length === 0) {
            return {
                totalProcessed: 0,
                successful: 0,
                failed: 0,
                results: [],
            };
        }

        processorLogger.info({ count: messages.length }, "Processing pending messages batch");

        const results: ProcessingResult[] = [];
        let successful = 0;
        let failed = 0;

        for (const message of messages) {
            const result = await this.processMessage(message);
            results.push(result);

            if (result.success) {
                successful++;
            } else {
                failed++;
            }
        }

        processorLogger.info(
            { totalProcessed: messages.length, successful, failed },
            "Batch processing completed"
        );

        return {
            totalProcessed: messages.length,
            successful,
            failed,
            results,
        };
    }

    /**
     * Process failed messages for retry
     */
    async processFailedRetries(): Promise<BatchProcessingResult> {
        const messages = await databaseService.getFailedMessagesForRetry(
            config.processing.maxRetryCount,
            config.processing.batchSize
        );

        if (messages.length === 0) {
            return {
                totalProcessed: 0,
                successful: 0,
                failed: 0,
                results: [],
            };
        }

        processorLogger.info({ count: messages.length }, "Retrying failed messages");

        const results: ProcessingResult[] = [];
        let successful = 0;
        let failed = 0;

        for (const message of messages) {
            const result = await this.processMessage(message);
            results.push(result);

            if (result.success) {
                successful++;
            } else {
                failed++;
            }
        }

        processorLogger.info(
            { totalProcessed: messages.length, successful, failed },
            "Retry processing completed"
        );

        return {
            totalProcessed: messages.length,
            successful,
            failed,
            results,
        };
    }
}

// Export singleton instance
export const processorService = new ProcessorService();

