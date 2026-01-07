import { FastifyInstance } from "fastify";
import { HistoryGamasController } from "../controllers/history-gamas.controller";

export async function historyGamasRoutes(fastify: FastifyInstance) {
    // --------------------------------------------------------
    // POST /api/history-gamas - Create History Gamas
    // --------------------------------------------------------
    fastify.post(
        "/",
        {
            schema: {
                tags: ["History Gamas"],
                summary: "Create History Gamas",
                description: "Create a new history gamas record",
                body: {
                    type: "object",
                    required: ["date"],
                    properties: {
                        date: { type: "string", format: "date", description: "Date of gamas (YYYY-MM-DD)" },
                        description: { type: "string", nullable: true, description: "Description of gamas" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
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
        HistoryGamasController.create
    );

    // --------------------------------------------------------
    // GET /api/history-gamas - Get all History Gamas
    // --------------------------------------------------------
    fastify.get(
        "/",
        {
            schema: {
                tags: ["History Gamas"],
                summary: "Get all History Gamas",
                description: "Get all history gamas with optional filters and pagination",
                querystring: {
                    type: "object",
                    properties: {
                        startDate: { type: "string", format: "date" },
                        endDate: { type: "string", format: "date" },
                        page: { type: "integer", minimum: 1, default: 1 },
                        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
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
                                        date: { type: "string" },
                                        description: { type: "string", nullable: true },
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
        HistoryGamasController.getAll
    );

    // --------------------------------------------------------
    // GET /api/history-gamas/:id - Get History Gamas by ID
    // --------------------------------------------------------
    fastify.get(
        "/:id",
        {
            schema: {
                tags: ["History Gamas"],
                summary: "Get History Gamas by ID",
                description: "Get a specific history gamas record by ID",
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
                                    date: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    createdAt: { type: "string" },
                                    updatedAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        HistoryGamasController.getById
    );

    // --------------------------------------------------------
    // PATCH /api/history-gamas/:id - Update History Gamas
    // --------------------------------------------------------
    fastify.patch(
        "/:id",
        {
            schema: {
                tags: ["History Gamas"],
                summary: "Update History Gamas",
                description: "Update a history gamas record by ID",
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                body: {
                    type: "object",
                    properties: {
                        date: { type: "string", format: "date" },
                        description: { type: "string", nullable: true },
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
                                    date: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    createdAt: { type: "string" },
                                    updatedAt: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        HistoryGamasController.update
    );

    // --------------------------------------------------------
    // DELETE /api/history-gamas/:id - Delete History Gamas
    // --------------------------------------------------------
    fastify.delete(
        "/:id",
        {
            schema: {
                tags: ["History Gamas"],
                summary: "Delete History Gamas",
                description: "Delete a history gamas record by ID",
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
        HistoryGamasController.delete
    );
}

