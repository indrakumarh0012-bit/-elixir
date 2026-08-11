import { medicalBooksDB, type MedicalTextbook } from "../data/medicalBooksDB";
import { citeBook } from "../data/textbookEditions";
import type { PatientSummary } from "../summary/types";
import { withSortedAdmissions } from "../summary/types";
import { conditionsFromSummary } from "./textbookClinicalShared";

export type TextbookPick = {
  specialtyLenses: string[];
  citations: string[];
  books: MedicalTextbook[];
  rationale: string;
};

const DISEASE_TO_SPECIALTY: { re: RegExp; specialty: string }[] = [
  { re: /\b(pregnan|obstetric|labour|labor|pph|eclampsia|preeclamp|gyna?ec|ovarian|uterine|caesarean|cesarean|anc)\b/i, specialty: "Obstetrics & Gynecology" },
  { re: /\b(neonat|preterm|nicu|newborn)\b/i, specialty: "Pediatrics" },
  { re: /\b(pedia|infant|child|bronchiolitis|kwashiorkor|marasmus|febrile seizure|nephrotic)\b/i, specialty: "Pediatrics" },
  { re: /\b(mi\b|acs|heart failure|arrhythmia|angina|cad|cardiomyopathy|hypertension|htn)\b/i, specialty: "Cardiology" },
  { re: /\b(cirrhosis|hepatitis|ibd|crohn|ulcerative colitis|pancreatit|gerd|peptic)\b/i, specialty: "Gastroenterology" },
  { re: /\b(fracture|orthop|arthritis|osteomyelitis|ddh|scoliosis)\b/i, specialty: "Orthopedics" },
  { re: /\b(appendic|hernia|cholecyst|peritonit|trauma|wound|abscess|surgical)\b/i, specialty: "Surgery" },
  { re: /\b(psoriasis|eczema|scabies|tinea|dermatit|vitiligo|acne)\b/i, specialty: "Dermatology" },
  { re: /\b(otitis|sinusitis|tonsill|epistaxis|ent\b|hearing)\b/i, specialty: "ENT" },
  { re: /\b(conjunctiv|cataract|glaucoma|myopia|ophthal|eye)\b/i, specialty: "Ophthalmology" },
  { re: /\b(depress|anxiety|psychos|schizophren|bipolar|suicid)\b/i, specialty: "Psychiatry" },
  { re: /\b(pneumonia|asthma|copd|sepsis|diabetes|ckd|anemia|typhoid|uti|meningitis|stroke|tb\b)\b/i, specialty: "General Medicine" },
];

function ageSuggestsPediatrics(summary: PatientSummary): boolean {
  const a = summary.age;
  if (typeof a === "number") return a < 18;
  const s = String(a).toLowerCase();
  if (/\b(day|month|mo|yr|year|infant|neonate|child)\b/.test(s)) {
    const n = parseFloat(s);
    if (Number.isFinite(n) && /year|yr/.test(s) && n < 18) return true;
    if (/day|month|mo|infant|neonate|child/.test(s)) return true;
  }
  return false;
}

/**
 * Auto-select only necessary latest-edition textbooks from disease + age +
 * clinician specialty hint (includes superspecialty titles when indicated).
 */
export function selectTextbooksForPatient(
  summary: PatientSummary,
  specialtyHint = "General Medicine",
): TextbookPick {
  const s = withSortedAdmissions(summary);
  const blob = [
    specialtyHint,
    ...conditionsFromSummary(s),
    ...s.admissions.flatMap((a) => a.clinicalPresentation),
    ...s.admissions.flatMap((a) => a.treatmentGiven.map((d) => d.genericName)),
  ].join(" ");

  const lenses = new Set<string>();
  if (specialtyHint && specialtyHint !== "Auto") lenses.add(specialtyHint);
  if (ageSuggestsPediatrics(s)) lenses.add("Pediatrics");

  for (const rule of DISEASE_TO_SPECIALTY) {
    if (rule.re.test(blob)) lenses.add(rule.specialty);
  }
  if (lenses.size === 0) lenses.add("General Medicine");

  // Prefer PG/Superspecialty first, then manuals, then UG
  const levelRank = (lvl: MedicalTextbook["level"]) =>
    lvl === "PG / Superspecialty" ? 0 : lvl === "Clinical Manual" ? 1 : 2;

  const picked: MedicalTextbook[] = [];
  const seen = new Set<string>();
  for (const lens of lenses) {
    const pool = medicalBooksDB
      .filter((b) => b.specialty === lens)
      .sort((a, b) => levelRank(a.level) - levelRank(b.level));
    for (const b of pool.slice(0, 4)) {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        picked.push(b);
      }
    }
  }

  // Always include a core medicine/peds anchor if empty
  if (picked.length === 0) {
    const core = medicalBooksDB.find((b) => b.id === "harrison-im");
    if (core) picked.push(core);
  }

  const citations = picked.slice(0, 8).map((b) => citeBook(b.id, b.title));
  return {
    specialtyLenses: Array.from(lenses),
    citations,
    books: picked.slice(0, 8),
    rationale: `Auto-selected for: ${Array.from(lenses).join(", ")}`,
  };
}
