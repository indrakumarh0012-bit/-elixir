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
  // ---- Antifungals ----
  voriconazole: [
    { minCrCl: 50, action: "PO 200 mg q12h (after loading) or IV 4 mg/kg q12h — standard." },
    { minCrCl: 0, maxCrCl: 49, action: "Switch IV to ORAL (IV vehicle SBECD accumulates); oral dose needs no reduction. Check trough on prolonged use." },
  ],
  flucytosine: [
    { minCrCl: 40, action: "25 mg/kg PO q6h — standard." },
    { minCrCl: 20, maxCrCl: 39, action: "25 mg/kg q12h (half the daily dose)." },
    { minCrCl: 10, maxCrCl: 19, action: "25 mg/kg q24h (quarter)." },
    { minCrCl: 0, maxCrCl: 9, action: "25 mg/kg q48h with levels/CBC — marrow toxicity accumulates." },
  ],
  "terbinafine-adult": [
    { minCrCl: 50, action: "250 mg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 49, action: "Not recommended (label) — choose itraconazole/fluconazole per fungus." },
  ],
  "amphotericin-b": [
    { minCrCl: 60, action: "Dose by indication; prefer liposomal in any renal risk. Saline load 500 ml before dose." },
    { minCrCl: 0, maxCrCl: 59, action: "Use LIPOSOMAL form; do not dose-reduce for CrCl — instead hydrate, correct K+/Mg2+, daily creatinine; hold only for rapidly rising creatinine per protocol." },
  ],
  // ---- Antivirals ----
  ganciclovir: [
    { minCrCl: 70, action: "Induction 5 mg/kg IV q12h — standard." },
    { minCrCl: 50, maxCrCl: 69, action: "2.5 mg/kg q12h (half dose)." },
    { minCrCl: 25, maxCrCl: 49, action: "2.5 mg/kg q24h (quarter of daily)." },
    { minCrCl: 10, maxCrCl: 24, action: "1.25 mg/kg q24h." },
    { minCrCl: 0, maxCrCl: 9, action: "1.25 mg/kg 3×/week after dialysis." },
  ],
  valganciclovir: [
    { minCrCl: 60, action: "Induction 900 mg PO BD; maintenance 900 mg OD." },
    { minCrCl: 40, maxCrCl: 59, action: "Induction 450 mg BD (half); maintenance 450 mg OD." },
    { minCrCl: 25, maxCrCl: 39, action: "Induction 450 mg OD (quarter); maintenance 450 mg alternate days." },
    { minCrCl: 10, maxCrCl: 24, action: "Induction 450 mg alternate days; maintenance 450 mg twice weekly." },
    { minCrCl: 0, maxCrCl: 9, action: "Not recommended — use IV ganciclovir with dialysis dosing." },
  ],
  entecavir: [
    { minCrCl: 50, action: "0.5 mg PO daily — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "HALVE: 0.25 mg daily or 0.5 mg q48h." },
    { minCrCl: 10, maxCrCl: 29, action: "0.15 mg daily or 0.5 mg q72h." },
    { minCrCl: 0, maxCrCl: 9, action: "0.05 mg daily or 0.5 mg weekly (after dialysis)." },
  ],
  "tenofovir-df": [
    { minCrCl: 50, action: "300 mg PO daily — standard; urine protein + phosphate yearly." },
    { minCrCl: 30, maxCrCl: 49, action: "300 mg q48h — or better, switch to tenofovir alafenamide." },
    { minCrCl: 10, maxCrCl: 29, action: "300 mg twice weekly; strongly prefer TAF/alternative." },
    { minCrCl: 0, maxCrCl: 9, action: "300 mg weekly after dialysis, or avoid." },
  ],
  lamivudine: [
    { minCrCl: 50, action: "300 mg PO daily (HIV) — standard." },
    { minCrCl: 30, maxCrCl: 49, action: "150 mg daily (half)." },
    { minCrCl: 15, maxCrCl: 29, action: "150 mg first dose, then 100 mg daily." },
    { minCrCl: 5, maxCrCl: 14, action: "150 mg first dose, then 50 mg daily." },
    { minCrCl: 0, maxCrCl: 4, action: "50 mg first dose, then 25 mg daily." },
  ],
  remdesivir: [
    { minCrCl: 30, action: "200 mg IV day 1, then 100 mg daily — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "Label caution (vehicle accumulation); recent data allow short courses — specialist decision, daily creatinine." },
  ],
  // ---- Antibiotics ----
  cefepime: [
    { minCrCl: 60, action: "1–2 g IV q8–12h — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "2 g q12h (or 1 g q8h for milder infection)." },
    { minCrCl: 11, maxCrCl: 29, action: "2 g q24h (half of severe-infection dose)." },
    { minCrCl: 0, maxCrCl: 10, action: "1 g q24h; any confusion/myoclonus = cefepime neurotoxicity until proven otherwise." },
  ],
  ceftazidime: [
    { minCrCl: 50, action: "1–2 g IV q8h — standard." },
    { minCrCl: 31, maxCrCl: 49, action: "1–2 g q12h." },
    { minCrCl: 16, maxCrCl: 30, action: "1–2 g q24h." },
    { minCrCl: 0, maxCrCl: 15, action: "0.5–1 g q24h (half dose, once daily)." },
  ],
  ertapenem: [
    { minCrCl: 30, action: "1 g IV q24h — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "500 mg q24h (half)." },
  ],
  colistin: [
    { minCrCl: 80, action: "Load 9 MU, then 9 MU/day divided q12h." },
    { minCrCl: 50, maxCrCl: 79, action: "Load 9 MU, then 7.5–9 MU/day divided q12h." },
    { minCrCl: 30, maxCrCl: 49, action: "Load 9 MU, then 5.5–7.5 MU/day divided q12h." },
    { minCrCl: 10, maxCrCl: 29, action: "Load 9 MU, then 4.5–5.5 MU/day divided q12h." },
    { minCrCl: 0, maxCrCl: 9, action: "Load 9 MU, then ~3.5 MU/day; dialysis protocol. Never reduce the loading dose." },
  ],
  teicoplanin: [
    { minCrCl: 60, action: "6 mg/kg q12h ×3 loading, then 6 mg/kg q24h — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "Full loading ×3, then HALVE maintenance (6 mg/kg q48h or half-dose daily)." },
    { minCrCl: 0, maxCrCl: 29, action: "Full loading ×3, then one-third (6 mg/kg q72h)." },
  ],
  daptomycin: [
    { minCrCl: 30, action: "4–6 mg/kg IV q24h — standard; weekly CK." },
    { minCrCl: 0, maxCrCl: 29, action: "Same mg/kg dose q48h (half frequency); dose after dialysis on dialysis days." },
  ],
  streptomycin: [
    { minCrCl: 30, action: "15 mg/kg IM daily (max 1 g)." },
    { minCrCl: 0, maxCrCl: 29, action: "12–15 mg/kg 2–3 times per week, level-guided; audiometry." },
  ],
  ethambutol: [
    { minCrCl: 30, action: "15–20 mg/kg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "15–25 mg/kg THREE times per week (not daily); vision checks each visit." },
  ],
  pyrazinamide: [
    { minCrCl: 30, action: "25 mg/kg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "25–35 mg/kg three times per week; watch urate and LFTs." },
  ],
  clarithromycin: [
    { minCrCl: 30, action: "250–500 mg PO BD — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "HALVE the dose (250 mg BD max); QT and interaction check." },
  ],
  "imipenem-cilastatin": [
    { minCrCl: 60, action: "500 mg IV q6h or 1 g q8h — standard." },
    { minCrCl: 30, maxCrCl: 59, action: "500 mg q8h (two-thirds)." },
    { minCrCl: 15, maxCrCl: 29, action: "500 mg q12h (half); seizure risk with accumulation." },
    { minCrCl: 0, maxCrCl: 14, action: "Avoid unless on dialysis (give post-dialysis); prefer meropenem." },
  ],
  // ---- Anticoagulants / CNS / misc ----
  enoxaparin: [
    { minCrCl: 30, action: "Treatment 1 mg/kg SC q12h; prophylaxis 40 mg SC daily." },
    { minCrCl: 0, maxCrCl: 29, action: "Treatment 1 mg/kg ONCE daily (half); prophylaxis 30 mg daily; anti-Xa if course > 1 week." },
  ],
  fondaparinux: [
    { minCrCl: 50, action: "Standard dosing by weight." },
    { minCrCl: 30, maxCrCl: 49, action: "Caution: prophylaxis 1.5 mg daily; treatment only if no alternative." },
    { minCrCl: 0, maxCrCl: 29, action: "CONTRAINDICATED — use unfractionated heparin." },
  ],
  baclofen: [
    { minCrCl: 60, action: "Standard titration 5 mg TID upward." },
    { minCrCl: 30, maxCrCl: 59, action: "HALVE doses and titrate slowly; watch for drowsiness/confusion." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid — baclofen encephalopathy in CKD is classic; if essential, 5 mg daily max with close watch." },
  ],
  topiramate: [
    { minCrCl: 70, action: "25–100 mg PO BD — standard." },
    { minCrCl: 0, maxCrCl: 69, action: "HALVE the dose; supplement after dialysis." },
  ],
  sotalol: [
    { minCrCl: 60, action: "80–160 mg q12h with QT monitoring." },
    { minCrCl: 40, maxCrCl: 59, action: "Same dose q24h (half frequency)." },
    { minCrCl: 0, maxCrCl: 39, action: "Avoid, or individualized q36–48h dosing with ECG — torsades risk." },
  ],
  morphine: [
    { minCrCl: 50, action: "Standard dosing; start low in elderly." },
    { minCrCl: 10, maxCrCl: 49, action: "Reduce dose ~25–50% and extend interval; watch sedation/myoclonus (M6G accumulation)." },
    { minCrCl: 0, maxCrCl: 9, action: "Avoid — switch to fentanyl (no active renal metabolites)." },
  ],
  acarbose: [
    { minCrCl: 25, action: "25–100 mg TID with meals — standard." },
    { minCrCl: 0, maxCrCl: 24, action: "Avoid (label)." },
  ],
  zidovudine: [
    { minCrCl: 15, action: "300 mg PO BD — standard." },
    { minCrCl: 0, maxCrCl: 14, action: "100 mg q6–8h; CBC for anemia." },
  ],
  metoclopramide: [
    { minCrCl: 40, action: "10 mg PO/IV TID — standard, short courses only." },
    { minCrCl: 0, maxCrCl: 39, action: "HALVE the dose — EPS/dystonia risk rises with accumulation." },
  ],
  hydrochlorothiazide: [
    { minCrCl: 30, action: "12.5–25 mg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 29, action: "Ineffective as diuretic below CrCl 30 — switch to a loop diuretic (may keep for calcium/BP niche uses)." },
  ],
  bisoprolol: [
    { minCrCl: 20, action: "2.5–10 mg PO daily — standard." },
    { minCrCl: 0, maxCrCl: 19, action: "Max 10 mg daily; start 1.25 mg." },
  ],
  // ---- Explicit "no adjustment" answers ----
  caspofungin: [{ minCrCl: 0, action: "No renal dose adjustment at any CrCl (hepatic handling). Moderate hepatic impairment: 35 mg daily." }],
  micafungin: [{ minCrCl: 0, action: "No renal dose adjustment at any CrCl, dialysis included." }],
  anidulafungin: [{ minCrCl: 0, action: "No renal dose adjustment at any CrCl." }],
  posaconazole: [{ minCrCl: 0, action: "Tablets: no renal adjustment. IV: vehicle caution below CrCl 50 — prefer tablets. Trough on prolonged therapy." }],
  "itraconazole-adult": [{ minCrCl: 0, action: "Oral: no renal adjustment (absorption and interactions are the issues). Old IV formulation avoided below CrCl 30." }],
  "tenofovir-af": [{ minCrCl: 0, action: "No adjustment to CrCl 15 and on dialysis — the preferred tenofovir in CKD." }],
  dolutegravir: [{ minCrCl: 0, action: "No renal adjustment at any CrCl." }],
  tigecycline: [{ minCrCl: 0, action: "No renal adjustment at any CrCl (biliary clearance); halve maintenance in severe hepatic impairment." }],
  "polymyxin-b": [{ minCrCl: 0, action: "NOT dose-adjusted for CrCl (unlike colistin) — but nephrotoxic: daily creatinine while on therapy." }],
  isoniazid: [{ minCrCl: 0, action: "No renal adjustment; give with pyridoxine 10–25 mg daily." }],
  rifampicin: [{ minCrCl: 0, action: "No renal adjustment; check drug interactions instead (potent inducer)." }],
  linagliptin: [{ minCrCl: 0, action: "No renal adjustment at any CrCl including dialysis — the go-to gliptin in CKD." }],
  teneligliptin: [{ minCrCl: 0, action: "No renal dose adjustment needed in CKD." }],
  lithium: [
    { minCrCl: 60, action: "Standard dosing to trough 0.6–1.0 mEq/L (elderly 0.4–0.8); levels 5–7 days after any change." },
    { minCrCl: 30, maxCrCl: 59, action: "Reduce dose 25–50%, level-guided; review every interacting drug (NSAID/ACEI/thiazide)." },
    { minCrCl: 0, maxCrCl: 29, action: "Avoid — switch mood stabilizer (e.g., valproate) with psychiatry." },
  ],
  venlafaxine: [
    { minCrCl: 30, action: "Standard dosing; check BP after titration." },
    { minCrCl: 10, maxCrCl: 29, action: "HALVE the dose." },
    { minCrCl: 0, maxCrCl: 9, action: "Avoid or specialist dosing." },
  ],
  azathioprine: [
    { minCrCl: 50, action: "1–2.5 mg/kg daily with CBC monitoring." },
    { minCrCl: 10, maxCrCl: 49, action: "~75% of dose." },
    { minCrCl: 0, maxCrCl: 9, action: "HALF dose; CBC weekly." },
  ],
  capecitabine: [
    { minCrCl: 50, action: "Full protocol dose." },
    { minCrCl: 30, maxCrCl: 49, action: "75% of dose." },
    { minCrCl: 0, maxCrCl: 29, action: "CONTRAINDICATED." },
  ],
  cisplatin: [
    { minCrCl: 60, action: "Full dose with pre/post hydration and mandatory diuresis." },
    { minCrCl: 45, maxCrCl: 59, action: "Reduce dose (e.g., 75%) or switch to carboplatin; oncology decision." },
    { minCrCl: 0, maxCrCl: 44, action: "Avoid — use carboplatin (Calvert) instead." },
  ],
  cyclophosphamide: [
    { minCrCl: 30, action: "Full protocol dose with hydration ± mesna." },
    { minCrCl: 0, maxCrCl: 29, action: "Reduce ~25%; hematology/oncology guidance." },
  ],
  oxaliplatin: [
    { minCrCl: 30, action: "Full protocol dose." },
    { minCrCl: 0, maxCrCl: 29, action: "Reduce (e.g., 65 mg/m²) per oncology." },
  ],
  imatinib: [
    { minCrCl: 40, action: "400 mg daily — standard." },
    { minCrCl: 20, maxCrCl: 39, action: "Start at 50% (200 mg), titrate by response/tolerance." },
    { minCrCl: 0, maxCrCl: 19, action: "Use with caution, specialist only." },
  ],
  "fentanyl-patch": [
    { minCrCl: 0, action: "PREFERRED opioid in renal failure — no active renal metabolites. Titrate carefully; never in opioid-naive patients." },
  ],
  cyclosporine: [
    { minCrCl: 0, action: "Dose by trough LEVELS, not CrCl bands — the drug is itself nephrotoxic; creatinine rise > 30% needs dose review." },
  ],
  tacrolimus: [
    { minCrCl: 0, action: "Dose by trough LEVELS, not CrCl bands; nephrotoxic — watch creatinine, K+, glucose, tremor." },
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
  const renalDrugs = drugsDB.filter(
    (d) => d.renalAdjustmentLimit != null || RENAL_DOSE_BANDS[d.id] || d.renalNote,
  );
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
  if (limit == null && !active && drug.renalNote) {
    recommendations.push(drug.renalNote);
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
