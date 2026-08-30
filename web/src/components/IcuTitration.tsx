import { useMemo, useState } from "react";
import {
  VASOACTIVES,
  adultMaintenanceFluids,
  correctedCa,
  correctedNa,
  freeWaterDeficit,
  infusionRateMlPerHour,
  pedMaintenanceFluids,
  restrictedFluidPlans,
  sodiumDeficit,
} from "../lib/icuMath";

function num(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

const card = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
const label = "text-xs font-semibold text-slate-600";
const input =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-orange-500";

export default function IcuTitration() {
  const [mode, setMode] = useState<"adult" | "child">("adult");
  const [weight, setWeight] = useState<number | "">("");
  const [creatinine, setCreatinine] = useState<number | "">("");

  const [drugId, setDrugId] = useState(VASOACTIVES[0].id);
  const [dose, setDose] = useState<number | "">("");

  const [na, setNa] = useState<number | "">("");
  const [glucose, setGlucose] = useState<number | "">("");
  const [ca, setCa] = useState<number | "">("");
  const [albumin, setAlbumin] = useState<number | "">("");

  const w = weight === "" ? null : Number(weight);
  const drug = VASOACTIVES.find((d) => d.id === drugId)!;
  const rate =
    dose !== "" && (w != null || !drug.weightBased)
      ? infusionRateMlPerHour(drug, Number(dose), w ?? 0)
      : null;
  const renalConcern = creatinine !== "" && Number(creatinine) >= 1.5;

  const fluids = useMemo(() => {
    if (w == null) return null;
    if (mode === "child") {
      const m = pedMaintenanceFluids(w);
      return m ? { label: `Holliday–Segar: ${m.daily} ml/day (${m.hourly} ml/h by 4-2-1)`, daily: m.daily } : null;
    }
    const a = adultMaintenanceFluids(w);
    return a ? { label: `${a.low}–${a.high} ml/day (25–30 ml/kg)`, daily: Math.round((a.low + a.high) / 2) } : null;
  }, [w, mode]);

  const naNum = na === "" ? null : Number(na);
  const lowNa = naNum != null && naNum < 135 && w != null;
  const highNa = naNum != null && naNum > 145 && w != null;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold text-orange-800">
        ICU / Ward — titrations &amp; corrections
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Infusion rates, insulin, fluids and electrolyte corrections. Weight
        drives everything; creatinine adds renal cautions.
      </p>

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {(["adult", "child"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === m ? "bg-orange-600 text-white shadow-sm" : "bg-orange-50 text-orange-800 hover:bg-orange-100"
              }`}>
              {m === "adult" ? "Adult" : "Child"}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block"><span className={label}>Weight (kg)</span>
            <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>Creatinine (mg/dL)</span>
            <input type="number" inputMode="decimal" step="0.1" value={creatinine} onChange={(e) => setCreatinine(num(e.target.value))} className={input} /></label>
        </div>
      </section>

      {/* Infusion calculator */}
      <section className={`mt-4 ${card}`}>
        <h3 className="text-base font-bold text-slate-900">Infusion rate calculator</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-1"><span className={label}>Drug</span>
            <select value={drugId} onChange={(e) => { setDrugId(e.target.value); setDose(""); }} className={input}>
              {VASOACTIVES.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select></label>
          <label className="block"><span className={label}>Dose ({drug.doseUnit})</span>
            <input type="number" inputMode="decimal" step="0.01" value={dose} onChange={(e) => setDose(num(e.target.value))} className={input}
              placeholder={`${drug.doseMin}–${drug.doseMax}`} /></label>
          <div className="rounded-lg bg-orange-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Pump rate</p>
            <p className="text-2xl font-bold text-orange-900">{rate != null ? `${rate} ml/h` : "—"}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700"><strong>Dilution:</strong> {drug.dilution}</p>
        <p className="mt-1 text-sm text-slate-700"><strong>Range:</strong> {drug.doseMin}–{drug.doseMax} {drug.doseUnit}. {drug.titration}</p>
        {dose !== "" && (Number(dose) > drug.doseMax || Number(dose) < drug.doseMin) && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm font-semibold text-red-800">
            Dose outside the usual range ({drug.doseMin}–{drug.doseMax} {drug.doseUnit}) — double-check before running.
          </p>
        )}
        {renalConcern && drug.renalNote && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            <strong>Renal:</strong> {drug.renalNote}
          </p>
        )}
      </section>

      {/* Insulin */}
      <section className={`mt-4 ${card}`}>
        <h3 className="text-base font-bold text-slate-900">Insulin infusion (50 U regular in 50 ml NS = 1 U/ml)</h3>
        <ul className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
          <li><strong>DKA:</strong> 0.05–0.1 U/kg/h{w != null ? ` = ${(0.05 * w).toFixed(1)}–${(0.1 * w).toFixed(1)} U/h (${(0.05 * w).toFixed(1)}–${(0.1 * w).toFixed(1)} ml/h) for ${w} kg` : ""} — NO bolus in children.</li>
          <li>Target glucose fall 50–70 mg/dL/h. Falling faster → halve the rate; slower after 1 h → increase by 25–50%.</li>
          <li>Glucose &lt; 250: add dextrose (5–10%) to fluids; continue insulin until ketones clear and gap closes — do not stop early.</li>
          <li><strong>K⁺ rules:</strong> K &lt; 3.3 → HOLD insulin, replace K first. 3.3–5.3 → add 20–40 mEq/L to fluids. &gt; 5.3 → no K until it falls and urine flows.</li>
          <li><strong>Non-DKA ICU control:</strong> target 140–180 mg/dL; start 0.02–0.05 U/kg/h, check glucose 1-hourly until stable; avoid tight (&lt;110) targets.</li>
          {mode === "child" && (
            <li className="font-semibold text-red-800">Pediatric cerebral edema: headache, falling sensorium or bradycardia during DKA treatment → 3% NaCl 3–5 ml/kg over 10–15 min, slow the fluids, call PICU.</li>
          )}
        </ul>
      </section>

      {/* Fluids */}
      <section className={`mt-4 ${card}`}>
        <h3 className="text-base font-bold text-slate-900">IV fluids — maintenance &amp; restrictions</h3>
        {fluids ? (
          <>
            <p className="mt-2 text-sm text-slate-800"><strong>Maintenance:</strong> {fluids.label}</p>
            <ul className="mt-2 space-y-2">
              {restrictedFluidPlans(fluids.daily).map((p) => (
                <li key={p.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{p.label}: <span className="text-orange-800">{p.dailyMl} ml/day</span></p>
                  <p className="mt-0.5 text-slate-700">{p.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Resuscitation is separate from maintenance: 10–20 ml/kg balanced crystalloid boluses, reassess after each; smaller/slower boluses in heart disease and severe anemia.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Enter weight to compute fluid plans.</p>
        )}
      </section>

      {/* Electrolytes */}
      <section className={`mt-4 ${card}`}>
        <h3 className="text-base font-bold text-slate-900">Electrolyte corrections</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block"><span className={label}>Na⁺ (mEq/L)</span>
            <input type="number" inputMode="decimal" value={na} onChange={(e) => setNa(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>Glucose (mg/dL)</span>
            <input type="number" inputMode="decimal" value={glucose} onChange={(e) => setGlucose(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>Ca²⁺ (mg/dL)</span>
            <input type="number" inputMode="decimal" step="0.1" value={ca} onChange={(e) => setCa(num(e.target.value))} className={input} /></label>
          <label className="block"><span className={label}>Albumin (g/dL)</span>
            <input type="number" inputMode="decimal" step="0.1" value={albumin} onChange={(e) => setAlbumin(num(e.target.value))} className={input} /></label>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {naNum != null && glucose !== "" && Number(glucose) > 100 && (
            <p className="rounded-md bg-slate-50 p-2"><strong>Corrected Na⁺ for glucose:</strong> {correctedNa(naNum, Number(glucose))} mEq/L — treat THIS value, not the measured one, in hyperglycemia/DKA.</p>
          )}
          {ca !== "" && albumin !== "" && (
            <p className="rounded-md bg-slate-50 p-2"><strong>Albumin-corrected Ca²⁺:</strong> {correctedCa(Number(ca), Number(albumin))} mg/dL.</p>
          )}
          {lowNa && naNum != null && w != null && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <p className="font-bold">Hyponatremia {naNum} mEq/L</p>
              <ul className="mt-1 list-decimal space-y-1 pl-5">
                <li>Symptomatic (seizure/coma): 3% NaCl {mode === "child" ? "3–5 ml/kg" : "100–150 ml"} over 10–20 min, repeat once if needed — then stop and reassess.</li>
                <li>Deficit to raise Na⁺ by 5: ≈ {sodiumDeficit(w, naNum, naNum + 5, "male", mode === "child")} mEq ({mode === "child" ? "TBW 0.6" : "TBW 0.6 M / 0.5 F"}).</li>
                <li><strong>Hard ceiling: ≤ 8–10 mEq/L rise per 24 h</strong> — faster risks osmotic demyelination. Recheck Na⁺ every 2–4 h while correcting.</li>
              </ul>
            </div>
          )}
          {highNa && naNum != null && w != null && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <p className="font-bold">Hypernatremia {naNum} mEq/L</p>
              <ul className="mt-1 list-decimal space-y-1 pl-5">
                <li>Free-water deficit ≈ {freeWaterDeficit(w, naNum, "male", mode === "child")} L — replace over 48 h (oral/NG water or D5).</li>
                <li><strong>Lower Na⁺ by ≤ 10–12 mEq/L per 24 h</strong> (cerebral edema risk, especially children).</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
            <p className="font-bold">Hyperkalemia (K⁺ ≥ 6.5 or ECG changes) — in order</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Calcium gluconate 10%: {mode === "child" ? "0.5–1 ml/kg (max 20 ml)" : "10 ml"} IV over 5–10 min — protects the heart, does not lower K⁺.</li>
              <li>Insulin–dextrose: {mode === "child" ? "0.1 U/kg + dextrose 0.5 g/kg" : "10 U regular + 25 g dextrose"} over 15–30 min; glucose checks hourly ×4.</li>
              <li>Salbutamol nebulized {mode === "child" ? "2.5–5 mg" : "10 mg"}.</li>
              <li>Remove K⁺: furosemide if urine flows, K-binder, dialysis if refractory/anuric.</li>
              <li>Stop every K⁺ source and K-raising drug (ACEI/ARB, spironolactone, cotrimoxazole).</li>
            </ol>
          </div>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-bold text-slate-900">Hypokalemia</p>
              <p className="mt-1 text-slate-700">
                Oral first when K⁺ 3.0–3.4. IV: {mode === "child" ? "0.5–1 mEq/kg over 1–2 h (max 40 mEq)" : "10 mEq/h peripheral (max conc 40 mEq/L); up to 20 mEq/h only via central line with monitoring"}. NEVER IV push. Correct Mg²⁺ too or K⁺ won't hold.
                {renalConcern && " Renal impairment: halve rates and recheck early — K⁺ clears slowly."}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-bold text-slate-900">Magnesium / Calcium</p>
              <p className="mt-1 text-slate-700">
                Hypomagnesemia: MgSO₄ {mode === "child" ? "25–50 mg/kg" : "1–2 g"} IV over 15–60 min (torsades: {mode === "child" ? "25–50 mg/kg" : "2 g"} over 1–2 min).{renalConcern ? " CKD: halve dose, watch for toxicity (lost reflexes)." : ""}{" "}
                Symptomatic hypocalcemia: calcium gluconate 10% {mode === "child" ? "0.5–1 ml/kg (max 20 ml)" : "10–20 ml"} diluted, over 10 min, on a monitor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Protocol-level summaries for bedside cross-checking (ISCCM/SSC, ISPAD
        DKA, standard references). Institutional protocols and senior review
        prevail — especially for 3% NaCl, insulin and potassium.
      </p>
    </div>
  );
}
