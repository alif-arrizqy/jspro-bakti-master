import type { FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { sitesService } from '../services/sites.service.js';
import {
  SiteQuerySchema,
  SiteFullCreateSchema,
  SiteFullUpdateSchema,
} from '../schemas/sites.schema.js';

// ===========================================
// RESPONSE HELPERS
// ===========================================
const successResponse = (data: unknown, message = 'Success') => {
  const response: { success: boolean; message: string; data?: unknown } = {
    success: true,
    message,
  };

  // Only include data field if it's not null or undefined
  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return response;
};

const errorResponse = (message: string, errors?: unknown) => ({
  success: false,
  message,
  errors,
});

export class SitesController {
  async getAllSites(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = SiteQuerySchema.parse(request.query);
      const result = await sitesService.getAllSites(query);
      return reply.send(successResponse(result, 'Sites retrieved successfully'));
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send(errorResponse('Failed to retrieve sites', error));
    }
  }

  async getSiteById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const site = await sitesService.getSiteById(id);

      if (!site) {
        return reply.status(404).send(errorResponse('Site not found'));
      }

      return reply.send(successResponse(site, 'Site retrieved successfully'));
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse('Failed to retrieve site', error));
    }
  }


  async createSite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = SiteFullCreateSchema.parse(request.body);
      const site = await sitesService.createSite(data);

      return reply.status(201).send(successResponse(site, 'Site created successfully'));
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('site_id')) {
            return reply.status(409).send(errorResponse('Site ID already exists', { field: 'siteId', code: error.code }));
          }
          if (target?.includes('pr_code')) {
            return reply.status(409).send(errorResponse('PR Code already exists', { field: 'prCode', code: error.code }));
          }
          return reply.status(409).send(errorResponse('Duplicate entry. A record with this value already exists', { target, code: error.code }));
        }
        
        // Handle other Prisma errors
        if (error.code === 'P2003') {
          return reply.status(400).send(errorResponse('Foreign key constraint failed', { code: error.code, meta: error.meta }));
        }
        
        return reply.status(400).send(errorResponse(`Database error: ${error.message}`, { code: error.code, meta: error.meta }));
      }
      
      // Handle Prisma validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        return reply.status(400).send(errorResponse('Invalid data format', { message: error.message }));
      }
      
      // Handle coordinate validation errors (from validateLongitude/validateLatitude)
      if (error instanceof Error && (error.message.includes('Longitude') || error.message.includes('Latitude'))) {
        return reply.status(400).send(errorResponse(error.message, { field: error.message.includes('Longitude') ? 'longitude' : 'latitude' }));
      }
      
      // Handle numeric field overflow (P2020)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2020') {
        const field = error.meta?.column_name || 'numeric field';
        return reply.status(400).send(errorResponse(`Value out of range for ${field}. Please check longitude (-180 to 180) and latitude (-90 to 90) values.`, { code: error.code, field }));
      }
      
      // Handle validation errors from Zod
      if (error && typeof error === 'object' && 'issues' in error) {
        return reply.status(400).send(errorResponse('Validation error', error));
      }
      
      // Generic error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send(errorResponse(`Failed to create site: ${errorMessage}`, error));
    }
  }

  async updateSite(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const data = SiteFullUpdateSchema.parse(request.body);
      const site = await sitesService.updateSite(id, data);

      if (!site) {
        return reply.status(404).send(errorResponse('Site not found'));
      }

      return reply.send(successResponse(site, 'Site updated successfully'));
    } catch (error) {
      request.log.error(error);
      return reply.status(400).send(errorResponse('Failed to update site', error));
    }
  }

  async deleteSite(request: FastifyRequest<{ Params: { id: string }; Querystring: { hard?: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const hardDelete = request.query.hard === 'true';
      const deleted = await sitesService.deleteSite(id, hardDelete);

      if (!deleted) {
        return reply.status(404).send(errorResponse('Site not found'));
      }

      const message = hardDelete ? 'Site permanently deleted' : 'Site deactivated successfully';
      // return reply.send({
      //   success: true,
      //   message,
      // });
      return reply.send(successResponse(null, message));
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse('Failed to delete site', error));
    }
  }

  async getStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const statistics = await sitesService.getStatistics();

      return reply.send(successResponse(statistics, 'Statistics retrieved successfully'));
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse('Failed to retrieve statistics', error));
    }
  }
}

export const sitesController = new SitesController();

