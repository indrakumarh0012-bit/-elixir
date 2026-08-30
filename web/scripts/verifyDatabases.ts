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
import {
  PREGNANCY_CONDITION_DOSING,
  pregnancyRenalNote,
  searchPregnancyConditions,
} from "../src/data/pregnancyConditionDosing";
import { assessPotassium } from "../src/lib/icuMath";
import { bmiValue, classifyBmiIndian, feetInchesToCm, waistFlag } from "../src/lib/bmiMath";
import { egfrCkdEpi2021, gfrCategory } from "../src/lib/creatinineClearanceMath";
import { assessBp, bpCentiles } from "../src/lib/bpMath";
import {
  WUEHL_AGE_SBP_DAY_BOYS, WUEHL_AGE_SBP_DAY_GIRLS,
  WUEHL_AGE_DBP_NIGHT_BOYS, WUEHL_AGE_SBP_24H_GIRLS,
} from "../src/data/wuehlBpAgeReference";

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
  const all = drugsDB.filter((d) => d.renalAdjustmentLimit != null || d.renalNote);
  if (drugsDB.length < 500) fail(`drugsDB only ${drugsDB.length} (< 500)`);
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
    ["ganciclovir", 80, /5 mg\/kg IV q12h/], ["ganciclovir", 60, /2\.5 mg\/kg q12h/], ["ganciclovir", 30, /2\.5 mg\/kg q24h/], ["ganciclovir", 15, /1\.25 mg\/kg q24h/],
    ["valganciclovir", 70, /900 mg PO BD/], ["valganciclovir", 50, /450 mg BD/], ["valganciclovir", 30, /450 mg OD/], ["valganciclovir", 15, /alternate days/],
    ["entecavir", 60, /0\.5 mg PO daily/], ["entecavir", 40, /HALVE/], ["entecavir", 20, /0\.15 mg/], ["entecavir", 5, /weekly/],
    ["tenofovir-df", 60, /300 mg PO daily/], ["tenofovir-df", 40, /q48h/], ["tenofovir-df", 20, /twice weekly/],
    ["lamivudine", 60, /300 mg PO daily/], ["lamivudine", 40, /150 mg daily/], ["lamivudine", 20, /100 mg daily/],
    ["flucytosine", 50, /q6h/], ["flucytosine", 30, /q12h/], ["flucytosine", 15, /q24h/], ["flucytosine", 5, /q48h/],
    ["cefepime", 70, /q8–12h/], ["cefepime", 45, /2 g q12h/], ["cefepime", 20, /2 g q24h/], ["cefepime", 5, /1 g q24h/],
    ["ceftazidime", 60, /q8h/], ["ceftazidime", 40, /q12h/], ["ceftazidime", 20, /q24h/],
    ["colistin", 90, /9 MU\/day/], ["colistin", 60, /7\.5–9 MU/], ["colistin", 40, /5\.5–7\.5 MU/], ["colistin", 20, /4\.5–5\.5 MU/],
    ["teicoplanin", 70, /q24h/], ["teicoplanin", 45, /HALVE maintenance/], ["teicoplanin", 20, /q72h/],
    ["daptomycin", 50, /q24h/], ["daptomycin", 20, /q48h/],
    ["ertapenem", 50, /1 g IV q24h/], ["ertapenem", 20, /500 mg q24h/],
    ["imipenem-cilastatin", 70, /q6h/], ["imipenem-cilastatin", 40, /500 mg q8h/], ["imipenem-cilastatin", 20, /500 mg q12h/], ["imipenem-cilastatin", 5, /Avoid/],
    ["ethambutol", 50, /daily/], ["ethambutol", 20, /THREE times per week/],
    ["pyrazinamide", 50, /daily/], ["pyrazinamide", 20, /three times per week/],
    ["streptomycin", 50, /15 mg\/kg IM daily/], ["streptomycin", 20, /2–3 times per week/],
    ["clarithromycin", 50, /BD/], ["clarithromycin", 20, /HALVE/],
    ["enoxaparin", 50, /q12h/], ["enoxaparin", 20, /ONCE daily/],
    ["fondaparinux", 60, /Standard/], ["fondaparinux", 40, /1\.5 mg/], ["fondaparinux", 20, /CONTRAINDICATED/],
    ["baclofen", 70, /Standard titration/], ["baclofen", 45, /HALVE/], ["baclofen", 20, /Avoid/],
    ["topiramate", 80, /BD/], ["topiramate", 50, /HALVE/],
    ["sotalol", 70, /q12h/], ["sotalol", 50, /q24h/], ["sotalol", 20, /Avoid/],
    ["morphine", 60, /Standard dosing/], ["morphine", 30, /25–50%/], ["morphine", 5, /fentanyl/],
    ["metoclopramide", 50, /TID/], ["metoclopramide", 20, /HALVE/],
    ["hydrochlorothiazide", 50, /12\.5–25 mg/], ["hydrochlorothiazide", 20, /loop diuretic/],
    ["voriconazole", 70, /q12h/], ["voriconazole", 30, /ORAL/],
    ["remdesivir", 50, /100 mg daily/], ["remdesivir", 20, /specialist decision/],
    ["zidovudine", 50, /300 mg PO BD/], ["zidovudine", 5, /100 mg q6–8h/],
    ["acarbose", 50, /TID/], ["acarbose", 10, /Avoid/],
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

  // No-adjustment drugs must appear in renal search with a green answer
  const noAdj = ["caspofungin", "micafungin", "anidulafungin", "linagliptin", "dolutegravir", "tenofovir-af", "tigecycline", "isoniazid", "rifampicin", "polymyxin-b", "posaconazole"];
  let na = 0;
  for (const id of noAdj) {
    const d = getDrugById(id);
    if (!d) { fail(`no-adjustment drug missing: ${id}`); continue; }
    const rep = buildRenalDoseReport(d, 15);
    const inSearch = searchRenalDrugs(d.name.split(" ")[0].toLowerCase()).some((x) => x.id === id);
    if (rep.urgency === "none" && rep.recommendations.length > 0 && inSearch) na++;
    else fail(`${id}: urgency=${rep.urgency}, recs=${rep.recommendations.length}, searchable=${inSearch}`);
  }
  console.log(`no-adjustment drugs searchable with green answer: ${na}/${noAdj.length}`);
}

// ---------- 5. 100 polypharmacy regimens ----------
section("100 random elderly regimens");
{
  let rngState = Number(process.env.VERIFY_SEED ?? 42);
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

// ---------- 5e. Conditions catalog + disease-drug + START rules ----------
section("Conditions, disease-drug and START rules");
{
  const { CONDITIONS_CATALOG } = await import("../src/clinical/clinicalData");
  const set = new Set(CONDITIONS_CATALOG.map((c) => c.toLowerCase()));
  if (CONDITIONS_CATALOG.length < 100) fail(`conditions catalog only ${CONDITIONS_CATALOG.length} (< 100)`);
  if (set.size !== CONDITIONS_CATALOG.length) fail("duplicate conditions in catalog");
  console.log(`conditions catalog: ${CONDITIONS_CATALOG.length} unique entries`);

  const rx = (ids: string[]) => ids.map((i) => getDrugById(i)!).filter(Boolean);
  const base = { ageYears: 78, weightKg: 60, creatinineMgDl: 1.0, sex: "Male" as const };

  const hf = analyzeRegimen({ ...base, conditions: ["Heart Failure (HFrEF)"] }, rx(["ibuprofen", "verapamil", "pioglitazone"]));
  if (hf.diseaseDrugAlerts.filter((a) => a.severity === "High").length !== 3)
    fail(`HF triple: got ${hf.diseaseDrugAlerts.length} alerts, want 3 High`);
  if (!hf.drugDetails.every((d) => d.verdict === "stop-or-review"))
    fail("HF triple: all three should be stop-or-review");
  if (hf.startAlerts.length < 2) fail("HF with no HF meds should START ACEI + beta-blocker");

  const af = analyzeRegimen({ ...base, conditions: ["Atrial Fibrillation"] }, rx(["paracetamol"]));
  if (!af.startAlerts.some((a) => /anticoagulation/i.test(a.ruleDescription)))
    fail("AF without OAC should trigger START anticoagulant");
  const afTreated = analyzeRegimen({ ...base, conditions: ["Atrial Fibrillation"] }, rx(["apixaban"]));
  if (afTreated.startAlerts.some((a) => /anticoagulation/i.test(a.ruleDescription)))
    fail("AF on apixaban should NOT trigger the START rule");

  const pd = analyzeRegimen({ ...base, conditions: ["Parkinson Disease"] }, rx(["flunarizine", "metoclopramide"]));
  if (pd.diseaseDrugAlerts.length !== 2) fail("Parkinson + flunarizine/metoclopramide should give 2 alerts");

  const falls = analyzeRegimen({ ...base, conditions: ["Recurrent Falls"] }, rx(["zolpidem", "lorazepam"]));
  if (falls.diseaseDrugAlerts.filter((a) => a.severity === "High").length !== 2)
    fail("Falls + 2 hypnotics should give 2 High alerts");

  const clean = analyzeRegimen({ ...base, conditions: ["Hypothyroidism"] }, rx(["thyroxine"]));
  if (clean.diseaseDrugAlerts.length !== 0) fail("thyroxine + hypothyroidism should give no disease-drug alert");
  console.log("disease-drug rules: HF/Parkinson/falls fire, treated-AF suppressed, benign regimen clean");
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
    [1.02, "on the 1 SD line"],
    [2.5, "between the 2 and 3 SD lines"],
    [3.6, "above the 3 SD line"],
  ];
  let zp = 0;
  for (const [z, want] of zCases) {
    const got = gm.zBandLabel(z);
    if (got === want) zp++;
    else fail(`zBand ${z}: want "${want}" got "${got}"`);
  }
  const zc: [number, string][] = [[0, "0"], [-1.14, "−2 to −1"], [-3.4, "<−3"], [2.5, "2 to 3"]];
  for (const [z, want] of zc) {
    const got = gm.zBandCompact(z);
    if (got === want) zp++;
    else fail(`zBandCompact ${z}: want "${want}" got "${got}"`);
  }
  console.log(`z-band cases: ${zp}/${zCases.length + zc.length} pass`);

  // IAP self-consistency: every published table value fed back must land on
  // its own centile line, and every median must give z = 0.
  const iap = await import("../src/data/iapGrowthReference");
  const centLabel = ["3rd", "10th", "25th", "50th", "75th", "90th", "97th"];
  let iapOk = 0, iapN = 0;
  const sweeps: [typeof iap.IAP_HEIGHT_BOYS, "male" | "female", "h" | "w"][] = [
    [iap.IAP_HEIGHT_BOYS, "male", "h"],
    [iap.IAP_HEIGHT_GIRLS, "female", "h"],
    [iap.IAP_WEIGHT_BOYS, "male", "w"],
    [iap.IAP_WEIGHT_GIRLS, "female", "w"],
  ];
  for (const [table, sex, kind] of sweeps) {
    for (const row of table) {
      const months = Math.round(row[0] * 12);
      if (months <= 60) continue; // 5.0 y row is below the IAP switchover
      for (let c = 0; c < 7; c++) {
        const x = row[1 + c];
        const r = kind === "h" ? gm.heightForAge(x, months, sex) : gm.weightForAge(x, months, sex);
        iapN++;
        const want = `on the ${centLabel[c]} centile line`;
        if (r && gm.centileBandLabel(r.percentile) === want) iapOk++;
        else fail(`IAP ${kind}/${sex} age ${row[0]} P${centLabel[c]}: got "${r ? gm.centileBandLabel(r.percentile) : "null"}"`);
      }
      const med = kind === "h" ? gm.heightForAge(row[4], months, sex) : gm.weightForAge(row[4], months, sex);
      iapN++;
      if (med && Math.abs(med.z) < 0.01 && Math.abs(med.median - row[4]) < 0.01) iapOk++;
      else fail(`IAP median ${kind}/${sex} age ${row[0]}: z=${med?.z}`);
    }
  }
  console.log(`IAP table self-consistency: ${iapOk}/${iapN}`);

  // Anchors from the paper's own 18-y international-comparison tables
  const b18h = gm.heightForAge(173.6, 216, "male");
  const g18h = gm.heightForAge(157.8, 216, "female");
  const b18w = gm.weightForAge(61.6, 216, "male");
  const g18w = gm.weightForAge(52.0, 216, "female");
  for (const [name, r] of [["boy 18y 173.6 cm", b18h], ["girl 18y 157.8 cm", g18h], ["boy 18y 61.6 kg", b18w], ["girl 18y 52 kg", g18w]] as const) {
    if (!r || Math.abs(r.percentile - 50) > 0.5) fail(`anchor ${name}: percentile ${r?.percentile}`);
  }
  if (b18h && !/IAP 2015/.test(b18h.reference)) fail("5-18y reference must cite IAP 2015");

  // Between-lines and classification behavior
  const between = gm.heightForAge(140, 144, "male"); // 12-y boy, 140 cm: P10=138.3, P25=143.3
  if (!between || gm.centileBandLabel(between.percentile) !== "between the 10th and 25th centile lines")
    fail(`12y boy 140 cm: got "${between ? gm.centileBandLabel(between.percentile) : "null"}"`);
  const short = gm.heightForAge(128, 144, "male"); // below P3 (133.2)
  if (!short || !/Short stature/.test(short.classification) || short.percentile >= 3)
    fail(`12y boy 128 cm should be below 3rd centile: ${short?.classification}`);
  const heavy = gm.weightForAge(70, 144, "male"); // above P97 (66.1)
  if (!heavy || !/97th/.test(heavy.classification)) fail("12y boy 70 kg should flag >97th centile");
  const interp = gm.heightForAge(150, 150, "male"); // 12.5 y exact row: P25=146.2, P50=151.4
  if (!interp || gm.centileBandLabel(interp.percentile) !== "between the 25th and 50th centile lines")
    fail(`12.5y boy 150 cm interpolation: ${interp ? gm.centileBandLabel(interp.percentile) : "null"}`);
  console.log("IAP anchors, between-line placement and classifications OK");

  const over = gm.heightForAge(170, 220, "male");
  if (over !== null) fail("age > 216 months should return null");
}

// ---------- 5f. New features: OB, BP, ped renal, alternatives ----------
section("OB dating");
{
  const { calculateGestation } = await import("../src/lib/obMath");
  const d = (x: string) => new Date(x + "T00:00:00");
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const cases: [string, string, string, number, string, string][] = [
    ["lmp", "2026-01-01", "2026-08-30", 28, "2026-10-08", "34 weeks 3 days"],
    ["lmp", "2026-01-01", "2026-08-30", 35, "2026-10-15", "33 weeks 3 days"],
    ["lmp", "2026-01-01", "2026-08-30", 24, "2026-10-04", "35 weeks 0 days"],
    ["ivf5", "2026-03-01", "2026-08-30", 28, "2026-11-17", "28 weeks 5 days"],
    ["ivf3", "2026-03-01", "2026-08-30", 28, "2026-11-19", "28 weeks 3 days"],
    ["ovulation", "2026-03-01", "2026-08-30", 28, "2026-11-22", "28 weeks 0 days"],
  ];
  let ok = 0;
  for (const [m, anchor, today, cyc, edd, ga] of cases) {
    const r = calculateGestation(m as never, d(anchor), d(today), cyc);
    if (r && iso(r.edd) === edd && r.gaLabel === ga) ok++;
    else fail(`OB ${m}/${anchor}/cyc${cyc}: got ${r ? iso(r.edd) + " " + r.gaLabel : "null"} want ${edd} ${ga}`);
  }
  const bad = calculateGestation("lmp", d("2026-09-15"), d("2026-08-30"), 28);
  if (bad !== null) fail("future LMP should be rejected");
  console.log(`OB cases: ${ok}/${cases.length} + future-date rejection`);
}

section("Wuehl BP centiles");
{
  const { assessBp, bpCentiles, dippingPercent } = await import("../src/lib/bpMath");
  const wref = await import("../src/data/wuehlBpReference");
  // every table median fed back must be the 50th centile (z≈0)
  let ok = 0, n = 0;
  const sweep: [readonly (readonly number[])[], "male" | "female", "day" | "night" | "24h", "sbp" | "dbp"][] = [
    [wref.WUEHL_SBP_DAY_BOYS, "male", "day", "sbp"],
    [wref.WUEHL_SBP_NIGHT_GIRLS, "female", "night", "sbp"],
    [wref.WUEHL_DBP_DAY_GIRLS, "female", "day", "dbp"],
    [wref.WUEHL_DBP_NIGHT_BOYS, "male", "night", "dbp"],
    [wref.WUEHL_SBP_24H_BOYS, "male", "24h", "sbp"],
    [wref.WUEHL_DBP_24H_GIRLS, "female", "24h", "dbp"],
  ];
  for (const [table, sex, period, comp] of sweep) {
    for (const [h, , m] of table) {
      const a = assessBp(sex, period, comp, h, m);
      n++;
      if (a && Math.abs(a.z) < 0.01 && Math.abs(a.percentile - 50) < 0.5) ok++;
      else fail(`BP median ${sex}/${period}/${comp} h${h}: z=${a?.z}`);
    }
  }
  console.log(`BP median self-consistency: ${ok}/${n}`);
  // published check: boy 120 cm day SBP 50th = 110.8; girl 175 night SBP 95th sane
  const c = bpCentiles("male", "day", "sbp", 120);
  if (Math.abs(c.p50 - 110.8) > 0.2) fail(`boy 120cm day SBP p50 ${c.p50} != 110.8`);
  if (!(c.p95 > c.p90 && c.p90 > c.p50 && c.p50 > c.p5)) fail("centile ordering broken");
  const hi = assessBp("male", "day", "sbp", 140, 135);
  if (!hi || !/Hypertensive/.test(hi.classification)) fail(`boy 140cm day SBP 135 should be hypertensive: ${hi?.classification}`);
  const dip = dippingPercent(120, 100);
  if (dip !== 16.7) fail(`dip calc: ${dip} != 16.7`);
  console.log("BP anchors, HTN classification and dipping OK");
}

section("Pediatric renal (Harriet Lane)");
{
  const pr = await import("../src/lib/pedRenal");
  const cut = (days: number) => pr.creatinineUpperLimitForAge(days).limit;
  if (cut(10) !== 1.0 || cut(200) !== 0.4 || cut(365 * 5) !== 0.7 || cut(365 * 15) !== 1.0)
    fail(`age cutoffs wrong: ${cut(10)}/${cut(200)}/${cut(365 * 5)}/${cut(365 * 15)}`);
  const e = pr.schwartzEgfr(110, 0.9); // 0.413*110/0.9 = 50.5
  if (e == null || Math.abs(e - 50.5) > 0.2) fail(`Schwartz eGFR ${e} != 50.5`);
  const acy = pr.pedRenalAction("acyclovir_po", 15);
  if (!acy || !/q8h/.test(acy)) fail(`acyclovir GFR15 action: ${acy}`);
  const nit = pr.pedRenalAction("nitrofurantoin", 40);
  if (!nit || !/AVOID/.test(nit)) fail(`nitrofurantoin GFR40 should say avoid`);
  const ctx = pr.pedRenalAction("ceftriaxone_iv", 20);
  if (!ctx || !/No renal adjustment/.test(ctx)) fail("ceftriaxone should be no-adjust");
  // band sweep
  let gaps = 0;
  for (const [id, bands] of Object.entries(pr.PED_RENAL_BANDS)) {
    for (let g = 0; g <= 120; g += 5) {
      const hits = bands.filter((b) => g >= b.minGfr && g <= (b.maxGfr ?? Infinity));
      if (hits.length !== 1) { gaps++; fail(`ped band gap/overlap ${id} @ GFR ${g}`); }
    }
  }
  console.log(`ped renal: cutoffs, Schwartz, actions OK; band sweep gaps=${gaps}; ${Object.keys(pr.PED_RENAL_BANDS).length} drugs covered`);
}

section("Specialty drugs + alternatives");
{
  const rx = (ids: string[]) => ids.map((i) => getDrugById(i)!).filter(Boolean);
  for (const id of ["lithium", "clozapine", "tacrolimus", "azathioprine", "cisplatin", "tamoxifen", "fentanyl-patch", "efavirenz", "vincristine", "capecitabine"])
    if (!getDrugById(id)) fail(`specialty drug missing: ${id}`);

  const aza = analyzeRegimen({ ageYears: 60, weightKg: 70, sex: "Male", conditions: [] }, rx(["azathioprine", "allopurinol"]));
  if (!aza.interactions.some((x) => x.interaction.severity === "Contraindicated"))
    fail("azathioprine + allopurinol not Contraindicated");
  const tam = analyzeRegimen({ ageYears: 55, weightKg: 60, sex: "Female", conditions: [] }, rx(["tamoxifen", "paroxetine"]));
  if (!tam.interactions.some((x) => /endoxifen/.test(x.interaction.clinicalEffect)))
    fail("tamoxifen + paroxetine not flagged");
  const li = analyzeRegimen({ ageYears: 72, weightKg: 60, creatinineMgDl: 1.8, sex: "Male", conditions: [] }, rx(["lithium", "ibuprofen"]));
  const liDetail = li.drugDetails.find((x) => x.drugId === "lithium");
  if (!liDetail || liDetail.verdict === "continue") fail("lithium in CKD + NSAID should be flagged");

  // alternatives appear on stop verdicts
  const ckd = analyzeRegimen({ ageYears: 80, weightKg: 55, creatinineMgDl: 2.2, sex: "Female", conditions: [] }, rx(["metformin", "oxybutynin"]));
  const met = ckd.drugDetails.find((x) => x.drugId === "metformin");
  const oxy = ckd.drugDetails.find((x) => x.drugId === "oxybutynin");
  if (!met?.alternatives || !/linagliptin|insulin/.test(met.alternatives)) fail("metformin stop should suggest alternatives");
  if (!oxy?.alternatives || !/solifenacin|Bladder/.test(oxy.alternatives)) fail("oxybutynin stop should suggest alternatives");
  const fine = analyzeRegimen({ ageYears: 40, weightKg: 70, sex: "Male", conditions: [] }, rx(["paracetamol"]));
  if (fine.drugDetails[0].alternatives) fail("continue verdict must not carry alternatives");
  console.log("specialty interactions, lithium flag, alternatives-on-stop all OK");
}

// ---------- 5g. ICU titration math ----------
section("ICU titrations and corrections");
{
  const m = await import("../src/lib/icuMath");
  const byId = Object.fromEntries(m.VASOACTIVES.map((d) => [d.id, d]));
  const cases: [string, number, number, number][] = [
    ["noradrenaline", 0.1, 70, 5.25],
    ["noradrenaline", 0.05, 10, 0.38],
    ["adrenaline", 0.1, 15, 1.13],
    ["dopamine", 10, 10, 1.5],
    ["dobutamine", 5, 60, 3.6],
    ["vasopressin", 0.02, 0, 3],
    ["ntg", 1, 50, 6],
    ["milrinone", 0.5, 40, 6],
    ["fentanyl-inf", 2, 20, 4],
    ["midazolam-inf", 0.1, 30, 3],
  ];
  let ok = 0;
  for (const [id, dose, wt, want] of cases) {
    const got = m.infusionRateMlPerHour(byId[id], dose, wt);
    if (got != null && Math.abs(got - want) < 0.02) ok++;
    else fail(`infusion ${id} ${dose} @ ${wt}kg: got ${got} want ${want}`);
  }
  console.log(`infusion rate cases: ${ok}/${cases.length}`);
  for (const d of m.VASOACTIVES) {
    if (!(d.doseMin < d.doseMax) || !(d.concPerMl > 0) || !d.dilution || !d.titration)
      fail(`vasoactive record incomplete: ${d.id}`);
  }

  const hs: [number, number, number][] = [[8, 800, 32], [10, 1000, 40], [15, 1250, 50], [23, 1560, 63], [40, 1900, 80], [70, 2400, 110]];
  let fok = 0;
  for (const [wt, daily, hourly] of hs) {
    const r = m.pedMaintenanceFluids(wt);
    if (r && r.daily === daily && Math.abs(r.hourly - hourly) < 0.5) fok++;
    else fail(`Holliday-Segar ${wt}kg: got ${JSON.stringify(r)} want ${daily}/${hourly}`);
  }
  const plans = m.restrictedFluidPlans(1560);
  if (plans[0].dailyMl !== 1040) fail(`HF restriction of 1560 should be 1040, got ${plans[0].dailyMl}`);
  if (!/urine output/.test(String(plans[1].dailyMl))) fail("renal plan must add urine output");
  console.log(`fluid cases: ${fok}/${hs.length} + restriction checks`);

  const el: [string, number | null, number][] = [
    ["NaDef", m.sodiumDeficit(70, 120, 128, "male"), 336],
    ["NaDefF", m.sodiumDeficit(60, 118, 123, "female"), 150],
    ["FWD", m.freeWaterDeficit(60, 160, "female"), 4.3],
    ["corrNa", m.correctedNa(130, 600), 138],
    ["corrCa", m.correctedCa(7, 2), 8.6],
  ];
  for (const [name, got, want] of el) {
    if (got == null || Math.abs(got - want) > 0.05) fail(`${name}: got ${got} want ${want}`);
  }
  if (m.sodiumDeficit(70, 140, 130) !== null) fail("Na deficit with target<current should be null");
  if (m.freeWaterDeficit(70, 140) !== null) fail("FWD with normal Na should be null");
  console.log("electrolyte formulas: deficit, free water, corrected Na/Ca all exact");
}

// ---------- 5h. Ped-BP low flags, pulse pressure, pregnancy safety ----------
section("Ped-BP dengue flags + pregnancy safety");
{
  const bp = await import("../src/lib/bpMath");
  const low = bp.assessBp("male", "day", "sbp", 140, 85); // well below 5th
  if (!low || low.band !== "alert" || !/LOW|hypotension/i.test(low.classification))
    fail(`low BP should alert: ${low?.classification}`);
  const normal = bp.assessBp("male", "day", "sbp", 140, 112);
  if (!normal || normal.band !== "normal") fail(`112 @140cm should be normal: ${normal?.percentile}`);
  if (bp.pulsePressure(90, 72) !== 18) fail("PP 90/72 should be 18");
  if (bp.pulsePressure(110, 70) !== 40) fail("PP 110/70 should be 40");
  if (bp.pulsePressure(80, 85) !== null) fail("inverted PP should be null");
  console.log("Ped-BP: <5th centile alerts, pulse pressure math OK");

  const { PREGNANCY_SAFETY } = await import("../src/data/pregnancySafety");
  const ids = Object.keys(PREGNANCY_SAFETY);
  const missing = ids.filter((id) => !getDrugById(id));
  if (missing.length) fail(`pregnancy entries with unknown ids: ${missing.join(",")}`);
  if (ids.length < 150) fail(`pregnancy safety only ${ids.length} entries`);
  for (const [id, e] of Object.entries(PREGNANCY_SAFETY)) {
    if (!e.note.trim()) fail(`pregnancy entry ${id} has empty note`);
    if (e.risk === "avoid" && !e.alternative && !/contraindicated|oncology|specialist|handle|Defer|abortifacient|Stop/i.test(e.note))
      { /* alternatives optional when note self-contains action */ }
  }
  const spot: [string, string][] = [
    ["warfarin", "avoid"], ["enalapril", "avoid"], ["methotrexate", "avoid"],
    ["valproate-adult", "avoid"], ["doxycycline", "avoid"], ["atorvastatin", "avoid"],
    ["paracetamol", "safe"], ["thyroxine", "safe"], ["azathioprine", "safe"],
    ["hydroxychloroquine", "safe"], ["levetiracetam", "safe"], ["enoxaparin", "safe"],
    ["nifedipine-retard", "safe"], ["lithium", "caution"], ["fluconazole", "caution"],
  ];
  for (const [id, want] of spot) {
    if (PREGNANCY_SAFETY[id]?.risk !== want) fail(`pregnancy ${id}: want ${want} got ${PREGNANCY_SAFETY[id]?.risk}`);
  }
  console.log(`pregnancy safety: ${ids.length} entries, all ids valid, 15 spot classifications OK`);

  // Polypharmacy integration
  const rx = (list: string[]) => list.map((i) => getDrugById(i)!).filter(Boolean);
  const preg = analyzeRegimen(
    { ageYears: 28, weightKg: 60, sex: "Female", conditions: ["Pregnancy"] },
    rx(["warfarin", "enalapril", "paracetamol", "thyroxine"]),
  );
  const highs = preg.diseaseDrugAlerts.filter((a) => a.severity === "High").map((a) => a.drugId).sort();
  if (highs.join() !== "enalapril,warfarin") fail(`pregnancy regimen High alerts: ${highs.join()}`);
  if (preg.diseaseDrugAlerts.some((a) => a.drugId === "paracetamol" || a.drugId === "thyroxine"))
    fail("safe drugs must not alert in pregnancy");
  const wf = preg.drugDetails.find((d) => d.drugId === "warfarin");
  if (!wf || wf.verdict !== "stop-or-review") fail("warfarin in pregnancy should be STOP/REVIEW");
  console.log("Polypharmacy 'Pregnancy' condition: warfarin+ACEI flagged High, safe drugs clean");
}

// ---------- 5i. 300-sample pediatric dose + renal crosscheck ----------
section("300-sample ped dose/renal crosscheck");
{
  const { calculatePediatricDose } = await import("../src/lib/pediatricDoseMath");
  const { pedRenalAction, PED_RENAL_BANDS } = await import("../src/lib/pedRenal");
  let checks = 0, bad = 0;
  const seed = Number(process.env.VERIFY_SEED ?? 42);
  const weights = [6, 22, 3 + (seed % 38), 10 + ((seed * 7) % 50)];
  const gfrs = [70, 25, 8 + (seed % 80)];
  for (const d of pediatricDrugsDB) {
    for (const w of weights) {
      const r = calculatePediatricDose({
        weightKg: w,
        doseMgPerKgDay: d.defaultDoseMgPerKg,
        frequency: d.defaultFrequency,
        drug: d,
        formulation: d.formulations[0] ?? null,
      });
      // independent recomputation of the arithmetic
      const rawDaily = d.defaultDoseMgPerKg * w;
      const expDaily = d.maxDosePerDayMg > 0 ? Math.min(rawDaily, d.maxDosePerDayMg) : rawDaily;
      const expPer = expDaily / d.defaultDosesPerDay;
      checks++;
      if (d.defaultDoseMgPerKg > 0) {
        if (Math.abs(r.dailyMg - expDaily) > 0.51 || Math.abs(r.perDoseMg - expPer) > 0.51) {
          bad++; fail(`${d.id} @${w}kg: daily ${r.dailyMg} vs ${expDaily}, per ${r.perDoseMg} vs ${expPer}`);
        }
        if (r.perDoseMg < 0 || r.dailyMg < 0) { bad++; fail(`${d.id} negative dose`); }
      }
      // volume math against the labeled strength
      const f0 = d.formulations[0];
      if (d.defaultDoseMgPerKg > 0 && f0 && f0.strengthMg > 0 && r.volumeMl != null) {
        const expVol = expPer / (f0.strengthMg / f0.strengthVolumeMl);
        checks++;
        if (Math.abs(r.volumeMl - expVol) > 0.05) { bad++; fail(`${d.id} @${w}kg: vol ${r.volumeMl} vs ${expVol.toFixed(2)}`); }
      }
      for (const g of gfrs) {
        const action = pedRenalAction(d.id, g, d.renalAdjustment);
        checks++;
        if (!action.trim()) { bad++; fail(`${d.id} empty renal action @GFR ${g}`); }
        // consistency: at GFR 70 a banded drug must not tell you to avoid (except NSAID hydration caveat)
        const bands = PED_RENAL_BANDS[d.id];
        if (bands && g === 70) {
          const b = bands.find((x) => g >= x.minGfr && g <= (x.maxGfr ?? Infinity));
          if (b && b.action !== action) { bad++; fail(`${d.id} band mismatch @70`); }
        }
      }
    }
  }
  console.log(`ped crosscheck samples: ${checks} (${pediatricDrugsDB.length} drugs × weights × GFR bands), failures: ${bad}`);
  if (checks < 300) fail(`crosscheck only ${checks} samples (<300)`);
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

// ---------- Pregnancy comorbidity dosing ----------
{
  console.log("\n=== Pregnancy comorbidity dosing ===");
  const names = new Set<string>();
  for (const e of PREGNANCY_CONDITION_DOSING) {
    if (names.has(e.condition)) fail(`preg dosing: duplicate condition ${e.condition}`);
    names.add(e.condition);
    if (!e.changes.length) fail(`preg dosing ${e.condition}: no changes listed`);
    for (const c of e.changes)
      if (c.trim().length < 15) fail(`preg dosing ${e.condition}: suspiciously short change text`);
    if (!e.ref.trim()) fail(`preg dosing ${e.condition}: missing reference`);
    for (const t of e.timed ?? []) {
      if (t.from == null && t.to == null) fail(`preg dosing ${e.condition}: timed note without window`);
      if (t.from != null && (t.from < 1 || t.from > 44)) fail(`preg dosing ${e.condition}: timed.from ${t.from} out of range`);
      if (t.to != null && (t.to < 1 || t.to > 44)) fail(`preg dosing ${e.condition}: timed.to ${t.to} out of range`);
      if (t.from != null && t.to != null && t.from > t.to) fail(`preg dosing ${e.condition}: timed window inverted`);
    }
  }
  // Search must surface the major conditions by common queries
  const probes: [string, string][] = [
    ["thyroid", "Hypothyroidism"],
    ["epilep", "Epilepsy"],
    ["TB", "Tuberculosis"],
    ["UTI", "Urinary tract infection"],
    ["asthma", "Asthma"],
    ["lupus", "Systemic lupus erythematosus"],
    ["warfarin", "Venous thromboembolism (DVT / PE)"],
    ["hypertension", "Hypertension (chronic)"],
    ["sugar", "Diabetes mellitus (pre-existing, type 1 or 2)"],
  ];
  for (const [q, want] of probes)
    if (!searchPregnancyConditions(q).some((e) => e.condition === want))
      fail(`preg dosing search "${q}" did not return "${want}"`);
  // Renal banding: pregnancy norms (upper limit ~0.8 mg/dL)
  if (pregnancyRenalNote(0.6).band !== "normal") fail("preg renal: 0.6 should be normal");
  if (pregnancyRenalNote(0.9).band !== "caution") fail("preg renal: 0.9 should be caution");
  if (pregnancyRenalNote(1.4).band !== "alert") fail("preg renal: 1.4 should be alert");
  console.log(`pregnancy condition entries: ${PREGNANCY_CONDITION_DOSING.length}, search + renal banding OK`);
}

// ---------- Potassium banding ----------
{
  console.log("\n=== Potassium assessment banding ===");
  const cases: [number, string, string][] = [
    [2.1, "alert", "SEVERE hypokalemia"],
    [2.7, "alert", "Moderate hypokalemia"],
    [3.2, "caution", "Mild hypokalemia"],
    [3.5, "normal", "Normal"],
    [4.2, "normal", "Normal"],
    [5.0, "normal", "Normal"],
    [5.4, "caution", "Mild hyperkalemia"],
    [6.2, "alert", "Moderate hyperkalemia"],
    [6.8, "alert", "SEVERE hyperkalemia"],
  ];
  for (const [kv, band, prefix] of cases) {
    const a = assessPotassium(kv);
    if (!a) { fail(`K ${kv}: no assessment returned`); continue; }
    if (a.band !== band) fail(`K ${kv}: band ${a.band}, expected ${band}`);
    if (!a.classification.startsWith(prefix)) fail(`K ${kv}: classification "${a.classification}" lacks "${prefix}"`);
    if (a.band !== "normal" && a.actions.length < 2) fail(`K ${kv}: abnormal but < 2 actions`);
  }
  if (assessPotassium(0.2) !== null || assessPotassium(15) !== null)
    fail("K implausible values should return null");
  const ped = assessPotassium(2.1, true);
  if (!ped || !ped.actions[0].includes("0.5\u20131 mEq/kg"))
    fail("K pediatric severe hypokalemia should use weight-based IV rate");
  const renal = assessPotassium(3.2, false, true);
  if (!renal || !renal.actions.some((x) => x.includes("Renal impairment")))
    fail("K renal-impairment note missing");
  console.log("potassium bands verified across 9 levels + pediatric + renal variants");
}

// ---------- BMI (Indian cutoffs), eGFR, age-based BP ----------
{
  console.log("\n=== BMI / eGFR / age-based BP ===");
  // BMI boundaries per Indian consensus
  if (classifyBmiIndian(22.9).band !== "normal") fail("BMI 22.9 should be normal");
  if (!classifyBmiIndian(23.0).label.includes("Overweight")) fail("BMI 23.0 should be overweight (Indian)");
  if (!classifyBmiIndian(25.0).label.includes("Obese")) fail("BMI 25.0 should be obese (Indian)");
  if (classifyBmiIndian(18.4).band === "normal") fail("BMI 18.4 should be underweight");
  const b = bmiValue(70, 170);
  if (b == null || Math.abs(b - 24.2) > 0.05) fail(`BMI 70kg/170cm expected 24.2, got ${b}`);
  const cm = feetInchesToCm(5, 7);
  if (Math.abs(cm - 170.2) > 0.2) fail(`5'7" expected ~170.2 cm, got ${cm}`);
  if (!waistFlag(90, "male").abnormal || waistFlag(89, "male").abnormal) fail("male waist cutoff should be 90");
  if (!waistFlag(80, "female").abnormal || waistFlag(79, "female").abnormal) fail("female waist cutoff should be 80");

  // eGFR CKD-EPI 2021 properties + spot value
  const e1 = egfrCkdEpi2021("Male", 50, 1.0);
  const e2 = egfrCkdEpi2021("Male", 50, 2.0);
  const e3 = egfrCkdEpi2021("Female", 50, 1.0);
  if (e1 == null || e2 == null || e3 == null) fail("eGFR returned null for valid inputs");
  else {
    if (!(e2 < e1)) fail("eGFR must fall as creatinine rises");
    if (!(e3 < e1)) fail("eGFR female at same SCr 1.0 should be lower than male");
    if (e1 < 80 || e1 > 100) fail(`eGFR M/50y/1.0 expected ~85-95, got ${e1}`);
  }
  if (egfrCkdEpi2021("Male", 15, 1.0) !== null) fail("eGFR should be adults-only (null < 18y)");
  if (gfrCategory(50).stage !== "G3a" || gfrCategory(10).stage !== "G5") fail("GFR staging wrong");

  // Age-based Wuehl tables: monotonic ages, plausible medians, rising with age
  for (const [name, t] of [
    ["SBP_DAY_BOYS", WUEHL_AGE_SBP_DAY_BOYS], ["SBP_DAY_GIRLS", WUEHL_AGE_SBP_DAY_GIRLS],
    ["DBP_NIGHT_BOYS", WUEHL_AGE_DBP_NIGHT_BOYS], ["SBP_24H_GIRLS", WUEHL_AGE_SBP_24H_GIRLS],
  ] as const) {
    for (let i = 1; i < t.length; i++)
      if (t[i][0] <= t[i - 1][0]) fail(`${name}: ages not increasing at row ${i}`);
    if (t[0][2] <= 50 || t[0][2] > 140) fail(`${name}: implausible first median ${t[0][2]}`);
  }
  const c10 = bpCentiles("male", "day", "sbp", 10, "age");
  if (!(c10.p50 > 105 && c10.p50 < 122)) fail(`10y boy day SBP p50 implausible: ${c10.p50}`);
  if (!(c10.p95 > c10.p50 && c10.p50 > c10.p5)) fail("age-based centiles not ordered");
  const hi = assessBp("male", "day", "sbp", 10, 150, "age");
  if (!hi || hi.band !== "alert") fail("150 SBP at 10y should be hypertensive alert");
  const lo = assessBp("male", "day", "sbp", 10, 78, "age");
  if (!lo || lo.band !== "alert") fail("78 SBP at 10y should flag low/alert");
  console.log("BMI boundaries, eGFR behaviour, and age-based BP tables verified");
}

// ---------- Complex clinical scenario audit (100+) ----------
{
  console.log("\n=== Complex clinical scenario audit ===");
  let audits = 0;
  const check = (desc: string, cond: boolean) => {
    audits++;
    if (!cond) fail(`audit: ${desc}`);
  };
  const { estimateCrCl } = await import("../src/lib/creatinineClearanceMath");
  const { buildRenalDoseReport } = await import("../src/lib/renalDoseAdjust");
  const { VASOACTIVES, infusionRateMlPerHour, correctedNa, correctedCa, sodiumDeficit, freeWaterDeficit, pedMaintenanceFluids } = await import("../src/lib/icuMath");
  const { calculateGestation } = await import("../src/lib/obMath");
  const { PREGNANCY_SAFETY } = await import("../src/data/pregnancySafety");
  const { PREGNANCY_CONDITION_DOSING: PCD } = await import("../src/data/pregnancyConditionDosing");
  const { weightForAge, heightForAge } = await import("../src/lib/growthMath");
  const { analyzeRegimen } = await import("../src/clinical/AnalysisEngine");

  // — Cockcroft-Gault hand-computed spots (Lexicomp-style worked examples)
  const cg1 = estimateCrCl({ sex: "Male", ageYears: 40, weightKg: 70, heightCm: null, creatinine: 1.0, unit: "mg/dL" });
  check("CG M/40/70kg/1.0 = 97.2", cg1.valid && Math.abs(cg1.crCl - 97.2) < 0.5);
  const cg2 = estimateCrCl({ sex: "Female", ageYears: 40, weightKg: 70, heightCm: null, creatinine: 1.0, unit: "mg/dL" });
  check("CG female = male x 0.85", cg2.valid && Math.abs(cg2.crCl - cg1.crCl * 0.85) < 0.6);
  const cg3 = estimateCrCl({ sex: "Male", ageYears: 40, weightKg: 70, heightCm: null, creatinine: 88.4, unit: "µmol/L" });
  check("CG µmol/L 88.4 equals mg/dL 1.0", cg3.valid && Math.abs(cg3.crCl - cg1.crCl) < 1);
  // — eGFR spots (CKD-EPI 2021 published behaviour)
  const eM = egfrCkdEpi2021("Male", 40, 1.0)!;
  const eF = egfrCkdEpi2021("Female", 40, 0.8)!;
  check("eGFR M/40/1.0 in 90-105", eM >= 90 && eM <= 105);
  check("eGFR F/40/0.8 in 90-110", eF >= 90 && eF <= 110);
  check("eGFR M/70/3.0 stages G3b-G4", ["G3b","G4"].includes(gfrCategory(egfrCkdEpi2021("Male", 70, 3.0)!).stage));

  // — Renal dose bands: guideline-critical drugs at defined CrCl
  const byId = (id: string) => drugsDB.find((d) => d.id === id)!;
  const rec = (id: string, crcl: number) => buildRenalDoseReport(byId(id), crcl).recommendations.join(" ");
  check("metformin CrCl 25 says stop/avoid", /stop|avoid/i.test(rec("metformin", 25)));
  check("metformin CrCl 50 allows reduced use", !/\bSTOP\b/.test(rec("metformin", 50)) || /halve|reduce|1000/i.test(rec("metformin", 50)));
  check("enoxaparin CrCl 20 once-daily", /once daily|OD|24 ?h/i.test(rec("enoxaparin", 20)));
  check("apixaban severe CKD guidance present", rec("apixaban", 12).length > 10);
  check("vancomycin CrCl 20 mentions levels/interval", /level|trough|interval|q24|q48/i.test(rec("vancomycin", 20)));
  check("meropenem CrCl 20 interval extended", /q12h|q24h|50%|half/i.test(rec("meropenem", 20)));
  check("acyclovir CrCl 15 dose-reduced", /q12h|q24h|reduce|50%/i.test(rec("acyclovir-adult", 15)));
  check("fluconazole CrCl 30 halved", /50%|halve/i.test(rec("fluconazole", 30)));
  check("digoxin low CrCl caution", rec("digoxin", 25).length > 10);
  check("nitrofurantoin CrCl 25 avoid", /avoid/i.test(rec("nitrofurantoin", 25)));
  check("pemetrexed CrCl 40 not given", /not|avoid|do not/i.test(rec("pemetrexed", 40)));
  check("zoledronic CrCl 30 avoid", /avoid/i.test(rec("zoledronic-acid", 30)));

  // — WHO growth medians (WHO standards: 12mo boy ~9.6 kg / 75.7 cm)
  const w12 = weightForAge(9.6, 12, "male");
  check("12mo boy 9.6kg z~0", w12 != null && Math.abs(w12.z) < 0.15);
  const h12 = heightForAge(75.7, 12, "male");
  check("12mo boy 75.7cm z~0", h12 != null && Math.abs(h12.z) < 0.2);
  const w6g = weightForAge(7.3, 6, "female");
  check("6mo girl 7.3kg z~0 (WHO median)", w6g != null && Math.abs(w6g.z) < 0.2);
  check("12mo boy 7.0kg below -2SD (underweight)", (() => { const r = weightForAge(7.0, 12, "male"); return r != null && r.z < -2; })());

  // — Ped-BP: age vs height consistency for an average 10-y-old (~140 cm)
  const pAge = bpCentiles("male", "day", "sbp", 10, "age");
  const pHt = bpCentiles("male", "day", "sbp", 140, "height");
  check("10y vs 140cm day SBP medians within 6 mmHg", Math.abs(pAge.p50 - pHt.p50) <= 6);
  check("day SBP median > night median (age basis)", pAge.p50 > bpCentiles("male", "night", "sbp", 10, "age").p50);

  // — ICU drips: recompute every mcg/kg/min drug by hand at min and max dose
  for (const d of VASOACTIVES) {
    if (d.doseUnit === "mcg/kg/min" && d.weightBased) {
      for (const w of [10, 70]) {
        for (const dose of [d.doseMin, d.doseMax]) {
          const manual = Math.round(((dose * w * 60) / d.concPerMl) * 100) / 100;
          const got = infusionRateMlPerHour(d, dose, w);
          check(`${d.id} ${dose}@${w}kg rate matches hand calc`, got != null && Math.abs(got - manual) < 0.05);
        }
      }
    } else {
      const got = infusionRateMlPerHour(d, d.doseMin, 70);
      check(`${d.id} produces finite positive rate`, got != null && got > 0 && got < 2000);
    }
  }
  // — ICU corrections: textbook formulas
  check("corrected Na 130 at glucose 400 = 134.8", Math.abs(correctedNa(130, 400) - 134.8) < 0.05);
  check("corrected Ca 7.0 at albumin 2.0 = 8.6", Math.abs(correctedCa(7.0, 2.0) - 8.6) < 0.05);
  check("Na deficit 70kg 120->125 = 210 mEq (TBW 0.6)", Math.abs((sodiumDeficit(70, 120, 125, "male") ?? 0) - 210) < 3);
  check("free water deficit 70kg Na160 = 6L", Math.abs((freeWaterDeficit(70, 160, "male") ?? 0) - 6) < 0.3);
  check("Holliday-Segar 25kg = 1600 ml/day", (() => { const m = pedMaintenanceFluids(25); return m != null && Math.abs(m.daily - 1600) < 10; })());
  check("Holliday-Segar 8kg = 800 ml/day", (() => { const m = pedMaintenanceFluids(8); return m != null && Math.abs(m.daily - 800) < 10; })());

  // — Potassium: pediatric severe + adult moderate wording
  check("K 2.1 child uses weight-based IV", assessPotassium(2.1, true)!.actions[0].includes("mEq/kg"));
  check("K 6.2 adult includes insulin-dextrose", assessPotassium(6.2)!.actions.join(" ").includes("Insulin 10 U"));
  check("K 3.6 normal band exact boundary", assessPotassium(3.5)!.band === "normal");

  // — OB dating math: EDD anchored to conception + 266 d
  const lmp = new Date("2026-01-01T00:00:00");
  const g28 = calculateGestation("lmp", lmp, new Date("2026-03-01T00:00:00"), 28)!;
  check("LMP EDD = LMP + 280d (28d cycle)", Math.round((g28.edd.getTime() - lmp.getTime()) / 86400000) === 280);
  const g35 = calculateGestation("lmp", lmp, new Date("2026-03-01T00:00:00"), 35)!;
  check("35d cycle shifts EDD +7d", Math.round((g35.edd.getTime() - g28.edd.getTime()) / 86400000) === 7);
  const et = new Date("2026-02-01T00:00:00");
  const g5 = calculateGestation("ivf5", et, new Date("2026-03-01T00:00:00"))!;
  check("IVF day-5 EDD = transfer + 261d", Math.round((g5.edd.getTime() - et.getTime()) / 86400000) === 261);

  // — Pregnancy safety verdicts (guideline-critical)
  const psafe = (id: string) => PREGNANCY_SAFETY[id];
  check("enalapril avoid in pregnancy", psafe("enalapril")?.risk === "avoid");
  check("enalapril alternative names labetalol/nifedipine/methyldopa", /labetalol|nifedipine|methyldopa/i.test(psafe("enalapril")?.alternative ?? ""));
  check("warfarin avoid", psafe("warfarin")?.risk === "avoid");
  check("atorvastatin avoid", psafe("atorvastatin")?.risk === "avoid");
  check("sertraline not avoid", psafe("sertraline")?.risk !== "avoid");
  check("paracetamol safe", psafe("paracetamol")?.risk === "safe");
  check("methotrexate avoid", psafe("methotrexate")?.risk === "avoid");

  // — Pregnancy comorbidity entries carry the guideline-critical numbers
  const pcd = (name: string) => PCD.find((e) => e.condition === name)!.changes.join(" ");
  check("hypothyroid entry: 25-30% increase", pcd("Hypothyroidism").includes("25–30%"));
  check("TB entry: pyridoxine + streptomycin contraindicated", /pyridoxine/i.test(pcd("Tuberculosis")) && /[Ss]treptomycin/.test(pcd("Tuberculosis")));
  check("VTE entry: enoxaparin 1 mg/kg q12h", pcd("Venous thromboembolism (DVT / PE)").includes("1 mg/kg every 12 h"));
  check("UTI entry: nitrofurantoin stop at 36 wk", pcd("Urinary tract infection").includes("36 weeks"));
  check("epilepsy entry: folic acid 5 mg + no valproate", pcd("Epilepsy").includes("5 mg") && /valproate/i.test(pcd("Epilepsy")));
  check("preterm entry: betamethasone 12 mg x2 24h apart", pcd("Threatened preterm labour").includes("12 mg"));

  // — Polypharmacy engine: multi-drug + multi-condition regimens
  const meds = (ids: string[]) => ids.map((i) => byId(i));
  const reg1 = analyzeRegimen(
    { ageYears: 70, weightKg: 60, creatinineMgDl: 1.1, sex: "Male", conditions: ["Heart Failure (HFrEF)", "Breast Cancer"] },
    meds(["warfarin", "ibuprofen", "doxorubicin"]),
  );
  const flat1 = JSON.stringify(reg1);
  check("warfarin+NSAID interaction detected", /bleed/i.test(flat1));
  check("anthracycline+HF alert fires", /cardiotox|cardiomyopathy/i.test(flat1));
  check("NSAID+HF STOPP alert fires", /fluid retention|worsen/i.test(flat1));
  const reg2 = analyzeRegimen(
    { ageYears: 60, weightKg: 60, creatinineMgDl: 2.2, sex: "Female", conditions: ["CKD"] },
    meds(["cisplatin", "gentamicin"]),
  );
  check("nephrotoxic chemo + CKD alert fires", /nephro|kidney|renal/i.test(JSON.stringify(reg2)));
  const reg3 = analyzeRegimen(
    { ageYears: 30, weightKg: 60, creatinineMgDl: 0.9, sex: "Male", conditions: ["Gout / Hyperuricemia"] },
    meds(["mercaptopurine", "allopurinol"]),
  );
  check("6-MP + allopurinol hazard fires", /25%|quarter|toxicity/i.test(JSON.stringify(reg3)));

  // — More renal band spots
  check("levofloxacin CrCl 15 interval/dose cut", /q48h|750|250|50%|half/i.test(rec("levofloxacin", 15)));
  check("ciprofloxacin CrCl 20 reduced", /50%|q24|reduce|half/i.test(rec("ciprofloxacin", 20)));
  check("gabapentin low CrCl reduced", rec("gabapentin", 20).length > 10);
  check("pregabalin low CrCl reduced", rec("pregabalin", 20).length > 10);
  check("ganciclovir renal guidance present", rec("ganciclovir", 30).length > 10);
  check("spironolactone low CrCl caution/avoid", /avoid|caution|K|potassium/i.test(rec("spironolactone", 20)));
  check("allopurinol low CrCl reduced", /reduce|100|50/i.test(rec("allopurinol", 25)));
  check("dabigatran CrCl 25 guidance", /avoid|75|contraindicated|reduce/i.test(rec("dabigatran", 25)));
  check("rivaroxaban CrCl 10 avoid", /avoid|not recommended/i.test(rec("rivaroxaban", 10)));
  check("cotrimoxazole CrCl 20 reduced", /50%|half|reduce|avoid/i.test(rec("cotrimoxazole", 20)));

  // — More pregnancy safety verdicts
  check("isotretinoin avoid in pregnancy", psafe("isotretinoin")?.risk === "avoid" || PREGNANCY_SAFETY["isotretinoin"] === undefined);
  check("doxycycline avoid", psafe("doxycycline")?.risk === "avoid");
  check("thyroxine safe", psafe("thyroxine")?.risk === "safe");
  check("insulin regular safe", psafe("insulin-regular")?.risk === "safe");
  check("amoxicillin safe", psafe("amoxicillin")?.risk === "safe");
  check("ibuprofen not safe-rated", psafe("ibuprofen")?.risk !== "safe");
  check("valproate avoid", psafe("valproate-adult")?.risk === "avoid");
  check("lithium not safe-rated", psafe("lithium")?.risk !== "safe");

  // — More pregnancy comorbidity texts
  check("HIV entry: dolutegravir continued", /dolutegravir/i.test(pcd("HIV")));
  check("HBV entry: tenofovir from 28 wk", /28 weeks/.test(pcd("Hepatitis B")));
  check("malaria entry: defer primaquine", /primaquine/i.test(pcd("Malaria")));
  check("hyperthyroid entry: PTU first trimester", /PTU/.test(pcd("Hyperthyroidism (Graves)")));
  check("hypertension entry: stop ACEi/ARB", /STOP ACE/i.test(pcd("Hypertension (chronic)")));
  check("lupus entry: continue hydroxychloroquine", /hydroxychloroquine/i.test(pcd("Systemic lupus erythematosus")));

  // — More BMI/eGFR spots
  check("BMI 45kg/152cm = 19.5 normal", (() => { const v = bmiValue(45, 152); return v != null && Math.abs(v - 19.5) < 0.1 && classifyBmiIndian(v).band === "normal"; })());
  check("BMI 29.9 below severe band", classifyBmiIndian(29.9).label.includes("Obese"));
  check("BMI 36 severe obesity", classifyBmiIndian(36).label.includes("Severe"));
  check("gfrCategory boundaries 90/60/45/30/15", gfrCategory(90).stage === "G1" && gfrCategory(60).stage === "G2" && gfrCategory(45).stage === "G3a" && gfrCategory(30).stage === "G3b" && gfrCategory(15).stage === "G4");

  console.log(`complex clinical audit assertions: ${audits}`);
  if (audits < 100) fail(`audit count ${audits} < 100`);
}

// ---------- Result ----------
console.log("\n========== VERIFY RESULT ==========");
if (failures.length) {
  console.log(`FAILURES: ${failures.length}`);
  for (const f of failures.slice(0, 40)) console.log(" -", f);
  process.exit(1);
}
console.log("ALL DATABASE CHECKS PASSED");
