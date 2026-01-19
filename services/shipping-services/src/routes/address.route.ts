import { FastifyInstance } from "fastify";
import { addressController } from "../controllers/address.controller";

export async function addressRoutes(fastify: FastifyInstance) {
    fastify.get("/", {
        schema: {
            tags: ["Address"],
            summary: "Get all addresses",
            description: "Get all addresses with pagination and filters",
            querystring: {
                type: "object",
                properties: {
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
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
                                        properties: {
                                            id: { type: "integer" },
                                            province: { type: "string" },
                                            cluster: { type: ["string", "null"] },
                                            address_shipping: { type: "string" },
                                            created_at: { type: "string" },
                                            updated_at: { type: "string" },
                                        },
                                        additionalProperties: true,
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
                                    additionalProperties: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        handler: addressController.getAll.bind(addressController),
    });

    fastify.get("/:id", {
        schema: {
            tags: ["Address"],
            summary: "Get address by ID",
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
                            additionalProperties: true,
                            properties: {
                                id: { type: "integer" },
                                province: { type: "string" },
                                cluster: { type: ["string", "null"] },
                                address_shipping: { type: "string" },
                                created_at: { type: "string" },
                                updated_at: { type: "string" },
                            },
                        },
                    },
                    additionalProperties: true,
                },
            },
        },
        handler: addressController.getById.bind(addressController),
    });

    fastify.post("/", {
        schema: {
            tags: ["Address"],
            summary: "Create new address",
            body: {
                type: "object",
                required: ["province", "address_shipping"],
                properties: {
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
                    address_shipping: { type: "string" },
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
        handler: addressController.create.bind(addressController),
    });

    fastify.patch("/:id", {
        schema: {
            tags: ["Address"],
            summary: "Update address",
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
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
                    address_shipping: { type: "string" },
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
        handler: addressController.update.bind(addressController),
    });

    fastify.delete("/:id", {
        schema: {
            tags: ["Address"],
            summary: "Delete address",
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
        handler: addressController.delete.bind(addressController),
    });
}

