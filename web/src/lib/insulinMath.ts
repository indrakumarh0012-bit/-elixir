/**
 * Insulin dosing & titration — OPD subcutaneous and IV infusion.
 *
 * Sources: ADA Standards of Care 2025 (basal initiation 10 U or 0.1–0.2
 * U/kg/day; titrate 2 U q3d to fasting 80–130; basal-bolus 50/50),
 * ISPAD 2022 (children: total 0.5–1 U/kg/day prepubertal, up to 1.2–2
 * pubertal, < 0.5 in partial remission; no IV bolus in pediatric DKA),
 * RSSDI 2022 Indian consensus (premix use, 40 vs 100 IU/ml matching),
 * 1800/1500 correction rules and 500/450 carb-ratio rules.
 */

export type Setting = "adult" | "child";
export type DmType = "t1" | "t2";
export type Regimen = "basal" | "basalPlus" | "basalBolus" | "premix" | "splitMixed";

export const REGIMEN_LABELS: Record<Regimen, string> = {
  basal: "Basal only (bedtime long-acting / NPH)",
  basalPlus: "Basal-plus (basal + 1 bolus at biggest meal)",
  basalBolus: "Basal–bolus (basal + bolus before each meal)",
  premix: "Premixed twice daily (30/70 or 25/75)",
  splitMixed: "Split-mixed (NPH + regular, BD — pediatric/low-resource)",
};

/** Recommended starting total daily dose range, U/kg/day. */
export function tddPerKgRange(
  setting: Setting,
  dm: DmType,
  regimen: Regimen,
): { low: number; high: number; note: string } {
  if (setting === "child") {
    return {
      low: 0.5,
      high: 1.0,
      note:
        "ISPAD: 0.5–1 U/kg/day prepubertal at onset (< 0.5 in partial remission; pubertal adolescents often need 1.2–2 U/kg/day). Titrate to glycemic targets.",
    };
  }
  if (dm === "t1")
    return { low: 0.4, high: 0.6, note: "Adult T1DM start 0.4–0.6 U/kg/day; individual needs vary (0.4–1)." };
  if (regimen === "basal")
    return { low: 0.1, high: 0.2, note: "ADA: start basal 10 U/day or 0.1–0.2 U/kg/day." };
  return { low: 0.3, high: 0.5, note: "T2DM full regimen 0.3–0.5 U/kg/day (0.2–0.3 if elderly, frail, or eGFR < 45)." };
}

export type RegimenSplit = { when: string; insulin: string; units: number }[];

/** Split a chosen TDD across the regimen. Rounded to whole units. */
export function regimenSplit(regimen: Regimen, tdd: number, setting: Setting): RegimenSplit {
  const r = (x: number) => Math.max(1, Math.round(x));
  switch (regimen) {
    case "basal":
      return [{ when: "Bedtime (same time daily)", insulin: "Glargine / degludec / detemir or NPH", units: r(tdd) }];
    case "basalPlus":
      return [
        { when: "Bedtime", insulin: "Basal (glargine/NPH)", units: r(tdd * 0.7) },
        { when: "Before the largest meal", insulin: "Rapid (aspart/lispro) or regular", units: r(tdd * 0.3) },
      ];
    case "basalBolus":
      return [
        { when: "Bedtime / fixed time", insulin: "Basal (glargine/degludec/NPH)", units: r(tdd * 0.5) },
        { when: "Before breakfast", insulin: "Rapid 0–15 min (or regular 30 min) pre-meal", units: r((tdd * 0.5) / 3) },
        { when: "Before lunch", insulin: "Rapid (or regular)", units: r((tdd * 0.5) / 3) },
        { when: "Before dinner", insulin: "Rapid (or regular)", units: r((tdd * 0.5) / 3) },
      ];
    case "premix":
      return [
        { when: "30 min before breakfast", insulin: "Premix 30/70 (or 25/75 analogue 0–15 min)", units: r(tdd * (2 / 3)) },
        { when: "30 min before dinner", insulin: "Premix 30/70", units: r(tdd / 3) },
      ];
    case "splitMixed": {
      const am = tdd * (2 / 3);
      const pm = tdd / 3;
      const shortShare = setting === "child" ? 1 / 3 : 1 / 3;
      return [
        { when: "Before breakfast", insulin: "NPH (intermediate)", units: r(am * (1 - shortShare)) },
        { when: "Before breakfast", insulin: "Regular (short)", units: r(am * shortShare) },
        { when: "Before dinner", insulin: "NPH", units: r(pm * (1 - shortShare)) },
        { when: "Before dinner", insulin: "Regular", units: r(pm * shortShare) },
      ];
    }
  }
}

/** 1800 rule (rapid analogues) / 1500 rule (regular): mg/dL dropped per unit. */
export function correctionFactor(tdd: number, rapid = true): number | null {
  if (!(tdd > 0)) return null;
  return Math.round((rapid ? 1800 : 1500) / tdd);
}

/** 500 rule (rapid) / 450 rule (regular): grams of carbohydrate per unit. */
export function carbRatio(tdd: number, rapid = true): number | null {
  if (!(tdd > 0)) return null;
  return Math.round((rapid ? 500 : 450) / tdd);
}

export type TitrationAdvice = { band: "normal" | "caution" | "alert"; text: string };

/** Basal titration driven by fasting glucose (ADA treat-to-target style). */
export function basalTitration(fbs: number): TitrationAdvice | null {
  if (!(fbs > 20) || fbs > 1000) return null;
  if (fbs < 70)
    return {
      band: "alert",
      text: `FBS ${fbs} — HYPOGLYCEMIA range. Reduce the basal dose by 10–20% (2–4 units), find the cause (missed meal, exercise, renal impairment), and re-educate on hypo treatment (15 g fast carbohydrate, recheck in 15 min).`,
    };
  if (fbs <= 130)
    return { band: "normal", text: `FBS ${fbs} is at target (80–130). Continue the current basal dose.` };
  if (fbs <= 180)
    return {
      band: "caution",
      text: `FBS ${fbs} above target. Increase basal by 2 units every 3 days until fasting 80–130, provided there is no nocturnal hypoglycemia.`,
    };
  return {
    band: "alert",
    text: `FBS ${fbs} well above target. Increase basal by 4 units every 3 days (or 10–15%); review adherence, technique, storage and injection sites; check for Somogyi/dawn pattern before large increases.`,
  };
}

/** Bolus/premix titration driven by post-prandial (2-h) glucose. */
export function bolusTitration(ppbs: number): TitrationAdvice | null {
  if (!(ppbs > 20) || ppbs > 1200) return null;
  if (ppbs < 70)
    return {
      band: "alert",
      text: `Post-meal ${ppbs} — hypoglycemia. Reduce the pre-meal bolus for THAT meal by 1–2 units (or 10–20%); review carbohydrate content and timing.`,
    };
  if (ppbs <= 180)
    return { band: "normal", text: `Post-meal ${ppbs} is at target (< 180). Continue the current bolus dose.` };
  if (ppbs <= 250)
    return {
      band: "caution",
      text: `Post-meal ${ppbs} above target. Increase the bolus BEFORE that meal by 1–2 units every 3 days; confirm injection 15 min (rapid) / 30 min (regular) before eating.`,
    };
  return {
    band: "alert",
    text: `Post-meal ${ppbs} markedly high. Increase that meal's bolus by 2–4 units (or 10–20%) every 3 days; rule out missed doses, infection and steroid use; check ketones if unwell.`,
  };
}

/** Supplemental correction dose from a random glucose (uses the 1800/1500 CF). */
export function correctionDose(
  grbs: number,
  tdd: number,
  target = 150,
  rapid = true,
): number | null {
  const cf = correctionFactor(tdd, rapid);
  if (cf == null || !(grbs > target)) return null;
  return Math.round(((grbs - target) / cf) * 2) / 2;
}

/**
 * Ward variable-rate IV insulin scale (50 U regular in 50 ml NS, 1 U/ml),
 * for the non-DKA patient. Target 140–180 mg/dL. A typical starting scale —
 * the institutional chart prevails.
 */
export function vriiiRate(grbs: number): { rate: number | null; text: string; band: "normal" | "caution" | "alert" } {
  if (!(grbs > 20) || grbs > 1500) return { rate: null, text: "Implausible glucose — recheck.", band: "alert" };
  if (grbs < 70)
    return { rate: 0, text: "STOP insulin. Give 25 ml 25% dextrose IV (child: 2 ml/kg 10% dextrose), recheck in 15 min.", band: "alert" };
  if (grbs <= 140) return { rate: 0.5, text: "0.5 U/h — at/near target; watch for drift down.", band: "normal" };
  if (grbs <= 180) return { rate: 1, text: "1 U/h — target band 140–180.", band: "normal" };
  if (grbs <= 250) return { rate: 2, text: "2 U/h — recheck in 1 h.", band: "caution" };
  if (grbs <= 300) return { rate: 3, text: "3 U/h — recheck in 1 h.", band: "caution" };
  if (grbs <= 350) return { rate: 4, text: "4 U/h — recheck in 1 h; check ketones.", band: "alert" };
  return { rate: 6, text: "6 U/h and senior review — exclude DKA/HHS (ketones, blood gas, osmolality).", band: "alert" };
}

/** DKA infusion rate band (adult 0.1 U/kg/h; child 0.05–0.1, never bolus). */
export function dkaRate(weightKg: number, setting: Setting): { low: number; high: number } | null {
  if (!(weightKg > 0)) return null;
  const r = (x: number) => Math.round(x * 10) / 10;
  if (setting === "child") return { low: r(0.05 * weightKg), high: r(0.1 * weightKg) };
  return { low: r(0.1 * weightKg), high: r(0.1 * weightKg) };
}
