import { drugsDB, getDrugById, interactionsDB } from "./clinicalData";
import type {
  AgeCategory,
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
  const hasHF = patient.conditions.some((c) =>
    c.toLowerCase().includes("heart failure"),
  );
  if (hasHF && !currentMeds.some(isAceInhibitor)) {
    alerts.push({
      relatedCondition: "Heart Failure",
      ruleDescription:
        "START: ACE inhibitor indicated in symptomatic heart failure with reduced ejection fraction (unless contraindicated).",
      recommendation:
        "Consider starting an ACE inhibitor (e.g., Enalapril or Ramipril) if not contraindicated; titrate and monitor K+/creatinine.",
    });
  }
  return alerts;
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
