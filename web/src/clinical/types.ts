export type AgeCategory = "pediatric" | "adult" | "geriatric";

export interface PatientProfile {
  ageYears: number;
  weightKg: number;
  creatinineMgDl?: number;
  sex?: "Male" | "Female";
  conditions: string[];
}

export interface GeriatricGuideline {
  type: "Beers" | "STOPP" | "START";
  ruleDescription: string;
  recommendation: string;
}

export interface DrugRecord {
  id: string;
  name: string;
  class: string;
  standardDose: string;
  pediatricDoseRule?: string;
  /** Used to compute mg/day when pediatric (mg/kg/day midpoint or fixed). */
  pediatricMgPerKgDay?: number;
  pediatricDoseUnit?: "mg/kg/day" | "mg/kg/dose";
  geriatricGuidelines?: GeriatricGuideline[];
  renalAdjustmentLimit?: number;
  renalNote?: string;
}

export interface PracticalInteraction {
  drugAId: string;
  drugBId: string;
  severity: "Contraindicated" | "Major" | "Moderate" | "Minor";
  clinicalEffect: string;
  managementAction: string;
  timingAdjustment?: string;
  isPracticallyDocumented: boolean;
}

export interface InteractionFinding {
  interaction: PracticalInteraction;
  drugAName: string;
  drugBName: string;
}

export interface PediatricDoseFinding {
  drugId: string;
  drugName: string;
  rule: string;
  calculatedDoseLabel: string;
}

export interface RenalFinding {
  drugId: string;
  drugName: string;
  renalAdjustmentLimit: number;
  note: string;
}

export interface StartFinding {
  ruleDescription: string;
  recommendation: string;
  relatedCondition: string;
}

/** Point-wise, per-drug breakdown for the polypharmacy report. */
export interface DrugPointAnalysis {
  drugId: string;
  drugName: string;
  drugClass: string;
  standardDose: string;
  /** Beers criteria points: "rule — recommendation" */
  beersPoints: string[];
  stoppPoints: string[];
  startPoints: string[];
  /** Renal guidance at this patient's calculated CrCl */
  renalPoints: string[];
  /** Interactions this drug participates in within the current regimen */
  interactionPoints: string[];
  anticholinergic: boolean;
  verdict: "stop-or-review" | "adjust" | "caution" | "continue";
}

export interface TherapeuticDuplication {
  className: string;
  drugNames: string[];
}

export interface AnticholinergicBurden {
  count: number;
  drugNames: string[];
  note: string;
}

/** A drug that is risky or wrong for one of this patient's conditions. */
export interface DiseaseDrugAlert {
  severity: "High" | "Moderate";
  drugId: string;
  drugName: string;
  condition: string;
  rule: string;
  recommendation: string;
}

export interface PolypharmacyFinding {
  severity: "High" | "Moderate" | "Info";
  title: string;
  detail: string;
  recommendation: string;
}

export interface RegimenAnalysisReport {
  ageCategory: AgeCategory;
  estimatedCrClMlMin: number | null;
  medicationCount: number;
  interactions: InteractionFinding[];
  geriatricAlerts: GeriatricGuideline[];
  drugDetails: DrugPointAnalysis[];
  therapeuticDuplications: TherapeuticDuplication[];
  anticholinergicBurden: AnticholinergicBurden;
  diseaseDrugAlerts: DiseaseDrugAlert[];
  startAlerts: StartFinding[];
  pediatricDoses: PediatricDoseFinding[];
  renalAlerts: RenalFinding[];
  polypharmacyAlerts: PolypharmacyFinding[];
}
