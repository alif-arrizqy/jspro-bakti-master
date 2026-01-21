import { FastifyInstance } from "fastify";
import { problemMasterController } from "../controllers/problem-master.controller";

export async function problemMasterRoutes(fastify: FastifyInstance) {
    fastify.get("/", {
        schema: {
            tags: ["Problem Master"],
            summary: "Get all problems",
            description: "Get all problems with pagination and search",
            querystring: {
                type: "object",
                properties: {
                    search: { type: "string" },
                    page: { type: "integer", default: 1 },
                    limit: { type: "integer", default: 20 },
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
                                items: {
                                    type: "array",
                                    items: { 
                                        type: "object",
                                        additionalProperties: true,
                                    },
                                },
                                pagination: { 
                                    type: "object",
                                    additionalProperties: true,
                                },
                            },
                            additionalProperties: true,
                        },
                    },
                    additionalProperties: true,
                },
            },
        },
        handler: problemMasterController.getAll.bind(problemMasterController),
    });

    fastify.get("/:id", {
        schema: {
            tags: ["Problem Master"],
            summary: "Get problem by ID",
            params: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                },
                required: ["id"],
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
                                problem_name: { type: "string" },
                                created_at: { type: "string" },
                                updated_at: { type: "string" },
                            },
                            additionalProperties: true,
                        },
                    },
                    additionalProperties: true,
                },
            },
        },
        handler: problemMasterController.getById.bind(problemMasterController),
    });

    fastify.post("/", {
        schema: {
            tags: ["Problem Master"],
            summary: "Create new problem",
            body: {
                type: "object",
                required: ["problem_name"],
                properties: {
                    problem_name: { type: "string", maxLength: 100 },
                },
            },
            response: {
                201: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        message: { type: "string" },
                        data: { type: "object" },
                    },
                },
            },
        },
        handler: problemMasterController.create.bind(problemMasterController),
    });

    fastify.patch("/:id", {
        schema: {
            tags: ["Problem Master"],
            summary: "Update problem",
            params: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                },
                required: ["id"],
            },
            body: {
                type: "object",
                properties: {
                    problem_name: { type: "string", maxLength: 100 },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        message: { type: "string" },
                        data: { type: "object" },
                    },
                },
            },
        },
        handler: problemMasterController.update.bind(problemMasterController),
    });

    fastify.delete("/:id", {
        schema: {
            tags: ["Problem Master"],
            summary: "Delete problem",
            params: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                },
                required: ["id"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        message: { type: "string" },
                    },
                },
            },
        },
        handler: problemMasterController.delete.bind(problemMasterController),
    });
}

