import { useMemo, useState } from "react";
import {
  dosesPerDayFromFrequency,
  mgToMl,
  mlToDrops,
  pediatricDrugsDB,
  searchPediatricDrugs,
  type DrugFormulation,
  type PediatricDrug,
} from "../data/pediatricDrugs";

type AgeUnit = "years" | "months" | "days";

export default function PediatricDosageCalculator() {
  const [ageValue, setAgeValue] = useState<number | "">(3);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");
  const [weight, setWeight] = useState<number | "">(14);
  const [creatinine, setCreatinine] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<PediatricDrug | null>(null);
  const [selectedFormulation, setSelectedFormulation] = useState<DrugFormulation | null>(null);
  const [targetMgPerKgDay, setTargetMgPerKgDay] = useState<number | "">("");
  const [frequency, setFrequency] = useState("q12h");

  const filteredDrugs = useMemo(
    () => searchPediatricDrugs(searchQuery),
    [searchQuery],
  );

  const ageDays = useMemo(() => {
    if (ageValue === "" || Number(ageValue) < 0) return null;
    const n = Number(ageValue);
    if (ageUnit === "days") return n;
    if (ageUnit === "months") return n * 30.4375;
    return n * 365.25;
  }, [ageValue, ageUnit]);

  const ageMonths = useMemo(() => {
    if (ageDays == null) return null;
    return ageDays / 30.4375;
  }, [ageDays]);

  const isNeonate = ageDays != null && ageDays < 28;

  const handleDrugSelect = (drug: PediatricDrug) => {
    setSelectedDrug(drug);
    setTargetMgPerKgDay(drug.defaultDoseMgPerKg);
    setFrequency(drug.defaultFrequency);
    setSelectedFormulation(drug.formulations[0] ?? null);
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

  const volumeMl =
    selectedFormulation && perDose > 0 ? mgToMl(perDose, selectedFormulation) : null;
  const dropsPerMl = selectedFormulation?.dropsPerMl ?? 20;
  const drops =
    volumeMl != null &&
    (selectedFormulation?.form === "Drops" || isNeonate || Boolean(selectedFormulation?.dropperCapacityMl))
      ? mlToDrops(volumeMl, dropsPerMl)
      : null;

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
          India / Bengaluru private OPD strengths &amp; brands included. Neonates: use{" "}
          <strong>Cloherty</strong> + dropper/mL guidance. Seed: {pediatricDrugsDB.length} drugs.
        </p>
      </header>

      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">1. Patient parameters</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step={ageUnit === "days" ? 1 : 0.5}
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
                <option value="days">Days</option>
              </select>
            </div>
            {ageDays != null && (
              <p className="mt-1 text-xs text-slate-500">
                ≈ {Math.round(ageDays)} days
                {ageMonths != null ? ` · ${ageMonths.toFixed(1)} months` : ""}
                {isNeonate ? " · Neonate (<28 days)" : ""}
              </p>
            )}
            {isNeonate && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-900">
                Neonatal age — verify Cloherty &amp; Stark for GA/PNA-specific doses; use marked
                dropper (often 1 ml ≈ 20 drops — confirm bottle).
              </p>
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

      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">2. Drug selection</h2>
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Search drug / brand / strength
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Calpol, 100 mg/5 ml, Levipil, Meftal-P..."
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

      {selectedDrug && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            3. Dosage calculation — {selectedDrug.name}
          </h2>

          <p className="mb-3 rounded-lg bg-[var(--accent-soft)] p-3 text-sm text-slate-700">
            <strong>Guideline dose:</strong> {selectedDrug.recommendedDose}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Available routes of administration
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedDrug.route.map((r) => (
                <span
                  key={r}
                  className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              India / Bengaluru common formulation (syrup · powder · drops · IV)
            </label>
            <select
              value={selectedFormulation?.strengthLabel ?? ""}
              onChange={(e) => {
                const next =
                  selectedDrug.formulations.find((x) => x.strengthLabel === e.target.value) ??
                  null;
                setSelectedFormulation(next);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              {selectedDrug.formulations.map((form) => (
                <option key={form.strengthLabel + form.form} value={form.strengthLabel}>
                  {form.form}: {form.strengthLabel}
                </option>
              ))}
            </select>
            {selectedFormulation && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  <strong>Form:</strong> {selectedFormulation.form}
                </p>
                <p>
                  <strong>Strength:</strong> {selectedFormulation.strengthLabel}
                </p>
                <p>
                  <strong>Common brands (India / private Bengaluru):</strong>{" "}
                  {selectedFormulation.commonBrandsIndia.join(", ")}
                </p>
                {selectedFormulation.packSizes && (
                  <p>
                    <strong>Packs:</strong> {selectedFormulation.packSizes.join(", ")}
                  </p>
                )}
                {(selectedFormulation.form === "Drops" ||
                  selectedFormulation.dropperCapacityMl) && (
                  <p className="mt-1 font-medium text-amber-900">
                    Dropper: typically marked 1 ml capacity
                    {selectedFormulation.dropperCapacityMl
                      ? ` (listed ${selectedFormulation.dropperCapacityMl} ml)`
                      : ""}
                    ; many droppers ≈ {selectedFormulation.dropsPerMl ?? 20} drops = 1 ml —{" "}
                    <em>always confirm printed on the bottle</em>.
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedDrug.ivAdministration?.giveSlowly && (
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
              <p className="font-bold">IV — give slowly</p>
              <p className="mt-1">{selectedDrug.ivAdministration.note}</p>
            </div>
          )}

          {selectedDrug.neonatalNote && isNeonate && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-bold">Neonatal note (Cloherty)</p>
              <p className="mt-1">{selectedDrug.neonatalNote}</p>
            </div>
          )}

          {isTopicalOrNonMg ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Not calculated as mg/kg × weight (topical / ORS / combo label dosing). Follow
              formulation &amp; instructions.
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

              {weightNum <= 0 ? (
                <p className="mb-4 text-sm font-medium text-red-600">
                  Enter a valid weight (&gt; 0 kg) to calculate.
                </p>
              ) : (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-[var(--ok-bg)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium text-emerald-900">Total daily dose</span>
                    <span className="text-2xl font-bold text-emerald-900">
                      {cappedDaily.toFixed(1)} mg
                    </span>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium text-emerald-900">Per-dose amount</span>
                    <span className="text-2xl font-bold text-emerald-900">
                      {perDose.toFixed(1)} mg
                    </span>
                  </div>
                  {volumeMl != null && selectedFormulation && (
                    <div className="mt-3 border-t border-emerald-200 pt-3 text-sm text-emerald-950">
                      <p>
                        <strong>Volume per dose</strong> (using {selectedFormulation.strengthLabel}
                        ): <strong>{volumeMl.toFixed(2)} ml</strong>
                      </p>
                      {drops != null && (
                        <p className="mt-1">
                          <strong>Approx. drops per dose:</strong> {drops.toFixed(0)} drops
                          {isNeonate ? " (neonate — use marked dropper)" : ""} @{" "}
                          {dropsPerMl} drops/ml
                        </p>
                      )}
                      {isNeonate && (
                        <p className="mt-1 text-xs">
                          Neonate tip: draw to the ml mark on the dropper first; drops are approximate
                          if the bottle does not print drops/ml.
                        </p>
                      )}
                    </div>
                  )}
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
              Serum creatinine &gt; 1.0 mg/dL — this drug may need renal adjustment.
            </div>
          )}

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

            {selectedDrug.maxDosePerDayMg > 0 && (
              <div className="rounded-lg border-2 border-red-600 bg-red-50 p-3">
                <p className="text-sm font-bold text-red-700">
                  MAXIMUM DOSAGE FOR THE DAY: {selectedDrug.maxDosePerDayMg} mg / 24 hours
                </p>
                <p className="mt-1 text-xs font-medium text-red-600">
                  Do not exceed this absolute daily maximum unless a specialist protocol explicitly
                  allows a higher ceiling.
                  {weightNum > 0 && !isTopicalOrNonMg
                    ? ` Current calculated daily (after cap): ${cappedDaily.toFixed(1)} mg.`
                    : ""}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">References</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Primary for this drug: <strong>{selectedDrug.referenceSource}</strong>
                </li>
                <li>
                  Harriet Lane Handbook; Nelson Textbook of Pediatrics; IAP STG
                </li>
                <li>
                  India strengths/brands: common private Bengaluru / national pharmacy stock —
                  always match the exact bottle label in hand
                </li>
                {isNeonate ? (
                  <li className="font-medium text-amber-900">
                    Neonate (&lt;28 days):{" "}
                    <strong>Cloherty and Stark&apos;s Manual of Neonatal Care</strong> for
                    GA/PNA-specific doses and dropper use.
                  </li>
                ) : (
                  <li>
                    Neonates: refer{" "}
                    <strong>Cloherty and Stark&apos;s Manual of Neonatal Care</strong> when needed.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
