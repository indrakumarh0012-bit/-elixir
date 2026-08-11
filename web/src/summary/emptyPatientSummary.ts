import type { PatientSummary } from "../summary/types";

/** Blank performa until a PDF/notes analysis completes. */
export const EMPTY_PATIENT_SUMMARY: PatientSummary = {
  patientId: "",
  hospitalId: "",
  name: "",
  sex: "Other",
  age: "",
  comorbidities: [],
  admissions: [],
};
