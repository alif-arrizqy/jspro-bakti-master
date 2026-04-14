import dotenv from "dotenv";

dotenv.config();

type SourceId = "apt1" | "apt2" | "talis5" | "terestrial";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function buildUrl(prefix: "APT1" | "APT2"): string {
  const connection = required(`${prefix}_DB_CONNECTION`);
  const user = required(`${prefix}_POSTGRES_USER`);
  const password = required(`${prefix}_POSTGRES_PASSWORD`);
  const host = required(`${prefix}_DB_HOST`);
  const port = required(`${prefix}_DB_PORT_EXPOSE`);
  const database = required(`${prefix}_POSTGRES_DB`);
  return `${connection}://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3007),
  host: process.env.HOST ?? "localhost",
  logLevel: process.env.LOG_LEVEL ?? "info",
  apiPrefix: process.env.API_PREFIX ?? "/api/v1",
  multipleBeUrl: process.env.MULTIPLE_BE ?? "",
  dataSources: {
    apt1: buildUrl("APT1"),
    apt2: buildUrl("APT2"),
    talis5: process.env.TA5_DATABASE_URL ?? "",
    terestrial: process.env.TERESTRIAL_DATABASE_URL ?? "",
  } satisfies Record<SourceId, string>,
};

export type DataSourceId = SourceId;
