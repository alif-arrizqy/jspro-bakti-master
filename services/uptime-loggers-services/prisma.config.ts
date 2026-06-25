import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const getDatabaseUrl = (): string => {
    try {
        return env("DATABASE_URL");
    } catch {
        throw new Error("DATABASE_URL must be set in .env file");
    }
};

export default defineConfig({
    schema: "prisma/data-loggers/schema.prisma",
    datasource: {
        url: getDatabaseUrl(),
    },
});
