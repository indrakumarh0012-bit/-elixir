import { useMemo, useState } from "react";
import {
  dosesPerDayFromFrequency,
  pediatricDrugsDB,
  searchPediatricDrugs,
  type PediatricDrug,
} from "../data/pediatricDrugs";

type AgeUnit = "years" | "months";

export default function PediatricDosageCalculator() {
  const [ageValue, setAgeValue] = useState<number | "">(3);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");
  const [weight, setWeight] = useState<number | "">(14);
  const [creatinine, setCreatinine] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<PediatricDrug | null>(null);
  const [targetMgPerKgDay, setTargetMgPerKgDay] = useState<number | "">("");
  const [frequency, setFrequency] = useState("q12h");

  const filteredDrugs = useMemo(
    () => searchPediatricDrugs(searchQuery),
    [searchQuery],
  );

  const ageMonths = useMemo(() => {
    if (ageValue === "" || Number(ageValue) < 0) return null;
    return ageUnit === "years" ? Number(ageValue) * 12 : Number(ageValue);
  }, [ageValue, ageUnit]);

  const handleDrugSelect = (drug: PediatricDrug) => {
    setSelectedDrug(drug);
    setTargetMgPerKgDay(drug.defaultDoseMgPerKg);
    setFrequency(drug.defaultFrequency);
    setSearchQuery("");
  };

  const divisions = useMemo(() => {
    if (!selectedDrug) return 1;
    return dosesPerDayFromFrequency(frequency) || selectedDrug.defaultDosesPerDay;
  }, [frequency, selectedDrug]);

  const weightNum = weight === "" ? 0 : Number(weight);
  const doseNum = targetMgPerKgDay === "" ? 0 : Number(targetMgPerKgDay);
  const isTopicalOrNonMg = Boolean(
    selectedDrug && selectedDrug.defaultDoseMgPerKg === 0 && selectedDrug.maxDosePerDayMg === 0,
  );

  const rawDaily = weightNum > 0 && doseNum > 0 ? weightNum * doseNum : 0;
  const cappedDaily =
    selectedDrug && selectedDrug.maxDosePerDayMg > 0
      ? Math.min(rawDaily, selectedDrug.maxDosePerDayMg)
      : rawDaily;
  const perDose = divisions > 0 ? cappedDaily / divisions : 0;
  const exceedsMax =
    Boolean(selectedDrug) &&
    selectedDrug!.maxDosePerDayMg > 0 &&
    rawDaily > selectedDrug!.maxDosePerDayMg;
  const renalWarn =
    Boolean(selectedDrug?.renalAdjustment) &&
    creatinine !== "" &&
    Number(creatinine) > 1.0;
  const weightInvalid = weight !== "" && Number(weight) <= 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Smart-Elixir Clinical Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Pediatric Dosage Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Harriet Lane / Nelson / IAP–aligned decision support. Confirm every dose with local
          protocol before prescribing. Database seed: {pediatricDrugsDB.length} drugs
          (expandable to 200+).
        </p>
      </header>

      {/* Section 1: Patient parameters */}
      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">1. Patient parameters</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={ageValue}
                onChange={(e) =>
                  setAgeValue(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
              <select
                value={ageUnit}
                onChange={(e) => setAgeUnit(e.target.value as AgeUnit)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm"
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
            {ageMonths != null && (
              <p className="mt-1 text-xs text-slate-500">≈ {ageMonths.toFixed(1)} months</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Weight (kg) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
            {weightInvalid && (
              <p className="mt-1 text-xs font-medium text-red-600">Weight must be &gt; 0</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Serum creatinine (mg/dL)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              placeholder="Optional"
              value={creatinine}
              onChange={(e) =>
                setCreatinine(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Drug selection */}
      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">2. Drug selection</h2>
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Search drug (name or category)
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Amoxicillin, UTI, Antihistamine..."
            className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[var(--accent)]"
          />
          {searchQuery.trim() && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredDrugs.length === 0 && (
                <li className="px-3 py-3 text-sm text-slate-500">No matches</li>
              )}
              {filteredDrugs.map((drug) => (
                <li key={drug.id}>
                  <button
                    type="button"
                    onClick={() => handleDrugSelect(drug)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left hover:bg-[var(--accent-soft)]"
                  >
                    <span className="font-semibold text-slate-900">{drug.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {drug.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedDrug && (
          <p className="mt-3 text-sm text-slate-600">
            Selected: <strong>{selectedDrug.name}</strong>{" "}
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
              {selectedDrug.category}
            </span>
          </p>
        )}
      </section>

      {/* Section 3 + 4: Calculation & clinical guidelines */}
      {selectedDrug && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              3. Dosage calculation — {selectedDrug.name}
            </h2>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              Source: {selectedDrug.referenceSource}
            </span>
          </div>

          <p className="mb-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm text-slate-700">
            <strong>Guideline dose:</strong> {selectedDrug.recommendedDose}
          </p>

          {isTopicalOrNonMg ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This product is not calculated as mg/kg × weight (topical / volume / device dosing).
              Follow administration instructions below.
            </div>
          ) : (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Target dose (mg/kg/day) — editable
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={targetMgPerKgDay}
                    onChange={(e) =>
                      setTargetMgPerKgDay(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    disabled={weightInvalid || weightNum <= 0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold outline-none focus:border-[var(--accent)] disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)]"
                  >
                    {selectedDrug.frequencyOptions.map((f) => (
                      <option key={f} value={f}>
                        {f} ({dosesPerDayFromFrequency(f)}× / day)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Route
                  </label>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {selectedDrug.route.join(" · ")}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Divisions / day
                  </label>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {divisions}
                  </div>
                </div>
              </div>

              {weightNum <= 0 ? (
                <p className="mb-4 text-sm font-medium text-red-600">
                  Enter a valid weight (&gt; 0 kg) to calculate.
                </p>
              ) : (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-[var(--ok-bg)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium text-emerald-900">
                      Calculated total daily dose
                    </span>
                    <span className="text-2xl font-bold text-emerald-900">
                      {cappedDaily.toFixed(1)} mg
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-emerald-900">
                      Calculated per-dose amount
                    </span>
                    <span className="text-2xl font-bold text-emerald-900">
                      {perDose.toFixed(1)} mg
                    </span>
                  </div>
                </div>
              )}

              {exceedsMax && (
                <div className="mb-4 rounded-lg border border-red-200 bg-[var(--danger-bg)] p-3 text-sm font-semibold text-red-700">
                  Daily dose capped at absolute maximum ({selectedDrug.maxDosePerDayMg} mg/day).
                  Raw calculated daily was {rawDaily.toFixed(1)} mg.
                </div>
              )}
            </>
          )}

          {renalWarn && (
            <div className="mb-4 rounded-lg border border-red-200 bg-[var(--danger-bg)] p-3 text-sm font-semibold text-red-700">
              Serum creatinine &gt; 1.0 mg/dL and this drug is flagged for renal adjustment —
              review dose for renal function / CrCl before prescribing.
            </div>
          )}

          {/* Section 4 */}
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <h3 className="text-base font-semibold text-slate-900">4. Clinical guidelines</h3>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                <span aria-hidden>⚠</span> Cautions / contraindications
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {selectedDrug.cautionsAndContraindications.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-bold text-[var(--accent)]">
                Administration instructions
              </h4>
              <p className="text-sm text-slate-700">{selectedDrug.instructions}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
