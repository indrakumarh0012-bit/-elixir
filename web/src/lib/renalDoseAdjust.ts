import { drugsDB } from "../clinical/clinicalData";
import type { DrugRecord } from "../clinical/types";

export type RenalDoseBand = {
  minCrCl: number;
  maxCrCl?: number;
  action: string;
};

export type RenalDoseReport = {
  drug: DrugRecord;
  crCl: number;
  adjustmentRequired: boolean;
  urgency: "none" | "caution" | "adjust" | "avoid";
  standardDose: string;
  bands: RenalDoseBand[];
  recommendations: string[];
};

/** CrCl-band dosing detail for high-use antibiotics and renally cleared drugs. */
const RENAL_DOSE_BANDS: Record<string, RenalDoseBand[]> = {
  amoxicillin: [
    { minCrCl: 30, action: "250–500 mg PO TID or 875 mg PO BID — standard adult dose." },
    { minCrCl: 10, maxCrCl: 29, action: "250–500 mg PO q12h (extend interval)." },
    { minCrCl: 0, maxCrCl: 9, action: "250 mg PO q24h or avoid unless benefit outweighs risk; consider alternative." },
  ],
  "amoxicillin-clavulanate": [
    { minCrCl: 30, action: "625 mg PO TID or 1 g PO BID — standard regimen." },
    { minCrCl: 10, maxCrCl: 29, action: "625 mg PO q12h; avoid high-dose 2 g BID preparations." },
    { minCrCl: 0, maxCrCl: 9, action: "625 mg PO q24h; monitor LFTs (clavulanate hepatotoxicity risk)." },
  ],
  azithromycin: [
    { minCrCl: 10, action: "500 mg day 1 then 250 mg daily × 4 days — no routine adjustment if CrCl ≥ 10." },
    { minCrCl: 0, maxCrCl: 9, action: "Use with caution; consider alternative macrolide or dose per local protocol." },
  ],
  cefalexin: [
    { minCrCl: 50, action: "250–500 mg PO QID — standard dose." },
    { minCrCl: 10, maxCrCl: 49, action: "250–500 mg PO q12–24h depending on severity." },
    { minCrCl: 0, maxCrCl: 9, action: "250 mg PO q24h; monitor for neurotoxicity if accumulation." },
  ],
  cefuroxime: [
    { minCrCl: 30, action: "250–500 mg PO BID — standard oral dose." },
    { minCrCl: 10, maxCrCl: 29, action: "250 mg PO q12h." },
    { minCrCl: 0, maxCrCl: 9, action: "250 mg PO q24h." },
  ],
  cefixime: [
    { minCrCl: 50, action: "400 mg PO daily or 200 mg PO BID." },
    { minCrCl: 20, maxCrCl: 49, action: "300 mg PO daily." },
    { minCrCl: 0, maxCrCl: 19, action: "200 mg PO daily." },
  ],
  ceftriaxone: [
    { minCrCl: 10, action: "1–2 g IV/IM daily (indication-dependent) — no adjustment if CrCl ≥ 10." },
    { minCrCl: 0, maxCrCl: 9, action: "Max 2 g daily; avoid calcium-containing IV fluids in neonates (precipitation risk)." },
  ],
  ciprofloxacin: [
    { minCrCl: 50, action: "250–500 mg PO BID or 400 mg IV q12h — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "250–500 mg PO q12h or 400 mg IV q12h." },
    { minCrCl: 0, maxCrCl: 29, action: "250 mg PO q18–24h or 200–400 mg IV q18–24h; avoid if alternatives exist (CNS/QT risk)." },
  ],
  levofloxacin: [
    { minCrCl: 50, action: "500–750 mg PO/IV daily — standard." },
    { minCrCl: 20, maxCrCl: 49, action: "500 mg PO/IV q48h (first dose 500 mg)." },
    { minCrCl: 0, maxCrCl: 19, action: "500 mg PO/IV q48h; avoid if possible (QT prolongation, tendon risk)." },
  ],
  metronidazole: [
    { minCrCl: 10, action: "400–500 mg PO TID or 500 mg IV q8h — standard." },
    { minCrCl: 0, maxCrCl: 9, action: "Extend interval to q12–24h; monitor for neurotoxicity with accumulation." },
  ],
  nitrofurantoin: [
    { minCrCl: 60, action: "100 mg PO BID × 5–7 days — effective for uncomplicated UTI." },
    { minCrCl: 0, maxCrCl: 59, action: "Avoid — inadequate urinary concentration and toxicity risk in CKD." },
  ],
  doxycycline: [
    { minCrCl: 0, action: "100 mg PO BID day 1 then 100 mg daily — minimal renal adjustment; preferred tetracycline in CKD." },
  ],
  vancomycin: [
    { minCrCl: 80, action: "15–20 mg/kg IV q12h loading; target trough 10–20 mg/L (15–20 for serious infections)." },
    { minCrCl: 50, maxCrCl: 79, action: "15–20 mg/kg IV q12–24h; check trough before 4th dose." },
    { minCrCl: 30, maxCrCl: 49, action: "15 mg/kg IV q24–48h; mandatory trough-guided dosing." },
    { minCrCl: 0, maxCrCl: 29, action: "15 mg/kg IV q48–72h or per dialysis protocol; nephrotoxicity monitoring essential." },
  ],
  gentamicin: [
    { minCrCl: 60, action: "5–7 mg/kg IV q24h (extended-interval) or per local once-daily protocol." },
    { minCrCl: 40, maxCrCl: 59, action: "Extend interval to q36–48h; check levels." },
    { minCrCl: 20, maxCrCl: 39, action: "q48h dosing; pre-dose trough < 1 mg/L, peak per protocol." },
    { minCrCl: 0, maxCrCl: 19, action: "Avoid or use dialysis dosing with level monitoring; high nephro/ototoxicity risk." },
  ],
  "piperacillin-tazobactam": [
    { minCrCl: 40, action: "4.5 g IV q6h — standard." },
    { minCrCl: 20, maxCrCl: 39, action: "4.5 g IV q8h." },
    { minCrCl: 0, maxCrCl: 19, action: "4.5 g IV q12h; extend interval further if on dialysis." },
  ],
  meropenem: [
    { minCrCl: 50, action: "1 g IV q8h — standard." },
    { minCrCl: 25, maxCrCl: 49, action: "1 g IV q12h." },
    { minCrCl: 10, maxCrCl: 24, action: "500 mg IV q12h." },
    { minCrCl: 0, maxCrCl: 9, action: "500 mg IV q24h or per dialysis protocol." },
  ],
  linezolid: [
    { minCrCl: 30, action: "600 mg PO/IV q12h — standard; no routine adjustment." },
    { minCrCl: 0, maxCrCl: 29, action: "600 mg q12h with caution; monitor platelets and serotonin syndrome risk." },
  ],
};

function urgencyFor(crCl: number, limit?: number): RenalDoseReport["urgency"] {
  if (limit == null) return "none";
  if (crCl >= limit) return "none";
  if (crCl >= limit * 0.5) return "caution";
  if (crCl >= 10) return "adjust";
  return "avoid";
}

function bandsForDrug(drug: DrugRecord): RenalDoseBand[] {
  if (RENAL_DOSE_BANDS[drug.id]) return RENAL_DOSE_BANDS[drug.id];
  const limit = drug.renalAdjustmentLimit;
  if (limit == null) return [];
  return [
    { minCrCl: limit, action: `Standard dose: ${drug.standardDose}` },
    {
      minCrCl: 10,
      maxCrCl: limit - 1,
      action: drug.renalNote ?? "Reduce dose or extend dosing interval.",
    },
    {
      minCrCl: 0,
      maxCrCl: 9,
      action: "Avoid or use dialysis-specific dosing; consult formulary.",
    },
  ];
}

function activeBand(bands: RenalDoseBand[], crCl: number): RenalDoseBand | null {
  for (const band of bands) {
    const max = band.maxCrCl ?? Number.POSITIVE_INFINITY;
    if (crCl >= band.minCrCl && crCl <= max) return band;
  }
  return bands[0] ?? null;
}

export function searchRenalDrugs(query: string): DrugRecord[] {
  const q = query.trim().toLowerCase();
  const renalDrugs = drugsDB.filter((d) => d.renalAdjustmentLimit != null);
  if (!q) return renalDrugs.slice(0, 40);
  return renalDrugs
    .filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.class.toLowerCase().includes(q) ||
        d.id.includes(q),
    )
    .slice(0, 40);
}

export function buildRenalDoseReport(drug: DrugRecord, crCl: number): RenalDoseReport {
  const bands = bandsForDrug(drug);
  const limit = drug.renalAdjustmentLimit;
  const adjustmentRequired = limit != null && crCl < limit;
  const urgency = urgencyFor(crCl, limit);
  const active = activeBand(bands, crCl);

  const recommendations: string[] = [];
  if (active) {
    recommendations.push(`At CrCl ${crCl} mL/min: ${active.action}`);
  }
  if (drug.renalNote && adjustmentRequired) {
    recommendations.push(drug.renalNote);
  }
  if (!adjustmentRequired && limit != null) {
    recommendations.push(
      `CrCl ≥ ${limit} mL/min — standard dosing generally acceptable: ${drug.standardDose}`,
    );
  }

  return {
    drug,
    crCl,
    adjustmentRequired,
    urgency,
    standardDose: drug.standardDose,
    bands,
    recommendations,
  };
}

export const URGENCY_STYLES: Record<
  RenalDoseReport["urgency"],
  { label: string; wrap: string; badge: string }
> = {
  none: {
    label: "No adjustment",
    wrap: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-700 text-white",
  },
  caution: {
    label: "Use caution",
    wrap: "border-amber-200 bg-amber-50",
    badge: "bg-amber-700 text-white",
  },
  adjust: {
    label: "Adjust dose / interval",
    wrap: "border-orange-200 bg-orange-50",
    badge: "bg-orange-700 text-white",
  },
  avoid: {
    label: "Avoid or specialist dosing",
    wrap: "border-rose-200 bg-rose-50",
    badge: "bg-rose-700 text-white",
  },
};
