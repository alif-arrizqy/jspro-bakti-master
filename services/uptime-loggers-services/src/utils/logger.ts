import pino from "pino";
import { config } from "../config/env.js";

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

export const appLogger = logger.child({ module: "app" });
export const dbLogger = logger.child({ module: "database" });
export const redisLogger = logger.child({ module: "redis" });
export const probeLogger = logger.child({ module: "probe" });
export const sitesLogger = logger.child({ module: "sites" });
