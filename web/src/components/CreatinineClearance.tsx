import { useMemo, useState } from "react";
import { drugsDB } from "../clinical/clinicalData";
import { egfrCkdEpi2021, estimateCrCl, gfrCategory } from "../lib/creatinineClearanceMath";
import SaveButton from "./SaveButton";
import {
  buildRenalDoseReport,
  searchRenalDrugs,
  URGENCY_STYLES,
} from "../lib/renalDoseAdjust";

/** Cockcroft–Gault CrCl (mL/min) with renal drug dose adjustment lookup. */
export default function CreatinineClearance() {
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState<number | "">(60);
  const [weight, setWeight] = useState<number | "">(60);
  const [height, setHeight] = useState<number | "">(165);
  const [unit, setUnit] = useState<"mg/dL" | "µmol/L">("mg/dL");
  const [creatinine, setCreatinine] = useState<number | "">(1.2);
  const [drugQuery, setDrugQuery] = useState("");
  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);

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

  const filteredDrugs = useMemo(() => searchRenalDrugs(drugQuery), [drugQuery]);

  const selectedReport = useMemo(() => {
    if (!result.valid || !selectedDrugId) return null;
    const drug = drugsDB.find((d) => d.id === selectedDrugId);
    if (!drug) return null;
    return buildRenalDoseReport(drug, result.crCl);
  }, [result.crCl, result.valid, selectedDrugId]);

  const numOrEmpty = (v: string): number | "" => {
    if (v.trim() === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? n : "";
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Creatinine Clearance</h2>

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
                  sex === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
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
            data-adv="2"
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
        {result.valid ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  CrCl — Cockcroft-Gault
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {result.crCl} <span className="text-lg font-semibold">mL/min</span>
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Used for the drug dose adjustments below.
                </p>
              </div>
              {(() => {
                const scrMgDl =
                  creatinine === ""
                    ? null
                    : unit === "mg/dL"
                      ? Number(creatinine)
                      : Number(creatinine) / 88.4;
                const egfr =
                  scrMgDl == null || age === ""
                    ? null
                    : egfrCkdEpi2021(sex, Number(age), scrMgDl);
                if (egfr == null) return null;
                const cat = gfrCategory(egfr);
                return (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      eGFR — CKD-EPI 2021
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {egfr}{" "}
                      <span className="text-lg font-semibold">mL/min/1.73 m²</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      KDIGO {cat.stage} — {cat.label}. Use for CKD staging
                      (adults; race-free 2021 equation).
                    </p>
                  </div>
                );
              })()}
            </div>
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

      {result.valid && (
        <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">
            Renal dose adjustment lookup
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Search antibiotics and renally cleared drugs. Adjustments use your calculated
            CrCl of <strong>{result.crCl} mL/min</strong>.
          </p>

          <label className="mt-4 block text-sm font-semibold" htmlFor="renal-drug-search">
            Search drug
          </label>
          <input
            id="renal-drug-search"
            type="search"
            value={drugQuery}
            onChange={(e) => {
              setDrugQuery(e.target.value);
              setSelectedDrugId(null);
            }}
            placeholder="e.g. amoxicillin, ciprofloxacin, vancomycin…"
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none ring-blue-600 focus:ring-2"
          />

          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
            {filteredDrugs.map((drug) => (
              <li key={drug.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDrugId(drug.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedDrugId === drug.id
                      ? "border-blue-400 bg-blue-50 font-semibold text-blue-900"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-semibold">{drug.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{drug.class}</span>
                </button>
              </li>
            ))}
          </ul>

          {selectedReport && (
            <div
              className={`mt-4 rounded-xl border p-4 ${URGENCY_STYLES[selectedReport.urgency].wrap}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${URGENCY_STYLES[selectedReport.urgency].badge}`}
                >
                  {URGENCY_STYLES[selectedReport.urgency].label}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedReport.drug.name}
                </h3>
              </div>

              <p className="mt-2 text-sm text-slate-700">
                <strong>Standard dose:</strong> {selectedReport.standardDose}
              </p>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Recommendations at CrCl {selectedReport.crCl} mL/min
                </p>
                {selectedReport.recommendations.map((rec) => (
                  <p
                    key={rec}
                    className="rounded-lg border border-white/80 bg-white/70 px-3 py-2 text-sm leading-relaxed text-slate-800"
                  >
                    {rec}
                  </p>
                ))}
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Full CrCl band guide
                </p>
                <ul className="mt-2 space-y-2">
                  {selectedReport.bands.map((band) => {
                    const maxLabel =
                      band.maxCrCl != null ? `–${band.maxCrCl}` : "+";
                    return (
                      <li
                        key={`${band.minCrCl}-${band.maxCrCl ?? "up"}`}
                        className="rounded-lg border border-white/80 bg-white/60 px-3 py-2 text-sm"
                      >
                        <span className="font-semibold text-slate-900">
                          CrCl {band.minCrCl}
                          {maxLabel} mL/min:
                        </span>{" "}
                        {band.action}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      <SaveButton
        tool="CrCl"
        build={() => {
          if (!result.valid) return null;
          return {
            title: `CrCl ${result.crCl} ml/min — ${age} y`,
            detail: `Cockcroft–Gault (${sex}, ${weight} kg, Cr ${creatinine} ${unit})` +
              (selectedReport
                ? `\n${selectedReport.drug.name}: ${selectedReport.recommendations[0] ?? ""}`
                : ""),
          };
        }}
      />
      <p className="mt-3 text-xs text-slate-500">
        Ref: Cockcroft–Gault 1976 · drug bands per label/renal handbooks.
      </p>
    </div>
  );
}