export interface LoggerRowRaw {
  ts: string;
  batt_volt: number;
  dock_active: string;
  load1: number;
  load2: number;
  load3: number;
  energy: {
    edl1: number;
    edl2: number;
    eh1: number;
    eh2: number;
    eh3: number;
  };
  pv: {
    pv1_curr: number | null;
    pv2_curr: number | null;
    pv3_curr: number | null;
    pv1_volt: number | null;
    pv2_volt: number | null;
    pv3_volt: number | null;
  };
}

export interface SlaMappedRow {
  ts: string;
  batt_volt: number;
  pms: number;
  edl1: number;
  edl2: number;
  eh1: number;
  eh2: number;
  eh3: number;
  vsat_curr: number;
  bts_curr: number;
  obl_curr: number;
  pv1_curr: number | null;
  pv2_curr: number | null;
  pv3_curr: number | null;
  pv1_volt: number | null;
  pv2_volt: number | null;
  pv3_volt: number | null;
  flag_status: string;
  lvd1: number;
  lvd2: number;
  duration: number;
  real: number;
}

