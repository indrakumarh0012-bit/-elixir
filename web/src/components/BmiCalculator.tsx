import { useMemo, useState } from "react";
import {
  bmiValue,
  classifyBmiIndian,
  feetInchesToCm,
  waistFlag,
} from "../lib/bmiMath";
import SaveButton from "./SaveButton";
import BmiGauge from "./BmiGauge";

const BAND_STYLES = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-950",
  caution: "border-amber-200 bg-amber-50 text-amber-950",
  alert: "border-red-200 bg-red-50 text-red-950",
} as const;

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-500";
const label = "text-xs font-semibold text-slate-700";

function num(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

export default function BmiCalculator() {
  const [sex, setSex] = useState<"male" | "female">("male");
  const [unit, setUnit] = useState<"cm" | "ft">("cm");
  const [weight, setWeight] = useState<number | "">("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [feet, setFeet] = useState<number | "">("");
  const [inches, setInches] = useState<number | "">("");
  const [age, setAge] = useState<number | "">("");
  const [waist, setWaist] = useState<number | "">("");

  const effHeight = useMemo(() => {
    if (unit === "cm") return heightCm === "" ? null : Number(heightCm);
    if (feet === "") return null;
    return feetInchesToCm(Number(feet), inches === "" ? 0 : Number(inches));
  }, [unit, heightCm, feet, inches]);

  const bmi = useMemo(() => {
    if (weight === "" || effHeight == null) return null;
    return bmiValue(Number(weight), effHeight);
  }, [weight, effHeight]);

  const cls = bmi != null ? classifyBmiIndian(bmi) : null;
  const pediatric = age !== "" && Number(age) < 18;
  const wf = waist !== "" && Number(waist) > 0 ? waistFlag(Number(waist), sex) : null;

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">BMI</h2>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["male", "female"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSex(s)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                sex === s ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}>
              {s === "male" ? "Male" : "Female"}
            </button>
          ))}
          <span className="mx-1 hidden self-center text-slate-300 sm:inline">|</span>
          {(["cm", "ft"] as const).map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                unit === u ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}>
              {u === "cm" ? "Height in cm" : "Height in ft / in"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={label}>Weight (kg)</span>
            <input type="number" inputMode="decimal" min={1} step="0.1" value={weight}
              onChange={(e) => setWeight(num(e.target.value))} className={input} />
          </label>
          {unit === "cm" ? (
            <label className="block">
              <span className={label}>Height (cm)</span>
              <input type="number" inputMode="decimal" min={50} data-adv="3" value={heightCm}
                onChange={(e) => setHeightCm(num(e.target.value))} className={input} />
            </label>
          ) : (
            <>
              <label className="block">
                <span className={label}>Height (feet)</span>
                <input type="number" inputMode="numeric" min={1} max={8} data-adv="1" value={feet}
                  onChange={(e) => setFeet(num(e.target.value))} className={input} />
              </label>
              <label className="block">
                <span className={label}>+ inches</span>
                <input type="number" inputMode="numeric" min={0} max={11} value={inches}
                  onChange={(e) => setInches(num(e.target.value))} className={input} />
              </label>
            </>
          )}
          <label className="block">
            <span className={label}>Age (years)</span>
            <input type="number" inputMode="numeric" min={2} max={110} data-adv="2" value={age}
              onChange={(e) => setAge(num(e.target.value))} className={input} />
          </label>
          <label className="block">
            <span className={label}>Waist (cm, optional)</span>
            <input type="number" inputMode="decimal" min={40} value={waist}
              onChange={(e) => setWaist(num(e.target.value))} className={input} />
          </label>
        </div>
        {unit === "ft" && effHeight != null && (
          <p className="mt-2 text-xs text-slate-600">= {effHeight} cm</p>
        )}
      </section>

      {bmi != null && cls && (
        <div className={`mt-4 rounded-lg border p-4 ${BAND_STYLES[cls.band]}`}>
          <p className="text-3xl font-bold">
            {bmi} <span className="text-lg font-semibold">kg/m²</span>
          </p>
          <p className="mt-1 text-lg font-bold">{cls.label}</p>
          <p className="mt-1 text-sm">{cls.advice}</p>
        </div>
      )}

      {bmi != null && <BmiGauge bmi={bmi} />}

      {pediatric && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Age under 18: adult cutoffs do not apply — plot BMI on the IAP
          age-and-sex BMI centile chart instead (overweight ≥ adult-equivalent
          23 line, obesity ≥ adult-equivalent 27 line per IAP 2015).
        </p>
      )}

      {wf && (
        <p className={`mt-3 rounded-lg border p-3 text-sm ${wf.abnormal ? BAND_STYLES.alert : BAND_STYLES.normal}`}>
          {wf.text}
        </p>
      )}

      {bmi != null && cls && (
        <SaveButton
          tool="BMI"
          build={() => ({
            title: `BMI ${bmi} kg/m²`,
            detail: `${cls.label} · weight ${weight} kg, height ${effHeight} cm${waist !== "" ? `, waist ${waist} cm` : ""}`,
          })}
        />
      )}
      <p className="mt-2 text-xs text-slate-600">
        Ref: Indian consensus for Asian Indians (Misra 2009) · IAP 2015 charts
        for under-18s.
      </p>
    </div>
  );
}
