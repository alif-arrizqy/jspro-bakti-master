import { FastifyInstance } from "fastify";
import { returSparePartController } from "../controllers/retur-spare-part.controller";

export async function returSparePartRoutes(fastify: FastifyInstance) {
    // GET /api/v1/retur-spare-part - Get all
    fastify.get("/", {
        schema: {
            tags: ["Retur Spare Part"],
            summary: "Get all retur spare parts",
            description: "Get all retur spare parts with pagination and filters",
            querystring: {
                type: "object",
                properties: {
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    shipper: { type: "string" },
                    source_spare_part: { type: "string" },
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
                        data: { type: "array", items: { type: "object" } },
                        pagination: { type: "object" },
                    },
                },
            },
        },
        handler: returSparePartController.getAll.bind(returSparePartController),
    });

    // GET /api/v1/retur-spare-part/export - Export to Excel
    fastify.get("/export", {
        schema: {
            tags: ["Retur Spare Part"],
            summary: "Export retur spare parts to Excel",
            description: "Export retur spare parts data to Excel file",
            querystring: {
                type: "object",
                properties: {
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    shipper: { type: "string" },
                    source_spare_part: { type: "string" },
                    search: { type: "string" },
                },
            },
            response: {
                200: {
                    description: "Excel file download",
                    content: {
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                            schema: { type: "string", format: "binary" },
                        },
                    },
                },
            },
        },
        handler: returSparePartController.exportToExcel.bind(returSparePartController),
    });

    // GET /api/v1/retur-spare-part/:id - Get by ID
    fastify.get("/:id", {
        schema: {
            tags: ["Retur Spare Part"],
            summary: "Get retur spare part by ID",
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
                        data: { type: "object" },
                    },
                },
            },
        },
        handler: returSparePartController.getById.bind(returSparePartController),
    });

    // POST /api/v1/retur-spare-part - Create (with file upload)
    fastify.post("/", {
        schema: {
            tags: ["Retur Spare Part"],
            summary: "Create retur spare part",
            description: "Create new retur spare part with optional image upload",
            consumes: ["multipart/form-data"],
            body: {
                type: "object",
                required: ["date", "shipper", "source_spare_part", "list_spare_part"],
                properties: {
                    date: { type: "string", format: "date" },
                    shipper: { type: "string" },
                    source_spare_part: { type: "string" },
                    list_spare_part: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                qty: { type: "integer" },
                                condition: { type: "string" },
                            },
                        },
                    },
                    image: { type: "string", format: "binary" },
                    notes: { type: "string" },
                },
            },
            response: {
                201: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        data: { type: "object" },
                    },
                },
            },
        },
        handler: returSparePartController.create.bind(returSparePartController),
    });

    // PATCH /api/v1/retur-spare-part/:id - Update (with file upload)
    fastify.patch("/:id", {
        schema: {
            tags: ["Retur Spare Part"],
            summary: "Update retur spare part",
            description: "Update retur spare part with optional image upload",
            consumes: ["multipart/form-data"],
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
                    date: { type: "string", format: "date" },
                    shipper: { type: "string" },
                    source_spare_part: { type: "string" },
                    list_spare_part: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                qty: { type: "integer" },
                                condition: { type: "string" },
                            },
                        },
                    },
                    image: { type: "string", format: "binary" },
                    notes: { type: "string" },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        data: { type: "object" },
                    },
                },
            },
        },
        handler: returSparePartController.update.bind(returSparePartController),
    });

    // DELETE /api/v1/retur-spare-part/:id - Delete
    fastify.delete("/:id", {
        schema: {
            tags: ["Retur Spare Part"],
            summary: "Delete retur spare part",
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
        handler: returSparePartController.delete.bind(returSparePartController),
    });
}

