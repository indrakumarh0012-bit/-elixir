import { useMemo, useState } from "react";

/** Cockcroft–Gault CrCl (mL/min) with optional IBW / AjBW. */
function dosingWeightKg(
  abwKg: number,
  heightCm: number | null,
  isFemale: boolean,
): { weight: number; basis: string; ibw: number | null; ajbw: number | null } {
  if (!heightCm || heightCm <= 0) {
    return { weight: abwKg, basis: "ABW", ibw: null, ajbw: null };
  }
  const heightIn = heightCm / 2.54;
  const ibw = isFemale
    ? 45.5 + 2.3 * Math.max(heightIn - 60, 0)
    : 50 + 2.3 * Math.max(heightIn - 60, 0);
  if (abwKg > ibw * 1.2) {
    const ajbw = ibw + 0.4 * (abwKg - ibw);
    return { weight: ajbw, basis: "AjBW", ibw: round1(ibw), ajbw: round1(ajbw) };
  }
  if (abwKg < ibw) {
    return { weight: abwKg, basis: "ABW (under IBW)", ibw: round1(ibw), ajbw: null };
  }
  return { weight: abwKg, basis: "ABW", ibw: round1(ibw), ajbw: null };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function CreatinineClearance() {
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState(60);
  const [weight, setWeight] = useState(60);
  const [height, setHeight] = useState(165);
  const [unit, setUnit] = useState<"mg/dL" | "µmol/L">("mg/dL");
  const [creatinine, setCreatinine] = useState(1.2);

  const result = useMemo(() => {
    const isFemale = sex === "Female";
    const { weight: wt, basis, ibw, ajbw } = dosingWeightKg(
      weight,
      height > 0 ? height : null,
      isFemale,
    );
    const genderFactor = isFemale ? 0.85 : 1.0;
    let crCl = 0;
    if (creatinine > 0 && age > 0 && wt > 0) {
      if (unit === "µmol/L") {
        const k = isFemale ? 1.04 : 1.23;
        crCl = ((140 - age) * wt * k) / creatinine;
      } else {
        crCl = (((140 - age) * wt) / (72 * creatinine)) * genderFactor;
      }
    }
    return {
      crCl: round1(crCl),
      weightUsed: round1(wt),
      basis,
      ibw,
      ajbw,
      genderFactor,
    };
  }, [sex, age, weight, height, unit, creatinine]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[var(--ink)]">Creatinine Clearance</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Cockcroft–Gault (mL/min) — adult dosing support at the end of the workflow.
      </p>

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
            min={18}
            max={110}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>

        <label className="block text-sm font-semibold">
          Actual body weight (kg)
          <input
            type="number"
            min={30}
            max={200}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>

        <label className="block text-sm font-semibold">
          Height (cm) — optional for IBW / AjBW
          <input
            type="number"
            min={0}
            max={220}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
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
            min={unit === "mg/dL" ? 0.2 : 10}
            max={unit === "mg/dL" ? 20 : 2000}
            step={unit === "mg/dL" ? 0.1 : 1}
            value={creatinine}
            onChange={(e) => setCreatinine(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Estimated CrCl
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--accent)]">
          {result.crCl} <span className="text-lg font-semibold">mL/min</span>
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Weight used: <strong>{result.weightUsed} kg</strong> ({result.basis})
          {result.ibw != null ? ` · IBW ${result.ibw} kg` : ""}
          {result.ajbw != null ? ` · AjBW ${result.ajbw} kg` : ""}
          {` · Gender factor ${result.genderFactor}`}
        </p>
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Cockcroft–Gault is preferred for drug dosing. Inaccurate in AKI / unstable creatinine.
        </p>
      </div>
    </div>
  );
}
