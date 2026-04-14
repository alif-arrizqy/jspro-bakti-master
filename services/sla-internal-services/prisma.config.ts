import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const getDatabaseUrl = (): string => {
  try {
    return env("DATABASE_URL");
  } catch {
    return "postgresql://invalid:invalid@localhost:5432/invalid";
  }
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: getDatabaseUrl(),
  },
});
