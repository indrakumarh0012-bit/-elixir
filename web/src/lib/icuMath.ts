/**
 * ICU / ward titration math.
 *
 * Infusion: mL/h = dose(mcg/kg/min) × weight(kg) × 60 ÷ concentration(mcg/mL).
 * Fluids: adult 25–30 mL/kg/day; children Holliday–Segar (100/50/20) with the
 * standard restrictions for heart failure/SIADH (two-thirds) and oligo-anuric
 * renal failure (insensible ≈ 30–40% of maintenance + urine replacement).
 * Electrolytes: standard deficit formulas with pediatric doses alongside.
 */

export type VasoactiveDrug = {
  id: string;
  name: string;
  /** Usual dose range in the stated unit */
  doseMin: number;
  doseMax: number;
  doseUnit: "mcg/kg/min" | "mcg/kg/h" | "U/min" | "mg/kg/h";
  /** Standard syringe dilution */
  dilution: string;
  /** Final concentration, mcg/mL (or U/mL for vasopressin, mg/mL for midazolam) */
  concPerMl: number;
  titration: string;
  renalNote?: string;
  weightBased: boolean;
};

export const VASOACTIVES: VasoactiveDrug[] = [
  {
    id: "noradrenaline", name: "Noradrenaline (Norad)",
    doseMin: 0.05, doseMax: 1, doseUnit: "mcg/kg/min",
    dilution: "4 mg in 50 ml NS/D5 (80 mcg/ml)", concPerMl: 80,
    titration: "Start 0.05 mcg/kg/min; titrate every 5–10 min to MAP ≥ 65 (adults) / age-appropriate BP (children). First-line in septic shock. Central line preferred; extravasation → phentolamine.",
    weightBased: true,
  },
  {
    id: "adrenaline", name: "Adrenaline",
    doseMin: 0.05, doseMax: 1, doseUnit: "mcg/kg/min",
    dilution: "4 mg in 50 ml (80 mcg/ml)", concPerMl: 80,
    titration: "0.05–0.3 mcg/kg/min inotropy; higher = pressor. First-line in anaphylaxis and pediatric cold shock. Watch lactate/glucose (β-effects).",
    weightBased: true,
  },
  {
    id: "dopamine", name: "Dopamine",
    doseMin: 5, doseMax: 20, doseUnit: "mcg/kg/min",
    dilution: "200 mg in 50 ml (4000 mcg/ml)", concPerMl: 4000,
    titration: "5–10 inotropy, 10–20 pressor. More arrhythmogenic than noradrenaline — second-line where norad available.",
    weightBased: true,
  },
  {
    id: "dobutamine", name: "Dobutamine",
    doseMin: 5, doseMax: 20, doseUnit: "mcg/kg/min",
    dilution: "250 mg in 50 ml (5000 mcg/ml)", concPerMl: 5000,
    titration: "Inodilator for low-output states (cardiogenic shock, severe HF). May drop BP — pair with a pressor if MAP low.",
    weightBased: true,
  },
  {
    id: "vasopressin", name: "Vasopressin",
    doseMin: 0.01, doseMax: 0.04, doseUnit: "U/min",
    dilution: "20 U in 50 ml (0.4 U/ml)", concPerMl: 0.4,
    titration: "Fixed 0.01–0.04 U/min (NOT weight-based, adults) added to noradrenaline in refractory septic shock. Do not titrate like a catecholamine.",
    weightBased: false,
  },
  {
    id: "ntg", name: "Nitroglycerin (GTN)",
    doseMin: 0.5, doseMax: 5, doseUnit: "mcg/kg/min",
    dilution: "25 mg in 50 ml (500 mcg/ml)", concPerMl: 500,
    titration: "Start low, titrate to BP/symptoms in hypertensive emergency with pulmonary edema, or angina. Tachyphylaxis after 24–48 h; contraindicated with sildenafil/tadalafil.",
    weightBased: true,
  },
  {
    id: "milrinone", name: "Milrinone",
    doseMin: 0.25, doseMax: 0.75, doseUnit: "mcg/kg/min",
    dilution: "10 mg in 50 ml (200 mcg/ml)", concPerMl: 200,
    titration: "Inodilator (post-cardiac surgery, HF). Hypotension and arrhythmia; long half-life.",
    renalNote: "RENALLY CLEARED — CrCl < 50: reduce to 0.25–0.4 mcg/kg/min; accumulates in AKI.",
    weightBased: true,
  },
  {
    id: "fentanyl-inf", name: "Fentanyl infusion",
    doseMin: 1, doseMax: 3, doseUnit: "mcg/kg/h",
    dilution: "500 mcg in 50 ml (10 mcg/ml)", concPerMl: 10,
    titration: "Analgosedation 1–3 mcg/kg/h; safest opioid in renal failure. Assess with pain/sedation scores; daily interruption where feasible.",
    weightBased: true,
  },
  {
    id: "midazolam-inf", name: "Midazolam infusion",
    doseMin: 0.05, doseMax: 0.2, doseUnit: "mg/kg/h",
    dilution: "50 mg in 50 ml (1 mg/ml)", concPerMl: 1,
    titration: "Sedation 0.05–0.2 mg/kg/h; active metabolite accumulates in renal failure — expect delayed wake-up, use lowest dose or switch strategy.",
    renalNote: "Active metabolite accumulates in CKD/AKI — reduce and reassess daily.",
    weightBased: true,
  },
];

/** ml/h for a dose. Handles the three unit shapes. */
export function infusionRateMlPerHour(
  drug: VasoactiveDrug,
  dose: number,
  weightKg: number,
): number | null {
  if (!(dose > 0)) return null;
  if (drug.weightBased && !(weightKg > 0)) return null;
  let perHour: number; // in the same mass unit as concPerMl
  switch (drug.doseUnit) {
    case "mcg/kg/min": perHour = dose * weightKg * 60; break;
    case "mcg/kg/h": perHour = dose * weightKg; break;
    case "mg/kg/h": perHour = dose * weightKg; break;
    case "U/min": perHour = dose * 60; break;
  }
  return Math.round((perHour / drug.concPerMl) * 100) / 100;
}

// ---------------- Fluids ----------------

/** Holliday–Segar daily maintenance (ml/day) and hourly 4-2-1 (ml/h). */
export function pedMaintenanceFluids(weightKg: number): { daily: number; hourly: number } | null {
  if (!(weightKg > 0)) return null;
  let daily: number;
  let hourly: number;
  if (weightKg <= 10) { daily = 100 * weightKg; hourly = 4 * weightKg; }
  else if (weightKg <= 20) { daily = 1000 + 50 * (weightKg - 10); hourly = 40 + 2 * (weightKg - 10); }
  else { daily = 1500 + 20 * (weightKg - 20); hourly = 60 + 1 * (weightKg - 20); }
  return { daily: Math.min(Math.round(daily), 2400), hourly: Math.round(hourly * 10) / 10 };
}

export function adultMaintenanceFluids(weightKg: number): { low: number; high: number } | null {
  if (!(weightKg > 0)) return null;
  return { low: Math.round(25 * weightKg), high: Math.round(30 * weightKg) };
}

export type FluidPlan = {
  label: string;
  dailyMl: number | string;
  note: string;
};

/** Restricted plans from a maintenance figure. */
export function restrictedFluidPlans(maintenanceDaily: number): FluidPlan[] {
  return [
    {
      label: "Heart failure / SIADH / meningitis",
      dailyMl: Math.round(maintenanceDaily * (2 / 3)),
      note: "Two-thirds maintenance; isotonic fluid; daily weight and Na+.",
    },
    {
      label: "Oligo-anuric renal failure (AKI/CKD)",
      dailyMl: `${Math.round(maintenanceDaily * 0.3)}–${Math.round(maintenanceDaily * 0.4)} + urine output`,
      note: "Insensible losses only (≈ 30–40% of maintenance, ≈ 400 ml/m²/day) PLUS ml-for-ml urine replacement; reassess with strict intake–output charting.",
    },
    {
      label: "DKA (pediatric caution)",
      dailyMl: "10 ml/kg NS over 1 h first",
      note: "Then deficit + maintenance over 48 h; never bolus insulin; fall in sensorium = suspect cerebral edema → 3% NaCl 3–5 ml/kg.",
    },
  ];
}

// ---------------- Electrolytes ----------------

/** Total body water fraction. */
function tbwFactor(sex: "male" | "female", pediatric: boolean): number {
  if (pediatric) return 0.6;
  return sex === "male" ? 0.6 : 0.5;
}

/** mEq needed to raise serum Na to target (symptomatic hyponatremia). */
export function sodiumDeficit(
  weightKg: number, currentNa: number, targetNa: number,
  sex: "male" | "female" = "male", pediatric = false,
): number | null {
  if (!(weightKg > 0) || !(currentNa > 80) || targetNa <= currentNa) return null;
  return Math.round(tbwFactor(sex, pediatric) * weightKg * (targetNa - currentNa));
}

/** Litres of free water to correct hypernatremia. */
export function freeWaterDeficit(
  weightKg: number, currentNa: number,
  sex: "male" | "female" = "male", pediatric = false,
): number | null {
  if (!(weightKg > 0) || !(currentNa > 145)) return null;
  return Math.round(tbwFactor(sex, pediatric) * weightKg * (currentNa / 140 - 1) * 10) / 10;
}

/** Sodium corrected for hyperglycemia (Katz 1.6 per 100 mg/dL over 100). */
export function correctedNa(measuredNa: number, glucoseMgDl: number): number {
  return Math.round((measuredNa + 1.6 * Math.max(0, glucoseMgDl - 100) / 100) * 10) / 10;
}

/** Calcium corrected for albumin. */
export function correctedCa(measuredCa: number, albuminGdl: number): number {
  return Math.round((measuredCa + 0.8 * (4 - albuminGdl)) * 10) / 10;
}
