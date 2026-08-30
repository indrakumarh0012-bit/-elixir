import { drugsDB, getDrugById, interactionsDB } from "./clinicalData";
import { buildRenalDoseReport } from "../lib/renalDoseAdjust";
import type {
  AgeCategory,
  AnticholinergicBurden,
  DiseaseDrugAlert,
  DrugPointAnalysis,
  TherapeuticDuplication,
  DrugRecord,
  GeriatricGuideline,
  InteractionFinding,
  PatientProfile,
  PediatricDoseFinding,
  PolypharmacyFinding,
  RegimenAnalysisReport,
  RenalFinding,
  StartFinding,
} from "./types";

function categorizeAge(ageYears: number): AgeCategory {
  if (ageYears < 18) return "pediatric";
  if (ageYears >= 65) return "geriatric";
  return "adult";
}

/** Cockcroft–Gault CrCl (mL/min); assumes male if sex omitted. */
export function estimateCrClMlMin(patient: PatientProfile): number | null {
  const scr = patient.creatinineMgDl;
  if (scr == null || scr <= 0 || patient.ageYears <= 0 || patient.weightKg <= 0) {
    return null;
  }
  const genderFactor = patient.sex === "Female" ? 0.85 : 1.0;
  return (
    Math.round(
      ((((140 - patient.ageYears) * patient.weightKg) / (72 * scr)) * genderFactor) * 10,
    ) / 10
  );
}

function pairMatches(
  a: string,
  b: string,
  idA: string,
  idB: string,
): boolean {
  return (a === idA && b === idB) || (a === idB && b === idA);
}

function findInteractions(currentMeds: DrugRecord[]): InteractionFinding[] {
  const findings: InteractionFinding[] = [];
  for (let i = 0; i < currentMeds.length; i++) {
    for (let j = i + 1; j < currentMeds.length; j++) {
      const drugA = currentMeds[i];
      const drugB = currentMeds[j];
      for (const interaction of interactionsDB) {
        if (pairMatches(drugA.id, drugB.id, interaction.drugAId, interaction.drugBId)) {
          findings.push({
            interaction,
            drugAName: getDrugById(interaction.drugAId)?.name ?? drugA.name,
            drugBName: getDrugById(interaction.drugBId)?.name ?? drugB.name,
          });
        }
      }
    }
  }
  return findings;
}

function isAceInhibitor(drug: DrugRecord): boolean {
  return drug.class.toLowerCase().includes("ace inhibitor");
}

function evaluateStartCriteria(
  patient: PatientProfile,
  currentMeds: DrugRecord[],
): StartFinding[] {
  const alerts: StartFinding[] = [];
  const has = (re: RegExp) => patient.conditions.some((c) => re.test(c));
  const onClass = (re: RegExp) => currentMeds.some((d) => re.test(d.class));
  const onId = (re: RegExp) => currentMeds.some((d) => re.test(d.id));

  if (has(/heart failure/i) && !currentMeds.some(isAceInhibitor) && !onId(/sacubitril/)) {
    alerts.push({
      relatedCondition: "Heart Failure",
      ruleDescription:
        "START: ACE inhibitor (or ARNI) indicated in heart failure with reduced ejection fraction unless contraindicated.",
      recommendation:
        "Consider an ACE inhibitor (Enalapril/Ramipril) or ARNI; titrate and monitor K+/creatinine.",
    });
  }
  if (has(/heart failure/i) && !onId(/metoprolol|bisoprolol|carvedilol/)) {
    alerts.push({
      relatedCondition: "Heart Failure",
      ruleDescription:
        "START: evidence-based beta-blocker (bisoprolol, carvedilol, metoprolol succinate) in stable HFrEF.",
      recommendation: "Start low and up-titrate 2-weekly once euvolemic.",
    });
  }
  if (has(/atrial fibrillation/i) && !onId(/warfarin|apixaban|rivaroxaban|dabigatran/)) {
    alerts.push({
      relatedCondition: "Atrial Fibrillation",
      ruleDescription:
        "START: oral anticoagulation in AF with CHA2DS2-VASc ≥ 2 (score ≥ 2 is near-universal at ≥ 65 y). Antiplatelets are NOT adequate for AF stroke prevention.",
      recommendation: "Consider a DOAC (apixaban preferred in elderly/CKD) or warfarin.",
    });
  }
  if (has(/CAD|ACS|Post-MI/i) && !onId(/atorvastatin|rosuvastatin/)) {
    alerts.push({
      relatedCondition: "CAD / Post-MI",
      ruleDescription: "START: statin for secondary prevention in documented atherosclerotic disease.",
      recommendation: "High-intensity statin (Atorvastatin 40-80 / Rosuvastatin 20) unless limited life expectancy.",
    });
  }
  if (has(/CAD|ACS|Post-MI|Stroke|TIA/i) && !onId(/aspirin|clopidogrel|ticagrelor|warfarin|apixaban|rivaroxaban|dabigatran/)) {
    alerts.push({
      relatedCondition: "CAD / Stroke / TIA",
      ruleDescription:
        "START: antiplatelet for secondary prevention of atherosclerotic events (or anticoagulant if cardioembolic).",
      recommendation: "Aspirin 75 mg or Clopidogrel 75 mg daily unless bleeding contraindication.",
    });
  }
  if (has(/osteoporosis|fragility fracture|hip fracture/i) && !onId(/alendronate/)) {
    alerts.push({
      relatedCondition: "Osteoporosis / Fragility Fracture",
      ruleDescription:
        "START: bisphosphonate plus calcium/vitamin D after fragility fracture or documented osteoporosis.",
      recommendation: "Alendronate 70 mg weekly (check CrCl ≥ 35) + calcium/vitamin D.",
    });
  }
  if (has(/diabetic nephropathy|diabetes.*CKD|CKD.*diabet/i) && !currentMeds.some(isAceInhibitor) && !onId(/telmisartan|losartan|olmesartan/)) {
    alerts.push({
      relatedCondition: "Diabetic Kidney Disease",
      ruleDescription: "START: ACE inhibitor or ARB in diabetes with nephropathy/albuminuria.",
      recommendation: "One (never both) of ACEI/ARB; monitor K+ and creatinine after start.",
    });
  }
  if (has(/COPD/i) && !onId(/tiotropium|ipratropium|salbutamol|budesonide/) && !onClass(/bronchodilator|LAMA|SAMA/i)) {
    alerts.push({
      relatedCondition: "COPD",
      ruleDescription: "START: regular inhaled bronchodilator (LAMA/LABA) in symptomatic COPD.",
      recommendation: "e.g., Tiotropium 18 mcg daily; check inhaler technique.",
    });
  }
  return alerts;
}

/**
 * STOPP-style disease-drug rules: drugs that are risky or wrong for one of
 * this patient's stated conditions.
 */
const DISEASE_DRUG_RULES: {
  drugId: RegExp;
  condition: RegExp;
  severity: "High" | "Moderate";
  rule: string;
  recommendation: string;
}[] = [
  {
    drugId: /^(ibuprofen|diclofenac|naproxen|etoricoxib|indomethacin|aspirin)$/,
    condition: /heart failure/i,
    severity: "High",
    rule: "NSAIDs cause fluid retention and worsen heart failure (STOPP).",
    recommendation: "Avoid; use paracetamol/topical NSAID for pain.",
  },
  {
    drugId: /^(ibuprofen|diclofenac|naproxen|etoricoxib|indomethacin)$/,
    condition: /CKD|nephropathy|ESRD/i,
    severity: "High",
    rule: "NSAIDs reduce renal perfusion — AKI on CKD (STOPP).",
    recommendation: "Avoid NSAIDs in CKD; paracetamol first.",
  },
  {
    drugId: /^(ibuprofen|diclofenac|naproxen|etoricoxib|indomethacin|aspirin)$/,
    condition: /peptic ulcer|GI bleed/i,
    severity: "High",
    rule: "NSAID/aspirin with ulcer or GI-bleed history — rebleeding risk (STOPP).",
    recommendation: "Avoid, or only with PPI cover after clear indication review.",
  },
  {
    drugId: /^(verapamil|diltiazem)$/,
    condition: /heart failure/i,
    severity: "High",
    rule: "Non-DHP calcium blockers are negatively inotropic — worsen HFrEF (STOPP/Beers).",
    recommendation: "Stop; use beta-blocker for rate control in HF.",
  },
  {
    drugId: /^pioglitazone$/,
    condition: /heart failure/i,
    severity: "High",
    rule: "Pioglitazone causes fluid retention — contraindicated in heart failure.",
    recommendation: "Stop; switch to a DPP-4 inhibitor / SGLT2i / insulin.",
  },
  {
    drugId: /^(risperidone|quetiapine|olanzapine|haloperidol)$/,
    condition: /dementia/i,
    severity: "High",
    rule: "Antipsychotics in dementia increase stroke and mortality (Beers).",
    recommendation: "Use only for dangerous agitation/psychosis after non-drug measures; lowest dose, shortest time.",
  },
  {
    drugId: /^(oxybutynin|solifenacin|trihexyphenidyl|amitriptyline|chlorpheniramine|pheniramine)$/,
    condition: /dementia|cognitive/i,
    severity: "High",
    rule: "Anticholinergics worsen cognition in dementia (Beers).",
    recommendation: "Deprescribe; use non-anticholinergic alternatives.",
  },
  {
    drugId: /^(oxybutynin|solifenacin|trihexyphenidyl|amitriptyline)$/,
    condition: /glaucoma/i,
    severity: "Moderate",
    rule: "Anticholinergics can precipitate angle-closure in glaucoma.",
    recommendation: "Confirm glaucoma type with ophthalmology before continuing.",
  },
  {
    drugId: /^(oxybutynin|solifenacin|amitriptyline|chlorpheniramine)$/,
    condition: /urinary retention|BPH/i,
    severity: "Moderate",
    rule: "Anticholinergics worsen outflow obstruction — retention risk.",
    recommendation: "Avoid in BPH with significant residual volume.",
  },
  {
    drugId: /^(zolpidem|clonazepam|alprazolam|lorazepam|diazepam-adult)$/,
    condition: /fall|frailty|syncope|dizziness/i,
    severity: "High",
    rule: "Sedative-hypnotics in fallers — falls and fracture (STOPP).",
    recommendation: "Taper and stop; sleep hygiene / non-drug measures.",
  },
  {
    drugId: /^(tramadol|amitriptyline)$/,
    condition: /fall|frailty/i,
    severity: "Moderate",
    rule: "Sedating analgesics add to fall risk.",
    recommendation: "Prefer paracetamol/topical agents; review need.",
  },
  {
    drugId: /^(trimetazidine|flunarizine|cinnarizine|metoclopramide|risperidone|haloperidol|olanzapine)$/,
    condition: /parkinson/i,
    severity: "High",
    rule: "Dopamine-blocking / parkinsonism-inducing drugs worsen Parkinson disease.",
    recommendation: "Stop; if antiemetic needed use domperidone (peripheral).",
  },
  {
    drugId: /^(prednisolone|dexamethasone|hydrocortisone)$/,
    condition: /osteoporosis|fragility fracture/i,
    severity: "Moderate",
    rule: "Systemic corticosteroids accelerate bone loss on top of osteoporosis.",
    recommendation: "Lowest dose/shortest course; ensure bisphosphonate + calcium/vitamin D cover.",
  },
  {
    drugId: /^(prednisolone|dexamethasone)$/,
    condition: /diabet/i,
    severity: "Moderate",
    rule: "Corticosteroids raise glucose — expect control to worsen.",
    recommendation: "Intensify monitoring; adjust hypoglycemics during the course.",
  },
  {
    drugId: /^(tamsulosin|silodosin|prazosin)$/,
    condition: /orthostatic hypotension|syncope|fall/i,
    severity: "Moderate",
    rule: "Alpha-blockers aggravate orthostatic drops — falls and syncope.",
    recommendation: "Night-time dosing, postural BP checks; review combination antihypertensives.",
  },
  {
    drugId: /^(atenolol|metoprolol|bisoprolol|carvedilol)$/,
    condition: /bradyarrhythmia|heart block/i,
    severity: "High",
    rule: "Beta-blockade on conduction disease — bradycardia/complete block risk.",
    recommendation: "Cardiology review before continuing; ECG.",
  },
  {
    drugId: /^(glibenclamide|glimepiride)$/,
    condition: /recurrent hypoglycemia/i,
    severity: "High",
    rule: "Sulfonylureas in a patient with recurrent hypoglycemia — dangerous.",
    recommendation: "Switch to DPP-4 inhibitor or other low-hypoglycemia agent.",
  },
  {
    drugId: /^(metformin)$/,
    condition: /cirrhosis|liver disease/i,
    severity: "Moderate",
    rule: "Advanced liver disease raises lactic acidosis risk on metformin.",
    recommendation: "Avoid in decompensated cirrhosis; specialist decision.",
  },
  {
    drugId: /^(theophylline|doxofylline)$/,
    condition: /epilepsy|seizure/i,
    severity: "Moderate",
    rule: "Xanthines lower seizure threshold.",
    recommendation: "Prefer inhaled therapy; review need.",
  },
  {
    drugId: /^(tiotropium|ipratropium)$/,
    condition: /glaucoma/i,
    severity: "Moderate",
    rule: "Inhaled anticholinergics can worsen angle-closure if mist reaches the eye.",
    recommendation: "Use mouthpiece/spacer correctly; ophthalmology if eye pain/haloes.",
  },
];

function findDiseaseDrugAlerts(
  patient: PatientProfile,
  meds: DrugRecord[],
): DiseaseDrugAlert[] {
  const out: DiseaseDrugAlert[] = [];
  for (const rule of DISEASE_DRUG_RULES) {
    const cond = patient.conditions.find((c) => rule.condition.test(c));
    if (!cond) continue;
    for (const d of meds) {
      if (rule.drugId.test(d.id)) {
        out.push({
          severity: rule.severity,
          drugId: d.id,
          drugName: d.name,
          condition: cond,
          rule: rule.rule,
          recommendation: rule.recommendation,
        });
      }
    }
  }
  return out;
}

function pediatricDoses(
  patient: PatientProfile,
  currentMeds: DrugRecord[],
): PediatricDoseFinding[] {
  return currentMeds
    .filter((d) => d.pediatricDoseRule)
    .map((d) => {
      let calculated = "See rule — confirm max daily dose";
      if (d.pediatricMgPerKgDay != null && patient.weightKg > 0) {
        const mg = Math.round(d.pediatricMgPerKgDay * patient.weightKg * 10) / 10;
        if (d.pediatricDoseUnit === "mg/kg/dose") {
          calculated = `≈ ${mg} mg per dose (using ${d.pediatricMgPerKgDay} mg/kg/dose × ${patient.weightKg} kg)`;
        } else {
          calculated = `≈ ${mg} mg/day (using ${d.pediatricMgPerKgDay} mg/kg/day × ${patient.weightKg} kg)`;
        }
      }
      return {
        drugId: d.id,
        drugName: d.name,
        rule: d.pediatricDoseRule!,
        calculatedDoseLabel: calculated,
      };
    });
}

function renalAlerts(
  crCl: number | null,
  currentMeds: DrugRecord[],
): RenalFinding[] {
  if (crCl == null) return [];
  return currentMeds
    .filter(
      (d) =>
        d.renalAdjustmentLimit != null && crCl < d.renalAdjustmentLimit,
    )
    .map((d) => ({
      drugId: d.id,
      drugName: d.name,
      renalAdjustmentLimit: d.renalAdjustmentLimit!,
      note:
        d.renalNote ??
        `CrCl ${crCl} mL/min is below adjustment threshold (${d.renalAdjustmentLimit} mL/min).`,
    }));
}

function analyzePolypharmacy(
  patient: PatientProfile,
  currentMeds: DrugRecord[],
  ageCategory: AgeCategory,
  interactionCount: number,
): PolypharmacyFinding[] {
  const alerts: PolypharmacyFinding[] = [];
  const n = currentMeds.length;

  if (n >= 10) {
    alerts.push({
      severity: "High",
      title: "Excessive polypharmacy",
      detail: `${n} concurrent medications — high burden for adherence, ADRs, and prescribing cascades.`,
      recommendation:
        "Prioritize deprescribing review; reconcile indication, duration, and duplicates with past records.",
    });
  } else if (n >= 5) {
    alerts.push({
      severity: ageCategory === "geriatric" ? "High" : "Moderate",
      title: "Polypharmacy",
      detail: `${n} concurrent medications (≥5). Geriatric patients are at elevated fall, delirium, and hospitalization risk.`,
      recommendation:
        "Map each drug to an active indication from past history; stop without clear ongoing need.",
    });
  } else if (n >= 3) {
    alerts.push({
      severity: "Info",
      title: "Multi-drug regimen",
      detail: `${n} medications on the active list — screen for interactions and timing conflicts.`,
      recommendation: "Keep a reconciled medication list with past admission/OPD records.",
    });
  }

  const byClass = new Map<string, string[]>();
  for (const d of currentMeds) {
    const key = d.class.toLowerCase();
    const list = byClass.get(key) ?? [];
    list.push(d.name);
    byClass.set(key, list);
  }
  for (const [cls, names] of byClass) {
    if (names.length >= 2) {
      alerts.push({
        severity: "Moderate",
        title: `Same-class duplication: ${cls}`,
        detail: `More than one agent from the same class: ${names.join(", ")}.`,
        recommendation:
          "Confirm intentional combination vs therapeutic duplication; simplify if redundant.",
      });
    }
  }

  const ppiCount = currentMeds.filter((d) =>
    d.class.toLowerCase().includes("ppi"),
  ).length;
  if (ppiCount >= 2) {
    alerts.push({
      severity: "High",
      title: "Duplicate PPI therapy",
      detail: "Two or more PPIs present — usually unintentional duplication.",
      recommendation: "Continue a single PPI with a clear indication and planned stop date.",
    });
  }

  const fallRisk =
    patient.conditions.some((c) => c.toLowerCase().includes("fall")) ||
    ageCategory === "geriatric";
  const sedating = currentMeds.filter(
    (d) =>
      d.id === "zolpidem" ||
      d.id === "amitriptyline" ||
      d.class.toLowerCase().includes("sedative"),
  );
  if (fallRisk && sedating.length > 0) {
    alerts.push({
      severity: "High",
      title: "Fall-risk CNS active drugs",
      detail: `Sedating / anticholinergic agents on list: ${sedating.map((d) => d.name).join(", ")}.`,
      recommendation:
        "Review against past fall history; prefer non-pharmacologic sleep/pain strategies when possible.",
    });
  }

  if (interactionCount >= 2) {
    alerts.push({
      severity: "High",
      title: "Multiple practical DDIs",
      detail: `${interactionCount} documented practical interactions in the current regimen.`,
      recommendation:
        "Resolve timing and dose adjustments before discharge counseling; document in the summary.",
    });
  }

  return alerts;
}

/**
 * Pure clinical regimen analyzer: DDIs, Beers/STOPP/START, pediatric dosing, renal + polypharmacy.
 */


/** What to reach for instead, shown when a drug earns a STOP/REVIEW verdict. */
const ALTERNATIVES: Record<string, string> = {
  ibuprofen: "Paracetamol first; topical NSAID for joints; short tramadol only if unavoidable.",
  diclofenac: "Paracetamol / topical diclofenac gel; PPI cover if any oral NSAID is truly needed.",
  naproxen: "Paracetamol / topical NSAID; if inflammation demands, shortest course + PPI.",
  etoricoxib: "Paracetamol / topical NSAID; avoid all NSAIDs in cardiac/renal disease.",
  indomethacin: "Any other analgesic — indomethacin has the worst CNS profile in elderly.",
  aspirin: "If for primary prevention in elderly — usually stop; secondary prevention stays.",
  glibenclamide: "Gliclazide (shorter-acting), linagliptin/teneligliptin (no renal adjustment), or basal insulin.",
  glimepiride: "Low-dose gliclazide or a DPP-4 inhibitor; insulin if HbA1c far off target.",
  metformin: "In CKD: linagliptin/teneligliptin, low-dose gliclazide, or insulin.",
  oxybutynin: "Bladder training + timed voiding; if a drug is needed, low-dose solifenacin (max 5 mg in CKD).",
  solifenacin: "Bladder training; review if benefit is real — stop and reassess after 4 weeks.",
  trihexyphenidyl: "Stop — for drug-induced EPS, reduce the offending antipsychotic instead.",
  amitriptyline: "For neuropathic pain: duloxetine (if eGFR > 30) or gabapentin (renally dosed).",
  chlorpheniramine: "Loratadine / fexofenadine (non-sedating).",
  pheniramine: "Loratadine / fexofenadine.",
  cinnarizine: "Vestibular rehabilitation; betahistine for Meniere-type vertigo.",
  flunarizine: "For migraine prophylaxis: propranolol (if no asthma/HF) or topiramate (renally dosed).",
  diazepam: "Taper gradually; sleep hygiene; melatonin at bedtime if needed.",
  "diazepam-adult": "Taper gradually (switch to equivalent lorazepam first if needed); sleep hygiene, melatonin.",
  alprazolam: "Gradual taper; SSRI for underlying anxiety; relaxation techniques.",
  clonazepam: "Slow taper; treat the underlying disorder (SSRI for anxiety).",
  zolpidem: "Sleep hygiene + stimulus control; melatonin; treat pain/nocturia driving insomnia.",
  lorazepam: "Taper; non-drug sleep measures; melatonin.",
  risperidone: "Non-drug measures for BPSD (routine, pain control, environment); if essential, lowest-dose quetiapine with review date.",
  olanzapine: "Non-drug BPSD measures; if an antipsychotic is unavoidable, set a stop date.",
  quetiapine: "Non-drug measures first; re-review need every 4–12 weeks.",
  haloperidol: "For delirium: treat the cause; if sedation essential, lowest dose shortest time.",
  paroxetine: "Sertraline or escitalopram (cleaner in elderly).",
  fluoxetine: "Sertraline / escitalopram (shorter half-life, no CYP2D6 problem with tamoxifen).",
  verapamil: "For rate control in HF: beta-blocker (bisoprolol/carvedilol); for BP: amlodipine.",
  diltiazem: "Beta-blocker for rate control in HFrEF; amlodipine for BP.",
  clonidine: "Amlodipine / telmisartan / chlorthalidone per guidelines.",
  prazosin: "For BP: standard first-line agents; keep alpha-blockers for BPH symptoms only.",
  pioglitazone: "DPP-4 inhibitor, SGLT2 inhibitor (if eGFR allows), or insulin.",
  nitrofurantoin: "Per urine culture: cephalexin, fosfomycin single dose, or amoxicillin-clavulanate.",
  dabigatran: "Apixaban (best renal tolerance of the DOACs) or warfarin with INR monitoring.",
  rivaroxaban: "Apixaban or warfarin when CrCl < 15.",
  tramadol: "Paracetamol round-the-clock; topical agents; low-dose morphine (renally adjusted) for severe pain.",
  morphine: "In renal failure: fentanyl (patch/injection) — no active renal metabolites.",
  "tenofovir-df": "Tenofovir alafenamide (TAF) — same efficacy, kinder to kidneys and bone.",
  cotrimoxazole: "Per culture: nitrofurantoin (if eGFR ≥ 60), cephalexin, or fosfomycin.",
  duloxetine: "Sertraline (no renal adjustment) for mood; gabapentin (renally dosed) for neuropathic pain.",
  trimetazidine: "Optimize standard anti-anginals: beta-blocker, amlodipine, nitrates, ranolazine per cardiology.",
  digoxin: "Rate control with beta-blocker; if digoxin essential, 0.125 mg with levels.",
  cisplatin: "Carboplatin dosed by Calvert formula (uses the patient's GFR).",
  capecitabine: "Infusional 5-FU with dose reduction per oncology, or non-fluoropyrimidine regimen.",
  lithium: "With psychiatry: valproate or an atypical agent; never stop lithium abruptly.",
  spironolactone: "For resistant HTN in CKD: check with nephrology; amiloride is NOT safer — loop diuretic + BP agents.",
  famciclovir: "Acyclovir or valacyclovir with renal-banded dosing (cheaper, same coverage).",
  baclofen: "Tizanidine (hepatic clearance) at low dose, or local measures/physio for spasticity.",
  fondaparinux: "Unfractionated heparin (monitorable, reversible) in CrCl < 30.",
  enoxaparin: "In CrCl < 30 with high bleeding risk: unfractionated heparin.",
};

/** Systemic anticholinergics in the DB (inhaled LAMA/SAMA deliberately excluded). */
const ANTICHOLINERGIC_IDS = new Set([
  "oxybutynin",
  "solifenacin",
  "trihexyphenidyl",
  "amitriptyline",
  "chlorpheniramine",
  "pheniramine",
  "cinnarizine",
]);

function isAnticholinergic(d: DrugRecord): boolean {
  return ANTICHOLINERGIC_IDS.has(d.id);
}

/** "NSAID (COX-2 selective)" and "NSAID" count as the same class for duplication. */
function normalizedClass(d: DrugRecord): string {
  return d.class.toLowerCase().split("(")[0].trim();
}

function findDuplications(meds: DrugRecord[]): TherapeuticDuplication[] {
  const byClass = new Map<string, DrugRecord[]>();
  for (const d of meds) {
    const key = normalizedClass(d);
    byClass.set(key, [...(byClass.get(key) ?? []), d]);
  }
  const out: TherapeuticDuplication[] = [];
  for (const [key, list] of byClass) {
    if (list.length >= 2) {
      out.push({ className: list[0].class.split("(")[0].trim() || key, drugNames: list.map((d) => d.name) });
    }
  }
  return out;
}

function anticholinergicBurden(meds: DrugRecord[], ageCategory: AgeCategory): AnticholinergicBurden {
  const hits = meds.filter(isAnticholinergic);
  let note = "No systemic anticholinergics in this regimen.";
  if (hits.length === 1) {
    note =
      ageCategory === "geriatric"
        ? "One anticholinergic — acceptable if clearly indicated; watch cognition, constipation, urinary retention."
        : "One anticholinergic in the regimen.";
  } else if (hits.length >= 2) {
    note =
      "Cumulative anticholinergic burden: additive confusion/delirium, falls, constipation and urinary retention risk" +
      (ageCategory === "geriatric" ? " — in an elderly patient, actively deprescribe down to one or none." : ".");
  }
  return { count: hits.length, drugNames: hits.map((d) => d.name), note };
}

function buildDrugDetails(
  meds: DrugRecord[],
  interactions: InteractionFinding[],
  crCl: number | null,
  ageCategory: AgeCategory,
  diseaseDrug: DiseaseDrugAlert[] = [],
): DrugPointAnalysis[] {
  return meds.map((d) => {
    const guidelines = d.geriatricGuidelines ?? [];
    const beersPoints = guidelines
      .filter((g) => g.type === "Beers")
      .map((g) => `${g.ruleDescription} → ${g.recommendation}.`);
    const stoppPoints = guidelines
      .filter((g) => g.type === "STOPP")
      .map((g) => `${g.ruleDescription} → ${g.recommendation}.`);
    const myDiseaseAlerts = diseaseDrug.filter((a) => a.drugId === d.id);
    for (const a of myDiseaseAlerts) {
      stoppPoints.push(`For this patient's ${a.condition}: ${a.rule} → ${a.recommendation}`);
    }
    const startPoints = guidelines
      .filter((g) => g.type === "START")
      .map((g) => `${g.ruleDescription} → ${g.recommendation}.`);

    const renalPoints: string[] = [];
    let renalUrgency: "none" | "caution" | "adjust" | "avoid" = "none";
    if (crCl != null && d.renalAdjustmentLimit != null) {
      const rep = buildRenalDoseReport(d, crCl);
      renalUrgency = rep.urgency;
      renalPoints.push(...rep.recommendations);
    }

    const mine = interactions.filter(
      (x) => x.interaction.drugAId === d.id || x.interaction.drugBId === d.id,
    );
    const interactionPoints = mine.map((x) => {
      const other = x.interaction.drugAId === d.id ? x.drugBName : x.drugAName;
      return `With ${other} — ${x.interaction.severity}: ${x.interaction.clinicalEffect} Action: ${x.interaction.managementAction}`;
    });

    const hasContra = mine.some((x) => x.interaction.severity === "Contraindicated");
    const beersAvoid =
      ageCategory === "geriatric" && beersPoints.some((p) => /avoid/i.test(p));
    // The band text is the authority: a band that says STOP/Avoid at this CrCl
    // outranks the generic urgency thresholds (e.g. metformin stops at CrCl 30,
    // well above the generic "avoid below 10" cutoff).
    const renalSaysStop = /\b(STOP|Avoid)\b/.test(renalPoints.join(" "));
    const diseaseHigh = myDiseaseAlerts.some((a) => a.severity === "High");
    let verdict: DrugPointAnalysis["verdict"] = "continue";
    if (hasContra || beersAvoid || renalUrgency === "avoid" || renalSaysStop || diseaseHigh)
      verdict = "stop-or-review";
    else if (renalUrgency === "adjust") verdict = "adjust";
    else if (
      renalUrgency === "caution" ||
      mine.length > 0 ||
      (ageCategory === "geriatric" && (stoppPoints.length > 0 || isAnticholinergic(d)))
    )
      verdict = "caution";

    return {
      drugId: d.id,
      drugName: d.name,
      drugClass: d.class,
      standardDose: d.standardDose,
      beersPoints,
      stoppPoints,
      startPoints,
      renalPoints,
      interactionPoints,
      anticholinergic: isAnticholinergic(d),
      verdict,
      alternatives: verdict === "stop-or-review" ? ALTERNATIVES[d.id] : undefined,
    };
  });
}

export function analyzeRegimen(
  patient: PatientProfile,
  currentMeds: DrugRecord[],
): RegimenAnalysisReport {
  const ageCategory = categorizeAge(patient.ageYears);
  const estimatedCrClMlMin = estimateCrClMlMin(patient);

  const interactions = findInteractions(currentMeds);

  const geriatricAlerts: GeriatricGuideline[] =
    ageCategory === "geriatric"
      ? currentMeds.flatMap((d) => d.geriatricGuidelines ?? [])
      : [];

  const startAlerts =
    ageCategory === "geriatric" || patient.conditions.length > 0
      ? evaluateStartCriteria(patient, currentMeds)
      : [];

  const startFiltered =
    ageCategory === "pediatric"
      ? []
      : startAlerts;

  const pediatricDoseFindings =
    ageCategory === "pediatric" ? pediatricDoses(patient, currentMeds) : [];

  const renal = renalAlerts(estimatedCrClMlMin, currentMeds);
  const diseaseDrug = findDiseaseDrugAlerts(patient, currentMeds);
  const polypharmacyAlerts = analyzePolypharmacy(
    patient,
    currentMeds,
    ageCategory,
    interactions.length,
  );

  return {
    ageCategory,
    estimatedCrClMlMin,
    medicationCount: currentMeds.length,
    interactions,
    geriatricAlerts,
    drugDetails: buildDrugDetails(currentMeds, interactions, estimatedCrClMlMin, ageCategory, diseaseDrug),
    therapeuticDuplications: findDuplications(currentMeds),
    anticholinergicBurden: anticholinergicBurden(currentMeds, ageCategory),
    diseaseDrugAlerts: diseaseDrug,
    startAlerts: startFiltered,
    pediatricDoses: pediatricDoseFindings,
    renalAlerts: renal,
    polypharmacyAlerts,
  };
}

/** Resolve drug IDs to records (ignores unknown ids). */
export function resolveMeds(ids: string[]): DrugRecord[] {
  return ids
    .map((id) => drugsDB.find((d) => d.id === id))
    .filter((d): d is DrugRecord => Boolean(d));
}
