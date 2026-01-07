import { z } from "zod";

// ============================================================
// SLA Internal Request/Response Schemas
// ============================================================

// Query params for summary (SLA 1)
export const slaInternalSummaryQuerySchema = z.object({
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    siteId: z.string().optional().describe("Site ID (optional, if not provided returns all sites)"),
});

// Query params for daily (SLA 2)
export const slaInternalDailyQuerySchema = z.object({
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    siteId: z.string().describe("Site ID (required)"),
});

// Query params for export (SLA 3)
export const slaInternalExportQuerySchema = z.object({
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    siteId: z.string().describe("Site ID (required)"),
});

// ============================================================
// Swagger Schema Definitions
// ============================================================

export const slaInternalSwaggerSchemas = {
    SlaInternalSummaryResponse: {
        type: "object",
        properties: {
            siteId: { type: "string" },
            prCode: { type: "string", nullable: true },
            siteName: { type: "string", nullable: true },
            lc: { type: "string", nullable: true },
            totalRecords: { type: "integer" },
            uptimeMinutes: { type: "integer" },
            unknownMinutes: { type: "integer" },
            upPercentage: { type: "number" },
            unknownPercentage: { type: "number" },
            avgBatteryVoltage: { type: "number", nullable: true },
        },
    },
    SlaInternalDailyResponse: {
        type: "object",
        properties: {
            siteId: { type: "string" },
            prCode: { type: "string", nullable: true },
            siteName: { type: "string", nullable: true },
            date: { type: "string", format: "date" },
            uptimeMinutes: { type: "integer" },
            avgBatteryVoltage: { type: "number", nullable: true },
            avgVsatCurrent: { type: "number", nullable: true },
            avgBtsCurrent: { type: "number", nullable: true },
            totalEh1: { type: "number", nullable: true },
            totalEh2: { type: "number", nullable: true },
            totalEh3: { type: "number", nullable: true },
            totalEdl1: { type: "number", nullable: true },
            totalEdl2: { type: "number", nullable: true },
            totalEdl3: { type: "number", nullable: true },
        },
    },
    SlaInternalSummaryListResponse: {
        type: "object",
        properties: {
            success: { type: "boolean" },
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        siteId: { type: "string" },
                        prCode: { type: "string", nullable: true },
                        siteName: { type: "string", nullable: true },
                        lc: { type: "string", nullable: true },
                        totalRecords: { type: "integer" },
                        uptimeMinutes: { type: "integer" },
                        unknownMinutes: { type: "integer" },
                        upPercentage: { type: "number" },
                        unknownPercentage: { type: "number" },
                        avgBatteryVoltage: { type: "number", nullable: true },
                    },
                },
            },
        },
    },
    SlaInternalDailyListResponse: {
        type: "object",
        properties: {
            success: { type: "boolean" },
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        siteId: { type: "string" },
                        prCode: { type: "string", nullable: true },
                        siteName: { type: "string", nullable: true },
                        date: { type: "string", format: "date" },
                        uptimeMinutes: { type: "integer" },
                        avgBatteryVoltage: { type: "number", nullable: true },
                        avgVsatCurrent: { type: "number", nullable: true },
                        avgBtsCurrent: { type: "number", nullable: true },
                        totalEh1: { type: "number", nullable: true },
                        totalEh2: { type: "number", nullable: true },
                        totalEh3: { type: "number", nullable: true },
                        totalEdl1: { type: "number", nullable: true },
                        totalEdl2: { type: "number", nullable: true },
                        totalEdl3: { type: "number", nullable: true },
                    },
                },
            },
        },
    },
};

