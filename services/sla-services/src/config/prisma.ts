import { PrismaClient as SlaClient } from "@prisma/sla-client";
import { PrismaClient as DataLoggersClient } from "@prisma/data-loggers-client";
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

// Connection pool for sla_db
const slaPool = new Pool({
    connectionString: config.database.slaUrl,
    ...poolConfig,
});

// Connection pool for data_loggers_db
const dataLoggersPool = new Pool({
    connectionString: config.database.dataLoggersUrl,
    ...poolConfig,
});

// Adapter for sla_db (Prisma 7 adapter pattern)
const slaAdapter = new PrismaPg(slaPool);

// Adapter for data_loggers_db (Prisma 7 adapter pattern)
const dataLoggersAdapter = new PrismaPg(dataLoggersPool);

// Client for sla_db
const slaDb = new SlaClient({
    adapter: slaAdapter,
    log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
});

// Client for data_loggers_db (read-only for SLA Internal)
const dataLoggersDb = new DataLoggersClient({
    adapter: dataLoggersAdapter,
    log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
});

export { slaDb, dataLoggersDb };
