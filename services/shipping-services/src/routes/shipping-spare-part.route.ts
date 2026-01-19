import { FastifyInstance } from "fastify";
import { shippingSparePartController } from "../controllers/shipping-spare-part.controller";

export async function shippingSparePartRoutes(fastify: FastifyInstance) {
    // GET /api/v1/shipping-spare-part - Get all
    fastify.get("/", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Get all shipping spare parts",
            description: "Get all shipping spare parts with pagination and filters",
            querystring: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["REQUEST_GUDANG", "PROSES_KIRIM", "SELESAI"],
                    },
                    site_id: { type: "string" },
                    address_id: { type: "integer" },
                    problem_id: { type: "integer" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
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
        handler: shippingSparePartController.getAll.bind(shippingSparePartController),
    });

    // GET /api/v1/shipping-spare-part/active - Get active (REQUEST_GUDANG & PROSES_KIRIM)
    fastify.get("/active", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Get active shipping spare parts",
            description: "Get shipping spare parts with status REQUEST_GUDANG or PROSES_KIRIM",
            querystring: {
                type: "object",
                properties: {
                    site_id: { type: "string" },
                    address_id: { type: "integer" },
                    problem_id: { type: "integer" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
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
        handler: shippingSparePartController.getActive.bind(shippingSparePartController),
    });

    // GET /api/v1/shipping-spare-part/history - Get history (SELESAI)
    fastify.get("/history", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Get shipping history",
            description: "Get shipping spare parts with status SELESAI",
            querystring: {
                type: "object",
                properties: {
                    site_id: { type: "string" },
                    address_id: { type: "integer" },
                    problem_id: { type: "integer" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
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
        handler: shippingSparePartController.getHistory.bind(shippingSparePartController),
    });

    // GET /api/v1/shipping-spare-part/export - Export to Excel
    fastify.get("/export", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Export shipping spare parts to Excel",
            description: "Export shipping spare parts data to Excel file",
            querystring: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["REQUEST_GUDANG", "PROSES_KIRIM", "SELESAI"],
                    },
                    site_id: { type: "string" },
                    address_id: { type: "integer" },
                    problem_id: { type: "integer" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
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
        handler: shippingSparePartController.exportToExcel.bind(shippingSparePartController),
    });

    // GET /api/v1/shipping-spare-part/:id - Get by ID
    fastify.get("/:id", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Get shipping spare part by ID",
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
        handler: shippingSparePartController.getById.bind(shippingSparePartController),
    });

    // POST /api/v1/shipping-spare-part - Create (with file upload)
    fastify.post("/", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Create shipping spare part",
            description: "Create new shipping spare part with optional ticket image upload",
            consumes: ["multipart/form-data"],
            body: {
                type: "object",
                required: ["date", "site_id", "address_id", "problem_id", "status"],
                properties: {
                    date: { type: "string", format: "date" },
                    site_id: { type: "string" },
                    address_id: { type: "integer" },
                    sparepart_note: { type: "string" },
                    problem_id: { type: "integer" },
                    ticket_number: { type: "string" },
                    ticket_image: { type: "string", format: "binary" },
                    status: {
                        type: "string",
                        enum: ["REQUEST_GUDANG", "PROSES_KIRIM", "SELESAI"],
                        default: "REQUEST_GUDANG",
                    },
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
        handler: shippingSparePartController.create.bind(shippingSparePartController),
    });

    // PATCH /api/v1/shipping-spare-part/:id - Update (with file upload)
    fastify.patch("/:id", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Update shipping spare part",
            description: "Update shipping spare part (status transition, resi info, etc.)",
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
                    resi_number: { type: "string" },
                    resi_image: { type: "string", format: "binary" },
                    status: {
                        type: "string",
                        enum: ["REQUEST_GUDANG", "PROSES_KIRIM", "SELESAI"],
                    },
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
        handler: shippingSparePartController.update.bind(shippingSparePartController),
    });

    // DELETE /api/v1/shipping-spare-part/:id - Delete
    fastify.delete("/:id", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Delete shipping spare part",
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
        handler: shippingSparePartController.delete.bind(shippingSparePartController),
    });
}

