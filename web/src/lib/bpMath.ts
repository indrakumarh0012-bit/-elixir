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
import {
  BP_AGE_MAX, BP_AGE_MIN,
  WUEHL_AGE_DBP_24H_BOYS, WUEHL_AGE_DBP_24H_GIRLS,
  WUEHL_AGE_DBP_DAY_BOYS, WUEHL_AGE_DBP_DAY_GIRLS,
  WUEHL_AGE_DBP_NIGHT_BOYS, WUEHL_AGE_DBP_NIGHT_GIRLS,
  WUEHL_AGE_SBP_24H_BOYS, WUEHL_AGE_SBP_24H_GIRLS,
  WUEHL_AGE_SBP_DAY_BOYS, WUEHL_AGE_SBP_DAY_GIRLS,
  WUEHL_AGE_SBP_NIGHT_BOYS, WUEHL_AGE_SBP_NIGHT_GIRLS,
} from "../data/wuehlBpAgeReference";
import { zToPercentile } from "./growthMath";

export type BpBasis = "height" | "age";
export { BP_AGE_MIN, BP_AGE_MAX };

export type BpPeriod = "day" | "night" | "24h";
export type BpSex = "male" | "female";

const AGE_TABLES: Record<BpPeriod, Record<BpSex, { sbp: BpRow[]; dbp: BpRow[] }>> = {
  day: {
    male: { sbp: WUEHL_AGE_SBP_DAY_BOYS, dbp: WUEHL_AGE_DBP_DAY_BOYS },
    female: { sbp: WUEHL_AGE_SBP_DAY_GIRLS, dbp: WUEHL_AGE_DBP_DAY_GIRLS },
  },
  night: {
    male: { sbp: WUEHL_AGE_SBP_NIGHT_BOYS, dbp: WUEHL_AGE_DBP_NIGHT_BOYS },
    female: { sbp: WUEHL_AGE_SBP_NIGHT_GIRLS, dbp: WUEHL_AGE_DBP_NIGHT_GIRLS },
  },
  "24h": {
    male: { sbp: WUEHL_AGE_SBP_24H_BOYS, dbp: WUEHL_AGE_DBP_24H_BOYS },
    female: { sbp: WUEHL_AGE_SBP_24H_GIRLS, dbp: WUEHL_AGE_DBP_24H_GIRLS },
  },
};

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

/** Interpolated [L, M, S] at an x value (height or age); clamped to range. */
function lmsAt(table: BpRow[], x: number): [number, number, number] {
  const min = table[0][0];
  const max = table[table.length - 1][0];
  const v = Math.min(Math.max(x, min), max);
  let lo = 0;
  while (lo < table.length - 2 && table[lo + 1][0] <= v) lo++;
  const hi = Math.min(lo + 1, table.length - 1);
  const span = table[hi][0] - table[lo][0] || 1;
  const f = (v - table[lo][0]) / span;
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

/** Reference centiles (5th…99th) for one component at this height or age. */
export function bpCentiles(
  sex: BpSex,
  period: BpPeriod,
  component: "sbp" | "dbp",
  x: number,
  basis: BpBasis = "height",
): BpCentileRow {
  const set = basis === "age" ? AGE_TABLES : TABLES;
  const [l, m, s] = lmsAt(set[period][sex][component], x);
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
  x: number,
  value: number,
  basis: BpBasis = "height",
): BpAssessment | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (basis === "height" && (!Number.isFinite(x) || x < BP_HEIGHT_MIN - 15)) return null;
  if (basis === "age" && (!Number.isFinite(x) || x < BP_AGE_MIN - 1 || x > BP_AGE_MAX + 3)) return null;
  const set = basis === "age" ? AGE_TABLES : TABLES;
  const [l, m, s] = lmsAt(set[period][sex][component], x);
  const z = lmsZ(value, l, m, s);
  const pct = zToPercentile(z);
  let classification: string;
  let band: BpAssessment["band"];
  if (pct < 5) {
    classification =
      "LOW (below 5th centile) — hypotension; in dengue/sepsis this means decompensated shock";
    band = "alert";
  } else if (pct < 10) {
    classification = "Low-normal (5th–10th centile) — watch trend, check pulse pressure";
    band = "caution";
  } else if (pct < 90) {
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

/**
 * Pulse pressure (SBP − DBP). IAP/WHO dengue: pulse pressure ≤ 20 mmHg
 * indicates shock even when systolic still looks "normal".
 */
export function pulsePressure(sbp: number, dbp: number): number | null {
  if (!Number.isFinite(sbp) || !Number.isFinite(dbp) || sbp <= dbp) return null;
  return Math.round((sbp - dbp) * 10) / 10;
}

/** Nocturnal dipping: (day − night)/day. Normal ≥ 10%. */
export function dippingPercent(daySbp: number, nightSbp: number): number | null {
  if (!Number.isFinite(daySbp) || !Number.isFinite(nightSbp) || daySbp <= 0) return null;
  return Math.round(((daySbp - nightSbp) / daySbp) * 1000) / 10;
}
