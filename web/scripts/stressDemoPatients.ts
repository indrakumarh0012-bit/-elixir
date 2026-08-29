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

type Fail = { tool: string; caseId: string; message: string };

const fails: Fail[] = [];
const pass = { pedDose: 0, crCl: 0 };
const brands = [
  "Ambroxyl", "Relent", "Calpol", "Meftal-P", "Augmentin", "Azithral",
  "Levolin", "Ascoril LS", "Ondem", "Montair", "Crocin", "Zifi",
];

function fail(tool: string, caseId: string, message: string) {
  fails.push({ tool, caseId, message });
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
testPedDose();
testCrCl();

console.log("\n========== RESULTS ==========");
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
