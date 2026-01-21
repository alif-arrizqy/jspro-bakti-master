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
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
                    page: { type: "integer", default: 1 },
                    limit: { type: "integer", default: 20 },
                },
            },
            // Disable response validation to prevent data filtering
            response: false as any,
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
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
                    page: { type: "integer", default: 1 },
                    limit: { type: "integer", default: 20 },
                },
            },
            // Disable response validation to prevent data filtering
            response: false as any,
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
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
                    page: { type: "integer", default: 1 },
                    limit: { type: "integer", default: 20 },
                },
            },
            // Disable response validation to prevent data filtering
            response: false as any,
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
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
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

    // GET /api/v1/shipping-spare-part/export-pdf - Export to PDF
    fastify.get("/export-pdf", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Export shipping spare parts to PDF",
            description: "Export shipping spare parts data to PDF file",
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
                    province: {
                        type: "string",
                        enum: ["PAPUA_BARAT", "PAPUA_BARAT_DAYA", "PAPUA_SELATAN", "PAPUA", "MALUKU", "MALUKU_UTARA"],
                    },
                    cluster: { type: "string" },
                },
            },
            response: {
                200: {
                    description: "PDF file download",
                    content: {
                        "application/pdf": {
                            schema: { type: "string", format: "binary" },
                        },
                    },
                },
            },
        },
        handler: shippingSparePartController.exportToPDF.bind(shippingSparePartController),
    });

    // GET /api/v1/shipping-spare-part/statistics - Get statistics
    fastify.get("/statistics", {
        schema: {
            tags: ["Shipping Spare Part"],
            summary: "Get shipping statistics",
            description: "Get statistics/rekapan data shipping per status (REQUEST_GUDANG, PROSES_KIRIM, SELESAI)",
            querystring: {
                type: "object",
                properties: {
                    site_id: { type: "string" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
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
                                request_gudang: { type: "integer" },
                                proses_kirim: { type: "integer" },
                                selesai: { type: "integer" },
                                total: { type: "integer" },
                            },
                        },
                    },
                },
            },
        },
        handler: shippingSparePartController.getStatistics.bind(shippingSparePartController),
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
                        message: { type: "string" },
                        data: {
                            type: "object",
                            properties: {
                                id: { type: "integer" },
                                date: { type: ["string", "null"] },
                                site_id: { type: ["string", "null"] },
                                address_id: { type: ["integer", "null"] },
                                address: {
                                    type: ["object", "null"],
                                    properties: {
                                        id: { type: "integer" },
                                        province: { type: "string" },
                                        cluster: { type: ["string", "null"] },
                                        address_shipping: { type: "string" },
                                    },
                                    additionalProperties: true,
                                },
                                sparepart_note: { type: ["string", "null"] },
                                problem_id: { type: ["integer", "null"] },
                                problem: {
                                    type: ["object", "null"],
                                    properties: {
                                        id: { type: "integer" },
                                        problem_name: { type: "string" },
                                    },
                                    additionalProperties: true,
                                },
                                ticket_number: { type: ["string", "null"] },
                                ticket_image: { type: ["string", "null"] },
                                status: { type: ["string", "null"] },
                                resi_number: { type: ["string", "null"] },
                                resi_image: { type: ["string", "null"] },
                                created_at: { type: ["string", "null"] },
                                updated_at: { type: ["string", "null"] },
                            },
                            additionalProperties: true,
                        },
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
            // Body validation is handled in controller with Zod schema
            // Fastify cannot validate multipart/form-data body schema directly
            // Remove body schema to avoid validation errors
            response: {
                201: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        message: { type: "string" },
                        data: { type: "object", additionalProperties: true },
                    },
                    additionalProperties: true,
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
            // Body validation is handled in controller with Zod schema
            // Fastify cannot validate multipart/form-data body schema directly
            // Remove body schema to avoid validation errors
            response: {
                200: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        message: { type: "string" },
                        data: { type: "object", additionalProperties: true },
                    },
                    additionalProperties: true,
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

