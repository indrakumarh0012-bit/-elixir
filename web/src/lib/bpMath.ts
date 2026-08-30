import {
  BP_HEIGHT_MIN,
  WUEHL_DBP_24H_BOYS, WUEHL_DBP_24H_GIRLS,
  WUEHL_DBP_DAY_BOYS, WUEHL_DBP_DAY_GIRLS,
  WUEHL_DBP_NIGHT_BOYS, WUEHL_DBP_NIGHT_GIRLS,
  WUEHL_SBP_24H_BOYS, WUEHL_SBP_24H_GIRLS,
  WUEHL_SBP_DAY_BOYS, WUEHL_SBP_DAY_GIRLS,
  WUEHL_SBP_NIGHT_BOYS, WUEHL_SBP_NIGHT_GIRLS,
  type BpRow,
} from "../data/wuehlBpReference";
import { zToPercentile } from "./growthMath";

export type BpPeriod = "day" | "night" | "24h";
export type BpSex = "male" | "female";

const TABLES: Record<BpPeriod, Record<BpSex, { sbp: BpRow[]; dbp: BpRow[] }>> = {
  day: {
    male: { sbp: WUEHL_SBP_DAY_BOYS, dbp: WUEHL_DBP_DAY_BOYS },
    female: { sbp: WUEHL_SBP_DAY_GIRLS, dbp: WUEHL_DBP_DAY_GIRLS },
  },
  night: {
    male: { sbp: WUEHL_SBP_NIGHT_BOYS, dbp: WUEHL_DBP_NIGHT_BOYS },
    female: { sbp: WUEHL_SBP_NIGHT_GIRLS, dbp: WUEHL_DBP_NIGHT_GIRLS },
  },
  "24h": {
    male: { sbp: WUEHL_SBP_24H_BOYS, dbp: WUEHL_DBP_24H_BOYS },
    female: { sbp: WUEHL_SBP_24H_GIRLS, dbp: WUEHL_DBP_24H_GIRLS },
  },
};

/** Interpolated [L, M, S] at a height; clamped to the table's range. */
function lmsAt(table: BpRow[], heightCm: number): [number, number, number] {
  const min = table[0][0];
  const max = table[table.length - 1][0];
  const h = Math.min(Math.max(heightCm, min), max);
  const idx = (h - min) / 5;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, table.length - 1);
  const f = idx - lo;
  const lerp = (i: number) => table[lo][i] + (table[hi][i] - table[lo][i]) * f;
  return [lerp(1), lerp(2), lerp(3)];
}

function lmsZ(x: number, l: number, m: number, s: number): number {
  if (Math.abs(l) < 1e-9) return Math.log(x / m) / s;
  return (Math.pow(x / m, l) - 1) / (l * s);
}

/** BP value at a given z for the LMS parameters (inverse transform). */
function lmsValue(z: number, l: number, m: number, s: number): number {
  if (Math.abs(l) < 1e-9) return m * Math.exp(s * z);
  return m * Math.pow(1 + l * s * z, 1 / l);
}

const Z_FOR: Record<string, number> = {
  p5: -1.6449, p10: -1.2816, p50: 0, p90: 1.2816, p95: 1.6449, p99: 2.3263,
};

export type BpCentileRow = {
  p5: number; p10: number; p50: number; p90: number; p95: number; p99: number;
};

export type BpAssessment = {
  z: number;
  percentile: number;
  classification: string;
  band: "normal" | "caution" | "alert";
};

/** Reference centile values (5th…99th) for one component at this height. */
export function bpCentiles(
  sex: BpSex,
  period: BpPeriod,
  component: "sbp" | "dbp",
  heightCm: number,
): BpCentileRow {
  const [l, m, s] = lmsAt(TABLES[period][sex][component], heightCm);
  const out = {} as BpCentileRow;
  for (const [key, z] of Object.entries(Z_FOR)) {
    out[key as keyof BpCentileRow] = Math.round(lmsValue(z, l, m, s) * 10) / 10;
  }
  return out;
}

/** Assess one measured value against the Wuehl reference. */
export function assessBp(
  sex: BpSex,
  period: BpPeriod,
  component: "sbp" | "dbp",
  heightCm: number,
  value: number,
): BpAssessment | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm < BP_HEIGHT_MIN - 15) return null;
  const [l, m, s] = lmsAt(TABLES[period][sex][component], heightCm);
  const z = lmsZ(value, l, m, s);
  const pct = zToPercentile(z);
  let classification: string;
  let band: BpAssessment["band"];
  if (pct < 90) {
    classification = "Normal";
    band = "normal";
  } else if (pct < 95) {
    classification = "Elevated (90th–95th centile)";
    band = "caution";
  } else {
    classification = "Hypertensive range (≥ 95th centile)";
    band = "alert";
  }
  return { z: Math.round(z * 100) / 100, percentile: Math.round(pct * 10) / 10, classification, band };
}

/** Nocturnal dipping: (day − night)/day. Normal ≥ 10%. */
export function dippingPercent(daySbp: number, nightSbp: number): number | null {
  if (!Number.isFinite(daySbp) || !Number.isFinite(nightSbp) || daySbp <= 0) return null;
  return Math.round(((daySbp - nightSbp) / daySbp) * 1000) / 10;
}
