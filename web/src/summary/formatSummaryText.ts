import type { PatientSummary } from "./types";
import { withSortedAdmissions } from "./types";

/** Plain-text performa for copy / download. */
export function formatPatientSummaryText(summary: PatientSummary): string {
  const s = withSortedAdmissions(summary);
  const lines: string[] = [
    "PATIENT SUMMARY",
    "================",
    `Name: ${s.name || "—"}`,
    `Sex: ${s.sex}`,
    `Age: ${s.age || "—"}`,
    `Hospital ID: ${s.hospitalId || "—"}`,
    `Patient ID: ${s.patientId || "—"}`,
    `Comorbidities: ${s.comorbidities.length ? s.comorbidities.join("; ") : "None"}`,
    "",
  ];

  s.admissions.forEach((adm, i) => {
    lines.push(`ADMISSION ${i + 1}: ${adm.admissionDate}`);
    lines.push("----------------");
    lines.push("Clinically Presented With:");
    adm.clinicalPresentation.forEach((c) => lines.push(`  • ${c}`));
    lines.push("");
    lines.push("On Examination:");
    lines.push(`  ${adm.examinationFindings || "—"}`);
    lines.push("");
    lines.push("Investigations — Abnormal:");
    adm.investigations.abnormal.forEach((x) => lines.push(`  • ${x}`));
    if (!adm.investigations.abnormal.length) lines.push("  —");
    lines.push("Investigations — Important Normals:");
    adm.investigations.importantNormal.forEach((x) => lines.push(`  • ${x}`));
    if (!adm.investigations.importantNormal.length) lines.push("  —");
    lines.push("");
    lines.push("Treatment Given:");
    if (!adm.treatmentGiven.length) lines.push("  —");
    adm.treatmentGiven.forEach((d, di) => {
      lines.push(`  Drug ${di + 1}: ${d.genericName}`);
      lines.push(`    Brand: ${d.brandName || "—"}`);
      lines.push(`    Contents: ${d.contents || "—"}`);
      lines.push(`    Class: ${d.drugClass || "—"}`);
      lines.push(`    Mechanism: ${d.mechanismOfAction || "—"}`);
      lines.push(`    Dosage: ${d.dosage || "—"}`);
      lines.push(`    Duration: ${d.duration || "—"}`);
      lines.push(`    Instructions: ${d.instructions || "—"}`);
      lines.push(`    Cautions: ${d.cautions || "—"}`);
      lines.push("");
    });
    lines.push("Advice on Discharge & Follow-Up:");
    adm.followUpAndAdvice.forEach((a) => lines.push(`  ✓ ${a}`));
    if (!adm.followUpAndAdvice.length) lines.push("  —");
    lines.push("");
  });

  return lines.join("\n");
}

export function downloadPatientSummary(summary: PatientSummary) {
  const text = formatPatientSummaryText(summary);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (summary.name || "patient").replace(/[^\w-]+/g, "_");
  a.href = url;
  a.download = `patient-summary-${safeName}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyPatientSummary(
  summary: PatientSummary,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatPatientSummaryText(summary));
    return true;
  } catch {
    return false;
  }
}
