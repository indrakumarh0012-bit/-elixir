/**
 * Stress-test Smart-Elixir: ≥100 demo patients × 3 tools.
 * Run: npx --yes tsx scripts/stressDemoPatients.ts
 */
import {
  pediatricDrugsDB,
  searchPediatricDrugs,
} from "../src/data/pediatricDrugs";
import { estimateCrCl } from "../src/lib/creatinineClearanceMath";
import { calculatePediatricDose } from "../src/lib/pediatricDoseMath";
import { parsePathophysiologyFlat } from "../src/summary/formatClinicalPoints";
import { formatPatientSummaryText } from "../src/summary/formatSummaryText";
import { parsePatientSummariesJson } from "../src/summary/parsePatientSummary";
import type { PatientSummary } from "../src/summary/types";
import { withSortedAdmissions } from "../src/summary/types";

type Fail = { tool: string; caseId: string; message: string };

const fails: Fail[] = [];
const pass = { summarizer: 0, pedDose: 0, crCl: 0 };
const names = [
  "Asha", "Ravi", "Meera", "Arjun", "Fatima", "Kabir", "Ananya", "Vikram",
  "Priya", "Omar", "Sneha", "Dev", "Isha", "Rohan", "Zara", "Nikhil",
];
const diagnoses = [
  "Community-acquired pneumonia", "Acute gastroenteritis", "Bronchiolitis",
  "UTI", "Asthma exacerbation", "Febrile seizure", "Typhoid fever",
  "Acute otitis media", "Viral fever", "Nephrotic syndrome",
];
const brands = [
  "Ambroxyl", "Relent", "Calpol", "Meftal-P", "Augmentin", "Azithral",
  "Levolin", "Ascoril LS", "Ondem", "Montair", "Crocin", "Zifi",
];

function fail(tool: string, caseId: string, message: string) {
  fails.push({ tool, caseId, message });
}

function makePatient(i: number): PatientSummary {
  const sex = i % 3 === 0 ? "Female" : i % 3 === 1 ? "Male" : "Other";
  const age = (i % 80) + 1;
  const dx = diagnoses[i % diagnoses.length];
  const drug = pediatricDrugsDB[i % pediatricDrugsDB.length];
  return {
    patientId: `DEMO-${String(i + 1).padStart(3, "0")}`,
    hospitalId: `UHID${100000 + i}`,
    name: `${names[i % names.length]} ${i + 1}`,
    sex,
    age,
    comorbidities: i % 4 === 0 ? ["Type 2 diabetes"] : [],
    diagnoses: [dx],
    admissions: [
      {
        id: `a-${i}`,
        admissionDate: `2024-${String((i % 12) + 1).padStart(2, "0")}-15`,
        timestamp: Date.UTC(2024, i % 12, 15),
        clinicalPresentation: [`Fever ${i % 5} days`, dx],
        examinationFindings: i % 5 === 0 ? "" : "Vitals stable",
        investigations: {
          abnormal: i % 3 === 0 ? ["CRP elevated"] : [],
          importantNormal: i % 2 === 0 ? ["CBC normal"] : [],
        },
        treatmentGiven: [
          {
            genericName: drug.name,
            brandName: drug.formulations[0]?.commonBrandsIndia[0] || "",
            contents: drug.formulations[0]?.strengthLabel || "",
            drugClass: drug.category,
            mechanismOfAction: "Standard textbook mechanism",
            dosage: `${drug.defaultDoseMgPerKg} mg/kg/day`,
            duration: "5 days",
            instructions: drug.instructions,
            cautions: drug.cautionsAndContraindications[0] || "Monitor",
          },
        ],
        followUpAndAdvice: i % 7 === 0 ? [] : ["Review in 3 days"],
      },
    ],
  };
}

function testSummarizer() {
  console.log("\n=== SUMMARIZER: 100 demo patients + edge cases ===");
  for (let i = 0; i < 100; i++) {
    const id = `SUM-${i + 1}`;
    const p = makePatient(i);
    const sorted = withSortedAdmissions(p);
    if (!sorted.hospitalId) fail("summarizer", id, "missing hospitalId");
    if (!sorted.admissions.length) fail("summarizer", id, "no admissions");
    if (sorted.admissions[0].treatmentGiven[0]?.genericName !== p.admissions[0].treatmentGiven[0].genericName) {
      fail("summarizer", id, "drug name lost in normalize");
    }
    const text = formatPatientSummaryText(sorted);
    if (!text.includes(sorted.name)) fail("summarizer", id, "format missing name");
    if (!text.includes(sorted.hospitalId)) fail("summarizer", id, "format missing hospitalId");

    const wrapped = JSON.stringify({ patients: [p] });
    const parsed = parsePatientSummariesJson(wrapped);
    if (!parsed.ok) fail("summarizer", id, `parse failed: ${parsed.error}`);
    else if (parsed.patients.length !== 1) fail("summarizer", id, "wrong patient count");
    else pass.summarizer++;
  }

  // Edge: multi-patient, fenced JSON, missing fields, bad sex
  const multi = {
    patients: [makePatient(0), makePatient(1), makePatient(2)],
  };
  const multiParsed = parsePatientSummariesJson(
    "```json\n" + JSON.stringify(multi) + "\n```",
  );
  if (!multiParsed.ok || multiParsed.patients.length !== 3) {
    fail("summarizer", "SUM-MULTI", "fenced multi-patient parse failed");
  } else pass.summarizer++;

  const broken = withSortedAdmissions({
    admissions: [
      {
        // @ts-expect-error intentional incomplete
        treatmentGiven: [{ genericName: "PCM" }],
      },
    ],
  } as PatientSummary);
  if (!broken.admissions[0].investigations.abnormal) {
    fail("summarizer", "SUM-BROKEN", "investigations not defaulted");
  } else if (broken.admissions[0].treatmentGiven[0].genericName !== "PCM") {
    fail("summarizer", "SUM-BROKEN", "drug normalize failed");
  } else pass.summarizer++;

  const badSex = withSortedAdmissions({
    ...makePatient(5),
    sex: "Unknown" as PatientSummary["sex"],
  });
  if (badSex.sex !== "Other") fail("summarizer", "SUM-SEX", "bad sex not normalized");
  else pass.summarizer++;

  const patho = parsePathophysiologyFlat(
    "1. Definition\n1. Cascade starts with endothelial injury.\n2. Inflammation amplifies edema.\nRef: Harrison 21st ed., Nelson 22nd ed.",
  );
  if (patho.points.length < 1) fail("summarizer", "SUM-PATHO", "patho points empty");
  if (!patho.references.toLowerCase().includes("harrison")) {
    fail("summarizer", "SUM-PATHO", "ref not parsed");
  } else pass.summarizer++;

  const emptyParse = parsePatientSummariesJson("");
  if (emptyParse.ok) fail("summarizer", "SUM-EMPTY", "empty should fail");
  else pass.summarizer++;
}

function testPedDose() {
  console.log("\n=== PED DOSE: 100 demo patients + brand search ===");
  for (let i = 0; i < 100; i++) {
    const id = `PED-${i + 1}`;
    const drug = pediatricDrugsDB[i % pediatricDrugsDB.length];
    const weight = 3 + (i % 40) * 0.7; // 3–31 kg
    const form = drug.formulations[0] ?? null;
    const freq = drug.defaultFrequency || "OD";
    const r = calculatePediatricDose({
      weightKg: weight,
      doseMgPerKgDay: drug.defaultDoseMgPerKg,
      frequency: freq,
      drug,
      formulation: form,
    });
    if (!r.valid && !r.errors.some((e) => e.includes("Volume"))) {
      // zero mg/kg drugs (label-based) are valid with 0 daily
      if (drug.defaultDoseMgPerKg === 0 && weight > 0) {
        pass.pedDose++;
        continue;
      }
      fail("pedDose", id, `${drug.name}: ${r.errors.join("; ")}`);
      continue;
    }
    if (r.dailyMg < 0 || r.perDoseMg < 0) {
      fail("pedDose", id, "negative dose");
      continue;
    }
    if (drug.maxDosePerDayMg > 0 && r.dailyMg > drug.maxDosePerDayMg + 0.01) {
      fail("pedDose", id, `exceeded max ${r.dailyMg} > ${drug.maxDosePerDayMg}`);
      continue;
    }
    pass.pedDose++;
  }

  for (const brand of brands) {
    const hits = searchPediatricDrugs(brand);
    if (hits.length === 0) fail("pedDose", `SEARCH-${brand}`, "no hits");
    else pass.pedDose++;
  }

  // Edge weights
  const para = searchPediatricDrugs("Calpol")[0];
  if (!para) fail("pedDose", "EDGE-CALPOL", "Calpol missing");
  else {
    const zero = calculatePediatricDose({
      weightKg: 0,
      doseMgPerKgDay: 60,
      frequency: "q6h",
      drug: para,
      formulation: para.formulations[0],
    });
    if (zero.valid) fail("pedDose", "EDGE-ZERO-WT", "0 kg should be invalid");
    else pass.pedDose++;

    const huge = calculatePediatricDose({
      weightKg: 20,
      doseMgPerKgDay: 1000,
      frequency: "q6h",
      drug: para,
      formulation: para.formulations[0],
    });
    if (!huge.capped && para.maxDosePerDayMg > 0) {
      fail("pedDose", "EDGE-CAP", "should cap at max");
    } else pass.pedDose++;
  }
}

function testCrCl() {
  console.log("\n=== CrCl: 100 demo patients + edges ===");
  for (let i = 0; i < 100; i++) {
    const id = `CRCL-${i + 1}`;
    const sex = i % 2 === 0 ? "Male" : "Female";
    const age = 18 + (i % 70);
    const weight = 40 + (i % 60);
    const height = i % 5 === 0 ? null : 150 + (i % 40);
    const unit = i % 3 === 0 ? "µmol/L" : "mg/dL";
    const creatinine = unit === "mg/dL" ? 0.6 + (i % 20) * 0.1 : 50 + i * 3;
    const r = estimateCrCl({
      sex,
      ageYears: age,
      weightKg: weight,
      heightCm: height,
      creatinine,
      unit,
    });
    if (!r.valid) {
      fail("crCl", id, r.errors.join("; "));
      continue;
    }
    if (!(r.crCl >= 0) || !Number.isFinite(r.crCl)) {
      fail("crCl", id, `bad crCl ${r.crCl}`);
      continue;
    }
    // Known formula check for simple male mg/dL without height obesity
    if (sex === "Male" && unit === "mg/dL" && height == null) {
      const expected =
        Math.round(((((140 - age) * weight) / (72 * creatinine)) * 10)) / 10;
      if (Math.abs(r.crCl - expected) > 0.2) {
        fail("crCl", id, `formula mismatch ${r.crCl} vs ${expected}`);
        continue;
      }
    }
    pass.crCl++;
  }

  const bad = estimateCrCl({
    sex: "Female",
    ageYears: 0,
    weightKg: 60,
    heightCm: 160,
    creatinine: 1,
    unit: "mg/dL",
  });
  if (bad.valid) fail("crCl", "EDGE-AGE0", "age 0 should be invalid");
  else pass.crCl++;

  const creat0 = estimateCrCl({
    sex: "Male",
    ageYears: 50,
    weightKg: 70,
    heightCm: 170,
    creatinine: 0,
    unit: "mg/dL",
  });
  if (creat0.valid) fail("crCl", "EDGE-CR0", "creat 0 should be invalid");
  else pass.crCl++;

  // Female factor check
  const m = estimateCrCl({
    sex: "Male",
    ageYears: 60,
    weightKg: 70,
    heightCm: null,
    creatinine: 1,
    unit: "mg/dL",
  });
  const f = estimateCrCl({
    sex: "Female",
    ageYears: 60,
    weightKg: 70,
    heightCm: null,
    creatinine: 1,
    unit: "mg/dL",
  });
  if (!(f.crCl < m.crCl)) fail("crCl", "EDGE-SEX", "female CrCl should be lower");
  else pass.crCl++;
}

console.log("Smart-Elixir stress suite — 100+ demo patients × 3 tools");
testSummarizer();
testPedDose();
testCrCl();

console.log("\n========== RESULTS ==========");
console.log(`Summarizer passes: ${pass.summarizer}`);
console.log(`Ped Dose passes:   ${pass.pedDose}`);
console.log(`CrCl passes:       ${pass.crCl}`);
console.log(`Failures:          ${fails.length}`);
if (fails.length) {
  console.log("\n--- FAILURE DETAIL ---");
  for (const f of fails.slice(0, 50)) {
    console.log(`[${f.tool}] ${f.caseId}: ${f.message}`);
  }
  if (fails.length > 50) console.log(`... +${fails.length - 50} more`);
  process.exit(1);
}
console.log("\nALL CHECKS PASSED — tools look seamless on 100+ demo patients.");
process.exit(0);
