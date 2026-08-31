/**
 * Builders that turn the real reference tables into chart curves with the
 * patient marked. Rule: WHO standards under 5 years, IAP 2015 from 5 years
 * (head circumference is WHO 0-5 y only; BMI uses WHO 2006/2007 across 0-19 y
 * with the IAP adult-equivalent interpretation noted in the BMI tool).
 */
import type { ChartSpec } from "../components/CentileChart";
import {
  lmsValueAtZ,
  percentileToZ,
  whoLmsRow,
  type Sex,
} from "./growthMath";
import {
  IAP_HEIGHT_BOYS,
  IAP_HEIGHT_GIRLS,
  IAP_WEIGHT_BOYS,
  IAP_WEIGHT_GIRLS,
  type IapRow,
} from "../data/iapGrowthReference";
import { WHO_BMI_BOYS, WHO_BMI_GIRLS } from "../data/whoBmiReference";

const WHO_CENTILES = [3, 15, 50, 85, 97];
const ord = (p: number) => (p === 3 ? "3rd" : `${p}th`);
const IAP_COLS: { label: string; idx: number }[] = [
  { label: "3rd", idx: 1 },
  { label: "10th", idx: 2 },
  { label: "25th", idx: 3 },
  { label: "50th", idx: 4 },
  { label: "75th", idx: 5 },
  { label: "90th", idx: 6 },
  { label: "97th", idx: 7 },
];

const sexWord = (s: Sex) => (s === "male" ? "boys" : "girls");

function monthTicks(): { at: number; label: string }[] {
  return [0, 12, 24, 36, 48, 60].map((m) => ({ at: m, label: m === 0 ? "0" : `${m / 12}y` }));
}

export function whoChartSpec(
  kind: "weight" | "height" | "hc",
  sex: Sex,
  ageMonths: number,
  value: number,
  caption: string,
): ChartSpec {
  const curves = WHO_CENTILES.map((p) => {
    const z = percentileToZ(p);
    const pts: [number, number][] = [];
    for (let m = 0; m <= 60; m += 2) {
      const [l, mm, s] = whoLmsRow(kind, sex, m);
      pts.push([m, lmsValueAtZ(l, mm, s, z)]);
    }
    return { label: ord(p), pts };
  });
  const titles = {
    weight: "Weight-for-age",
    height: "Length/height-for-age",
    hc: "Head circumference-for-age",
  } as const;
  return {
    title: `${titles[kind]} — WHO 0–5 y (${sexWord(sex)})`,
    yUnit: kind === "weight" ? "kg" : "cm",
    xLabel: "Age",
    curves,
    patient: { x: Math.min(ageMonths, 60), y: value, caption },
    xTicks: monthTicks(),
    refNote: "Curves computed from the WHO Child Growth Standards LMS tables (3rd/15th/50th/85th/97th centiles).",
  };
}

export function iapChartSpec(
  kind: "weight" | "height",
  sex: Sex,
  ageYears: number,
  value: number,
  caption: string,
): ChartSpec {
  const table: IapRow[] =
    kind === "height"
      ? sex === "male" ? IAP_HEIGHT_BOYS : IAP_HEIGHT_GIRLS
      : sex === "male" ? IAP_WEIGHT_BOYS : IAP_WEIGHT_GIRLS;
  const curves = IAP_COLS.map((c) => ({
    label: c.label,
    pts: table.map((r) => [r[0], r[c.idx]] as [number, number]),
  }));
  return {
    title: `${kind === "height" ? "Height" : "Weight"}-for-age — IAP 2015, 5–18 y (${sexWord(sex)})`,
    yUnit: kind === "weight" ? "kg" : "cm",
    xLabel: "Age (years)",
    curves,
    patient: { x: Math.min(Math.max(ageYears, 5), 18), y: value, caption },
    xTicks: [5, 8, 11, 14, 18].map((y) => ({ at: y, label: `${y}y` })),
    refNote: "Curves plotted directly from the IAP 2015 revised growth reference tables (Khadilkar et al., Indian Pediatrics 2015).",
  };
}

export function whoBmiChartSpec(
  sex: Sex,
  ageMonths: number,
  bmi: number,
  caption: string,
): ChartSpec {
  const table = sex === "male" ? WHO_BMI_BOYS : WHO_BMI_GIRLS;
  const under5 = ageMonths <= 60;
  const [from, to, step] = under5 ? [0, 60, 2] : [61, 228, 4];
  const curves = WHO_CENTILES.map((p) => {
    const z = percentileToZ(p);
    const pts: [number, number][] = [];
    for (let m = from; m <= to; m += step) {
      const row = table[Math.min(m, 228)];
      pts.push([m, lmsValueAtZ(row[1], row[2], row[3], z)]);
    }
    return { label: ord(p), pts };
  });
  return {
    title: `BMI-for-age — ${under5 ? "WHO 0–5 y" : "WHO 5–19 y"} (${sexWord(sex)})`,
    yUnit: "kg/m²",
    xLabel: "Age",
    curves,
    patient: { x: Math.min(Math.max(ageMonths, from), to), y: bmi, caption },
    xTicks: under5
      ? monthTicks()
      : [61, 96, 132, 168, 204, 228].map((m) => ({ at: m, label: `${Math.round(m / 12)}y` })),
    refNote: under5
      ? "Curves from the WHO 2006 Child Growth Standards BMI-for-age LMS tables."
      : "Curves from the WHO 2007 growth reference (5–19 y) BMI-for-age LMS tables.",
  };
}

/** Child BMI z-score/centile from the WHO 0-19 y tables. */
export function childBmiAssess(sex: Sex, ageMonths: number, bmi: number) {
  const table = sex === "male" ? WHO_BMI_BOYS : WHO_BMI_GIRLS;
  const m = Math.min(Math.max(Math.floor(ageMonths), 0), 228);
  const row = table[m];
  const l = row[1], mm = row[2], s = row[3];
  const z = l === 0 ? Math.log(bmi / mm) / s : (Math.pow(bmi / mm, l) - 1) / (l * s);
  const under5 = m <= 60;
  // WHO cutoffs: under 5 — overweight > +2, obese > +3, wasted < -2;
  // 5-19 y — overweight > +1, obese > +2, thin < -2.
  let label: string;
  let band: "normal" | "caution" | "alert";
  if (z < -3) { label = under5 ? "Severely wasted (< −3 SD)" : "Severe thinness (< −3 SD)"; band = "alert"; }
  else if (z < -2) { label = under5 ? "Wasted (< −2 SD)" : "Thinness (< −2 SD)"; band = "caution"; }
  else if (under5 ? z <= 2 : z <= 1) { label = "Normal BMI for age"; band = "normal"; }
  else if (under5 ? z <= 3 : z <= 2) { label = under5 ? "At risk / overweight (> +2 SD)" : "Overweight (> +1 SD)"; band = "caution"; }
  else { label = "Obesity for age"; band = "alert"; }
  return { z: Math.round(z * 100) / 100, label, band, median: mm };
}
