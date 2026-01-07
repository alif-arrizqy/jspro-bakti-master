import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { excelLogger } from "./logger";

// Excel column mapping for SLA Bakti upload - using column names instead of indices
const COLUMN_MAP = {
    date: 'Tanggal',
    siteId: 'Site ID',
    siteName: 'Nama Site',
    powerUptime: 'Power Uptime (%)',
    statusSla: 'SLA Kategori TOPO',
    powerDowntime: 'Power Downtime (%)',
};

export interface ParsedSlaBaktiRow {
    date: Date;
    siteId: string;
    siteName: string;
    prCode: string | null;
    sla: number | null;
    powerUptime: number | null;
    powerDowntime: number | null;
    statusSla: string | null;
}

export interface ParseResult {
    data: ParsedSlaBaktiRow[];
    errors: Array<{ row: number; message: string }>;
}

/**
 * Parse Excel date value to Date object
 */
function parseExcelDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    // Excel serial date number
    if (typeof value === "number") {
        // Excel date serial number (days since 1900-01-01)
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return date;
    }

    // Date object
    if (value instanceof Date) {
        return value;
    }

    // String date
    if (typeof value === "string") {
        const parsed = dayjs(value, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "MM/DD/YYYY"]);
        if (parsed.isValid()) {
            return parsed.toDate();
        }
    }

    return null;
}

/**
 * Parse numeric value from Excel cell
 */
function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        // Remove % sign if present
        const cleaned = value.replace(/%/g, "").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    return null;
}

/**
 * Parse string value from Excel cell
 */
function parseString(value: unknown): string | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    return String(value).trim();
}

/**
 * Parse Excel file buffer and extract SLA Bakti data
 */
export async function parseSlaBaktiExcel(buffer: Buffer): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Buffer & { [Symbol.toStringTag]: 'ArrayBuffer' });

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error("No worksheet found in Excel file");
    }

    const data: ParsedSlaBaktiRow[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    // Read header row to find column indices by name
    const headerRow = worksheet.getRow(1);
    const columnIndices: Record<keyof typeof COLUMN_MAP, number | null> = {
        date: null,
        siteId: null,
        siteName: null,
        powerUptime: null,
        statusSla: null,
        powerDowntime: null,
    };

    // Find column indices by matching header names
    headerRow.eachCell((cell, colNumber) => {
        const cellValue = String(cell.value || '').trim();
        
        // Match column names (case-insensitive, flexible matching)
        if (cellValue === COLUMN_MAP.date || cellValue.toLowerCase() === COLUMN_MAP.date.toLowerCase()) {
            columnIndices.date = colNumber;
        } else if (cellValue === COLUMN_MAP.siteId || cellValue.toLowerCase() === COLUMN_MAP.siteId.toLowerCase()) {
            columnIndices.siteId = colNumber;
        } else if (cellValue === COLUMN_MAP.siteName || cellValue.toLowerCase() === COLUMN_MAP.siteName.toLowerCase()) {
            columnIndices.siteName = colNumber;
        } else if (cellValue === COLUMN_MAP.powerUptime || cellValue.toLowerCase() === COLUMN_MAP.powerUptime.toLowerCase()) {
            columnIndices.powerUptime = colNumber;
        } else if (cellValue === COLUMN_MAP.statusSla || cellValue.toLowerCase() === COLUMN_MAP.statusSla.toLowerCase()) {
            columnIndices.statusSla = colNumber;
        } else if (cellValue === COLUMN_MAP.powerDowntime || cellValue.toLowerCase() === COLUMN_MAP.powerDowntime.toLowerCase()) {
            columnIndices.powerDowntime = colNumber;
        }
    });

    // Validate that required columns are found
    const missingColumns: string[] = [];
    if (!columnIndices.date) missingColumns.push(COLUMN_MAP.date);
    if (!columnIndices.siteId) missingColumns.push(COLUMN_MAP.siteId);
    if (missingColumns.length > 0) {
        throw new Error(`Required columns not found in Excel header: ${missingColumns.join(', ')}`);
    }

    excelLogger.info({ columnIndices }, "Column mapping from header");

    // Start from row 2 (skip header)
    const rowCount = worksheet.rowCount;

    excelLogger.info({ rowCount }, "Parsing Excel file");

    for (let rowIndex = 2; rowIndex <= rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);

        try {
            const dateValue = columnIndices.date ? row.getCell(columnIndices.date).value : null;
            const siteIdValue = columnIndices.siteId ? row.getCell(columnIndices.siteId).value : null;
            const siteNameValue = columnIndices.siteName ? row.getCell(columnIndices.siteName).value : null;
            const powerUptimeValue = columnIndices.powerUptime ? row.getCell(columnIndices.powerUptime).value : null;
            const statusSlaValue = columnIndices.statusSla ? row.getCell(columnIndices.statusSla).value : null;
            const powerDowntimeValue = columnIndices.powerDowntime ? row.getCell(columnIndices.powerDowntime).value : null;

            // Skip empty rows
            if (!dateValue && !siteIdValue) {
                continue;
            }

            const date = parseExcelDate(dateValue);
            const siteId = parseString(siteIdValue);
            const siteName = parseString(siteNameValue);
            const powerUptime = parseNumber(powerUptimeValue);
            const powerDowntime = parseNumber(powerDowntimeValue);
            const statusSla = parseString(statusSlaValue);

            // Validate required fields
            if (!date) {
                errors.push({ row: rowIndex, message: "Invalid or missing date" });
                continue;
            }

            if (!siteId) {
                errors.push({ row: rowIndex, message: "Invalid or missing Site ID" });
                continue;
            }

            // Calculate SLA (power uptime is the SLA value)
            const sla = powerUptime;

            data.push({
                date,
                siteId,
                siteName: siteName || "",
                prCode: null, // PR Code not in Excel, will be filled later if needed
                sla,
                powerUptime,
                powerDowntime,
                statusSla,
            });
        } catch (error) {
            errors.push({
                row: rowIndex,
                message: error instanceof Error ? error.message : "Unknown error parsing row",
            });
        }
    }

    excelLogger.info({ parsed: data.length, errors: errors.length }, "Excel parsing completed");

    return { data, errors };
}

/**
 * Generate Excel file for SLA Internal export (SLA 3)
 */
export async function generateSlaInternalExcel(
    data: Array<{
        timestamp: Date;
        siteId: string;
        batteryVoltage: number | null;
        vsatCurrent: number | null;
        btsCurrent: number | null;
        pv1Current: number | null;
        pv2Current: number | null;
        pv3Current: number | null;
        pv1Voltage: number | null;
        pv2Voltage: number | null;
        pv3Voltage: number | null;
        eh1: number | null;
        eh2: number | null;
        eh3: number | null;
        edl1: number | null;
        edl2: number | null;
        edl3: number | null;
    }>,
    siteId: string,
    startDate: string,
    endDate: string
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SLA Service";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("SLA Internal Data");

    // Define columns
    worksheet.columns = [
        { header: "DateTime", key: "timestamp", width: 20 },
        { header: "Site ID", key: "siteId", width: 15 },
        { header: "Battery Voltage (mV)", key: "batteryVoltage", width: 18 },
        { header: "VSAT Current (A)", key: "vsatCurrent", width: 15 },
        { header: "BTS Current (A)", key: "btsCurrent", width: 15 },
        { header: "PV1 Current (A)", key: "pv1Current", width: 15 },
        { header: "PV2 Current (A)", key: "pv2Current", width: 15 },
        { header: "PV3 Current (A)", key: "pv3Current", width: 15 },
        { header: "PV1 Voltage (V)", key: "pv1Voltage", width: 15 },
        { header: "PV2 Voltage (V)", key: "pv2Voltage", width: 15 },
        { header: "PV3 Voltage (V)", key: "pv3Voltage", width: 15 },
        { header: "EH1 (Wh)", key: "eh1", width: 12 },
        { header: "EH2 (Wh)", key: "eh2", width: 12 },
        { header: "EH3 (Wh)", key: "eh3", width: 12 },
        { header: "EDL1 (Wh)", key: "edl1", width: 12 },
        { header: "EDL2 (Wh)", key: "edl2", width: 12 },
        { header: "EDL3 (Wh)", key: "edl3", width: 12 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data rows
    for (const row of data) {
        worksheet.addRow({
            timestamp: dayjs(row.timestamp).format("YYYY-MM-DD HH:mm:ss"),
            siteId: row.siteId,
            batteryVoltage: row.batteryVoltage,
            vsatCurrent: row.vsatCurrent,
            btsCurrent: row.btsCurrent,
            pv1Current: row.pv1Current,
            pv2Current: row.pv2Current,
            pv3Current: row.pv3Current,
            pv1Voltage: row.pv1Voltage,
            pv2Voltage: row.pv2Voltage,
            pv3Voltage: row.pv3Voltage,
            eh1: row.eh1,
            eh2: row.eh2,
            eh3: row.eh3,
            edl1: row.edl1,
            edl2: row.edl2,
            edl3: row.edl3,
        });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

