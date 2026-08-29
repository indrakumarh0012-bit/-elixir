import {
  IAP_CENTILES,
  IAP_HEIGHT_BOYS,
  IAP_HEIGHT_GIRLS,
  IAP_WEIGHT_BOYS,
  IAP_WEIGHT_GIRLS,
  type IapRow,
} from "../data/iapGrowthReference";
import {
  STANDING_HEIGHT_FROM_MONTH,
  WHO_HFA_BOYS,
  WHO_HFA_GIRLS,
  WHO_WFA_BOYS,
  WHO_WFA_GIRLS,
} from "../data/whoGrowthStandards";

export type Sex = "male" | "female";
export const WHO_MAX_MONTHS = 60;
/** Charts run to 18 years: WHO to 60 months, IAP 2015 above that. */
export const GROWTH_MAX_MONTHS = 216;

const IAP_REF =
  "IAP 2015 charts for Indian children (Khadilkar et al., Indian Pediatrics 2015)";

/** Linear interpolation of a half-year-step IAP table at an exact age. */
function iapRowAt(table: IapRow[], ageYears: number): IapRow {
  const t = Math.min(Math.max(ageYears, 5), 18);
  const idx = (t - 5) / 0.5;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, table.length - 1);
  const frac = idx - lo;
  const a = table[lo];
  const b = table[hi];
  return a.map((v, i) => v + (b[i] - v) * frac) as IapRow;
}

/**
 * Where the measurement sits between the table's own centile columns —
 * exactly how the printed chart is read. Piecewise-linear between the seven
 * published lines; beyond the outer lines the SD column extends the scale.
 */
function iapPercentile(x: number, row: IapRow): number {
  const values = row.slice(1, 8);
  const sd = row[8];
  if (x < values[0]) {
    const z = (x - row[4]) / sd;
    return Math.min(zToPercentile(z), 2.9);
  }
  if (x > values[6]) {
    const z = (x - row[4]) / sd;
    return Math.max(zToPercentile(z), 97.1);
  }
  for (let i = 0; i < 6; i++) {
    if (x >= values[i] && x <= values[i + 1]) {
      const frac = (x - values[i]) / (values[i + 1] - values[i]);
      return IAP_CENTILES[i] + frac * (IAP_CENTILES[i + 1] - IAP_CENTILES[i]);
    }
  }
  return 50;
}

export type GrowthResult = {
  z: number;
  percentile: number;
  median: number;
  /** e.g. "WHO weight-for-age (0–5 y)" — shown so the user knows the source. */
  reference: string;
  /** "Length" below 24 months, "Height" from 24 months. */
  measurement?: "Length (lying)" | "Height (standing)";
  classification: string;
  /** Colour band for the UI: normal / caution / alert. */
  band: "normal" | "caution" | "alert";
};

/**
 * LMS to z-score.
 *   L != 0:  z = ((y/M)^L - 1) / (L*S)
 *   L == 0:  z = ln(y/M) / S
 */
function lmsZ(y: number, l: number, m: number, s: number): number {
  if (l === 0) return Math.log(y / m) / s;
  return (Math.pow(y / m, l) - 1) / (l * s);
}

/**
 * Beyond |z| = 3 the LMS curve is unreliable in the tails, so WHO replaces it
 * with a linear extrapolation off the 2SD–3SD gap. Applied to weight-based
 * indicators only; height-for-age keeps the raw LMS value.
 */
function whoTailCorrection(
  y: number,
  z: number,
  sd3neg: number,
  sd2neg: number,
  sd2pos: number,
  sd3pos: number,
): number {
  if (z > 3) {
    const gap = sd3pos - sd2pos;
    return gap > 0 ? 3 + (y - sd3pos) / gap : z;
  }
  if (z < -3) {
    const gap = sd2neg - sd3neg;
    return gap > 0 ? -3 + (y - sd3neg) / gap : z;
  }
  return z;
}

/** Normal CDF (Abramowitz & Stegun 26.2.17) → percentile 0–100. */
export function zToPercentile(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 50 * (1 + sign * y);
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Weight-for-age, WHO 0–60 months. Returns null outside that range. */
export function weightForAge(
  weightKg: number,
  ageMonths: number,
  sex: Sex,
): GrowthResult | null {
  const month = Math.floor(ageMonths);
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (month < 0 || month > GROWTH_MAX_MONTHS) return null;

  if (month > WHO_MAX_MONTHS) {
    const row = iapRowAt(sex === "male" ? IAP_WEIGHT_BOYS : IAP_WEIGHT_GIRLS, month / 12);
    const pct = iapPercentile(weightKg, row);
    const z = (weightKg - row[4]) / row[8];
    let classification: string;
    let band: GrowthResult["band"];
    if (z < -3) {
      classification = "Severely underweight (far below the 3rd IAP centile)";
      band = "alert";
    } else if (pct < 3) {
      classification = "Underweight (below the 3rd IAP centile)";
      band = "caution";
    } else if (pct <= 97) {
      classification = "Normal weight for age";
      band = "normal";
    } else {
      classification = "Above the 97th IAP centile — assess with BMI";
      band = "caution";
    }
    return {
      z: round(z, 2),
      percentile: round(pct, 1),
      median: row[4],
      reference: `Weight-for-age 5–18 y, ${IAP_REF}`,
      classification,
      band,
    };
  }

  const table = sex === "male" ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
  const [, l, m, s, sd3neg, sd2neg, sd2pos, sd3pos] = table[month];
  const z = whoTailCorrection(
    weightKg,
    lmsZ(weightKg, l, m, s),
    sd3neg,
    sd2neg,
    sd2pos,
    sd3pos,
  );

  let classification: string;
  let band: GrowthResult["band"];
  if (z < -3) {
    classification = "Severely underweight";
    band = "alert";
  } else if (z < -2) {
    classification = "Underweight";
    band = "caution";
  } else if (z <= 2) {
    classification = "Normal weight for age";
    band = "normal";
  } else {
    // WHO: high weight-for-age is not itself a diagnosis; assess with BMI.
    classification = "Above +2 SD — assess with weight-for-height / BMI";
    band = "caution";
  }

  return {
    z: round(z, 2),
    percentile: round(zToPercentile(z), 1),
    median: m,
    reference: "WHO Child Growth Standards, weight-for-age (0–5 y)",
    classification,
    band,
  };
}

/** Length/height-for-age, WHO 0–60 months. Returns null outside that range. */
export function heightForAge(
  heightCm: number,
  ageMonths: number,
  sex: Sex,
): GrowthResult | null {
  const month = Math.floor(ageMonths);
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  if (month < 0 || month > GROWTH_MAX_MONTHS) return null;

  if (month > WHO_MAX_MONTHS) {
    const row = iapRowAt(sex === "male" ? IAP_HEIGHT_BOYS : IAP_HEIGHT_GIRLS, month / 12);
    const pct = iapPercentile(heightCm, row);
    const z = (heightCm - row[4]) / row[8];
    let classification: string;
    let band: GrowthResult["band"];
    if (z < -3) {
      classification = "Severely short (far below the 3rd IAP centile)";
      band = "alert";
    } else if (pct < 3) {
      classification = "Short stature (below the 3rd IAP centile) — evaluate";
      band = "caution";
    } else if (pct <= 97) {
      classification = "Normal height for age";
      band = "normal";
    } else {
      classification = "Above the 97th IAP centile — tall stature";
      band = "caution";
    }
    return {
      z: round(z, 2),
      percentile: round(pct, 1),
      median: row[4],
      reference: `Height-for-age 5–18 y, ${IAP_REF}`,
      measurement: "Height (standing)",
      classification,
      band,
    };
  }

  const table = sex === "male" ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
  const [, l, m, s] = table[month];
  const z = lmsZ(heightCm, l, m, s); // no tail correction for height-for-age

  let classification: string;
  let band: GrowthResult["band"];
  if (z < -3) {
    classification = "Severely stunted";
    band = "alert";
  } else if (z < -2) {
    classification = "Stunted";
    band = "caution";
  } else if (z <= 3) {
    classification = "Normal height for age";
    band = "normal";
  } else {
    classification = "Very tall — consider endocrine review if unexpected";
    band = "caution";
  }

  return {
    z: round(z, 2),
    percentile: round(zToPercentile(z), 1),
    median: m,
    reference: "WHO Child Growth Standards, length/height-for-age (0–5 y)",
    measurement:
      month < STANDING_HEIGHT_FROM_MONTH
        ? "Length (lying)"
        : "Height (standing)",
    classification,
    band,
  };
}

/**
 * Where the child sits on the printed chart's centile lines
 * (3rd, 10th, 25th, 50th, 75th, 90th, 97th — the IAP/clinic-chart line set).
 */
export function centileBandLabel(percentile: number): string {
  const lines = [3, 10, 25, 50, 75, 90, 97];
  const ord = (n: number) => (n === 3 ? "3rd" : `${n}th`);
  for (const line of lines) {
    if (Math.abs(percentile - line) < 0.5) return `on the ${ord(line)} centile line`;
  }
  if (percentile < 3) return "below the 3rd centile line";
  if (percentile > 97) return "above the 97th centile line";
  for (let i = 0; i < lines.length - 1; i++) {
    if (percentile > lines[i] && percentile < lines[i + 1]) {
      return `between the ${ord(lines[i])} and ${ord(lines[i + 1])} centile lines`;
    }
  }
  return "";
}

/**
 * Position against the chart's marked z-lines (−3, −2, −1, 0, +1, +2, +3),
 * e.g. "between the −2 and −1 SD lines".
 */
export function zBandLabel(z: number): string {
  const lines = [-3, -2, -1, 0, 1, 2, 3];
  const name = (n: number) => `${n}`.replace("-", "\u2212");
  for (const line of lines) {
    if (Math.abs(z - line) < 0.05) return `on the ${name(line)} SD line`;
  }
  if (z < -3) return "below the −3 SD line";
  if (z > 3) return "above the 3 SD line";
  for (let i = 0; i < lines.length - 1; i++) {
    if (z > lines[i] && z < lines[i + 1]) {
      return `between the ${name(lines[i])} and ${name(lines[i + 1])} SD lines`;
    }
  }
  return "";
}

/** Compact z form for the stat tile: "0", "−2 to −1", "<−3", ">3". */
export function zBandCompact(z: number): string {
  const lines = [-3, -2, -1, 0, 1, 2, 3];
  const name = (n: number) => `${n}`.replace("-", "\u2212");
  for (const line of lines) {
    if (Math.abs(z - line) < 0.05) return name(line);
  }
  if (z < -3) return "<−3";
  if (z > 3) return ">3";
  for (let i = 0; i < lines.length - 1; i++) {
    if (z > lines[i] && z < lines[i + 1]) return `${name(lines[i])} to ${name(lines[i + 1])}`;
  }
  return "";
}

/** Compact form for the stat tile: "50th", "10th–25th", "<3rd", ">97th". */
export function centileBandCompact(percentile: number): string {
  const lines = [3, 10, 25, 50, 75, 90, 97];
  const ord = (n: number) => (n === 3 ? "3rd" : `${n}th`);
  for (const line of lines) {
    if (Math.abs(percentile - line) < 0.5) return ord(line);
  }
  if (percentile < 3) return "<3rd";
  if (percentile > 97) return ">97th";
  for (let i = 0; i < lines.length - 1; i++) {
    if (percentile > lines[i] && percentile < lines[i + 1]) {
      return `${ord(lines[i])}–${ord(lines[i + 1])}`;
    }
  }
  return "";
}

/** Years + months → total completed months. */
export function toMonths(years: number, months: number): number {
  return (Number(years) || 0) * 12 + (Number(months) || 0);
}
