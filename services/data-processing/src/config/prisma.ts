import { PrismaClient as MqttCollectorClient } from "@prisma/mqtt-collector-client";
import { PrismaClient as DataLoggersClient } from "@prisma/data-loggers-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "../config/env";

// Connection pool for mqtt_collector_db
const mqttCollectorPool = new Pool({
    connectionString: config.database.mqttCollectorUrl,
});

// Connection pool for data_loggers_db
const dataLoggersPool = new Pool({
    connectionString: config.database.dataLoggersUrl,
});

// Adapter for mqtt_collector_db
const mqttCollectorAdapter = new PrismaPg(mqttCollectorPool);

// Adapter for data_loggers_db
const dataLoggersAdapter = new PrismaPg(dataLoggersPool);

// Client for mqtt_collector_db (temporary/staging)
const mqttCollectorDb = new MqttCollectorClient({
    adapter: mqttCollectorAdapter,
    log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
});

// Client for data_loggers_db (permanent/historical)
const dataLoggersDb = new DataLoggersClient({
    adapter: dataLoggersAdapter,
    log: config.app.isDevelopment ? ["query", "error", "warn"] : ["error"],
});

export { mqttCollectorDb, dataLoggersDb };