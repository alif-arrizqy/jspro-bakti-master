import { PrismaClient as MonitoringClient } from "@prisma/monitoring-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "./env";

// Connection pool configuration for Prisma 7
const poolConfig = {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Connection pool for monitoring_db
const monitoringPool = new Pool({
    connectionString: config.database.monitoringUrl,
    ...poolConfig,
});

// Adapter for monitoring_db (Prisma 7 adapter pattern)
const monitoringAdapter = new PrismaPg(monitoringPool);

// Client for monitoring_db
const monitoringDb = new MonitoringClient({
    adapter: monitoringAdapter,
    log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
});

export { monitoringDb };

