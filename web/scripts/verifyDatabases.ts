/**
 * Database integrity + behavior verification.
 * Run: npx tsx scripts/verifyDatabases.ts
 * Exits non-zero on any failure.
 */
import { drugsDB, interactionsDB, getDrugById } from "../src/clinical/clinicalData";
import { analyzeRegimen } from "../src/clinical/AnalysisEngine";
import { buildRenalDoseReport, searchRenalDrugs } from "../src/lib/renalDoseAdjust";
import { pediatricDrugsDB, dosesPerDayFromFrequency } from "../src/data/pediatricDrugs";
import type { DrugRecord } from "../src/clinical/types";

let failures: string[] = [];
const fail = (msg: string) => failures.push(msg);
const section = (name: string) => console.log(`\n=== ${name} ===`);

// ---------- 1. Adult DB integrity ----------
section("Adult drugsDB integrity");
{
  const ids = new Set<string>();
  for (const d of drugsDB) {
    if (ids.has(d.id)) fail(`duplicate adult drug id: ${d.id}`);
    ids.add(d.id);
    if (!d.name.trim() || !d.class.trim() || !d.standardDose.trim())
      fail(`empty field on ${d.id}`);
    if (d.renalAdjustmentLimit != null && (d.renalAdjustmentLimit <= 0 || d.renalAdjustmentLimit > 90))
      fail(`implausible renal limit on ${d.id}: ${d.renalAdjustmentLimit}`);
  }
  console.log(`drugs: ${drugsDB.length}, unique ids OK: ${ids.size === drugsDB.length}`);
}

// ---------- 2. Interactions integrity ----------
section("interactionsDB integrity");
{
  const seen = new Set<string>();
  for (const ix of interactionsDB) {
    if (!getDrugById(ix.drugAId)) fail(`interaction references missing drug: ${ix.drugAId}`);
    if (!getDrugById(ix.drugBId)) fail(`interaction references missing drug: ${ix.drugBId}`);
    if (ix.drugAId === ix.drugBId) fail(`self-interaction: ${ix.drugAId}`);
    const key = [ix.drugAId, ix.drugBId].sort().join("|");
    if (seen.has(key)) fail(`duplicate interaction pair: ${key}`);
    seen.add(key);
    if (!ix.clinicalEffect.trim() || !ix.managementAction.trim())
      fail(`empty effect/action on ${key}`);
  }
  console.log(`interactions: ${interactionsDB.length}, all reference real drugs`);
}

// ---------- 3. Renal bands: full coverage, no gaps/overlaps ----------
section("Renal band coverage sweep");
{
  const renalDrugs = searchRenalDrugs("");
  // searchRenalDrugs caps at 40 — go direct:
  const all = drugsDB.filter((d) => d.renalAdjustmentLimit != null);
  let checked = 0;
  for (const drug of all) {
    for (let crCl = 0; crCl <= 130; crCl += 5) {
      const rep = buildRenalDoseReport(drug, crCl);
      if (rep.bands.length > 0) {
        const active = rep.bands.filter((b) => crCl >= b.minCrCl && crCl <= (b.maxCrCl ?? Infinity));
        if (active.length === 0) fail(`${drug.id}: NO band covers CrCl ${crCl}`);
        if (active.length > 1) fail(`${drug.id}: ${active.length} bands overlap at CrCl ${crCl}`);
      }
      if (rep.recommendations.length === 0) fail(`${drug.id}: no recommendation at CrCl ${crCl}`);
      checked++;
    }
  }
  console.log(`renal drugs: ${all.length}; band lookups checked: ${checked}`);
  console.log(`renal search page cap: ${renalDrugs.length}`);
}

// ---------- 4. 100 renal spot-cases with expected actions ----------
section("Renal spot cases");
{
  const expect: [string, number, RegExp][] = [
    ["famciclovir", 70, /500 mg PO TID/], ["famciclovir", 50, /q12h/], ["famciclovir", 30, /q24h/], ["famciclovir", 10, /250 mg/],
    ["valacyclovir", 60, /1 g PO TID/], ["valacyclovir", 40, /q12h/], ["valacyclovir", 20, /q24h/], ["valacyclovir", 5, /500 mg/],
    ["acyclovir-adult", 30, /5×\/day/], ["acyclovir-adult", 15, /q8h/], ["acyclovir-adult", 5, /q12h/],
    ["oseltamivir-adult", 80, /75 mg PO BD/], ["oseltamivir-adult", 45, /30 mg PO BD/], ["oseltamivir-adult", 20, /once daily/],
    ["metformin", 70, /1 g BD/], ["metformin", 50, /Continue/], ["metformin", 35, /HALVE/], ["metformin", 20, /STOP/],
    ["sitagliptin", 50, /100 mg/], ["sitagliptin", 35, /50 mg/], ["sitagliptin", 20, /25 mg/],
    ["apixaban", 50, /5 mg PO BD/], ["apixaban", 20, /2\.5 mg/], ["apixaban", 10, /Avoid/],
    ["rivaroxaban", 60, /20 mg/], ["rivaroxaban", 30, /15 mg/], ["rivaroxaban", 10, /Avoid/],
    ["dabigatran", 60, /150 mg/], ["dabigatran", 40, /110 mg/], ["dabigatran", 20, /Avoid/],
    ["digoxin", 70, /0\.125–0\.25/], ["digoxin", 45, /half/], ["digoxin", 20, /alternate days/],
    ["gabapentin", 90, /standard/i], ["gabapentin", 60, /1800/], ["gabapentin", 40, /900/], ["gabapentin", 20, /600/], ["gabapentin", 10, /once daily/],
    ["pregabalin", 70, /150–600/], ["pregabalin", 45, /HALVE/], ["pregabalin", 20, /25–150/],
    ["colchicine", 60, /0\.5 mg BD/], ["colchicine", 40, /once daily/], ["colchicine", 20, /alternate days/], ["colchicine", 5, /Avoid/],
    ["allopurinol", 70, /100–300/], ["allopurinol", 45, /100 mg daily/], ["allopurinol", 15, /50–100/],
    ["cotrimoxazole", 50, /960/], ["cotrimoxazole", 20, /HALVE/], ["cotrimoxazole", 10, /Avoid/],
    ["fluconazole", 60, /Standard/], ["fluconazole", 30, /HALVE/],
    ["memantine", 40, /10 mg PO BD/], ["memantine", 20, /5 mg PO BD/],
    ["amantadine", 60, /100 mg PO daily/], ["amantadine", 40, /once daily/], ["amantadine", 20, /alternate/], ["amantadine", 10, /Avoid/],
    ["tramadol", 50, /q6h/], ["tramadol", 20, /q12h/], ["tramadol", 5, /Avoid/],
    ["silodosin", 60, /8 mg/], ["silodosin", 40, /4 mg/], ["silodosin", 20, /Avoid/],
    ["solifenacin", 50, /5–10 mg/], ["solifenacin", 20, /Max 5 mg/],
    ["alendronate", 50, /70 mg/], ["alendronate", 30, /Avoid/],
    ["trimetazidine", 70, /35 mg MR PO BD/], ["trimetazidine", 45, /once daily/], ["trimetazidine", 20, /Avoid/],
    ["glibenclamide", 70, /avoid in elderly/i], ["glibenclamide", 40, /Avoid/],
    ["vildagliptin", 60, /50 mg PO BD/], ["vildagliptin", 30, /once daily/],
    ["levetiracetam", 90, /500–1500/], ["levetiracetam", 60, /500–1000/], ["levetiracetam", 40, /250–750/], ["levetiracetam", 20, /250–500/],
    ["spironolactone", 60, /25–50/], ["spironolactone", 40, /Max 25/], ["spironolactone", 20, /Avoid/],
    ["enalapril", 50, /standard/i], ["enalapril", 20, /2\.5 mg daily/],
    ["atenolol", 50, /25–100/], ["atenolol", 25, /Max 50/], ["atenolol", 10, /Max 25/],
    ["amikacin", 70, /once daily/], ["amikacin", 50, /q36h/], ["amikacin", 30, /q48h/], ["amikacin", 10, /Avoid/],
    ["famotidine", 60, /20–40/], ["famotidine", 30, /HALVE/],
    ["fenofibrate", 70, /145–160/], ["fenofibrate", 45, /alternate-day|third/], ["fenofibrate", 20, /Avoid/],
    ["dapagliflozin", 60, /10 mg/], ["dapagliflozin", 30, /do not initiate/i], ["dapagliflozin", 10, /Do not initiate/],
    ["warfarin", 20, /INR/],
    ["nitrofurantoin", 70, /100 mg PO BID/], ["nitrofurantoin", 40, /Avoid/],
    ["meropenem", 60, /1 g IV q8h/], ["meropenem", 30, /q12h/], ["meropenem", 15, /500 mg IV q12h/], ["meropenem", 5, /q24h/],
  ];
  let pass = 0;
  for (const [id, crCl, re] of expect) {
    const drug = getDrugById(id);
    if (!drug) { fail(`spot-case drug missing: ${id}`); continue; }
    const rep = buildRenalDoseReport(drug, crCl);
    const text = rep.recommendations.join(" | ");
    if (re.test(text)) pass++;
    else fail(`${id} @ CrCl ${crCl}: expected ${re} — got "${text.slice(0, 120)}"`);
  }
  console.log(`renal spot cases: ${pass}/${expect.length} pass`);
}

// ---------- 5. 100 polypharmacy regimens ----------
section("100 random elderly regimens");
{
  let rngState = 42;
  const rng = () => (rngState = (rngState * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  let ok = 0;
  for (let i = 0; i < 100; i++) {
    const n = 3 + Math.floor(rng() * 6);
    const meds: DrugRecord[] = [];
    while (meds.length < n) {
      const d = drugsDB[Math.floor(rng() * drugsDB.length)];
      if (!meds.some((m) => m.id === d.id)) meds.push(d);
    }
    const age = 65 + Math.floor(rng() * 26);
    try {
      const rep = analyzeRegimen(
        { ageYears: age, weightKg: 45 + Math.floor(rng() * 40), creatinineMgDl: 0.7 + rng() * 2, sex: rng() > 0.5 ? "Male" : "Female", conditions: ["Hypertension", "Type 2 Diabetes"] },
        meds,
      );
      if (rep.medicationCount !== n) fail(`regimen #${i}: med count ${rep.medicationCount} != ${n}`);
      if (rep.ageCategory !== "geriatric") fail(`regimen #${i}: age ${age} not geriatric`);
      ok++;
    } catch (e) {
      fail(`regimen #${i} CRASHED: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`regimens analyzed without crash: ${ok}/100`);

  // Known behaviors:
  const rx = (ids: string[]) => ids.map((i) => getDrugById(i)!).filter(Boolean);
  const p80 = { ageYears: 80, weightKg: 60, creatinineMgDl: 1.0, sex: "Male" as const, conditions: [] };

  const nitrate = analyzeRegimen(p80, rx(["sildenafil", "isosorbide-mononitrate"]));
  if (!nitrate.interactions.some((x) => x.interaction.severity === "Contraindicated"))
    fail("sildenafil + nitrate NOT flagged Contraindicated");
  else console.log("sildenafil + nitrate → Contraindicated ✓");

  const mtx = analyzeRegimen(p80, rx(["methotrexate", "cotrimoxazole"]));
  if (!mtx.interactions.some((x) => x.interaction.severity === "Contraindicated"))
    fail("MTX + cotrimoxazole NOT flagged");
  else console.log("methotrexate + cotrimoxazole → Contraindicated ✓");

  const beers = analyzeRegimen(p80, rx(["glibenclamide", "oxybutynin", "diazepam-adult", "indomethacin"]));
  if (beers.geriatricAlerts.filter((g) => g.type === "Beers").length < 4)
    fail(`Beers quartet: only ${beers.geriatricAlerts.filter((g) => g.type === "Beers").length}/4 alerts`);
  else console.log("Beers quartet (glibenclamide/oxybutynin/diazepam/indomethacin) → 4 alerts ✓");

  const arni = analyzeRegimen(p80, rx(["sacubitril-valsartan", "enalapril"]));
  if (!arni.interactions.some((x) => x.interaction.severity === "Contraindicated"))
    fail("ARNI + ACEI NOT flagged");
  else console.log("sacubitril-valsartan + enalapril → Contraindicated ✓");
}

// ---------- 5b. Drug-detail point analysis behavior ----------
section("Drug-by-drug analysis behavior");
{
  const rx = (ids: string[]) => ids.map((i) => getDrugById(i)!).filter(Boolean);
  const ckd80 = { ageYears: 80, weightKg: 55, creatinineMgDl: 2.2, sex: "Female" as const, conditions: [] };
  const rep = analyzeRegimen(ckd80, rx(["metformin", "famciclovir", "oxybutynin", "ibuprofen", "naproxen", "donepezil"]));

  if (rep.drugDetails.length !== 6) fail(`drugDetails length ${rep.drugDetails.length} != 6`);
  const byId = Object.fromEntries(rep.drugDetails.map((d) => [d.drugId, d]));

  // CrCl for 80y/55kg/Cr2.2 F = (140-80)*55/(72*2.2)*0.85 ≈ 17.7 → metformin STOP band
  if (rep.estimatedCrClMlMin == null || Math.abs(rep.estimatedCrClMlMin - 17.7) > 0.5)
    fail(`CrCl calc off: ${rep.estimatedCrClMlMin}`);
  if (byId.metformin.verdict !== "stop-or-review" || !byId.metformin.renalPoints.join(" ").includes("STOP"))
    fail(`metformin at CrCl 17.7 should be stop-or-review with STOP point; got ${byId.metformin.verdict}`);
  if (!byId.famciclovir.renalPoints.join(" ").includes("250 mg"))
    fail("famciclovir at CrCl 17.7 should show 250 mg band");
  if (byId.oxybutynin.verdict !== "stop-or-review" || byId.oxybutynin.beersPoints.length === 0)
    fail("oxybutynin should be Beers stop-or-review");
  if (!byId.oxybutynin.anticholinergic) fail("oxybutynin not marked anticholinergic");
  if (byId.donepezil.interactionPoints.length === 0)
    fail("donepezil should list its oxybutynin interaction");
  if (!rep.therapeuticDuplications.some((d) => /NSAID/i.test(d.className)))
    fail("ibuprofen + naproxen duplication not flagged");
  if (rep.anticholinergicBurden.count !== 1) fail(`anticholinergic count ${rep.anticholinergicBurden.count} != 1`);

  const two = analyzeRegimen(ckd80, rx(["oxybutynin", "cinnarizine"]));
  if (two.anticholinergicBurden.count !== 2 || !/deprescribe/.test(two.anticholinergicBurden.note))
    fail("2-anticholinergic burden note wrong");

  const youngContinue = analyzeRegimen(
    { ageYears: 40, weightKg: 70, sex: "Male", conditions: [] },
    rx(["paracetamol", "cetirizine"]),
  );
  if (!youngContinue.drugDetails.every((d) => d.verdict === "continue"))
    fail("benign adult regimen should be all continue");
  console.log("point-wise analysis: verdicts, renal points, duplication, burden all correct");
}

// ---------- 5c. Growth centile bands ----------
section("Growth centile bands");
{
  const { centileBandLabel, zToPercentile } = await import("../src/lib/growthMath");
  const cases: [number, string][] = [
    [zToPercentile(0), "on the 50th centile line"],
    [zToPercentile(-1), "between the 10th and 25th centile lines"],
    [zToPercentile(-1.5), "between the 3rd and 10th centile lines"],
    [zToPercentile(-2), "below the 3rd centile line"],
    [zToPercentile(1), "between the 75th and 90th centile lines"],
    [zToPercentile(1.645), "between the 90th and 97th centile lines"],
    [zToPercentile(2.5), "above the 97th centile line"],
    [25, "on the 25th centile line"],
    [60, "between the 50th and 75th centile lines"],
    [96.8, "on the 97th centile line"],
  ];
  let pass = 0;
  for (const [pct, want] of cases) {
    const got = centileBandLabel(pct);
    if (got === want) pass++;
    else fail(`centile ${pct.toFixed(2)}: want "${want}" got "${got}"`);
  }
  console.log(`centile band cases: ${pass}/${cases.length} pass`);

  const { centileBandCompact } = await import("../src/lib/growthMath");
  const compact: [number, string][] = [
    [zToPercentile(0), "50th"],
    [zToPercentile(-1), "10th–25th"],
    [zToPercentile(-2), "<3rd"],
    [zToPercentile(2.5), ">97th"],
    [25.2, "25th"],
    [60, "50th–75th"],
    [5, "3rd–10th"],
  ];
  let cpass = 0;
  for (const [pct, want] of compact) {
    const got = centileBandCompact(pct);
    if (got === want) cpass++;
    else fail(`compact centile ${pct.toFixed(2)}: want "${want}" got "${got}"`);
  }
  console.log(`compact centile cases: ${cpass}/${compact.length} pass`);
}

// ---------- 5d. Z-band labels + CDC 5-18y reference ----------
section("Z bands and 5-18 y reference");
{
  const gm = await import("../src/lib/growthMath");
  const zCases: [number, string][] = [
    [0, "on the 0 SD line"],
    [-1.14, "between the −2 and −1 SD lines"],
    [-2.6, "between the −3 and −2 SD lines"],
    [-3.4, "below the −3 SD line"],
    [1.02, "on the +1 SD line"],
    [2.5, "between the +2 and +3 SD lines"],
    [3.6, "above the +3 SD line"],
  ];
  let zp = 0;
  for (const [z, want] of zCases) {
    const got = gm.zBandLabel(z);
    if (got === want) zp++;
    else fail(`zBand ${z}: want "${want}" got "${got}"`);
  }
  const zc: [number, string][] = [[0, "0"], [-1.14, "−2 to −1"], [-3.4, "<−3"], [2.5, "+2 to +3"]];
  for (const [z, want] of zc) {
    const got = gm.zBandCompact(z);
    if (got === want) zp++;
    else fail(`zBandCompact ${z}: want "${want}" got "${got}"`);
  }
  console.log(`z-band cases: ${zp}/${zCases.length + zc.length} pass`);

  // CDC self-consistency: feeding each month's median back must give z ≈ 0.
  const cdc = await import("../src/data/cdcGrowthReference");
  let cdcOk = 0, cdcN = 0;
  const sweep: [readonly (readonly number[])[], "male" | "female", "h" | "w"][] = [
    [cdc.CDC_HFA_BOYS, "male", "h"],
    [cdc.CDC_HFA_GIRLS, "female", "h"],
    [cdc.CDC_WFA_BOYS, "male", "w"],
    [cdc.CDC_WFA_GIRLS, "female", "w"],
  ];
  for (const [table, sex, kind] of sweep) {
    for (const [month, , m] of table) {
      const r = kind === "h" ? gm.heightForAge(m, month, sex) : gm.weightForAge(m, month, sex);
      cdcN++;
      if (r && Math.abs(r.z) < 0.01) cdcOk++;
      else fail(`CDC median feedback ${kind}/${sex} m${month}: z=${r?.z}`);
    }
  }
  console.log(`CDC median self-consistency: ${cdcOk}/${cdcN}`);

  // Known values: 18-y medians and classification behavior
  const b18 = gm.heightForAge(176.2, 216, "male");
  const g18 = gm.heightForAge(163.1, 216, "female");
  if (!b18 || Math.abs(b18.z) > 0.02) fail(`boy 18y 176.2 cm should be ~z0, got ${b18?.z}`);
  const short10 = gm.heightForAge(120, 120, "male"); // 10-y boy, 120 cm ≈ -2.5 SD
  if (!short10 || short10.z > -2 || !/Stunted|short/i.test(short10.classification))
    fail(`10y boy 120 cm should flag short stature, got ${short10?.z} ${short10?.classification}`);
  const six = gm.weightForAge(20, 72, "male");
  if (!six || six.band !== "normal") fail(`6y boy 20 kg should be normal, got ${six?.z}`);
  if (six && !/CDC 2000/.test(six.reference)) fail("5-18y reference must say CDC 2000");
  if (b18 && g18) console.log(`18-y medians OK (boy z=${b18.z}, girl z=${g18.z}); 6-y and 10-y spot cases OK`);
  const over = gm.heightForAge(170, 220, "male");
  if (over !== null) fail("age > 216 months should return null");
}

// ---------- 6. Pediatric DB integrity ----------
section("Pediatric DB integrity");
{
  const ids = new Set<string>();
  for (const d of pediatricDrugsDB) {
    if (ids.has(d.id)) fail(`duplicate ped id: ${d.id}`);
    ids.add(d.id);
    if (d.defaultDoseMgPerKg > 0 && d.maxDosePerDayMg > 0) {
      // a 10 kg child at default dose must not exceed the daily max
      if (d.defaultDoseMgPerKg * 10 > d.maxDosePerDayMg)
        fail(`${d.id}: default dose × 10 kg (${d.defaultDoseMgPerKg * 10}) exceeds max/day ${d.maxDosePerDayMg}`);
    }
    if (dosesPerDayFromFrequency(d.defaultFrequency) !== d.defaultDosesPerDay)
      fail(`${d.id}: defaultFrequency ${d.defaultFrequency} ≠ defaultDosesPerDay ${d.defaultDosesPerDay}`);
    if (!d.formulations.length) fail(`${d.id}: no formulations`);
    for (const fm of d.formulations)
      if (!fm.commonBrandsIndia.length) fail(`${d.id}: formulation without brands`);
  }
  console.log(`pediatric drugs: ${pediatricDrugsDB.length}, unique + consistent`);
}

// ---------- Result ----------
console.log("\n========== VERIFY RESULT ==========");
if (failures.length) {
  console.log(`FAILURES: ${failures.length}`);
  for (const f of failures.slice(0, 40)) console.log(" -", f);
  process.exit(1);
}
console.log("ALL DATABASE CHECKS PASSED");
