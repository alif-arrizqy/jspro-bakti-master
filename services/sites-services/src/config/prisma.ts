import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: env.isDev ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.isDev) globalForPrisma.prisma = prisma;

// Handle Prisma connection errors gracefully
prisma.$on('error' as never, (e: Error) => {
  console.error('Prisma error:', e);
});

export default prisma;

