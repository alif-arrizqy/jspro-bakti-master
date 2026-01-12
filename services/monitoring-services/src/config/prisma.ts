import { PrismaClient as SiteDownClient } from "@prisma/site-down-client";
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

// Connection pool for site_down_db
const siteDownPool = new Pool({
    connectionString: config.database.siteDownUrl,
    ...poolConfig,
});

// Adapter for site_down_db (Prisma 7 adapter pattern)
const siteDownAdapter = new PrismaPg(siteDownPool);

// Client for site_down_db
const siteDownDb = new SiteDownClient({
    adapter: siteDownAdapter,
    log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
});

export { siteDownDb };

