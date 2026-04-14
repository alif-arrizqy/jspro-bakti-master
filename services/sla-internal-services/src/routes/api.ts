import type { FastifyInstance } from "fastify";
import { monthFormater } from "../lib/legacy-date-time";
import { env } from "../config/env";
import { resolveDataSourceId } from "../services/data-source-registry";
import { generateLegacySla3Workbook } from "../services/legacy-excel";
import { sla, sla2 } from "../services/legacy-sla-engine";
import { findNojsById, findNojsUsers, getSlaLoggerRows } from "../services/logger-repository";

function pickSource(q: Record<string, unknown>) {
  return resolveDataSourceId(String(q.dataSource ?? q.cluster ?? "apt1"));
}

function normalizeLegacyQueryTimestamp(value: unknown): string {
  return String(value ?? "").replace(/\+/g, " ").trim();
}

type HistoryItem = { date: string; flag: string };
type SlaLogLike = { ts: string; flag_status?: string };

function findNearestDate(apiData: { data?: HistoryItem[] }, slaData: { log: SlaLogLike[] }) {
  if (!apiData || !apiData.data || !slaData || !slaData.log) {
    return slaData;
  }

  const maxDifference = 3 * 60 * 1000;
  slaData.log.forEach((logEntry) => {
    let nearestFlag: string | null = null;
    let smallestDiff = Infinity;
    const logTs = new Date(String(logEntry.ts)).getTime();

    apiData.data?.forEach((apiEntry) => {
      const apiDate = new Date(apiEntry.date).getTime();
      const diff = Math.abs(logTs - apiDate);
      if (diff < smallestDiff && diff <= maxDifference) {
        smallestDiff = diff;
        nearestFlag = apiEntry.flag;
      }
    });

    if (nearestFlag) {
      logEntry.flag_status = nearestFlag;
    }
  });

  return slaData;
}

async function getFilteredHistory(nojsCode: string, start: string, end: string): Promise<{ data?: HistoryItem[] }> {
  if (!env.multipleBeUrl) {
    return { data: [] };
  }
  const base = env.multipleBeUrl.replace(/\/$/, "");
  const url = `${base}/getFilteredHistory?nojs=${encodeURIComponent(nojsCode)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch filtered history (${response.status})`);
  }
  return (await response.json()) as { data?: HistoryItem[] };
}

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/nojs", async (request, reply) => {
    try {
      const source = pickSource(request.query as Record<string, unknown>);
      const data = await findNojsUsers(source);
      return reply.send({ status: "success", data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load nojs";
      return reply.status(409).send({ status: "error", message });
    }
  });

  app.get("/api/logger/sla", async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const nojs = String(query.nojs ?? "");
    const start = normalizeLegacyQueryTimestamp(query.start);
    const end = normalizeLegacyQueryTimestamp(query.end);
    const daily = query.daily;

    if (!nojs) {
      return reply.status(404).send({ status: "error", message: "Nojs Not Found" });
    }

    try {
      const source = pickSource(query);
      const nojsId = Number(nojs);
      if (start && end && !daily) {
        const dataNojs = await findNojsById(source, nojsId);
        if (!dataNojs) {
          return reply.status(409).send({ status: "error", message: "Nojs Not Found" });
        }
        const result = await getSlaLoggerRows(source, { nojsId, start, end });
        const data = sla(result, { start, end });
        return reply.send({
          status: "success",
          data: [{ nojs: dataNojs.nojs, site: dataNojs.site, lc: dataNojs.lc, ...data.avg }],
        });
      }
      if (start && end && daily) {
        const dataNojs = await findNojsById(source, nojsId);
        if (!dataNojs) {
          return reply.status(409).send({ status: "error", message: "Nojs Not Found" });
        }
        const result = await getSlaLoggerRows(source, { nojsId, start, end });
        return reply.send({
          status: "success",
          data: sla2(result, { start, end }, dataNojs),
        });
      }
      return reply.status(404).send({ status: "error", message: "Parameter Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nojs Not Found";
      return reply.status(409).send({ status: "error", message });
    }
  });

  app.get("/api/export", async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const nojs = String(query.nojs ?? "");
    const nojsCode = String(query.nojsCode ?? "");
    const start = normalizeLegacyQueryTimestamp(query.start);
    const end = normalizeLegacyQueryTimestamp(query.end);
    const apt2 = String(query.apt2 ?? "") === "true";

    if (!nojs) {
      return reply.status(404).send({ status: "error", message: "Nojs Empty" });
    }
    if (!(start && end)) {
      return reply.status(404).send({ status: "error", message: "Parameter Not Found" });
    }

    try {
      const source = pickSource(query);
      const nojsId = Number(nojs);
      const dataNojs = await findNojsById(source, nojsId);
      if (!dataNojs) {
        return reply.status(409).send({ status: "error", message: "Nojs Not Found" });
      }

      const apiData = await getFilteredHistory(nojsCode, start, end);
      const result = await getSlaLoggerRows(source, { nojsId, start, end });
      const slaData = sla(result, { start, end });
      if (!slaData || !slaData.log || slaData.log.length === 0) {
        return reply.status(409).send({ status: "error", message: "SLA data not found" });
      }
      const updatedSlaData = findNearestDate(apiData, slaData);
      const wb = generateLegacySla3Workbook({
        log: updatedSlaData.log,
        site: dataNojs.site,
        uptime: slaData.duration,
        sumVolt: slaData.sumBattVolt,
        date: monthFormater(start),
        v3: apt2,
      });

      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      reply.header("Content-Disposition", `attachment; filename=${dataNojs.site}.xlsx`);
      const buffer = await wb.xlsx.writeBuffer();
      return reply.send(Buffer.from(buffer));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nojs Not Found";
      return reply.status(409).send({ status: "error", message });
    }
  });
}
