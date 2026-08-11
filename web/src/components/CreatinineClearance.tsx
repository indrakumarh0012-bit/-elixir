import { useMemo, useState } from "react";
import { estimateCrCl } from "../lib/creatinineClearanceMath";

/** Cockcroft–Gault CrCl (mL/min) with optional IBW / AjBW. */
export default function CreatinineClearance() {
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState<number | "">(60);
  const [weight, setWeight] = useState<number | "">(60);
  const [height, setHeight] = useState<number | "">(165);
  const [unit, setUnit] = useState<"mg/dL" | "µmol/L">("mg/dL");
  const [creatinine, setCreatinine] = useState<number | "">(1.2);

  const result = useMemo(() => {
    return estimateCrCl({
      sex,
      ageYears: age === "" ? 0 : Number(age),
      weightKg: weight === "" ? 0 : Number(weight),
      heightCm: height === "" || Number(height) <= 0 ? null : Number(height),
      creatinine: creatinine === "" ? 0 : Number(creatinine),
      unit,
    });
  }, [sex, age, weight, height, unit, creatinine]);

  const numOrEmpty = (v: string): number | "" => {
    if (v.trim() === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? n : "";
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[var(--ink)]">Creatinine Clearance</h1>

      <div className="mt-6 space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Sex</legend>
          <div className="flex gap-3">
            {(["Male", "Female"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  sex === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-semibold">
          Age (years)
          <input
            type="number"
            min={1}
            max={110}
            value={age}
            onChange={(e) => setAge(numOrEmpty(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>

        <label className="block text-sm font-semibold">
          Actual body weight (kg)
          <input
            type="number"
            min={1}
            max={300}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(numOrEmpty(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>

        <label className="block text-sm font-semibold">
          Height (cm)
          <input
            type="number"
            min={0}
            max={220}
            value={height}
            onChange={(e) => setHeight(numOrEmpty(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>

        <label className="block text-sm font-semibold">
          Serum creatinine unit
          <select
            value={unit}
            onChange={(e) => {
              const next = e.target.value as "mg/dL" | "µmol/L";
              setUnit(next);
              setCreatinine(next === "mg/dL" ? 1.2 : 106);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          >
            <option value="mg/dL">mg/dL</option>
            <option value="µmol/L">µmol/L</option>
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Serum creatinine ({unit})
          <input
            type="number"
            min={unit === "mg/dL" ? 0.1 : 10}
            max={unit === "mg/dL" ? 30 : 3000}
            step={unit === "mg/dL" ? 0.1 : 1}
            value={creatinine}
            onChange={(e) => setCreatinine(numOrEmpty(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Estimated CrCl
        </p>
        {result.valid ? (
          <>
            <p className="mt-1 text-3xl font-bold text-[var(--accent)]">
              {result.crCl} <span className="text-lg font-semibold">mL/min</span>
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Weight used: <strong>{result.weightUsed} kg</strong> ({result.basis})
              {result.ibw != null ? ` · IBW ${result.ibw} kg` : ""}
              {result.ajbw != null ? ` · AjBW ${result.ajbw} kg` : ""}
              {` · Gender factor ${result.genderFactor}`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm font-semibold text-amber-800">
            {result.errors.join(" · ") || "Enter age, weight, and creatinine."}
          </p>
        )}
      </div>
    </div>
  );
}
