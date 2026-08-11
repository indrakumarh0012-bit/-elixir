import { drugsDB, interactionsDB, searchDrugs, getDrugById } from "../src/clinical/clinicalData.ts";
import { analyzeRegimen } from "../src/clinical/AnalysisEngine.ts";
import { selectTextbooksForPatient } from "../src/lib/selectTextbooks.ts";
import { stripReferLanguage } from "../src/lib/textbookClinicalShared.ts";
import { withSortedAdmissions } from "../src/summary/types.ts";
import { EMPTY_PATIENT_SUMMARY } from "../src/summary/emptyPatientSummary.ts";

const ids = new Set(drugsDB.map((d) => d.id));
const missing: string[] = [];
for (const ix of interactionsDB) {
  if (!ids.has(ix.drugAId)) missing.push("A:" + ix.drugAId);
  if (!ids.has(ix.drugBId)) missing.push("B:" + ix.drugBId);
}
const dup = [...new Set(drugsDB.map((d) => d.id).filter((id, i, a) => a.indexOf(id) !== i))];

const meds = [
  "amiodarone",
  "digoxin",
  "clopidogrel",
  "omeprazole",
  "ciprofloxacin",
  "calcium-carbonate",
  "thyroxine",
]
  .map((id) => getDrugById(id))
  .filter(Boolean);

const report = analyzeRegimen(
  {
    ageYears: 72,
    weightKg: 68,
    creatinineMgDl: 1.4,
    sex: "Female",
    conditions: ["Heart Failure"],
  },
  meds as NonNullable<(typeof meds)[number]>[],
);

const pick = selectTextbooksForPatient(
  {
    ...EMPTY_PATIENT_SUMMARY,
    age: 5,
    diagnoses: ["Bronchiolitis"],
    comorbidities: ["Asthma"],
  },
  "General Medicine",
);

const stripped = stripReferLanguage(
  "1. Real patho point.\n2. Refer to Harrison for details.\n3. Another real point.\nRef: Harrison 21st ed.",
);

const sorted = withSortedAdmissions({
  ...EMPTY_PATIENT_SUMMARY,
  admissions: [
    {
      id: "b",
      admissionDate: "2024-06",
      timestamp: 200,
      clinicalPresentation: [],
      examinationFindings: "",
      investigations: { abnormal: [], importantNormal: [] },
      treatmentGiven: [],
      followUpAndAdvice: [],
    },
    {
      id: "a",
      admissionDate: "2023-01",
      timestamp: 100,
      clinicalPresentation: [],
      examinationFindings: "",
      investigations: { abnormal: [], importantNormal: [] },
      treatmentGiven: [],
      followUpAndAdvice: [],
    },
  ],
});

console.log(
  JSON.stringify(
    {
      drugCount: drugsDB.length,
      interactionCount: interactionsDB.length,
      missingInteractionIds: missing,
      duplicateIds: dup,
      amoxyclav: searchDrugs("amoxyclav")[0]?.id,
      shelcal: searchDrugs("shelcal")[0]?.id,
      interactionsFound: report.interactions.map(
        (i) => `${i.drugAName} + ${i.drugBName}`,
      ),
      crcl: report.estimatedCrClMlMin,
      pedBooks: pick.specialtyLenses,
      strippedHasRefer: /refer/i.test(stripped),
      stripKeptLines: stripped.split("\n").length,
      admissionOrder: sorted.admissions.map((a) => a.id),
    },
    null,
    2,
  ),
);

if (missing.length || dup.length) process.exit(1);
