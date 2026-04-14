import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env";
import { registerApiRoutes } from "./routes/api";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.logLevel,
      transport:
        env.nodeEnv === "development"
          ? {
              target: "pino-pretty",
            }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await registerApiRoutes(app);

  return app;
}
