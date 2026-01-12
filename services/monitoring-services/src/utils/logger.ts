import pino from "pino";
import { config } from "../config/env";

const transport = config.app.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    }
    : undefined;

export const logger = pino({
    level: config.logging.level,
    transport,
});

// Child loggers for different modules
export const appLogger = logger.child({ module: "app" });
export const dbLogger = logger.child({ module: "database" });
export const siteDownLogger = logger.child({ module: "site-down" });
export const siteUpLogger = logger.child({ module: "site-up" });
export const nmsLogger = logger.child({ module: "nms" });

