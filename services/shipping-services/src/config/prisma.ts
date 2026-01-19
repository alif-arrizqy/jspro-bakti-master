import { PrismaClient } from "@prisma/shipping-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "./env";

// Connection pool configuration for Prisma 7
const poolConfig = {
    max: 20, // Maximum number of clients in the pool
    min: 5, // Minimum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Connection pool for shipping_db
const shippingPool = new Pool({
    connectionString: config.database.shippingUrl,
    ...poolConfig,
});

// Adapter for shipping_db (Prisma 7 adapter pattern)
const shippingAdapter = new PrismaPg(shippingPool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Client for shipping_db
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: shippingAdapter,
        log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
    });

if (config.app.isDevelopment) globalForPrisma.prisma = prisma;

// Handle Prisma connection errors gracefully
prisma.$on("error" as never, (e: Error) => {
    console.error("Prisma error:", e);
});

export default prisma;
