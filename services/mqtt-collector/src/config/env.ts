import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // MQTT
    MQTT_BROKER_URL: z.string(),
    MQTT_USERNAME: z.string().optional().default(""),
    MQTT_PASSWORD: z.string().optional().default(""),
    MQTT_CLIENT_ID: z.string().default("mqtt_collector_service"),
    MQTT_TOPIC_PATTERN: z.string().default("sundaya/mqtt/+/+"),

    // Application
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    LOG_LEVEL: z
        .enum(["trace", "debug", "info", "warn", "error", "fatal"])
        .default("info"),

    // Optional
    MQTT_QOS: z.coerce.number().min(0).max(2).default(1),
    MQTT_KEEPALIVE: z.coerce.number().default(60),
    MQTT_RECONNECT_PERIOD: z.coerce.number().default(5000),
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
        url: env.DATABASE_URL,
    },
    mqtt: {
        brokerUrl: env.MQTT_BROKER_URL,
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD,
        clientId: env.MQTT_CLIENT_ID,
        topicPattern: env.MQTT_TOPIC_PATTERN,
        qos: env.MQTT_QOS as 0 | 1 | 2,
        keepalive: env.MQTT_KEEPALIVE,
        reconnectPeriod: env.MQTT_RECONNECT_PERIOD,
    },
    app: {
        nodeEnv: env.NODE_ENV,
        logLevel: env.LOG_LEVEL,
        isDevelopment: env.NODE_ENV === "development",
        isProduction: env.NODE_ENV === "production",
    },
} as const;
