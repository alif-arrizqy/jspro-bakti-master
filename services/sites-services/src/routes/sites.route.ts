import type { FastifyInstance } from "fastify";
import { sitesController } from "../controllers/sites.controller.js";
import {
  siteResponseSchema,
  siteArrayResponseSchema,
  paginatedResponseSchema,
  queryStringSchema,
  siteBodySchema,
} from "./sites.swagger.js";

export async function sitesRoutes(fastify: FastifyInstance) {
  fastify.get("/", {
    schema: {
      description: "Get all sites with pagination and filters. Supports filtering by status, province (region or specific), sccType, batteryVersion, siteId, prCode, and search",
      tags: ["Sites"],
      querystring: queryStringSchema,
      response: {
        200: paginatedResponseSchema,
      },
    },
    handler: sitesController.getAllSites.bind(sitesController),
  });

  fastify.get("/statistics", {
    schema: {
      description: "Get site statistics (total, by status, by scc type, by battery version)",
      tags: ["Statistics"],
      response: {
        200: siteResponseSchema,
      },
    },
    handler: sitesController.getStatistics.bind(sitesController),
  });


  fastify.get("/:id", {
    schema: {
      description: "Get site by ID (can use site_id, pr_code, or database id)",
      tags: ["Sites"],
      params: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      response: {
        200: siteResponseSchema,
      },
    },
    handler: sitesController.getSiteById.bind(sitesController),
  });

  fastify.post("/", {
    schema: {
      description: "Create a new site",
      tags: ["Sites"],
      body: siteBodySchema,
      response: {
        201: siteResponseSchema,
      },
    },
    handler: sitesController.createSite.bind(sitesController),
  });

  fastify.put("/:id", {
    schema: {
      description:
        "Update site by identifier. Can use siteId (recommended), prCode, or database id. Since GET response doesn't include database id, use siteId or prCode from the response instead.",
      tags: ["Sites"],
      params: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "Site identifier - use siteId or prCode from GET response (recommended), or database id"
          },
        },
        required: ["id"],
      },
      body: siteBodySchema,
      response: {
        200: siteResponseSchema,
      },
    },
    handler: sitesController.updateSite.bind(sitesController),
  });

  fastify.delete("/:id", {
    schema: {
      description:
        "Delete site by identifier (can use siteId, prCode, or database id). Soft delete by default, use ?hard=true for permanent delete",
      tags: ["Sites"],
      params: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "Site identifier - use siteId or prCode from GET response (recommended), or database id"
          },
        },
        required: ["id"],
      },
      querystring: {
        type: "object",
        properties: {
          hard: { type: "string", enum: ["true", "false"] },
        },
      },
      response: {
        200: siteResponseSchema,
      },
    },
    handler: sitesController.deleteSite.bind(sitesController),
  });
}
