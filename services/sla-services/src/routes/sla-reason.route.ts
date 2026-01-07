import { FastifyInstance } from "fastify";
import { SlaReasonController } from "../controllers/sla-reason.controller";

export async function slaReasonRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // POST /api/sla-reason - Create SLA Reason
    // --------------------------------------------------------
    fastify.post(
        "/",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Create SLA Reason",
                description: "Create a new SLA reason",
                body: {
                    type: "object",
                    required: ["reason"],
                    properties: {
                        reason: { type: "string", description: "Reason description (e.g., 'SNMP DOWN', 'Problem VSAT')" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "integer" },
                                    reason: { type: "string" },
                                    createdAt: { type: "string" },
                                    updatedAt: { type: "string" },
                                },
                            },
                        },
                    },
                    400: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                    500: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        SlaReasonController.create
    );

    // --------------------------------------------------------
    // GET /api/sla-reason - Get all SLA Reasons
    // --------------------------------------------------------
    fastify.get(
        "/",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Get all SLA Reasons",
                description: "Get all SLA reasons with optional filters and pagination",
                querystring: {
                    type: "object",
                    properties: {
                        page: { type: "integer", minimum: 1, default: 1 },
                        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        search: { type: "string", description: "Search reason by text" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "integer" },
                                        reason: { type: "string" },
                                        createdAt: { type: "string" },
                                        updatedAt: { type: "string" },
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
            },
        },
        SlaReasonController.getAll
    );

    // --------------------------------------------------------
    // GET /api/sla-reason/:id - Get SLA Reason by ID
    // --------------------------------------------------------
    fastify.get(
        "/:id",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Get SLA Reason by ID",
                description: "Get a specific SLA reason by ID",
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "integer" },
                                    reason: { type: "string" },
                                    createdAt: { type: "string" },
                                    updatedAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaReasonController.getById
    );

    // --------------------------------------------------------
    // PATCH /api/sla-reason/:id - Update SLA Reason
    // --------------------------------------------------------
    fastify.patch(
        "/:id",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Update SLA Reason",
                description: "Update a SLA reason by ID",
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                body: {
                    type: "object",
                    properties: {
                        reason: { type: "string" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "integer" },
                                    reason: { type: "string" },
                                    createdAt: { type: "string" },
                                    updatedAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaReasonController.update
    );

    // --------------------------------------------------------
    // DELETE /api/sla-reason/:id - Delete SLA Reason
    // --------------------------------------------------------
    fastify.delete(
        "/:id",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Delete SLA Reason",
                description: "Delete a SLA reason by ID",
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    deleted: { type: "integer" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaReasonController.delete
    );

    // --------------------------------------------------------
    // POST /api/sla-reason/battery-version - Add reason to battery version
    // --------------------------------------------------------
    fastify.post(
        "/battery-version",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Add reason to battery version",
                description: "Associate a SLA reason with a battery version",
                body: {
                    type: "object",
                    required: ["batteryVersion", "reasonId"],
                    properties: {
                        batteryVersion: { type: "string", enum: ["talis5", "mix", "jspro"] },
                        reasonId: { type: "integer" },
                        period: { type: "string", pattern: "^\\d{4}-\\d{2}$", description: "Period in YYYY-MM format (e.g., '2024-01'). Optional, defaults to current month." },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "integer" },
                                    batteryVersion: { type: "string" },
                                    reasonId: { type: "integer" },
                                    period: { type: "string", description: "Period in YYYY-MM format" },
                                    reason: {
                                        type: "object",
                                        properties: {
                                            id: { type: "integer" },
                                            reason: { type: "string" },
                                        },
                                    },
                                    createdAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaReasonController.addBatteryVersionReason
    );

    // --------------------------------------------------------
    // DELETE /api/sla-reason/battery-version/:id - Remove reason from battery version
    // --------------------------------------------------------
    fastify.delete(
        "/battery-version/:id",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Remove reason from battery version",
                description: "Remove association between SLA reason and battery version",
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    deleted: { type: "integer" },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaReasonController.removeBatteryVersionReason
    );

    // --------------------------------------------------------
    // GET /api/sla-reason/battery-version/:batteryVersion - Get reasons by battery version
    // --------------------------------------------------------
    fastify.get(
        "/battery-version/:batteryVersion",
        {
            schema: {
                tags: ["SLA Reason"],
                summary: "Get reasons by battery version",
                description: "Get all SLA reasons associated with a specific battery version",
                params: {
                    type: "object",
                    properties: {
                        batteryVersion: { type: "string", enum: ["talis5", "mix", "jspro"] },
                    },
                },
                querystring: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", format: "date", description: "Start date filter (ISO date string)" },
                        endDate: { type: "string", format: "date", description: "End date filter (ISO date string)" },
                        period: { type: "string", pattern: "^\\d{4}-\\d{2}$", description: "Period filter in YYYY-MM format (e.g., '2024-01'). If not provided, defaults to current month." },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "integer" },
                                        reason: { type: "string" },
                                        createdAt: { type: "string" },
                                        updatedAt: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        SlaReasonController.getReasonsByBatteryVersion
    );
}

