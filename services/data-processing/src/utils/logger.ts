import pino from "pino";
import { config } from "../config/env";

// Create logger instance
export const logger = pino({
    level: config.app.logLevel,
    transport: config.app.isDevelopment
        ? {
              target: "pino-pretty",
              options: {
                  colorize: true,
                  translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
                  ignore: "pid,hostname",
                  singleLine: false,
              },
          }
        : undefined,
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

// Create child loggers for different modules
export const createLogger = (module: string) => {
    return logger.child({ module });
};

// Export named loggers
export const processorLogger = createLogger("Processor");
export const dbLogger = createLogger("Database");
export const appLogger = createLogger("Application");

