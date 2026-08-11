import {
  dosesPerDayFromFrequency,
  mgToMl,
  type DrugFormulation,
  type PediatricDrug,
} from "../data/pediatricDrugs";

export type PedDoseInput = {
  weightKg: number;
  doseMgPerKgDay: number;
  frequency: string;
  drug: PediatricDrug;
  formulation: DrugFormulation | null;
};

export type PedDoseResult = {
  dailyMg: number;
  perDoseMg: number;
  volumeMl: number | null;
  capped: boolean;
  valid: boolean;
  errors: string[];
};

/** Shared pediatric daily / per-dose math used by UI + stress tests. */
export function calculatePediatricDose(input: PedDoseInput): PedDoseResult {
  const errors: string[] = [];
  const weight = Number(input.weightKg);
  const dose = Number(input.doseMgPerKgDay);
  const divisions = dosesPerDayFromFrequency(input.frequency) || 1;

  if (!Number.isFinite(weight) || weight <= 0) errors.push("Weight must be > 0");
  if (!Number.isFinite(dose) || dose < 0) errors.push("Dose mg/kg/day invalid");
  if (weight > 200) errors.push("Weight unrealistically high for pediatric calculator");
  if (!input.drug) errors.push("No drug selected");

  const rawDaily = weight > 0 && dose > 0 ? weight * dose : 0;
  const max = input.drug?.maxDosePerDayMg ?? 0;
  const cappedDaily = max > 0 ? Math.min(rawDaily, max) : rawDaily;
  const capped = max > 0 && rawDaily > max;
  const perDose = divisions > 0 ? cappedDaily / divisions : 0;

  let volumeMl: number | null = null;
  if (input.formulation && perDose > 0) {
    volumeMl = mgToMl(perDose, input.formulation);
    if (volumeMl != null && (!Number.isFinite(volumeMl) || volumeMl < 0)) {
      errors.push("Volume calculation failed");
      volumeMl = null;
    }
    if (volumeMl != null && volumeMl > 500) {
      errors.push("Volume > 500 ml/dose — check strength or dose");
    }
  }

  return {
    dailyMg: Math.round(cappedDaily * 100) / 100,
    perDoseMg: Math.round(perDose * 100) / 100,
    volumeMl:
      volumeMl == null ? null : Math.round(volumeMl * 1000) / 1000,
    capped,
    valid: errors.length === 0,
    errors,
  };
}
