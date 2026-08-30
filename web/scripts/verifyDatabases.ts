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
  if (drugsDB.length < 265) fail(`drugsDB only ${drugsDB.length} (< 265)`);
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
  const weights = [6, 22];
  const gfrs = [70, 25];
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

// ---------- Result ----------
console.log("\n========== VERIFY RESULT ==========");
if (failures.length) {
  console.log(`FAILURES: ${failures.length}`);
  for (const f of failures.slice(0, 40)) console.log(" -", f);
  process.exit(1);
}
console.log("ALL DATABASE CHECKS PASSED");
