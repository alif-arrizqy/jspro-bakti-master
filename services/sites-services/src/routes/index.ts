import type { FastifyInstance } from 'fastify';
import { sitesRoutes } from './sites.route.js';

export async function registerRoutes(fastify: FastifyInstance, prefix: string) {
  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
    handler: async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  });

  // Register sites routes
  fastify.register(sitesRoutes, { prefix: `${prefix}/sites` });
}

