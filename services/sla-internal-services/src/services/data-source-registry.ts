import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env, type DataSourceId } from "../config/env";

const clients = new Map<DataSourceId, PrismaClient>();
const pools = new Map<DataSourceId, Pool>();

function createPool(url: string): Pool {
  return new Pool({ connectionString: url });
}

function createClientWithPool(url: string, source: DataSourceId): PrismaClient {
  const pool = createPool(url);
  pools.set(source, pool);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
  });
}

export function resolveDataSourceId(input?: string | null): DataSourceId {
  const normalized = String(input ?? "apt1").toLowerCase();
  if (normalized === "apt1" || normalized === "apt2" || normalized === "talis5" || normalized === "terestrial") {
    return normalized;
  }
  throw new Error(`Unknown dataSource: ${input}`);
}

export function getPrismaForSource(source: DataSourceId): PrismaClient {
  const existing = clients.get(source);
  if (existing) {
    return existing;
  }
  const url = env.dataSources[source];
  if (!url) {
    throw new Error(`Data source "${source}" is not configured`);
  }
  const client = createClientWithPool(url, source);
  clients.set(source, client);
  return client;
}

export async function disconnectAllSources(): Promise<void> {
  await Promise.all(Array.from(clients.values()).map((c) => c.$disconnect()));
  await Promise.all(Array.from(pools.values()).map((p) => p.end()));
}

