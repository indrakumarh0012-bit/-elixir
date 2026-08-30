import { useMemo, useState } from "react";
import {
  VASOACTIVES,
  adultMaintenanceFluids,
  assessPotassium,
  correctedCa,
  correctedNa,
  freeWaterDeficit,
  infusionRateMlPerHour,
  pedMaintenanceFluids,
  restrictedFluidPlans,
  sodiumDeficit,
} from "../lib/icuMath";
import SaveButton from "./SaveButton";

function num(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

const card = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
const label = "text-xs font-semibold text-slate-700";
const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-500";

const BAND_STYLES = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-950",
  caution: "border-amber-200 bg-amber-50 text-amber-950",
  alert: "border-red-200 bg-red-50 text-red-950",
} as const;

type Topic = "drips" | "fluids" | "electrolytes";
const TOPICS: { id: Topic; label: string }[] = [
  { id: "drips", label: "Drips" },
  { id: "fluids", label: "Fluids" },
  { id: "electrolytes", label: "Electrolytes" },
];

export default function IcuTitration() {
  const [mode, setMode] = useState<"adult" | "child">("adult");
  const [topic, setTopic] = useState<Topic>("drips");
  const [weight, setWeight] = useState<number | "">("");
  const [creatinine, setCreatinine] = useState<number | "">("");

  const [drugId, setDrugId] = useState(VASOACTIVES[0].id);
  const [dose, setDose] = useState<number | "">("");

  const [na, setNa] = useState<number | "">("");
  const [k, setK] = useState<number | "">("");
  const [mg, setMg] = useState<number | "">("");
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
  const child = mode === "child";

  const fluids = useMemo(() => {
    if (w == null) return null;
    if (child) {
      const m = pedMaintenanceFluids(w);
      return m ? { label: `Holliday–Segar: ${m.daily} ml/day (${m.hourly} ml/h by 4-2-1)`, daily: m.daily } : null;
    }
    const a = adultMaintenanceFluids(w);
    return a ? { label: `${a.low}–${a.high} ml/day (25–30 ml/kg)`, daily: Math.round((a.low + a.high) / 2) } : null;
  }, [w, child]);

  const naNum = na === "" ? null : Number(na);
  const lowNa = naNum != null && naNum < 135 && w != null;
  const highNa = naNum != null && naNum > 145 && w != null;
  const kAssessment = k === "" ? null : assessPotassium(Number(k), child, renalConcern);
  const mgNum = mg === "" ? null : Number(mg);
  const caCorr =
    ca !== "" && albumin !== ""
      ? correctedCa(Number(ca), Number(albumin))
      : ca !== ""
        ? Number(ca)
        : null;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">ICU Titration</h2>

      <section className={`mt-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {(["adult", "child"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === m ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
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
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTopic(t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                topic === t.id ? "bg-orange-950 text-white shadow-sm" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {topic === "drips" && (
        <section className={`mt-4 ${card}`}>
          <h3 className="text-base font-bold text-slate-900">Infusion rate</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-1"><span className={label}>Drug</span>
              <select value={drugId} onChange={(e) => { setDrugId(e.target.value); setDose(""); }} className={input}>
                {VASOACTIVES.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select></label>
            <label className="block"><span className={label}>Dose ({drug.doseUnit})</span>
              <input type="number" inputMode="decimal" step="0.01" value={dose} onChange={(e) => setDose(num(e.target.value))} className={input}
                placeholder={`${drug.doseMin}–${drug.doseMax}`} /></label>
            <div className="rounded-lg bg-slate-100 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Pump rate</p>
              <p className="text-2xl font-bold text-slate-900">{rate != null ? `${rate} ml/h` : "—"}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-800"><strong>Dilution:</strong> {drug.dilution}</p>
          <p className="mt-1 text-sm text-slate-800"><strong>Range:</strong> {drug.doseMin}–{drug.doseMax} {drug.doseUnit}. {drug.titration}</p>
          {dose !== "" && (Number(dose) > drug.doseMax || Number(dose) < drug.doseMin) && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm font-semibold text-red-900">
              Dose outside the usual range ({drug.doseMin}–{drug.doseMax} {drug.doseUnit}) — double-check before running.
            </p>
          )}
          {renalConcern && drug.renalNote && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950">
              <strong>Renal:</strong> {drug.renalNote}
            </p>
          )}
        </section>
      )}

      {topic === "fluids" && (
        <section className={`mt-4 ${card}`}>
          <h3 className="text-base font-bold text-slate-900">IV fluids — maintenance &amp; restrictions</h3>
          {fluids ? (
            <>
              <p className="mt-2 text-sm text-slate-800"><strong>Maintenance:</strong> {fluids.label}</p>
              <ul className="mt-2 space-y-2">
                {restrictedFluidPlans(fluids.daily).map((p) => (
                  <li key={p.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{p.label}: <span className="text-slate-950">{p.dailyMl} ml/day</span></p>
                    <p className="mt-0.5 text-slate-700">{p.note}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-600">
                Resuscitation is separate from maintenance: 10–20 ml/kg balanced crystalloid boluses, reassess after each; smaller/slower boluses in heart disease and severe anemia.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Enter weight to compute fluid plans.</p>
          )}
        </section>
      )}

      {topic === "electrolytes" && (
        <section className={`mt-4 ${card}`}>
          <h3 className="text-base font-bold text-slate-900">Electrolytes — enter the measured values</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block"><span className={label}>K⁺ (mEq/L)</span>
              <input type="number" inputMode="decimal" step="0.1" value={k} onChange={(e) => setK(num(e.target.value))} className={input} /></label>
            <label className="block"><span className={label}>Na⁺ (mEq/L)</span>
              <input type="number" inputMode="decimal" value={na} onChange={(e) => setNa(num(e.target.value))} className={input} /></label>
            <label className="block"><span className={label}>Mg²⁺ (mg/dL)</span>
              <input type="number" inputMode="decimal" step="0.1" value={mg} onChange={(e) => setMg(num(e.target.value))} className={input} /></label>
            <label className="block"><span className={label}>Glucose (mg/dL)</span>
              <input type="number" inputMode="decimal" value={glucose} onChange={(e) => setGlucose(num(e.target.value))} className={input} /></label>
            <label className="block"><span className={label}>Ca²⁺ (mg/dL)</span>
              <input type="number" inputMode="decimal" step="0.1" value={ca} onChange={(e) => setCa(num(e.target.value))} className={input} /></label>
            <label className="block"><span className={label}>Albumin (g/dL)</span>
              <input type="number" inputMode="decimal" step="0.1" value={albumin} onChange={(e) => setAlbumin(num(e.target.value))} className={input} /></label>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            {kAssessment && (
              <div className={`rounded-lg border p-3 ${BAND_STYLES[kAssessment.band]}`}>
                <p className="font-bold">{kAssessment.classification}</p>
                {kAssessment.band !== "normal" ? (
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {kAssessment.actions.map((a, i) => (<li key={i}>{a}</li>))}
                  </ol>
                ) : (
                  <p className="mt-1">{kAssessment.actions[0]}</p>
                )}
              </div>
            )}
            {naNum != null && glucose !== "" && Number(glucose) > 100 && (
              <p className="rounded-md bg-slate-50 p-2"><strong>Corrected Na⁺ for glucose:</strong> {correctedNa(naNum, Number(glucose))} mEq/L — treat THIS value, not the measured one, in hyperglycemia/DKA.</p>
            )}
            {lowNa && naNum != null && w != null && (
              <div className={`rounded-lg border p-3 ${BAND_STYLES.caution}`}>
                <p className="font-bold">Hyponatremia (Na⁺ {naNum})</p>
                <ul className="mt-1 list-decimal space-y-1 pl-5">
                  <li>Symptomatic (seizure/coma): 3% NaCl {child ? "3–5 ml/kg" : "100–150 ml"} over 10–20 min, repeat once if needed — then stop and reassess.</li>
                  <li>Deficit to raise Na⁺ by 5: ≈ {sodiumDeficit(w, naNum, naNum + 5, "male", child)} mEq ({child ? "TBW 0.6" : "TBW 0.6 M / 0.5 F"}).</li>
                  <li><strong>Hard ceiling: ≤ 8–10 mEq/L rise per 24 h</strong> — faster risks osmotic demyelination. Recheck Na⁺ every 2–4 h while correcting.</li>
                </ul>
              </div>
            )}
            {naNum != null && naNum < 135 && w == null && (
              <p className={`rounded-lg border p-3 ${BAND_STYLES.caution}`}>Na⁺ {naNum} is low — enter weight to compute the sodium deficit and correction plan.</p>
            )}
            {highNa && naNum != null && w != null && (
              <div className={`rounded-lg border p-3 ${BAND_STYLES.caution}`}>
                <p className="font-bold">Hypernatremia (Na⁺ {naNum})</p>
                <ul className="mt-1 list-decimal space-y-1 pl-5">
                  <li>Free-water deficit ≈ {freeWaterDeficit(w, naNum, "male", child)} L — replace over 48 h (oral/NG water or D5).</li>
                  <li><strong>Lower Na⁺ by ≤ 10–12 mEq/L per 24 h</strong> (cerebral edema risk, especially children).</li>
                </ul>
              </div>
            )}
            {naNum != null && naNum > 145 && w == null && (
              <p className={`rounded-lg border p-3 ${BAND_STYLES.caution}`}>Na⁺ {naNum} is high — enter weight to compute the free-water deficit.</p>
            )}
            {naNum != null && naNum >= 135 && naNum <= 145 && (
              <p className={`rounded-lg border p-3 ${BAND_STYLES.normal}`}>Na⁺ {naNum} is in the normal range (135–145). No correction needed.</p>
            )}
            {mgNum != null && (
              mgNum < 1.7 ? (
                <div className={`rounded-lg border p-3 ${mgNum < 1.3 ? BAND_STYLES.alert : BAND_STYLES.caution}`}>
                  <p className="font-bold">{mgNum < 1.3 ? "Severe" : "Mild"} hypomagnesemia (Mg²⁺ {mgNum})</p>
                  <p className="mt-1">MgSO₄ {child ? "25–50 mg/kg" : "1–2 g"} IV over 15–60 min (torsades: {child ? "25–50 mg/kg" : "2 g"} over 1–2 min).{renalConcern ? " Renal impairment: halve dose and watch for toxicity (lost knee reflexes)." : ""} Low Mg²⁺ also keeps K⁺ and Ca²⁺ low — correct Mg²⁺ first.</p>
                </div>
              ) : mgNum > 2.4 ? (
                <p className={`rounded-lg border p-3 ${BAND_STYLES.caution}`}><strong>High Mg²⁺ ({mgNum}):</strong> stop magnesium sources; if symptomatic (hypotonia, hypotension) give calcium gluconate and involve seniors — mainly a renal-failure problem.</p>
              ) : (
                <p className={`rounded-lg border p-3 ${BAND_STYLES.normal}`}>Mg²⁺ {mgNum} is in the normal range (1.7–2.4). No correction needed.</p>
              )
            )}
            {caCorr != null && (
              <div className={`rounded-lg border p-3 ${caCorr < 8.5 || caCorr > 10.5 ? BAND_STYLES.caution : BAND_STYLES.normal}`}>
                <p className="font-bold">
                  {albumin !== "" ? "Albumin-corrected " : ""}Ca²⁺ {caCorr} mg/dL —{" "}
                  {caCorr < 8.5 ? "low" : caCorr > 10.5 ? "high" : "normal (8.5–10.5)"}
                </p>
                {caCorr < 8.5 && (
                  <p className="mt-1">Symptomatic (tetany, seizures, long QT): calcium gluconate 10% {child ? "0.5–1 ml/kg (max 20 ml)" : "10–20 ml"} diluted, IV over 10 min, on a monitor. Check Mg²⁺ and vitamin D.</p>
                )}
                {caCorr > 10.5 && (
                  <p className="mt-1">Hydrate with normal saline first; hold calcium, vitamin D and thiazides; bisphosphonate/specialist input for persistent or symptomatic hypercalcemia.</p>
                )}
              </div>
            )}
            {k === "" && na === "" && mg === "" && ca === "" && (
              <p className="text-sm text-slate-600">Enter a value — only the advice relevant to that value is shown.</p>
            )}
          </div>
        </section>
      )}

      <SaveButton
        tool="ICU"
        build={() => {
          if (topic === "electrolytes" && kAssessment) {
            return { title: kAssessment.classification, detail: kAssessment.actions.join(" ") };
          }
          if (rate == null) return null;
          return {
            title: `${drug.name} — ${dose} ${drug.doseUnit}`,
            detail: `${w ?? "?"} kg → ${rate} ml/h (${drug.dilution})`,
          };
        }}
      />

      <p className="mt-4 text-xs leading-relaxed text-slate-600">
        Insulin infusion, DKA rates and titration are in the Insulin tool
        (Infusion mode). Ref: ISCCM/SSC, standard ICU references. Institutional
        protocols and senior review prevail — especially for 3% NaCl and
        potassium.
      </p>
    </div>
  );
}
