/**
 * Pediatric renal assessment for the dose calculator.
 *
 * - Age-group serum creatinine upper limits follow the Harriet Lane normal
 *   values: what is "normal" in an adolescent is renal failure in a toddler.
 * - eGFR uses the bedside Schwartz equation (2009): 0.413 × height(cm) / SCr.
 * - Per-drug guidance uses Harriet Lane-style GFR bands
 *   (>50 / 30–50 / 10–29 / <10 mL/min/1.73 m²).
 */

export type PedRenalBand = { minGfr: number; maxGfr?: number; action: string };

/** Upper limit of normal serum creatinine (mg/dL) for age. */
export function creatinineUpperLimitForAge(ageDays: number): {
  limit: number;
  ageGroup: string;
  note?: string;
} {
  if (ageDays < 28)
    return {
      limit: 1.0,
      ageGroup: "neonate",
      note: "Neonatal creatinine reflects the mother's for the first days and falls over 1–2 weeks — trend matters more than one value.",
    };
  if (ageDays < 365 * 2) return { limit: 0.4, ageGroup: "infant (1 mo – 2 y)" };
  if (ageDays < 365 * 13) return { limit: 0.7, ageGroup: "child (2 – 12 y)" };
  return { limit: 1.0, ageGroup: "adolescent" };
}

/** Bedside Schwartz 2009. Returns mL/min/1.73 m². */
export function schwartzEgfr(heightCm: number, creatinineMgDl: number): number | null {
  if (!(heightCm > 0) || !(creatinineMgDl > 0)) return null;
  return Math.round(((0.413 * heightCm) / creatinineMgDl) * 10) / 10;
}

export function gfrStage(gfr: number): { label: string; band: "normal" | "caution" | "alert" } {
  if (gfr >= 90) return { label: "Normal GFR (≥ 90)", band: "normal" };
  if (gfr >= 60) return { label: "Mildly reduced (60–89)", band: "normal" };
  if (gfr >= 30) return { label: "Moderately reduced (30–59) — adjust renally cleared drugs", band: "caution" };
  if (gfr >= 15) return { label: "Severely reduced (15–29) — adjust doses, nephrology input", band: "alert" };
  return { label: "Kidney failure (< 15) — specialist dosing only", band: "alert" };
}

/** Harriet Lane-style GFR band actions for the renally cleared pediatric drugs. */
export const PED_RENAL_BANDS: Record<string, PedRenalBand[]> = {
  amox_po: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 10, maxGfr: 29, action: "Give the usual dose q12h (drop to 2 doses/day)." },
    { minGfr: 0, maxGfr: 9, action: "Usual dose q24h." },
  ],
  amox_clav_po: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 10, maxGfr: 29, action: "Amoxicillin component q12h; avoid high-dose regimens." },
    { minGfr: 0, maxGfr: 9, action: "Amoxicillin component q24h." },
  ],
  cephalexin_po: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 10, maxGfr: 49, action: "Usual dose q8–12h instead of q6h." },
    { minGfr: 0, maxGfr: 9, action: "Usual dose q12–24h." },
  ],
  cefixime_po: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 20, maxGfr: 49, action: "75% of the daily dose." },
    { minGfr: 0, maxGfr: 19, action: "HALF the daily dose." },
  ],
  cefpodoxime_po: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 0, maxGfr: 29, action: "Usual dose q24h (once daily)." },
  ],
  cefuroxime_po: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 10, maxGfr: 29, action: "Usual dose q12h max; consider q24h at the lower end." },
    { minGfr: 0, maxGfr: 9, action: "Usual dose q24h." },
  ],
  cotrimoxazole_po: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 15, maxGfr: 29, action: "HALF dose after the first 3 days; watch K+." },
    { minGfr: 0, maxGfr: 14, action: "Avoid unless no alternative (specialist dosing)." },
  ],
  nitrofurantoin: [
    { minGfr: 60, action: "Normal dosing for uncomplicated UTI." },
    { minGfr: 0, maxGfr: 59, action: "AVOID — poor urine levels and toxicity in renal impairment." },
  ],
  metronidazole_po: [
    { minGfr: 10, action: "Normal dosing." },
    { minGfr: 0, maxGfr: 9, action: "HALF dose or q12–24h; watch for neurotoxicity." },
  ],
  acyclovir_po: [
    { minGfr: 25, action: "Normal oral dosing; keep well hydrated." },
    { minGfr: 10, maxGfr: 24, action: "Same dose q8h max (3 doses/day) instead of 4–5." },
    { minGfr: 0, maxGfr: 9, action: "HALF dose q12h." },
  ],
  valacyclovir_po: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 30, maxGfr: 49, action: "Usual dose q12h." },
    { minGfr: 10, maxGfr: 29, action: "Usual dose q24h." },
    { minGfr: 0, maxGfr: 9, action: "HALF dose q24h." },
  ],
  oseltamivir_po: [
    { minGfr: 60, action: "Normal weight-band dosing." },
    { minGfr: 30, maxGfr: 59, action: "HALF the dose, still twice daily." },
    { minGfr: 10, maxGfr: 29, action: "Half dose ONCE daily." },
    { minGfr: 0, maxGfr: 9, action: "Not recommended off dialysis." },
  ],
  fluconazole_po: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 0, maxGfr: 49, action: "Usual first dose, then HALF all further doses." },
  ],
  ampicillin_iv: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 10, maxGfr: 29, action: "Usual dose q8h instead of q6h." },
    { minGfr: 0, maxGfr: 9, action: "Usual dose q12h." },
  ],
  cefotaxime_iv: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 10, maxGfr: 29, action: "Usual dose q8–12h." },
    { minGfr: 0, maxGfr: 9, action: "HALF dose q12h." },
  ],
  ceftriaxone_iv: [
    { minGfr: 10, action: "No renal adjustment needed." },
    { minGfr: 0, maxGfr: 9, action: "Max 2 g/day; no other change." },
  ],
  meropenem_iv: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 25, maxGfr: 49, action: "Usual dose q12h instead of q8h." },
    { minGfr: 10, maxGfr: 24, action: "HALF dose q12h." },
    { minGfr: 0, maxGfr: 9, action: "HALF dose q24h." },
  ],
  piptaz_iv: [
    { minGfr: 40, action: "Normal dosing." },
    { minGfr: 20, maxGfr: 39, action: "Usual dose q8h." },
    { minGfr: 0, maxGfr: 19, action: "Usual dose q12h." },
  ],
  vancomycin_iv: [
    { minGfr: 50, action: "Normal dosing with troughs before the 4th dose." },
    { minGfr: 30, maxGfr: 49, action: "Usual dose q12–24h, trough-guided." },
    { minGfr: 0, maxGfr: 29, action: "Single dose then re-dose by levels only." },
  ],
  gentamicin_iv: [
    { minGfr: 60, action: "Once-daily dosing with monitoring on courses > 5 days." },
    { minGfr: 30, maxGfr: 59, action: "Extend interval to q36–48h; levels mandatory." },
    { minGfr: 0, maxGfr: 29, action: "Avoid, or dose by levels only." },
  ],
  amikacin_iv: [
    { minGfr: 60, action: "Once-daily dosing with monitoring on longer courses." },
    { minGfr: 30, maxGfr: 59, action: "Extend interval to q36–48h; levels mandatory." },
    { minGfr: 0, maxGfr: 29, action: "Avoid, or dose by levels only." },
  ],
  linezolid_po: [{ minGfr: 0, action: "No renal adjustment; watch platelets on courses > 2 weeks." }],
  azithromycin_po: [{ minGfr: 0, action: "No renal adjustment needed." }],
  clarithromycin_po: [
    { minGfr: 30, action: "Normal dosing." },
    { minGfr: 0, maxGfr: 29, action: "HALF the dose." }
  ],
  levetiracetam: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 30, maxGfr: 49, action: "Give ~two-thirds of the usual dose." },
    { minGfr: 0, maxGfr: 29, action: "HALF dose; post-dialysis top-up if dialysed." },
  ],
  famotidine_po: [
    { minGfr: 50, action: "Normal dosing." },
    { minGfr: 0, maxGfr: 49, action: "HALF dose or alternate-day dosing." },
  ],
};

export function pedRenalAction(drugId: string, gfr: number): string | null {
  const bands = PED_RENAL_BANDS[drugId];
  if (!bands) return null;
  for (const b of bands) {
    if (gfr >= b.minGfr && gfr <= (b.maxGfr ?? Infinity)) return b.action;
  }
  return bands[0].action;
}
