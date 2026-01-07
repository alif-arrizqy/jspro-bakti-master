import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { registerRoutes } from './routes/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customSerializer = (_: any, value: any): any => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (typeof value.toNumber === 'function' && typeof value.toString === 'function') {
    return value.toString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const fastify = Fastify({
  logger: {
    level: env.isDev ? 'info' : 'warn',
    transport: env.isDev
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

fastify.addHook('preSerialization', async (_request, _reply, payload) => {
  return JSON.parse(JSON.stringify(payload, customSerializer));
});

const swaggerDescription = `
## Sites Information Management REST API

API untuk mengelola data site information Sundaya.

### Fitur:
- **CRUD Operations**: Create, Read, Update, Delete sites
- **Filtering**: Filter by province, status, SCC type, battery version
- **Pagination**: Support for paginated results
- **Statistics**: Get aggregated statistics
- **Soft Delete**: Support for soft delete (deactivate) dan hard delete

### Authentication:
Saat ini API belum menggunakan authentication. Akan ditambahkan di versi selanjutnya.

### Response Format:
Semua response menggunakan format standar:
\`\`\`json
{
  "success": true/false,
  "message": "...",
  "data": {...}
}
\`\`\`
`;

async function registerPlugins() {
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Sites Services API',
        description: swaggerDescription,
        version: '1.0.0',
        contact: {
          name: 'Sundaya Development Team',
          email: 'dev@sundaya.com',
        },
      },
      servers: [
        {
          url: env.isProd 
            ? `http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}`
            : `http://${env.HOST}:${env.PORT}`,
          description: env.isProd ? 'Production server' : 'Development server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Sites', description: 'Site management endpoints' },
        { name: 'Statistics', description: 'Statistics and reporting endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: false,
  });
}

const printServerBanner = () => {
  const serverUrl = `http://${env.HOST}:${env.PORT}`;
  const docsUrl = `${serverUrl}/docs`;
  const envName = env.NODE_ENV.padEnd(30);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Sites Services API                        ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: ${serverUrl.padEnd(40)}║
║  Swagger Docs:      ${docsUrl.padEnd(40)}║
║  Environment:       ${envName}║
╚════════════════════════════════════════════════════════════╝
  `);
};

const handleGracefulShutdown = async (signal: string) => {
  fastify.log.info(`${signal} received, shutting down gracefully...`);
  await fastify.close();
  process.exit(0);
};

async function start() {
  try {
    await registerPlugins();
    await registerRoutes(fastify, env.API_PREFIX);

    await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    });

    printServerBanner();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

start();

