// src/types/message.types.ts

import { z } from "zod";

// ============================================================
// Zod Schemas for Runtime Validation
// ============================================================

// Site information schema
const SiteInfoSchema = z.object({
    ip_address: z.string().ipv4().optional(),
    site_id: z.string().min(1).max(20),
    site_name: z.string().min(1),
});

// Load data schema
const LoadSchema = z.object({
    load1: z.number().optional(),
    load2: z.number().optional(),
    load3: z.number().optional(),
});

// PV data schema
const PVSchema = z.object({
    pv1_voltage: z.number().optional(),
    pv1_current: z.number().optional(),
    pv2_voltage: z.number().optional(),
    pv2_current: z.number().optional(),
    pv3_voltage: z.number().optional(),
    pv3_current: z.number().optional(),
});

// Energy discharge load schema
const EnergyDischargeLoadSchema = z.object({
    edl1: z.number().optional(),
    edl2: z.number().optional(),
    edl3: z.number().optional(),
});

// Energy harvest schema
const EnergyHarvestSchema = z.object({
    eh1: z.number().optional(),
    eh2: z.number().optional(),
    eh3: z.number().optional(),
});

// Scc data schema
const SccDataSchema = z.object({
    battery_voltage: z.number().optional(),
    cpu_temp: z.number().optional(),
    load: LoadSchema.optional(),
    pv: PVSchema.optional(),
    energy_discharge_load: EnergyDischargeLoadSchema.optional(),
    energy_harvest: EnergyHarvestSchema.optional(),
});

// Timestamp can be in multiple formats:
// - "20251125T145710" (compact)
// - "2025-11-25 14:57:10" (readable)
const TimestampSchema = z.string().refine(
    (val) => /^\d{8}T\d{6}$/.test(val) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val),
    { message: "Invalid timestamp format" }
);

// Main scc message schema
export const SccMessageSchema = z.object({
    timestamp: TimestampSchema,
    host: z.string(),
    sites: SiteInfoSchema,
    data_type: z.literal("scc"),
    data: SccDataSchema,
});

// Battery item schema (from publisher)
const BatteryItemSchema = z.object({
    battery_type: z.string().optional(),
    port: z.string().optional(),
    slave_id: z.string().optional(),
    pcb_code: z.string().optional(),
    sn1_code: z.string().optional(),
    pack_voltage: z.string().optional(),
    pack_current: z.string().optional(),
    remaining_capacity: z.string().optional(),
    soc: z.string().optional(),
    soh: z.string().optional(),
    cycle_count: z.string().optional(),
    max_cell_voltage: z.string().optional(),
    min_cell_voltage: z.string().optional(),
    cell_difference: z.string().optional(),
    average_cell_temperature: z.string().optional(),
    max_cell_temperature: z.string().optional(),
    min_cell_temperature: z.string().optional(),
    fet_temperature: z.string().optional(),
    ambient_temperature: z.string().optional(),
    environment_temperature: z.string().optional(),
    full_charged_capacity: z.string().optional(),
    remaining_charge_time: z.string().optional(),
    remaining_discharge_time: z.string().optional(),
    counter: z.string().optional(),
    warning_flag: z.string().optional(),
    protection_flag: z.string().optional(),
    fault_status_flag: z.string().optional(),
    cell_voltage: z.string().optional(),
    cell_temperature: z.string().optional(),
    timestamp: z.string().optional(),
});

// Battery message schema
export const BatteryMessageSchema = z.object({
    timestamp: TimestampSchema,
    host: z.string(),
    sites: SiteInfoSchema,
    data_type: z.literal("battery"),
    data: z.array(BatteryItemSchema),
});

// Union schema for all message types
export const MqttMessageSchema = z.union([
    SccMessageSchema,
    BatteryMessageSchema,
]);

// ============================================================
// TypeScript Types (Inferred from Zod schemas)
// ============================================================

export type SiteInfo = z.infer<typeof SiteInfoSchema>;
export type LoadData = z.infer<typeof LoadSchema>;
export type PVData = z.infer<typeof PVSchema>;
export type EnergyDischargeLoad = z.infer<typeof EnergyDischargeLoadSchema>;
export type EnergyHarvest = z.infer<typeof EnergyHarvestSchema>;
export type SccData = z.infer<typeof SccDataSchema>;
export type SccMessage = z.infer<typeof SccMessageSchema>;
export type BatteryItem = z.infer<typeof BatteryItemSchema>;
export type BatteryMessage = z.infer<typeof BatteryMessageSchema>;
export type MqttMessage = z.infer<typeof MqttMessageSchema>;

// ============================================================
// Helper Types
// ============================================================

export interface ValidationResult {
    success: boolean;
    data?: MqttMessage;
    error?: string;
}

export interface MqttTopicParts {
    namespace: string; // 'sundaya'
    siteId: string; // 'PAP9999'
    dataType: string; // 'scc' or 'battery'
}

export type DataType = "scc" | "battery";
export type MessageStatus = "PENDING" | "SENT" | "FAILED";

// ============================================================
// Utility Functions
// ============================================================

/**
 * Parse timestamp from multiple formats to Date
 * Supports:
 * - "20251125T145710" (compact)
 * - "2025-11-25 14:57:10" (readable)
 */
export function parseTimestamp(timestamp: string): Date {
    // Check if compact format: 20251125T145710
    if (/^\d{8}T\d{6}$/.test(timestamp)) {
        const year = parseInt(timestamp.substring(0, 4));
        const month = parseInt(timestamp.substring(4, 6)) - 1;
        const day = parseInt(timestamp.substring(6, 8));
        const hour = parseInt(timestamp.substring(9, 11));
        const minute = parseInt(timestamp.substring(11, 13));
        const second = parseInt(timestamp.substring(13, 15));
        return new Date(year, month, day, hour, minute, second);
    }

    // Check if readable format: 2025-11-25 14:57:10
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
        return new Date(timestamp.replace(" ", "T"));
    }

    // Fallback: try native Date parsing
    return new Date(timestamp);
}

/**
 * Parse MQTT topic to extract parts
 */
export function parseTopic(topic: string): MqttTopicParts | null {
    // Expected format: sundaya/mqtt/loggers/{data_type}
    // Example: sundaya/mqtt/loggers/scc
    const parts = topic.split("/");

    if (parts.length === 4 && parts[0] === "sundaya" && parts[1] === "mqtt" && parts[2] === "loggers") {
        // Format: sundaya/mqtt/loggers/{data_type}
        return {
            namespace: parts[0],
            siteId: "mqtt",  // Will get actual site_id from payload
            dataType: parts[3],
        };
    }

    if (parts.length === 3) {
        // Legacy format: sundaya/{site_id}/{data_type}
        return {
            namespace: parts[0],
            siteId: parts[1],
            dataType: parts[2],
        };
    }

    return null;
}

/**
 * Validate MQTT message payload
 */
export function validateMessage(payload: unknown): ValidationResult {
    try {
        const parsed = MqttMessageSchema.parse(payload);
        return {
            success: true,
            data: parsed,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", "),
            };
        }
        return {
            success: false,
            error: "Unknown validation error",
        };
    }
}

/**
 * Check if data type is valid
 */
export function isValidDataType(dataType: string): dataType is DataType {
    return dataType === "scc" || dataType === "battery";
}
