import { z } from "zod";

// ============================================================
// SLA Bakti Request/Response Schemas for Swagger
// ============================================================

// Query params for list
export const slaBaktiQuerySchema = z.object({
    startDate: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
    page: z.coerce.number().min(1).default(1).describe("Page number"),
    limit: z.coerce.number().min(1).max(100).default(20).describe("Items per page"),
});

// Params for site ID routes
export const siteIdParamSchema = z.object({
    siteId: z.string().describe("Site ID (e.g., PAP9999)"),
});

// Delete by date range
export const deleteByDateRangeSchema = z.object({
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
});


// PicType enum
export const picTypeEnum = z.enum(["VSAT", "POWER", "SNMP"]);

// SLA Report Problem schema
export const slaReportProblemSchema = z.object({
    pic: picTypeEnum.nullable().optional().describe("PIC for this problem (VSAT, POWER, or SNMP)"),
    problem: z.string().nullable().optional().describe("Problem description"),
    notes: z.string().nullable().optional().describe("Notes for this specific problem"),
});

// Create report body
export const createSlaReportBodySchema = z.object({
    date: z.string().describe("Date (YYYY-MM-DD)"),
    siteId: z.string().describe("Site ID"),
    prCode: z.string().nullable().optional().describe("PR Code"),
    problems: z.array(slaReportProblemSchema).optional().describe("Array of problems. Each problem can have different PIC."),
});

// Update report body (PATCH)
export const updateSlaReportBodySchema = z.object({
    date: z.string().optional().describe("Date (YYYY-MM-DD)"),
    siteId: z.string().optional().describe("Site ID"),
    prCode: z.string().nullable().optional().describe("PR Code"),
    problems: z.array(slaReportProblemSchema).optional().describe("Array of problems. If provided, will replace all existing problems."),
});

// Query params for SLA Report list
export const slaReportQuerySchema = z.object({
    startDate: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
    siteId: z.string().optional().describe("Site ID filter"),
    prCode: z.string().optional().describe("PR Code filter"),
    pic: picTypeEnum.optional().describe("PIC filter (filters reports that have at least one problem with this PIC)"),
    page: z.coerce.number().min(1).default(1).describe("Page number"),
    limit: z.coerce.number().min(1).max(100).default(20).describe("Items per page"),
});

// ============================================================
// Swagger Schema Definitions
// ============================================================

export const slaBaktiSwaggerSchemas = {
    SlaBaktiResponse: {
        type: "object",
        properties: {
            id: { type: "integer" },
            date: { type: "string", format: "date" },
            siteId: { type: "string" },
            prCode: { type: "string", nullable: true },
            sla: { type: "number", nullable: true },
            powerUptime: { type: "number", nullable: true },
            powerDowntime: { type: "number", nullable: true },
            statusSla: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    UploadPreviewResponse: {
        type: "object",
        properties: {
            summary: {
                type: "object",
                properties: {
                    total: { type: "integer" },
                    valid: { type: "integer" },
                    duplicate: { type: "integer" },
                    invalid: { type: "integer" },
                    invalidSiteId: { type: "integer" },
                },
            },
            validData: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        date: { type: "string" },
                        inserted: { type: "integer" },
                    },
                },
            },
            duplicates: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        date: { type: "string" },
                        siteId: { type: "string" },
                        siteName: { type: "string" },
                    },
                },
            },
            errors: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        row: { type: "integer" },
                        message: { type: "string" },
                    },
                },
            },
        },
    },
    ConfirmSaveResponse: {
        type: "object",
        properties: {
            inserted: { type: "integer" },
            skipped: { type: "integer" },
        },
    },
    DeleteResponse: {
        type: "object",
        properties: {
            deleted: { type: "integer" },
        },
    },
    PaginatedSlaBaktiResponse: {
        type: "object",
        properties: {
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        date: { type: "string", format: "date" },
                        siteId: { type: "string" },
                        prCode: { type: "string", nullable: true },
                        sla: { type: "number", nullable: true },
                        powerUptime: { type: "number", nullable: true },
                        powerDowntime: { type: "number", nullable: true },
                        statusSla: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
            },
            pagination: {
                type: "object",
                properties: {
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    total: { type: "integer" },
                    totalPages: { type: "integer" },
                },
            },
        },
    },
    SlaReportResponse: {
        type: "object",
        properties: {
            id: { type: "integer" },
            date: { type: "string", format: "date" },
            siteId: { type: "string" },
            prCode: { type: "string", nullable: true },
            problems: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        reportId: { type: "integer" },
                        pic: { type: "string", nullable: true },
                        problem: { type: "string", nullable: true },
                        notes: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    PaginatedSlaReportResponse: {
        type: "object",
        properties: {
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        date: { type: "string", format: "date" },
                        siteId: { type: "string" },
                        prCode: { type: "string", nullable: true },
                        problems: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "integer" },
                                    reportId: { type: "integer" },
                                    pic: { type: "string", nullable: true },
                                    problem: { type: "string", nullable: true },
                                    notes: { type: "string", nullable: true },
                                    createdAt: { type: "string", format: "date-time" },
                                    updatedAt: { type: "string", format: "date-time" },
                                },
                            },
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
            },
            pagination: {
                type: "object",
                properties: {
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    total: { type: "integer" },
                    totalPages: { type: "integer" },
                },
            },
        },
    },

};

// ============================================================
// Master Data Schema
// ============================================================

export const slaMasterQuerySchema = {
    type: "object" as const,
    properties: {
        startDate: {
            type: "string",
            format: "date",
            description: "Start date (YYYY-MM-DD)",
        },
        endDate: {
            type: "string",
            format: "date",
            description: "End date (YYYY-MM-DD)",
        },
        siteId: {
            type: "string",
            description: "Filter by site ID (partial match)",
        },
        siteName: {
            type: "string",
            description: "Filter by site name (partial match)",
        },
        batteryVersion: {
            type: "string",
            enum: ["talis5", "mix", "jspro"],
            description: "Filter by battery version",
        },
        statusSP: {
            type: "string",
            enum: ["Potensi SP", "Clear SP"],
            description: "Filter by status SP (Potensi SP or Clear SP)",
        },
        slaStatus: {
            type: "string",
            enum: ["Meet SLA", "Very Bad", "Bad", "Fair", "Poor"],
            description: "Filter by SLA status (Meet SLA: >=95%, Fair: 90-94.99%, Bad: 75-89.99%, Very Bad: <75%)",
        },
        slaMin: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Minimum SLA percentage",
        },
        slaMax: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Maximum SLA percentage",
        },
        province: {
            type: "string",
            enum: ["Maluku", "Papua"],
            description: "Filter by province. 'Maluku' includes MALUKU and MALUKU UTARA. 'Papua' includes PAPUA BARAT, PAPUA BARAT DAYA, and PAPUA SELATAN.",
        },
        pic: {
            type: "string",
            enum: ["VSAT", "POWER", "SNMP"],
            description: "Filter by PIC in problem reports",
        },
        page: {
            type: "integer",
            minimum: 1,
            default: 1,
            description: "Page number",
        },
        limit: {
            type: "integer",
            minimum: 1,
            maximum: 200,
            default: 50,
            description: "Items per page (default: 50, max: 200)",
        },
    },
    required: ["startDate", "endDate"],
};

export const slaMasterResponseSchema = {
    type: "object" as const,
    properties: {
        success: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                summary: {
                    type: "object",
                    properties: {
                        slaAverage: { type: "number" },
                        slaUnit: { type: "string" },
                        slaAverageDaily: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    date: { type: "string", format: "date" },
                                    sla: { type: "number" },
                                    slaUnit: { type: "string" },
                                    slaStatus: { type: "string", enum: ["Meet SLA", "Very Bad", "Bad", "Fair", "Poor"] },
                                },
                            },
                        },
                    },
                },
                sites: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            siteId: { type: "string" },
                            siteName: { type: "string" },
                            province: { type: "string", nullable: true },
                            batteryVersion: { type: "string", nullable: true },
                            talisInstalled: { type: "string", nullable: true },
                            problem: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        date: { type: "string", format: "date" },
                                        pic: { type: "string", enum: ["VSAT", "POWER", "SNMP"], nullable: true },
                                        problem: { type: "string", nullable: true },
                                        notes: { type: "string", nullable: true },
                                    },
                                },
                            },
                            siteSla: {
                                type: "object",
                                properties: {
                                    slaAverage: { type: "number" },
                                    slaUnit: { type: "string" },
                                    slaStatus: { type: "string", enum: ["Meet SLA", "Very Bad", "Bad", "Fair", "Poor"] },
                                    dailySla: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                date: { type: "string", format: "date" },
                                                sla: { type: "number" },
                                                slaUnit: { type: "string" },
                                                slaStatus: { type: "string", enum: ["Meet SLA", "Very Bad", "Bad", "Fair", "Poor"] },
                                            },
                                        },
                                    },
                                    statusSP: { type: "string", enum: ["Potensi SP", "Clear SP"], nullable: true },
                                },
                            },
                        },
                    },
                },
                pagination: {
                    type: "object",
                    properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                    },
                },
            },
        },
    },
};

