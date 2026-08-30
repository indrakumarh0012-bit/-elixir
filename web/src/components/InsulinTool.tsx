import { useMemo, useState } from "react";
import {
  REGIMEN_LABELS,
  basalTitration,
  bolusTitration,
  carbRatio,
  correctionDose,
  correctionFactor,
  dkaRate,
  regimenSplit,
  tddPerKgRange,
  vriiiRate,
  type DmType,
  type Regimen,
  type Setting,
} from "../lib/insulinMath";
import SaveButton from "./SaveButton";

const card = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
const label = "text-xs font-semibold text-slate-700";
const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-500";
const BAND = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-950",
  caution: "border-amber-200 bg-amber-50 text-amber-950",
  alert: "border-red-200 bg-red-50 text-red-950",
} as const;

function num(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

const seg = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    active ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
  }`;

export default function InsulinTool() {
  const [setting, setSetting] = useState<Setting>("adult");
  const [mode, setMode] = useState<"opd" | "infusion">("opd");
  const [dm, setDm] = useState<DmType>("t2");
  const [regimen, setRegimen] = useState<Regimen>("basal");
  const [weight, setWeight] = useState<number | "">("");
  const [fbs, setFbs] = useState<number | "">("");
  const [ppbs, setPpbs] = useState<number | "">("");
  const [grbs, setGrbs] = useState<number | "">("");
  const [egfrLow, setEgfrLow] = useState(false);

  const w = weight === "" ? null : Number(weight);

  const tdd = useMemo(() => {
    if (w == null) return null;
    const { low, high, note } = tddPerKgRange(setting, dm, regimen);
    const factor = egfrLow ? 0.75 : 1;
    const lowU = Math.round(low * w * factor);
    const highU = Math.round(high * w * factor);
    const floor = regimen === "basal" && setting === "adult" && dm === "t2" ? 10 : 1;
    const mid = Math.max(Math.round(((low + high) / 2) * w * factor), floor);
    return { lowU: Math.max(lowU, floor), highU: Math.max(highU, floor), mid, note };
  }, [w, setting, dm, regimen, egfrLow]);

  const split = tdd ? regimenSplit(regimen, tdd.mid, setting) : null;
  const fbsAdvice = fbs === "" ? null : basalTitration(Number(fbs));
  const ppbsAdvice = ppbs === "" ? null : bolusTitration(Number(ppbs));
  const rapid = regimen !== "splitMixed";
  const cf = tdd ? correctionFactor(tdd.mid, rapid) : null;
  const icr = tdd ? carbRatio(tdd.mid, rapid) : null;
  const corr = tdd && grbs !== "" ? correctionDose(Number(grbs), tdd.mid, 150, rapid) : null;
  const vriii = mode === "infusion" && grbs !== "" ? vriiiRate(Number(grbs)) : null;
  const dka = mode === "infusion" && w != null ? dkaRate(w, setting) : null;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Insulin</h2>

      {/* 1. Patient + mode */}
      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {(["adult", "child"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSetting(s)} className={seg(setting === s)}>
              {s === "adult" ? "Adult" : "Child"}
            </button>
          ))}
          <span className="mx-1 hidden self-center text-slate-300 sm:inline">|</span>
          <button type="button" onClick={() => setMode("opd")} className={seg(mode === "opd")}>
            OPD — subcutaneous
          </button>
          <button type="button" onClick={() => setMode("infusion")} className={seg(mode === "infusion")}>
            Infusion — IV
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block"><span className={label}>Weight (kg)</span>
            <input type="number" inputMode="decimal" min={2} step="0.5" value={weight}
              onChange={(e) => setWeight(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>FBS (mg/dL)</span>
            <input type="number" inputMode="numeric" data-adv="3" value={fbs}
              onChange={(e) => setFbs(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>PPBS 2-h (mg/dL)</span>
            <input type="number" inputMode="numeric" data-adv="3" value={ppbs}
              onChange={(e) => setPpbs(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>Random / GRBS (mg/dL)</span>
            <input type="number" inputMode="numeric" data-adv="3" value={grbs}
              onChange={(e) => setGrbs(num(e.target.value))} className={input} /></label>
        </div>
        {mode === "opd" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {setting === "adult" && (
              <>
                {(["t2", "t1"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setDm(t)} className={seg(dm === t)}>
                    {t === "t2" ? "Type 2" : "Type 1"}
                  </button>
                ))}
                <span className="mx-1 hidden self-center text-slate-300 sm:inline">|</span>
              </>
            )}
            <select value={regimen} onChange={(e) => setRegimen(e.target.value as Regimen)} className={`${input} mt-0 w-auto flex-1`}>
              {(Object.keys(REGIMEN_LABELS) as Regimen[]).map((r) => (
                <option key={r} value={r}>{REGIMEN_LABELS[r]}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={egfrLow} onChange={(e) => setEgfrLow(e.target.checked)} className="h-4 w-4" />
              eGFR &lt; 45 / elderly-frail
            </label>
          </div>
        )}
      </section>

      {mode === "opd" && (
        <>
          {/* 2. Total daily dose */}
          {tdd && (
            <section className={`mt-4 ${card}`}>
              <h3 className="text-base font-bold text-slate-900">1. Total daily dose</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {tdd.lowU}–{tdd.highU} units/day
                <span className="ml-2 text-sm font-semibold text-slate-600">(start ≈ {tdd.mid} U)</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">{tdd.note}{egfrLow ? " Dose shown already reduced 25% for renal impairment / frailty." : ""}</p>
            </section>
          )}

          {/* 3. Regimen split */}
          {split && tdd && (
            <section className={`mt-4 ${card}`}>
              <h3 className="text-base font-bold text-slate-900">2. Doses & timing — {REGIMEN_LABELS[regimen]}</h3>
              <ul className="mt-2 space-y-2">
                {split.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-800"><strong>{s.when}</strong> — {s.insulin}</span>
                    <span className="shrink-0 text-lg font-bold text-slate-900">{s.units} U</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-600">
                Rapid analogues (aspart/lispro/glulisine): 0–15 min pre-meal. Regular: 30 min pre-meal.
                NPH: cloudy — roll to mix. Glargine/degludec: same time daily, NEVER mixed in one syringe with other insulin.
              </p>
            </section>
          )}

          {/* 4. Titration from the entered sugars */}
          {(fbsAdvice || ppbsAdvice) && (
            <section className={`mt-4 ${card}`}>
              <h3 className="text-base font-bold text-slate-900">3. Titration for today's values</h3>
              <div className="mt-2 space-y-2 text-sm">
                {fbsAdvice && <p className={`rounded-lg border p-3 ${BAND[fbsAdvice.band]}`}><strong>Fasting → basal/evening dose:</strong> {fbsAdvice.text}</p>}
                {ppbsAdvice && <p className={`rounded-lg border p-3 ${BAND[ppbsAdvice.band]}`}><strong>Post-meal → bolus/morning premix:</strong> {ppbsAdvice.text}</p>}
              </div>
            </section>
          )}

          {/* 5. Correction factor / carb ratio */}
          {tdd && cf != null && (
            <section className={`mt-4 ${card}`}>
              <h3 className="text-base font-bold text-slate-900">4. Correction factor & carb ratio (at {tdd.mid} U/day)</h3>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-800">
                  <strong>Correction factor ({rapid ? "1800" : "1500"} rule):</strong> 1 unit drops glucose ≈ {cf} mg/dL.
                  {corr != null && grbs !== "" && (
                    <> For GRBS {grbs} → correction ≈ <strong>{corr} U</strong> (target 150; halve at bedtime; never twice within 3–4 h).</>
                  )}
                </p>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-800">
                  <strong>Carb ratio ({rapid ? "500" : "450"} rule):</strong> 1 unit covers ≈ {icr} g carbohydrate (for carb-counting basal-bolus users).
                </p>
              </div>
            </section>
          )}

          {/* 6. Cautions, in order of importance */}
          <section className={`mt-4 ${card}`}>
            <h3 className="text-base font-bold text-slate-900">Cautions</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
              <li><strong>Hypoglycemia first:</strong> teach the 15-15 rule (15 g fast carbohydrate, recheck in 15 min); every titration assumes hypo has been excluded.</li>
              <li><strong>Match syringe to vial:</strong> 40 IU/ml vials (red cap) ONLY with 40-unit red syringes; 100 IU/ml (orange) ONLY with 100-unit orange syringes — a mismatch gives a 2.5× dosing error. Pens are all 100 IU/ml.</li>
              <li><strong>Renal impairment:</strong> insulin clears renally — falling eGFR means falling requirement; reduce ~25% below eGFR 45 and up to 50% below 15, and relax targets in the elderly/frail (FBS 90–150).</li>
              <li><strong>Sick days:</strong> never stop basal insulin in T1DM; check glucose 4-hourly and ketones if &gt; 250 mg/dL; maintain fluids.</li>
              <li><strong>Technique & sites:</strong> rotate abdomen/thigh/arm sites (lipohypertrophy causes erratic absorption); inject at 90° with a lifted skin fold for thin patients/children.</li>
              <li><strong>Storage:</strong> unopened in the fridge door (2–8 °C, never frozen); the vial/pen in use keeps ≈ 28 days at room temperature away from sunlight — practical for Indian settings without refrigeration.</li>
              <li><strong>Steroids, pregnancy, infection</strong> raise requirements — expect to up-titrate, and step back down after.</li>
            </ol>
          </section>

          {tdd && split && (
            <SaveButton
              tool="Insulin"
              build={() => ({
                title: `Insulin ${tdd.mid} U/day — ${REGIMEN_LABELS[regimen]}`,
                detail: split.map((s) => `${s.when}: ${s.units} U ${s.insulin}`).join(" · "),
              })}
            />
          )}
          <p className="mt-2 text-xs text-slate-600">
            Ref: ADA Standards of Care 2025 · ISPAD 2022 (children) · RSSDI 2022 Indian consensus · 1800/500 rules.
          </p>
        </>
      )}

      {mode === "infusion" && (
        <>
          {/* Infusion: DKA weight-based + ward variable-rate scale */}
          <section className={`mt-4 ${card}`}>
            <h3 className="text-base font-bold text-slate-900">1. Preparation</h3>
            <p className="mt-2 text-sm text-slate-800">
              50 U regular (plain) insulin in 50 ml NS = <strong>1 U/ml</strong> in a syringe pump. Flush 10–20 ml through the line before connecting (insulin adsorbs to tubing).
            </p>
          </section>

          {dka && (
            <section className={`mt-4 ${card}`}>
              <h3 className="text-base font-bold text-slate-900">2. DKA / HHS rate ({w} kg)</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {setting === "child" ? `${dka.low}–${dka.high}` : dka.low} U/h
                <span className="ml-2 text-sm font-semibold text-slate-600">= same ml/h at 1 U/ml</span>
              </p>
              <ul className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
                <li>{setting === "child" ? "Children: 0.05–0.1 U/kg/h, NO IV bolus (cerebral edema risk); start insulin only AFTER 1 h of fluids." : "Adults: 0.1 U/kg/h (an initial 0.1 U/kg bolus is optional)."}</li>
                <li>Target fall 50–70 mg/dL/h; add 5–10% dextrose to fluids once glucose &lt; 250 and CONTINUE insulin until ketones clear and the gap closes.</li>
                <li>K⁺ rules: &lt; 3.3 hold insulin and replace K first; 3.3–5.3 add 20–40 mEq/L to fluids; &gt; 5.3 no K until it falls with urine output.</li>
                {setting === "child" && (
                  <li className="font-semibold text-red-900">Cerebral edema: headache, falling sensorium or bradycardia during DKA treatment → 3% NaCl 3–5 ml/kg over 10–15 min, slow the fluids, call PICU.</li>
                )}
              </ul>
            </section>
          )}

          <section className={`mt-4 ${card}`}>
            <h3 className="text-base font-bold text-slate-900">3. Ward variable-rate scale (non-DKA) — target 140–180</h3>
            {vriii ? (
              <p className={`mt-2 rounded-lg border p-3 text-sm font-semibold ${BAND[vriii.band]}`}>
                GRBS {grbs}: {vriii.rate != null && vriii.rate > 0 ? `run ${vriii.rate} U/h (${vriii.rate} ml/h). ` : ""}{vriii.text}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Enter the Random/GRBS value above to get the rate.</p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[380px] text-xs text-slate-700">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-1 pr-2">GRBS (mg/dL)</th><th className="py-1">Rate (U/h)</th></tr></thead>
                <tbody>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">&lt; 70</td><td className="py-1 font-semibold text-red-700">STOP + treat hypo</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">70–140</td><td className="py-1">0.5</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">141–180</td><td className="py-1">1</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">181–250</td><td className="py-1">2</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">251–300</td><td className="py-1">3</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">301–350</td><td className="py-1">4</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1 pr-2">&gt; 350</td><td className="py-1">6 + senior review, check ketones</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Check GRBS hourly until stable in 140–180 ×2, then 2-hourly. A typical starting scale — your institutional chart prevails.
            </p>
          </section>

          <section className={`mt-4 ${card}`}>
            <h3 className="text-base font-bold text-slate-900">4. Stopping the infusion (IV → subcutaneous)</h3>
            <ul className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
              <li>Stop only when eating, and in DKA only after ketones clear and the anion gap closes.</li>
              <li>Give the first subcutaneous <strong>basal</strong> dose 2 hours BEFORE stopping the infusion (rapid bolus with a meal: 15–30 min overlap) — IV insulin lasts minutes, and a gap causes rebound hyperglycemia/DKA.</li>
              <li>Estimate the day's subcutaneous dose from the last 6 h of infusion ×4 × 0.8, or restart the previous home regimen if control was good.</li>
            </ul>
          </section>

          {vriii && grbs !== "" && (
            <SaveButton
              tool="Insulin"
              build={() => ({
                title: `Infusion at GRBS ${grbs}`,
                detail: vriii.rate != null ? `${vriii.rate} U/h — ${vriii.text}` : vriii.text,
              })}
            />
          )}
          <p className="mt-2 text-xs text-slate-600">
            Ref: ADA/ISPAD DKA protocols · JBDS VRIII guidance · standard ICU references.
          </p>
        </>
      )}
    </div>
  );
}
