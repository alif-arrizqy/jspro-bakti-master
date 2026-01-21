import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().transform(Number),
    HOST: z.string().default("localhost"),
    API_PREFIX: z.string().default("/api/v1"),
    SHIPPING_DATABASE_URL: z.string().url(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    SITES_SERVICE_URL: z.string().url(),
    REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = {
    app: {
        nodeEnv: parsed.data.NODE_ENV,
        port: parsed.data.PORT,
        host: parsed.data.HOST,
        apiPrefix: parsed.data.API_PREFIX,
        isDevelopment: parsed.data.NODE_ENV === "development",
        isProduction: parsed.data.NODE_ENV === "production",
    },
    database: {
        shippingUrl: parsed.data.SHIPPING_DATABASE_URL,
    },
    logging: {
        level: parsed.data.LOG_LEVEL,
    },
    services: {
        sitesServiceUrl: parsed.data.SITES_SERVICE_URL,
    },
    cache: {
        redisUrl: parsed.data.REDIS_URL || undefined,
    },
};
