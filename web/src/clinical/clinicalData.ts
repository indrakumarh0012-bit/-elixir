import type { DrugRecord, PracticalInteraction } from "./types";

export const KNOWN_CONDITIONS = [
  "Heart Failure",
  "CKD",
  "Diabetes",
  "Hypertension",
  "Atrial Fibrillation",
  "CAD / ACS",
  "COPD",
  "Peptic Ulcer Disease",
  "Fall Risk / Frailty",
  "Depression",
] as const;

export const drugsDB: DrugRecord[] = [
  {
    id: "amitriptyline",
    name: "Amitriptyline",
    class: "TCA / Antidepressant",
    standardDose: "10–75 mg PO HS",
    geriatricGuidelines: [
      {
        type: "Beers",
        ruleDescription:
          "Highly anticholinergic TCA; associated with sedation, orthostasis, delirium, and falls in older adults.",
        recommendation: "Avoid",
      },
      {
        type: "STOPP",
        ruleDescription:
          "STOPP: Tricyclic antidepressants with anticholinergic effects in patients ≥65 years (especially with falls or cognitive impairment).",
        recommendation: "Stop / switch to safer alternative",
      },
    ],
  },
  {
    id: "zolpidem",
    name: "Zolpidem",
    class: "Sedative-hypnotic (Z-drug)",
    standardDose: "5–10 mg PO HS",
    geriatricGuidelines: [
      {
        type: "Beers",
        ruleDescription:
          "Non-benzodiazepine receptor agonist; increased risk of falls, fractures, delirium, and next-day impairment.",
        recommendation: "Avoid",
      },
      {
        type: "STOPP",
        ruleDescription:
          "STOPP: Hypnotic Z-drugs in older adults due to fall and fracture risk.",
        recommendation: "Stop; use non-pharmacologic sleep measures first",
      },
    ],
  },
  {
    id: "cefixime",
    name: "Cefixime",
    class: "3rd-generation cephalosporin",
    standardDose: "400 mg PO daily (adult)",
    pediatricDoseRule: "Cefixime: 8 mg/kg/day PO (often as single dose or divided BID)",
    pediatricMgPerKgDay: 8,
    pediatricDoseUnit: "mg/kg/day",
    renalAdjustmentLimit: 60,
    renalNote: "Extend interval or reduce dose when CrCl falls; check local formulary.",
  },
  {
    id: "paracetamol",
    name: "Paracetamol (Acetaminophen)",
    class: "Analgesic / antipyretic",
    standardDose: "500–1000 mg PO q6–8h (max 3–4 g/day adult)",
    pediatricDoseRule: "Paracetamol: 10–15 mg/kg/dose PO q4–6h (max per day per age/weight)",
    pediatricMgPerKgDay: 12.5,
    pediatricDoseUnit: "mg/kg/dose",
    renalAdjustmentLimit: 30,
    renalNote: "Use cautiously in advanced CKD; avoid chronic high doses.",
  },
  {
    id: "ciprofloxacin",
    name: "Ciprofloxacin",
    class: "Fluoroquinolone",
    standardDose: "250–750 mg PO BID",
    renalAdjustmentLimit: 50,
    renalNote: "Reduce dose / extend interval when CrCl < 50 mL/min.",
  },
  {
    id: "calcium-carbonate",
    name: "Calcium Carbonate",
    class: "Antacid / calcium supplement",
    standardDose: "500–1000 mg elemental Ca PO with meals",
  },
  {
    id: "amiodarone",
    name: "Amiodarone",
    class: "Class III antiarrhythmic",
    standardDose: "200 mg PO daily (maintenance)",
    geriatricGuidelines: [
      {
        type: "Beers",
        ruleDescription:
          "Amiodarone may be appropriate for arrhythmia but requires monitoring; avoid as first-line for AF rate control in some contexts.",
        recommendation: "Use with monitoring; prefer safer options when possible",
      },
    ],
  },
  {
    id: "digoxin",
    name: "Digoxin",
    class: "Cardiac glycoside",
    standardDose: "0.125–0.25 mg PO daily",
    renalAdjustmentLimit: 50,
    renalNote: "Reduce dose / increase monitoring when CrCl reduced; toxicity risk rises.",
    geriatricGuidelines: [
      {
        type: "Beers",
        ruleDescription:
          "Avoid as first-line for AF rate control; higher toxicity risk if doses >0.125 mg/day in older adults.",
        recommendation: "Reduce dose / reconsider indication",
      },
      {
        type: "STOPP",
        ruleDescription:
          "STOPP: Digoxin at doses >125 mcg/day with renal impairment in older adults.",
        recommendation: "Reduce dose",
      },
    ],
  },
  {
    id: "clopidogrel",
    name: "Clopidogrel",
    class: "P2Y12 inhibitor (antiplatelet)",
    standardDose: "75 mg PO daily",
  },
  {
    id: "omeprazole",
    name: "Omeprazole",
    class: "PPI",
    standardDose: "20–40 mg PO daily",
    geriatricGuidelines: [
      {
        type: "Beers",
        ruleDescription:
          "Avoid scheduled PPI use >8 weeks without strong indication (C. diff, bone loss, B12 risk).",
        recommendation: "Deprescribe if no indication",
      },
    ],
  },
  {
    id: "pantoprazole",
    name: "Pantoprazole",
    class: "PPI",
    standardDose: "40 mg PO daily",
  },
  {
    id: "enalapril",
    name: "Enalapril",
    class: "ACE inhibitor",
    standardDose: "2.5–20 mg PO BID",
    renalAdjustmentLimit: 30,
    renalNote: "Start low / titrate cautiously in CKD; monitor K+ and creatinine.",
  },
  {
    id: "ramipril",
    name: "Ramipril",
    class: "ACE inhibitor",
    standardDose: "1.25–10 mg PO daily",
    renalAdjustmentLimit: 30,
    renalNote: "Dose-adjust in significant CKD; monitor electrolytes.",
  },
  {
    id: "amoxicillin",
    name: "Amoxicillin",
    class: "Penicillin antibiotic",
    standardDose: "250–500 mg PO TID (adult)",
    pediatricDoseRule: "Amoxicillin: 40–90 mg/kg/day PO divided q8–12h",
    pediatricMgPerKgDay: 45,
    pediatricDoseUnit: "mg/kg/day",
    renalAdjustmentLimit: 30,
    renalNote: "Extend dosing interval in severe renal impairment.",
  },
  {
    id: "metformin",
    name: "Metformin",
    class: "Biguanide",
    standardDose: "500–1000 mg PO BID",
    renalAdjustmentLimit: 45,
    renalNote: "Reassess / avoid when eGFR/CrCl too low (lactic acidosis risk).",
  },
  {
    id: "warfarin",
    name: "Warfarin",
    class: "Vitamin K antagonist",
    standardDose: "Individualized INR-guided dosing",
  },
];

export const interactionsDB: PracticalInteraction[] = [
  {
    drugAId: "ciprofloxacin",
    drugBId: "calcium-carbonate",
    severity: "Moderate",
    clinicalEffect:
      "Calcium chelates ciprofloxacin in the gut, markedly reducing fluoroquinolone absorption and clinical efficacy.",
    managementAction:
      "Separate administration; prefer taking ciprofloxacin 2 hours before or 4–6 hours after calcium products.",
    timingAdjustment: "Administer Ciprofloxacin 2–4 hours apart from Calcium Carbonate",
    isPracticallyDocumented: true,
  },
  {
    drugAId: "amiodarone",
    drugBId: "digoxin",
    severity: "Major",
    clinicalEffect:
      "Amiodarone inhibits P-gp and reduces digoxin clearance, raising digoxin levels and toxicity risk (bradycardia, GI, visual, arrhythmias).",
    managementAction:
      "Decrease Digoxin dose by approximately 50% when starting Amiodarone; monitor digoxin level and HR closely.",
    isPracticallyDocumented: true,
  },
  {
    drugAId: "clopidogrel",
    drugBId: "omeprazole",
    severity: "Major",
    clinicalEffect:
      "Omeprazole inhibits CYP2C19, reducing activation of clopidogrel and attenuating antiplatelet effect (higher CV event risk in practice).",
    managementAction:
      "Switch Omeprazole to Pantoprazole (or another weaker CYP2C19 inhibitor PPI) if gastroprotection is required.",
    isPracticallyDocumented: true,
  },
];

export function searchDrugs(query: string): DrugRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return drugsDB.slice(0, 12);
  return drugsDB.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.class.toLowerCase().includes(q) ||
      d.id.includes(q),
  );
}

export function getDrugById(id: string): DrugRecord | undefined {
  return drugsDB.find((d) => d.id === id);
}
