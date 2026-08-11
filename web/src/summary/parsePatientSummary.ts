import { stripModelThinking } from "../lib/stripModelThinking";
import type { PatientSummary } from "./types";
import { withSortedAdmissions } from "./types";

function isSummaryShape(data: unknown): data is PatientSummary {
  if (!data || typeof data !== "object") return false;
  const o = data as PatientSummary;
  return Array.isArray(o.admissions);
}

function stripFences(raw: string): string {
  const trimmed = stripModelThinking(raw).trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence?.[1]?.trim() ?? trimmed;
}

/** Parse single PatientSummary (legacy). */
export function parsePatientSummaryJson(raw: string): {
  ok: true;
  summary: PatientSummary;
} | {
  ok: false;
  error: string;
} {
  const multi = parsePatientSummariesJson(raw);
  if (!multi.ok) return multi;
  if (multi.patients.length === 0) {
    return { ok: false, error: "No patients found in response." };
  }
  return { ok: true, summary: multi.patients[0] };
}

/**
 * Parse LLM output as one or many patients.
 * Accepts: { patients: [...] } | [...] | single PatientSummary object.
 */
export function parsePatientSummariesJson(raw: string): {
  ok: true;
  patients: PatientSummary[];
} | {
  ok: false;
  error: string;
} {
  const jsonText = stripFences(raw);
  if (!jsonText) return { ok: false, error: "Empty input." };

  try {
    const data = JSON.parse(jsonText) as unknown;

    if (Array.isArray(data)) {
      const patients = data
        .filter(isSummaryShape)
        .map((p) => withSortedAdmissions(p));
      if (patients.length === 0) {
        return { ok: false, error: "Array had no valid patient summaries." };
      }
      return { ok: true, patients };
    }

    if (data && typeof data === "object" && "patients" in data) {
      const list = (data as { patients: unknown }).patients;
      if (!Array.isArray(list)) {
        return { ok: false, error: "patients must be an array." };
      }
      const patients = list
        .filter(isSummaryShape)
        .map((p) => withSortedAdmissions(p));
      if (patients.length === 0) {
        return { ok: false, error: "No valid patients in patients[]." };
      }
      return { ok: true, patients };
    }

    if (isSummaryShape(data)) {
      return { ok: true, patients: [withSortedAdmissions(data)] };
    }

    return { ok: false, error: "Unrecognized summary JSON shape." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
}
