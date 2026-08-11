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
  startAlerts: StartFinding[];
  pediatricDoses: PediatricDoseFinding[];
  renalAlerts: RenalFinding[];
  polypharmacyAlerts: PolypharmacyFinding[];
}
