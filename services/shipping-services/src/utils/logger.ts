import pino from "pino";
import { config } from "../config/env";

const logger = pino({
    level: config.logging.level,
    transport:
        config.app.isDevelopment
            ? {
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "SYS:standard",
                      ignore: "pid,hostname",
                  },
              }
            : undefined,
});

export const shippingLogger = logger.child({ module: "shipping" });
export const appLogger = logger.child({ module: "app" });

