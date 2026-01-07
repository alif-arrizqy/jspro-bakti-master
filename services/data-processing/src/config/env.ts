import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
    // Database URLs - Separate databases
    MQTT_COLLECTOR_DATABASE_URL: z.string().url(),
    DATA_LOGGERS_DATABASE_URL: z.string().url(),

    // Application
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    LOG_LEVEL: z
        .enum(["trace", "debug", "info", "warn", "error", "fatal"])
        .default("info"),

    // Processing Configuration
    POLLING_INTERVAL_MS: z.coerce.number().default(5000),
    BATCH_SIZE: z.coerce.number().default(100),
    MAX_RETRY_COUNT: z.coerce.number().default(3),
});

// Parse and validate environment
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsedEnv.error.format());
    process.exit(1);
}

export const env = parsedEnv.data;

export const config = {
    database: {
        mqttCollectorUrl: env.MQTT_COLLECTOR_DATABASE_URL,
        dataLoggersUrl: env.DATA_LOGGERS_DATABASE_URL,
    },
    app: {
        nodeEnv: env.NODE_ENV,
        logLevel: env.LOG_LEVEL,
        isDevelopment: env.NODE_ENV === "development",
        isProduction: env.NODE_ENV === "production",
    },
    processing: {
        pollingIntervalMs: env.POLLING_INTERVAL_MS,
        batchSize: env.BATCH_SIZE,
        maxRetryCount: env.MAX_RETRY_COUNT,
    },
} as const;
