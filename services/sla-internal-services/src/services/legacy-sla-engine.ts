import { millisToSec, secToString } from "../lib/legacy-date-time";
import { groupByDate } from "../lib/legacy-group";
import { hexToBin } from "../lib/legacy-hex";
import type { LoggerRowRaw, SlaMappedRow } from "../types/legacy-sla";

const formaterSla = (data: LoggerRowRaw): Omit<SlaMappedRow, "lvd1" | "lvd2" | "duration" | "real"> => {
  const dockActive = hexToBin(data.dock_active) || null;
  return {
    ts: data.ts,
    batt_volt: data.batt_volt,
    pms: dockActive.on,
    edl1: data.energy.edl1,
    edl2: data.energy.edl2,
    eh1: data.energy.eh1 < 0 ? 0 : data.energy.eh1,
    eh2: data.energy.eh2 < 0 ? 0 : data.energy.eh2,
    eh3: data.energy.eh3,
    vsat_curr: data.load1,
    bts_curr: data.load2,
    obl_curr: data.load3,
    pv1_curr: data.pv.pv1_curr,
    pv2_curr: data.pv.pv2_curr,
    pv3_curr: data.pv.pv3_curr,
    pv1_volt: data.pv.pv1_volt,
    pv2_volt: data.pv.pv2_volt,
    pv3_volt: data.pv.pv3_volt,
    flag_status: "",
  };
};

const average = (arr: SlaMappedRow[], param: keyof SlaMappedRow, fix = 0): string => {
  return (arr.map((val) => Number(val[param])).reduce((acc, val) => acc + val, 0) / arr.length).toFixed(fix);
};

const sum = (arr: SlaMappedRow[], param: keyof SlaMappedRow, fix = 0): string => {
  return arr
    .map((val) => Number(val[param]))
    .reduce((acc, val) => acc + val, 0)
    .toFixed(fix);
};

export const dataMaping = (datas: LoggerRowRaw[], date: { start: string; end: string }) => {
  let uptime = 0;
  const result: SlaMappedRow[] = [];
  const totalDateSec = millisToSec(date.start, date.end);
  for (let i = 0; i < datas.length; i++) {
    let res = formaterSla(datas[i]);
    const tempTs = datas[i + 1] ? datas[i + 1].ts : res.ts;
    const second = millisToSec(res.ts, tempTs);
    const duration = second > 300 ? 300 : second;
    const lvd1 = res.vsat_curr > 0 ? res.batt_volt : 0;
    const lvd2 = res.bts_curr > 0 ? res.batt_volt : 0;
    uptime += duration;
    result.push({
      ...res,
      lvd1,
      lvd2,
      duration,
      real: second,
    });
  }
  const uptimePercent = ((uptime / totalDateSec) * 100).toFixed(2);
  const sumBattVolt = result.map((e) => e.batt_volt).length;
  const avgBattvolt = +average(result, "batt_volt", 2);
  const avgVsatCurr = +average(result, "vsat_curr", 2);
  const avgBtsCurr = +average(result, "bts_curr", 2);
  const avg = {
    up_time: secToString(uptime),
    unknown_time: secToString(totalDateSec - uptime),
    up_persentase: `${uptimePercent}%`,
    unknown_persentase: `${(100 - Number(uptimePercent)).toFixed(2)}%`,
    eh1: sum(result, "eh1"),
    eh2: sum(result, "eh2"),
    eh3: sum(result, "eh3"),
    batt_volt: avgBattvolt,
    edl1: sum(result, "edl1"),
    edl2: sum(result, "edl2"),
    vsat_curr: avgVsatCurr,
    bts_curr: avgBtsCurr,
    watt: ((avgVsatCurr + avgBtsCurr) * avgBattvolt).toFixed(1),
    duration: uptime,
    secend: totalDateSec,
  };
  return { avg, log: result, duration: uptime, sumBattVolt };
};

export const sla = (datas: LoggerRowRaw[], date: { start: string; end: string }) => {
  return dataMaping(datas, date);
};

export const sla2 = (
  datas: LoggerRowRaw[],
  date: { start: string; end: string },
  nojs: { nojs: string; site: string }
) => {
  const data = dataMaping(datas, date);
  const fiveMinutestoDaily = groupByDate(data.log);
  const dailys: Record<string, string | number>[] = [];
  fiveMinutestoDaily.forEach((log) => {
    const duration = sum(log.data, "duration");
    const newData = {
      nojs: nojs.nojs,
      site: nojs.site,
      date: log.date,
      up_time: secToString(duration),
      batt_volt: average(log.data, "batt_volt", 2),
      vsat_curr: average(log.data, "vsat_curr", 2),
      bts_curr: average(log.data, "bts_curr", 2),
      eh1: sum(log.data, "eh1"),
      eh2: sum(log.data, "eh2"),
      eh3: sum(log.data, "eh3"),
      edl1: sum(log.data, "edl1"),
      edl2: sum(log.data, "edl2"),
      lvd1: average(log.data, "lvd1", 2),
      lvd2: average(log.data, "lvd2", 2),
    };
    dailys.push(newData);
  });
  return dailys;
};
