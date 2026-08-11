export interface TreatmentDrug {
  genericName: string;
  brandName: string;
  /** Formulation / composition e.g. "Amoxicillin 500 mg + Clavulanate 125 mg" */
  contents: string;
  /** Pharmacologic class e.g. "Beta-lactam / beta-lactamase inhibitor" */
  drugClass: string;
  /** Brief mechanism of action */
  mechanismOfAction: string;
  dosage: string;
  /** Full course detail e.g. "7 days total — IV 3 days then oral 4 days" */
  duration: string;
  /** How to take / administer */
  instructions: string;
  /** Warnings, contraindications, monitoring */
  cautions: string;
}

export interface HospitalAdmission {
  id: string;
  admissionDate: string;
  timestamp: number;
  clinicalPresentation: string[];
  examinationFindings: string;
  investigations: {
    abnormal: string[];
    importantNormal: string[];
  };
  treatmentGiven: TreatmentDrug[];
  followUpAndAdvice: string[];
}

export interface PatientSummary {
  patientId: string;
  /** Hospital / UH / IP number — shown prominently for easy copy */
  hospitalId: string;
  name: string;
  sex: "Male" | "Female" | "Other";
  age: number | string;
  comorbidities: string[];
  /** Working / discharge diagnoses for pathophysiology search */
  diagnoses?: string[];
  admissions: HospitalAdmission[];
  /** Textbook-based pathophysiology keyed by condition name */
  pathophysiologyByCondition?: Record<string, string>;
  /** Textbook cross-check of treatment pattern + alternatives */
  treatmentCritique?: string;
}

/** Sort admissions oldest → newest for timeline display. */
export function sortAdmissionsChronologically(
  admissions: HospitalAdmission[],
): HospitalAdmission[] {
  return [...admissions].sort((a, b) => a.timestamp - b.timestamp);
}

export function normalizeTreatmentDrug(
  raw: Partial<TreatmentDrug> & { genericName?: string },
): TreatmentDrug {
  return {
    genericName: raw.genericName?.trim() || "Unknown drug",
    brandName: raw.brandName?.trim() || "",
    contents: raw.contents?.trim() || "",
    drugClass: raw.drugClass?.trim() || "",
    mechanismOfAction: raw.mechanismOfAction?.trim() || "",
    dosage: raw.dosage?.trim() || "",
    duration: raw.duration?.trim() || "",
    instructions: raw.instructions?.trim() || "",
    cautions: raw.cautions?.trim() || "",
  };
}

export function withSortedAdmissions(summary: PatientSummary): PatientSummary {
  const sexRaw = String(summary.sex ?? "Other");
  const sex: PatientSummary["sex"] =
    sexRaw === "Male" || sexRaw === "Female" || sexRaw === "Other"
      ? sexRaw
      : "Other";

  return {
    ...summary,
    patientId: String(summary.patientId ?? "").trim(),
    hospitalId: String(summary.hospitalId ?? "").trim(),
    name: String(summary.name ?? "").trim(),
    sex,
    age: summary.age ?? "",
    comorbidities: Array.isArray(summary.comorbidities)
      ? summary.comorbidities.filter((c) => String(c).trim())
      : [],
    diagnoses: Array.isArray(summary.diagnoses)
      ? summary.diagnoses.filter((d) => String(d).trim())
      : summary.diagnoses,
    admissions: sortAdmissionsChronologically(
      (Array.isArray(summary.admissions) ? summary.admissions : []).map(
        (adm, i) => ({
          id: String(adm?.id ?? `adm-${i + 1}`),
          admissionDate: String(adm?.admissionDate ?? "Unknown date"),
          timestamp:
            typeof adm?.timestamp === "number" && Number.isFinite(adm.timestamp)
              ? adm.timestamp
              : Date.now() - (1000 - i) * 86400000,
          clinicalPresentation: Array.isArray(adm?.clinicalPresentation)
            ? adm.clinicalPresentation
            : [],
          examinationFindings: String(adm?.examinationFindings ?? ""),
          investigations: {
            abnormal: Array.isArray(adm?.investigations?.abnormal)
              ? adm.investigations.abnormal
              : [],
            importantNormal: Array.isArray(adm?.investigations?.importantNormal)
              ? adm.investigations.importantNormal
              : [],
          },
          treatmentGiven: (Array.isArray(adm?.treatmentGiven)
            ? adm.treatmentGiven
            : []
          ).map((d) => normalizeTreatmentDrug(d ?? {})),
          followUpAndAdvice: Array.isArray(adm?.followUpAndAdvice)
            ? adm.followUpAndAdvice
            : [],
        }),
      ),
    ),
  };
}
