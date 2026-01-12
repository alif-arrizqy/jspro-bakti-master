import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().transform(Number).default(3003),
    HOST: z.string().default("0.0.0.0"),
    API_PREFIX: z.string().default("/api/v1"),
    MONITORING_DATABASE_URL: z.string().url(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    NMS_API_URL: z.string().url().default("https://nmsapi.btsbakti.com/api/v1"),
    NMS_USERNAME: z.string(),
    NMS_PASSWORD: z.string(),
    SITES_SERVICE_URL: z.string().url().optional(),
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
        monitoringUrl: parsed.data.MONITORING_DATABASE_URL,
    },
    logging: {
        level: parsed.data.LOG_LEVEL,
    },
    nms: {
        apiUrl: parsed.data.NMS_API_URL,
        username: parsed.data.NMS_USERNAME,
        password: parsed.data.NMS_PASSWORD,
    },
    services: {
        sitesServiceUrl: parsed.data.SITES_SERVICE_URL,
    },
};

