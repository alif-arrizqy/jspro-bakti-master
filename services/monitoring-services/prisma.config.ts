import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const getDatabaseUrl = (): string => {
    // Priority 1: Use PRISMA_DATABASE_URL if set (by scripts)
    // Scripts set this based on which schema is being used
    try {
        const dbUrl = env("PRISMA_DATABASE_URL");
        if (dbUrl && !dbUrl.includes("dummy")) {
            return dbUrl;
        }
    } catch {
        // PRISMA_DATABASE_URL not set, try DATABASE_URL
    }

    // Priority 2: Use DATABASE_URL if set
    try {
        const dbUrl = env("DATABASE_URL");
        if (dbUrl && !dbUrl.includes("dummy")) {
            return dbUrl;
        }
    } catch {
        // DATABASE_URL not set, detect from PRISMA_SCHEMA env var
    }

    // Priority 3: Detect database URL based on PRISMA_SCHEMA environment variable
    // Scripts should set this to indicate which schema is being used
    let schemaEnv = "";
    try {
        schemaEnv = env("PRISMA_SCHEMA");
    } catch {
        // PRISMA_SCHEMA not set, continue
    }
    
    if (schemaEnv.includes("monitoring-db") || schemaEnv.includes("monitoring_db")) {
        try {
            // Try MONITORING_DATABASE_URL
            return env("MONITORING_DATABASE_URL");
        } catch {
            throw new Error("MONITORING_DATABASE_URL must be set in .env file");
        }
    }

    throw new Error("PRISMA_DATABASE_URL, DATABASE_URL, or MONITORING_DATABASE_URL must be set in .env file.");
};

const getSchemaPath = (): string => {
    // Priority 1: Use PRISMA_SCHEMA if set
    try {
        const schemaPath = env("PRISMA_SCHEMA");
        if (schemaPath) {
            return schemaPath;
        }
    } catch {
        // PRISMA_SCHEMA not set, continue
    }

    // Priority 2: Default to monitoring-db schema (contains both site-down and site-up)
    return "prisma/monitoring-db/schema.prisma";
};

export default defineConfig({
    schema: getSchemaPath(),
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: getDatabaseUrl(),
    },
});

