import { getPrismaForSource } from "./data-source-registry";
import type { DataSourceId } from "../config/env";
import type { LoggerRowRaw } from "../types/legacy-sla";

type NojsUserRow = {
  id: number;
  nojs: string;
  site: string;
  lc: string;
  provinsi: string;
};

export async function findNojsById(source: DataSourceId, id: number): Promise<{ nojs: string; site: string; lc: string } | null> {
  const prisma = getPrismaForSource(source);
  return prisma.nojsUser.findFirst({
    where: { id },
    select: {
      nojs: true,
      site: true,
      lc: true,
    },
  }) as Promise<{ nojs: string; site: string; lc: string } | null>;
}

export async function findNojsUsers(source: DataSourceId): Promise<NojsUserRow[]> {
  const prisma = getPrismaForSource(source);
  return prisma.nojsUser.findMany({
    orderBy: { site: "asc" },
    select: {
      id: true,
      nojs: true,
      site: true,
      lc: true,
      provinsi: true,
    },
  }) as Promise<NojsUserRow[]>;
}

export async function getSlaLoggerRows(
  source: DataSourceId,
  args: { nojsId: number; start: string; end: string }
): Promise<LoggerRowRaw[]> {
  const prisma = getPrismaForSource(source);
  const result = await prisma.$queryRaw<
    Array<{
      ts: string;
      batt_volt: number | null;
      dock_active: string | null;
      load1: number | null;
      load2: number | null;
      load3: number | null;
      edl1: number | null;
      edl2: number | null;
      eh1: number | null;
      eh2: number | null;
      eh3: number | null;
      pv1_curr: number | null;
      pv2_curr: number | null;
      pv3_curr: number | null;
      pv1_volt: number | null;
      pv2_volt: number | null;
      pv3_volt: number | null;
    }>
  >`
    SELECT
      nl.ts,
      nl.batt_volt,
      nl.dock_active,
      nl.load1,
      nl.load2,
      nl.load3,
      e.edl1,
      e.edl2,
      e.eh1,
      e.eh2,
      e.eh3,
      p.pv1_curr,
      p.pv2_curr,
      p.pv3_curr,
      p.pv1_volt,
      p.pv2_volt,
      p.pv3_volt
    FROM nojs_loggers nl
    LEFT JOIN energy e ON e.id = nl.energy_id
    LEFT JOIN pv p ON p.id = nl.pv_id
    WHERE nl.nojs_id = ${args.nojsId}
      AND nl.ts >= ${args.start}
      AND nl.ts <= ${args.end}
      AND nl.energy_id <> 1
      AND nl.pv_id <> 1
    ORDER BY nl.ts ASC
  `;

  const seen = new Set<string>();
  const filtered = result.filter((el) => {
    const key = String(el.ts ?? "");
    const duplicate = seen.has(key);
    seen.add(key);
    return !duplicate;
  });

  return filtered.map((row) => ({
    ts: String(row.ts ?? ""),
    batt_volt: Number(row.batt_volt ?? 0),
    dock_active: String(row.dock_active ?? ""),
    load1: Number(row.load1 ?? 0),
    load2: Number(row.load2 ?? 0),
    load3: Number(row.load3 ?? 0),
    energy: {
      edl1: Number(row.edl1 ?? 0),
      edl2: Number(row.edl2 ?? 0),
      eh1: Number(row.eh1 ?? 0),
      eh2: Number(row.eh2 ?? 0),
      eh3: Number(row.eh3 ?? 0),
    },
    pv: {
      pv1_curr: row.pv1_curr ?? null,
      pv2_curr: row.pv2_curr ?? null,
      pv3_curr: row.pv3_curr ?? null,
      pv1_volt: row.pv1_volt ?? null,
      pv2_volt: row.pv2_volt ?? null,
      pv3_volt: row.pv3_volt ?? null,
    },
  }));
}

