import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const numStr = (def: number) => z.string().default(String(def)).transform(Number);
const boolStr = (def: boolean) =>
    z
        .string()
        .default(String(def))
        .transform((v) => v.split("#")[0]?.trim() === "true");

function parseCorsOrigins(raw: string): { allowAll: boolean; origins: string[] } {
    const origins = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (origins.includes("*")) {
        return { allowAll: true, origins: [] };
    }
    return { allowAll: false, origins };
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: numStr(8882),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

    DEFAULT_LOG_LIMIT: numStr(50),
    MAX_QUERY_LIMIT: numStr(300),
    SUMMARY_SAMPLE_LIMIT_PER_SITE: numStr(50),
    DB_STATEMENT_TIMEOUT_MS: numStr(15000),
    EXPECTED_LOGS_PER_DAY: numStr(240),

    SITES_SERVICES_URL: z.string().url(),
    SITES_SERVICES_TIMEOUT_MS: numStr(6000),
    SITES_SERVICES_CACHE_TTL_MS: numStr(120000),

    CORS_ORIGINS: z.string().default("http://localhost:8080,http://localhost:5173"),

    GRAFANA_BASE_URL: z.string().default(""),
    GRAFANA_SITE_VAR: z.string().default("SiteID"),

    CONNECTIVITY_PROBE_ENABLED: boolStr(true),
    CONNECTIVITY_PROBE_INTERVAL_MS: numStr(180000),
    CONNECTIVITY_PROBE_TIMEOUT_MS: numStr(3000),
    CONNECTIVITY_PROBE_CONCURRENCY: numStr(10),
    CONNECTIVITY_PROBE_MODE: z.enum(["tcp", "icmp"]).default("tcp"),
    CONNECTIVITY_PROBE_TCP_PORT: numStr(161),
    CONNECTIVITY_CACHE_TTL_MS: numStr(300000),
    CONNECTIVITY_PROBE_SITE_STATUS: z.enum(["all", "terestrial", "non_terestrial"]).default("all"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = {
    app: {
        nodeEnv: parsed.data.NODE_ENV,
        port: parsed.data.PORT,
        host: parsed.data.HOST,
        apiPrefix: "/api/v1",
        isDevelopment: parsed.data.NODE_ENV === "development",
        isProduction: parsed.data.NODE_ENV === "production",
    },
    database: {
        url: parsed.data.DATABASE_URL,
        statementTimeoutMs: parsed.data.DB_STATEMENT_TIMEOUT_MS,
    },
    redis: {
        url: parsed.data.REDIS_URL,
    },
    logging: {
        level: parsed.data.LOG_LEVEL,
    },
    query: {
        defaultLogLimit: parsed.data.DEFAULT_LOG_LIMIT,
        maxQueryLimit: parsed.data.MAX_QUERY_LIMIT,
        summarySampleLimitPerSite: parsed.data.SUMMARY_SAMPLE_LIMIT_PER_SITE,
        expectedLogsPerDay: parsed.data.EXPECTED_LOGS_PER_DAY,
    },
    services: {
        sitesUrl: parsed.data.SITES_SERVICES_URL,
        sitesTimeoutMs: parsed.data.SITES_SERVICES_TIMEOUT_MS,
        sitesCacheTtlMs: parsed.data.SITES_SERVICES_CACHE_TTL_MS,
    },
    cors: parseCorsOrigins(parsed.data.CORS_ORIGINS),
    grafana: {
        baseUrl: parsed.data.GRAFANA_BASE_URL,
        siteVar: parsed.data.GRAFANA_SITE_VAR,
    },
    probe: {
        enabled: parsed.data.CONNECTIVITY_PROBE_ENABLED,
        intervalMs: parsed.data.CONNECTIVITY_PROBE_INTERVAL_MS,
        timeoutMs: parsed.data.CONNECTIVITY_PROBE_TIMEOUT_MS,
        concurrency: parsed.data.CONNECTIVITY_PROBE_CONCURRENCY,
        mode: parsed.data.CONNECTIVITY_PROBE_MODE,
        tcpPort: parsed.data.CONNECTIVITY_PROBE_TCP_PORT,
        cacheTtlMs: parsed.data.CONNECTIVITY_CACHE_TTL_MS,
        siteStatus: parsed.data.CONNECTIVITY_PROBE_SITE_STATUS,
    },
};
