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
  // ---- Antivirals ----
  "acyclovir-adult": [
    { minCrCl: 25, action: "Zoster: 800 mg PO 5×/day — standard. Keep well hydrated." },
    { minCrCl: 10, maxCrCl: 24, action: "800 mg PO q8h (reduce from 5 to 3 doses/day)." },
    { minCrCl: 0, maxCrCl: 9, action: "800 mg PO q12h (half frequency); IV needs specialist dosing." },
  ],
  valacyclovir: [
    { minCrCl: 50, action: "Zoster: 1 g PO TID — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "1 g PO q12h (two-thirds of standard)." },
    { minCrCl: 10, maxCrCl: 29, action: "1 g PO q24h (one-third of standard)." },
    { minCrCl: 0, maxCrCl: 9, action: "500 mg PO q24h (one-sixth); watch for confusion/hallucinations (accumulation neurotoxicity)." },
  ],
  famciclovir: [
    { minCrCl: 60, action: "Zoster: 500 mg PO TID — standard." },
    { minCrCl: 40, maxCrCl: 59, action: "500 mg PO q12h (two-thirds of standard daily dose)." },
    { minCrCl: 20, maxCrCl: 39, action: "500 mg PO q24h (one-third of standard)." },
    { minCrCl: 0, maxCrCl: 19, action: "250 mg PO q24h (one-sixth); after dialysis on dialysis days." },
  ],
  "oseltamivir-adult": [
    { minCrCl: 60, action: "75 mg PO BD × 5 days — standard." },
    { minCrCl: 31, maxCrCl: 59, action: "30 mg PO BD (reduce each dose to less than half)." },
    { minCrCl: 11, maxCrCl: 30, action: "30 mg PO once daily (quarter of standard daily dose)." },
    { minCrCl: 0, maxCrCl: 10, action: "Not recommended off dialysis; dialysis patients get per-session dosing." },
  ],
  // ---- Diabetes ----
  metformin: [
    { minCrCl: 60, action: "Up to 1 g BD — standard; no restriction." },
    { minCrCl: 45, maxCrCl: 59, action: "Continue current dose; recheck renal function 3–6 monthly." },
    { minCrCl: 30, maxCrCl: 44, action: "HALVE the dose (max 500 mg BD); do not start new; recheck every 3 months." },
    { minCrCl: 0, maxCrCl: 29, action: "STOP metformin — lactic acidosis risk. Switch (e.g., low-dose DPP-4 inhibitor / insulin)." },
  ],
  sitagliptin: [
    { minCrCl: 45, action: "100 mg PO daily — standard." },
    { minCrCl: 30, maxCrCl: 44, action: "50 mg PO daily (half dose)." },
    { minCrCl: 0, maxCrCl: 29, action: "25 mg PO daily (quarter dose); dialysis patients also 25 mg." },
  ],
  vildagliptin: [
    { minCrCl: 50, action: "50 mg PO BD — standard." },
    { minCrCl: 0, maxCrCl: 49, action: "50 mg PO once daily (half dose) at any lower CrCl including dialysis." },
  ],
  glimepiride: [
    { minCrCl: 60, action: "1–4 mg PO daily — standard; take with breakfast." },
    { minCrCl: 30, maxCrCl: 59, action: "Start 1 mg and titrate slowly — hypoglycemia lasts longer in CKD." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid — prolonged hypoglycemia; prefer linagliptin/teneligliptin (no adjustment) or insulin." },
  ],
  dapagliflozin: [
    { minCrCl: 45, action: "10 mg PO daily — full glycemic effect." },
    { minCrCl: 25, maxCrCl: 44, action: "May continue for heart/kidney protection but glucose-lowering is weak; do not initiate for glycemia alone." },
    { minCrCl: 0, maxCrCl: 24, action: "Do not initiate; continuation only per nephrology/cardiology indication." },
  ],
  empagliflozin: [
    { minCrCl: 45, action: "10–25 mg PO daily — standard." },
    { minCrCl: 20, maxCrCl: 44, action: "10 mg daily for cardio-renal indication; weak glycemic effect." },
    { minCrCl: 0, maxCrCl: 19, action: "Do not initiate." },
  ],
  // ---- Anticoagulants ----
  apixaban: [
    { minCrCl: 30, action: "5 mg PO BD; HALVE to 2.5 mg BD if any 2 of: age ≥ 80, weight ≤ 60 kg, creatinine ≥ 1.5 mg/dL." },
    { minCrCl: 15, maxCrCl: 29, action: "2.5 mg PO BD (half dose)." },
    { minCrCl: 0, maxCrCl: 14, action: "Avoid — insufficient evidence; specialist decision only." },
  ],
  rivaroxaban: [
    { minCrCl: 50, action: "20 mg PO once daily WITH FOOD (AF dose)." },
    { minCrCl: 15, maxCrCl: 49, action: "15 mg PO once daily with food (reduced dose)." },
    { minCrCl: 0, maxCrCl: 14, action: "Avoid." },
  ],
  dabigatran: [
    { minCrCl: 50, action: "150 mg PO BD (110 mg BD if ≥ 80 y or high bleeding risk)." },
    { minCrCl: 30, maxCrCl: 49, action: "110 mg PO BD; check CrCl at least yearly." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid — accumulates; switch to warfarin or apixaban with specialist input." },
  ],
  warfarin: [
    { minCrCl: 0, action: "Dose by INR, not by CrCl — but bleeding risk rises in CKD; keep INR monitoring tighter (2-weekly)." },
  ],
  // ---- Cardiac ----
  digoxin: [
    { minCrCl: 60, action: "0.125–0.25 mg PO daily; in elderly max 0.125 mg (Beers)." },
    { minCrCl: 30, maxCrCl: 59, action: "0.125 mg daily (half the classic dose); check level after 1–2 weeks." },
    { minCrCl: 0, maxCrCl: 29, action: "0.125 mg alternate days or level-guided only; toxicity presents as nausea, vision change, arrhythmia." },
  ],
  spironolactone: [
    { minCrCl: 50, action: "25–50 mg PO daily — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "Max 25 mg daily (half ceiling); check K+ within 1 week of start/dose change." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid — hyperkalemia; if essential, 12.5–25 mg with close K+ monitoring." },
  ],
  enalapril: [
    { minCrCl: 30, action: "2.5–20 mg PO BD — standard; check creatinine + K+ 1–2 weeks after start." },
    { minCrCl: 10, maxCrCl: 29, action: "Start at 2.5 mg daily (half usual start); up-titrate slowly." },
    { minCrCl: 0, maxCrCl: 9, action: "Specialist dosing; a creatinine rise > 30% after start needs review." },
  ],
  atenolol: [
    { minCrCl: 35, action: "25–100 mg PO daily — standard." },
    { minCrCl: 15, maxCrCl: 34, action: "Max 50 mg daily (half)." },
    { minCrCl: 0, maxCrCl: 14, action: "Max 25 mg daily (quarter) — or switch to metoprolol (hepatically cleared)." },
  ],
  // ---- CNS ----
  gabapentin: [
    { minCrCl: 80, action: "300–1200 mg PO TID — standard range." },
    { minCrCl: 50, maxCrCl: 79, action: "Max ~600 mg TID (1800 mg/day)." },
    { minCrCl: 30, maxCrCl: 49, action: "Max ~300 mg TID (900 mg/day — about half)." },
    { minCrCl: 15, maxCrCl: 29, action: "Max 300 mg BD (600 mg/day)." },
    { minCrCl: 0, maxCrCl: 14, action: "300 mg once daily or less; sedation/dizziness = accumulation." },
  ],
  pregabalin: [
    { minCrCl: 60, action: "150–600 mg/day in 2–3 doses — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "HALVE: 75–300 mg/day." },
    { minCrCl: 15, maxCrCl: 29, action: "25–150 mg/day (quarter)." },
    { minCrCl: 0, maxCrCl: 14, action: "25–75 mg/day single dose." },
  ],
  levetiracetam: [
    { minCrCl: 80, action: "500–1500 mg PO BD — standard." },
    { minCrCl: 50, maxCrCl: 79, action: "500–1000 mg BD." },
    { minCrCl: 30, maxCrCl: 49, action: "250–750 mg BD (roughly half)." },
    { minCrCl: 0, maxCrCl: 29, action: "250–500 mg BD; post-dialysis supplement on dialysis days." },
  ],
  memantine: [
    { minCrCl: 30, action: "10 mg PO BD (after titration) — standard." },
    { minCrCl: 5, maxCrCl: 29, action: "5 mg PO BD (half maintenance)." },
    { minCrCl: 0, maxCrCl: 4, action: "Avoid — no data." },
  ],
  amantadine: [
    { minCrCl: 50, action: "100 mg PO daily–BD — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "100 mg once daily (half)." },
    { minCrCl: 15, maxCrCl: 29, action: "100 mg alternate days." },
    { minCrCl: 0, maxCrCl: 14, action: "Avoid — confusion, myoclonus with accumulation." },
  ],
  pramipexole: [
    { minCrCl: 50, action: "Standard TID titration." },
    { minCrCl: 35, maxCrCl: 49, action: "Give BD instead of TID (two-thirds)." },
    { minCrCl: 15, maxCrCl: 34, action: "Once daily (one-third)." },
    { minCrCl: 0, maxCrCl: 14, action: "Avoid." },
  ],
  duloxetine: [
    { minCrCl: 30, action: "20–60 mg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid — nausea and accumulation; choose sertraline (no renal adjustment) instead." },
  ],
  tramadol: [
    { minCrCl: 30, action: "50–100 mg PO q6h PRN, max 400 mg/day." },
    { minCrCl: 10, maxCrCl: 29, action: "Extend interval to q12h, max 200 mg/day (half); avoid extended-release forms." },
    { minCrCl: 0, maxCrCl: 9, action: "Avoid if possible; seizure and serotonin risk with accumulation." },
  ],
  // ---- Others ----
  allopurinol: [
    { minCrCl: 60, action: "100–300 mg PO daily titrated to urate — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "Start 100 mg daily; titrate slowly to urate target (max ~200 mg)." },
    { minCrCl: 0, maxCrCl: 29, action: "Start 50–100 mg alternate days–daily; slow titration (hypersensitivity risk rises with dose in CKD)." },
  ],
  colchicine: [
    { minCrCl: 50, action: "Acute gout: 1 mg then 0.5 mg after 1 h (max 1.5 mg/course modern low-dose). Prophylaxis 0.5 mg BD." },
    { minCrCl: 30, maxCrCl: 49, action: "Prophylaxis 0.5 mg once daily (half); avoid repeat acute courses within 14 days." },
    { minCrCl: 10, maxCrCl: 29, action: "0.5 mg alternate days; watch for diarrhoea/myopathy = toxicity." },
    { minCrCl: 0, maxCrCl: 9, action: "Avoid — fatal accumulation reported; never combine with clarithromycin." },
  ],
  cotrimoxazole: [
    { minCrCl: 30, action: "960 mg PO BD — standard." },
    { minCrCl: 15, maxCrCl: 29, action: "HALVE the dose after the first 3 days (480 mg BD); watch K+ (trimethoprim raises it)." },
    { minCrCl: 0, maxCrCl: 14, action: "Avoid unless no alternative (PCP treatment = specialist dosing)." },
  ],
  famotidine: [
    { minCrCl: 50, action: "20–40 mg PO HS — standard." },
    { minCrCl: 0, maxCrCl: 49, action: "HALVE: 20 mg HS or 40 mg alternate nights — confusion in elderly CKD with full dose." },
  ],
  ranitidine: [
    { minCrCl: 50, action: "150 mg PO BD — standard." },
    { minCrCl: 0, maxCrCl: 49, action: "150 mg once daily (half)." },
  ],
  fluconazole: [
    { minCrCl: 50, action: "Standard dose for indication (e.g., 150–400 mg/day)." },
    { minCrCl: 0, maxCrCl: 49, action: "Give the usual first (loading) dose, then HALVE all subsequent doses." },
  ],
  amikacin: [
    { minCrCl: 60, action: "15 mg/kg IV once daily with level monitoring on courses > 3 days." },
    { minCrCl: 40, maxCrCl: 59, action: "15 mg/kg q36h — extend the interval, don't cut the dose (peak matters for kill)." },
    { minCrCl: 20, maxCrCl: 39, action: "15 mg/kg q48h with trough levels." },
    { minCrCl: 0, maxCrCl: 19, action: "Avoid; if essential, level-guided specialist dosing only." },
  ],
  alendronate: [
    { minCrCl: 35, action: "70 mg PO once weekly — standard." },
    { minCrCl: 0, maxCrCl: 34, action: "Avoid — not recommended below CrCl 35." },
  ],
  silodosin: [
    { minCrCl: 50, action: "8 mg PO daily with food — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "4 mg PO daily (half)." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid." },
  ],
  solifenacin: [
    { minCrCl: 30, action: "5–10 mg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "Max 5 mg daily (half ceiling)." },
  ],
  trimetazidine: [
    { minCrCl: 60, action: "35 mg MR PO BD — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "35 mg once daily (half)." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid." },
  ],
  fenofibrate: [
    { minCrCl: 60, action: "145–160 mg PO daily — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "Reduce to ~48–54 mg daily (a third) or alternate-day dosing; recheck lipids at 6–8 weeks." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid." },
  ],
  glibenclamide: [
    { minCrCl: 60, action: "2.5–10 mg PO daily — but avoid in elderly regardless (Beers: prolonged hypoglycemia)." },
    { minCrCl: 0, maxCrCl: 59, action: "Avoid — active metabolites accumulate; switch to gliclazide/short-acting or DPP-4 inhibitor." },
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
