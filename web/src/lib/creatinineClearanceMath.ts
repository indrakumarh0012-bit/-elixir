/** Cockcroft–Gault helpers (pure — used by UI + stress tests). */

export function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

export function dosingWeightKg(
  abwKg: number,
  heightCm: number | null,
  isFemale: boolean,
): { weight: number; basis: string; ibw: number | null; ajbw: number | null } {
  const abw = Number.isFinite(abwKg) && abwKg > 0 ? abwKg : 0;
  if (!heightCm || heightCm <= 0 || !Number.isFinite(heightCm)) {
    return { weight: abw, basis: "ABW", ibw: null, ajbw: null };
  }
  const heightIn = heightCm / 2.54;
  const ibw = isFemale
    ? 45.5 + 2.3 * Math.max(heightIn - 60, 0)
    : 50 + 2.3 * Math.max(heightIn - 60, 0);
  if (abw > ibw * 1.2) {
    const ajbw = ibw + 0.4 * (abw - ibw);
    return { weight: ajbw, basis: "AjBW", ibw: round1(ibw), ajbw: round1(ajbw) };
  }
  if (abw > 0 && abw < ibw) {
    return { weight: abw, basis: "ABW (under IBW)", ibw: round1(ibw), ajbw: null };
  }
  return { weight: abw, basis: "ABW", ibw: round1(ibw), ajbw: null };
}

export type CrClInput = {
  sex: "Male" | "Female";
  ageYears: number;
  weightKg: number;
  heightCm: number | null;
  creatinine: number;
  unit: "mg/dL" | "µmol/L";
};

export type CrClResult = {
  crCl: number;
  weightUsed: number;
  basis: string;
  ibw: number | null;
  ajbw: number | null;
  genderFactor: number;
  valid: boolean;
  errors: string[];
};

/** Estimate CrCl (mL/min). Returns valid:false for impossible inputs. */
export function estimateCrCl(input: CrClInput): CrClResult {
  const errors: string[] = [];
  const { sex, unit } = input;
  const age = Number(input.ageYears);
  const weight = Number(input.weightKg);
  const creat = Number(input.creatinine);
  const height =
    input.heightCm != null && Number.isFinite(input.heightCm)
      ? Number(input.heightCm)
      : null;

  if (!Number.isFinite(age) || age <= 0) errors.push("Age must be > 0");
  if (!Number.isFinite(weight) || weight <= 0) errors.push("Weight must be > 0");
  if (!Number.isFinite(creat) || creat <= 0) {
    errors.push("Creatinine must be > 0");
  }
  if (age > 120) errors.push("Age unrealistically high");
  if (weight > 400) errors.push("Weight unrealistically high");
  if (unit === "mg/dL" && creat > 30) errors.push("Creatinine (mg/dL) unusually high");
  if (unit === "µmol/L" && creat > 3000) {
    errors.push("Creatinine (µmol/L) unusually high");
  }

  const isFemale = sex === "Female";
  const { weight: wt, basis, ibw, ajbw } = dosingWeightKg(
    weight,
    height && height > 0 ? height : null,
    isFemale,
  );
  const genderFactor = isFemale ? 0.85 : 1.0;

  let crCl = 0;
  if (errors.length === 0 && creat > 0 && age > 0 && wt > 0) {
    if (unit === "µmol/L") {
      const k = isFemale ? 1.04 : 1.23;
      crCl = ((140 - age) * wt * k) / creat;
    } else {
      crCl = (((140 - age) * wt) / (72 * creat)) * genderFactor;
    }
  }

  if (Number.isFinite(crCl) && crCl < 0) {
    errors.push("CrCl negative — check age (must be < 140)");
    crCl = 0;
  }

  return {
    crCl: round1(crCl),
    weightUsed: round1(wt),
    basis,
    ibw,
    ajbw,
    genderFactor,
    valid: errors.length === 0 && Number.isFinite(crCl),
    errors,
  };
}
