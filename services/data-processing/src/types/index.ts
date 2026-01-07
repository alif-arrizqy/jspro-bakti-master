import { z } from "zod";

// Message Payload Types (from MQTT)

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

// SCC data schema
const SccDataSchema = z.object({
    battery_voltage: z.number().optional(),
    cpu_temp: z.number().optional(),
    load: LoadSchema.optional(),
    pv: PVSchema.optional(),
    energy_discharge_load: EnergyDischargeLoadSchema.optional(),
    energy_harvest: EnergyHarvestSchema.optional(),
});

// Main SCC message schema
export const SccMessageSchema = z.object({
    timestamp: z.string(),
    host: z.string(),
    sites: SiteInfoSchema,
    data_type: z.literal("scc"),
    data: SccDataSchema,
});

// Battery item schema
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
    timestamp: z.string(),
    host: z.string(),
    sites: SiteInfoSchema,
    data_type: z.literal("battery"),
    data: z.array(BatteryItemSchema),
});

// TypeScript Types

export type SiteInfo = z.infer<typeof SiteInfoSchema>;
export type LoadData = z.infer<typeof LoadSchema>;
export type PVData = z.infer<typeof PVSchema>;
export type EnergyDischargeLoad = z.infer<typeof EnergyDischargeLoadSchema>;
export type EnergyHarvest = z.infer<typeof EnergyHarvestSchema>;
export type SccData = z.infer<typeof SccDataSchema>;
export type SccMessage = z.infer<typeof SccMessageSchema>;
export type BatteryItem = z.infer<typeof BatteryItemSchema>;
export type BatteryMessage = z.infer<typeof BatteryMessageSchema>;

export type DataType = "scc" | "battery";
export type MessageStatus = "PENDING" | "SENT" | "FAILED";

// Processing Result Types

export interface ProcessingResult {
    success: boolean;
    messageId: bigint;
    dataType: string;
    recordsCreated: number;
    error?: string;
}

export interface BatchProcessingResult {
    totalProcessed: number;
    successful: number;
    failed: number;
    results: ProcessingResult[];
}

// Utility Functions

/**
 * Parse timestamp from multiple formats to Date
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
 * Safe parse integer from string
 */
export function safeParseInt(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Safe parse float from string
 */
export function safeParseFloat(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Parse cell voltage string to array of integers
 * Input formats:
 * - JSON array: "[3422, 3437, 3406, ...]"
 * - Comma separated: "3354,3354,3354,..."
 */
export function parseCellVoltages(cellVoltageStr: string | undefined): number[] {
    if (!cellVoltageStr) return [];

    // Try JSON parse first (handles "[3422, 3437, ...]" format)
    try {
        const parsed = JSON.parse(cellVoltageStr);
        if (Array.isArray(parsed)) {
            return parsed
                .map((v) => (typeof v === "number" ? v : parseInt(String(v), 10)))
                .filter((v) => !isNaN(v));
        }
    } catch {
        // Not valid JSON, try manual parsing
    }

    // Fallback: Remove brackets and split by comma
    return cellVoltageStr
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => !isNaN(v));
}

/**
 * Parse flag string to array
 * Input: "['flag1', 'flag2']" or "flag1,flag2"
 */
export function parseFlags(flagStr: string | undefined): string[] {
    if (!flagStr) return [];
    
    // Try JSON parse first
    try {
        const parsed = JSON.parse(flagStr.replace(/'/g, '"'));
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // Not JSON, try comma separated
    }
    
    // Handle comma-separated
    return flagStr
        .replace(/[\[\]']/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

