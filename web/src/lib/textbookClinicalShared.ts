import type { PatientSummary } from "../summary/types";
import { withSortedAdmissions } from "../summary/types";

/** Shared: conditions for pathophysiology chips. */
export function conditionsFromSummary(summary: PatientSummary): string[] {
  const s = withSortedAdmissions(summary);
  const set = new Set<string>();
  for (const c of s.comorbidities) {
    if (c.trim()) set.add(c.trim());
  }
  for (const d of s.diagnoses ?? []) {
    if (d.trim()) set.add(d.trim());
  }
  return Array.from(set);
}

/** Strip "refer to textbook" style evasion from model output. */
export function stripReferLanguage(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const l = line.toLowerCase();
      if (/refer (to|the)|see (the )?(textbook|harrison|nelson|harriet|bailey)/i.test(l)) {
        return false;
      }
      if (/confirm (in|with|from) (the )?(latest|specialty|standard)/i.test(l)) {
        return false;
      }
      if (/should be (reviewed|confirmed|checked) in/i.test(l)) return false;
      if (/consult (your|a) (textbook|formulary|pharmacist)/i.test(l)) return false;
      return true;
    })
    .join("\n")
    .trim();
}
