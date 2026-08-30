import { useMemo, useState } from "react";
import {
  brandsForDrug,
  dosesPerDayFromFrequency,
  mlToDrops,
  searchPediatricDrugs,
  type DrugFormulation,
  type PediatricDrug,
} from "../data/pediatricDrugs";
import SaveButton from "./SaveButton";
import { calculatePediatricDose } from "../lib/pediatricDoseMath";
import { orsPlan, type DehydrationLevel } from "../lib/orsMath";
import { pedMaintenanceFluids, restrictedFluidPlans } from "../lib/icuMath";
import {
  creatinineUpperLimitForAge,
  gfrStage,
  pedRenalAction,
  schwartzEgfr,
} from "../lib/pedRenal";

type AgeUnit = "years" | "months" | "days" | "hours";

export default function PediatricDosageCalculator() {
  const [ageValue, setAgeValue] = useState<number | "">(3);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");
  const [weight, setWeight] = useState<number | "">(14);
  const [creatinine, setCreatinine] = useState<number | "">("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<PediatricDrug | null>(null);
  const [selectedFormulation, setSelectedFormulation] = useState<DrugFormulation | null>(null);
  const [targetMgPerKgDay, setTargetMgPerKgDay] = useState<number | "">("");
  const [frequency, setFrequency] = useState("q12h");
  const [dehydration, setDehydration] = useState<DehydrationLevel | "">("");

  const filteredDrugs = useMemo(
    () => searchPediatricDrugs(searchQuery).slice(0, 40),
    [searchQuery],
  );

  const ageDays = useMemo(() => {
    if (ageValue === "" || Number(ageValue) < 0) return null;
    const n = Number(ageValue);
    if (ageUnit === "hours") return n / 24;
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

  const weightNum = weight === "" ? 0 : Number(weight);
  const doseNum = targetMgPerKgDay === "" ? 0 : Number(targetMgPerKgDay);
  const isTopicalOrNonMg = Boolean(
    selectedDrug && selectedDrug.defaultDoseMgPerKg === 0 && selectedDrug.maxDosePerDayMg === 0,
  );

  const doseCalc = useMemo(() => {
    if (!selectedDrug) {
      return {
        dailyMg: 0,
        perDoseMg: 0,
        volumeMl: null as number | null,
        capped: false,
        valid: false,
        errors: [] as string[],
      };
    }
    return calculatePediatricDose({
      weightKg: weightNum,
      doseMgPerKgDay: doseNum,
      frequency,
      drug: selectedDrug,
      formulation: selectedFormulation,
    });
  }, [selectedDrug, weightNum, doseNum, frequency, selectedFormulation]);

  const cappedDaily = doseCalc.dailyMg;
  const perDose = doseCalc.perDoseMg;
  const exceedsMax = doseCalc.capped;
  const scr = creatinine === "" ? null : Number(creatinine);
  const crCutoff =
    ageDays != null && scr != null ? creatinineUpperLimitForAge(ageDays) : null;
  const crElevated =
    crCutoff != null && scr != null && scr > crCutoff.limit;
  const egfr =
    scr != null && heightCm !== "" && Number(heightCm) > 0
      ? schwartzEgfr(Number(heightCm), scr)
      : null;
  const egfrInfo = egfr != null ? gfrStage(egfr) : null;
  const renalAction =
    egfr != null && selectedDrug
      ? pedRenalAction(selectedDrug.id, egfr, selectedDrug.renalAdjustment)
      : null;
  const renalWarn =
    Boolean(selectedDrug?.renalAdjustment) && crElevated && egfr == null;
  const weightInvalid =
    (weight !== "" && (!(Number.isFinite(weightNum) && weightNum > 0))) ||
    doseCalc.errors.includes("Weight must be > 0");

  const volumeMl = doseCalc.volumeMl;
  const dropsPerMl = selectedFormulation?.dropsPerMl ?? 20;
  const drops =
    volumeMl != null &&
    (selectedFormulation?.form === "Drops" || isNeonate || Boolean(selectedFormulation?.dropperCapacityMl))
      ? mlToDrops(volumeMl, dropsPerMl)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 md:px-6">
      <header className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Ped Dose Calculator
        </h2>
      </header>

      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-slate-900">1. Patient parameters</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step={ageUnit === "days" || ageUnit === "hours" ? 1 : 0.5}
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
                <option value="hours">Hours of life</option>
              </select>
            </div>
            {ageDays != null && (
              <p className="mt-1 text-xs text-slate-500">
                {ageUnit === "hours"
                  ? `${ageValue} h of life · ≈ ${ageDays < 2 ? ageDays.toFixed(1) : Math.round(ageDays)} days`
                  : `≈ ${Math.round(ageDays)} days`}
                {ageMonths != null && ageUnit !== "hours" ? ` · ${ageMonths.toFixed(1)} months` : ""}
                {isNeonate ? " · Neonate (<28 days)" : ""}
              </p>
            )}
            {isNeonate && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                Neonate
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Height (cm) — for eGFR
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              placeholder="Optional, with creatinine"
              value={heightCm}
              onChange={(e) =>
                setHeightCm(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-slate-900">2. Drug selection</h3>
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drug / brand…"
            className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[var(--accent)]"
          />
          {searchQuery.trim() && (
            <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredDrugs.length === 0 && (
                <li className="px-3 py-3 text-sm text-slate-500">No matches</li>
              )}
              {filteredDrugs.map((drug) => {
                const brands = brandsForDrug(drug);
                return (
                  <li key={drug.id}>
                    <button
                      type="button"
                      onClick={() => handleDrugSelect(drug)}
                      className="w-full border-b border-slate-100 px-3 py-3 text-left hover:bg-[var(--accent-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-slate-900">{drug.name}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {drug.category}
                        </span>
                      </div>
                      {brands.length > 0 && (
                        <p className="mt-1 text-xs italic text-slate-500">
                          Brands: {brands.join(", ")}
                          {brandsForDrug(drug, 99).length > brands.length ? "…" : ""}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {drug.formulations.slice(0, 4).map((form) => (
                          <span
                            key={`${form.form}-${form.strengthLabel}`}
                            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                          >
                            {form.form}: {form.strengthLabel}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {selectedDrug && (
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-700">
              Selected: <strong>{selectedDrug.name}</strong>{" "}
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                {selectedDrug.category}
              </span>
            </p>
            <p className="mt-1 text-xs italic text-slate-500">
              Brands: {brandsForDrug(selectedDrug, 10).join(", ")}
            </p>
          </div>
        )}
      </section>

      {selectedDrug?.id === "ors" && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">
            3. Rehydration plan — ORS (WHO)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Uses the weight and age from section 1. Pick the assessed level of
            dehydration:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: "none", label: "No dehydration" },
                { id: "some", label: "Some dehydration" },
                { id: "severe", label: "Severe dehydration" },
              ] as { id: DehydrationLevel; label: string }[]
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDehydration(d.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  dehydration === d.id
                    ? d.id === "severe"
                      ? "bg-red-800 text-white shadow-sm"
                      : "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {dehydration === "" ? (
            <p className="mt-3 text-xs text-slate-600">
              Assess: some dehydration = 2 of restless/irritable, sunken eyes,
              thirsty/drinks eagerly, skin pinch goes back slowly. Severe = 2 of
              lethargic/unconscious, sunken eyes, drinking poorly or unable,
              skin pinch goes back very slowly (≥ 2 s).
            </p>
          ) : (
            (() => {
              const plan = orsPlan(
                dehydration,
                weight === "" || Number(weight) <= 0 ? null : Number(weight),
                ageMonths,
              );
              return (
                <div className="mt-3">
                  <p
                    className={`rounded-lg border p-3 text-sm font-bold ${
                      plan.plan === "C"
                        ? "border-red-200 bg-red-50 text-red-950"
                        : plan.plan === "B"
                          ? "border-amber-200 bg-amber-50 text-amber-950"
                          : "border-emerald-200 bg-emerald-50 text-emerald-950"
                    }`}
                  >
                    {plan.title}
                    <span className="mt-1 block text-base">{plan.volumeText}</span>
                  </p>
                  <ul className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
                    {plan.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                    <li className="font-semibold">{plan.zinc}</li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    Low-osmolarity ORS (WHO): 1 sachet in EXACTLY 1 litre of
                    clean water; discard after 24 hours. Ref: WHO Pocket Book
                    2013 / IMNCI / IAP acute gastroenteritis guidelines.
                  </p>
                </div>
              );
            })()
          )}
        </section>
      )}

      {selectedDrug && selectedDrug.id !== "ors" && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-900">
            3. Dosage calculation — {selectedDrug.name}
          </h3>

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
              Formulation (syrup · powder · drops · IV)
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
                  <strong>Common Indian brands:</strong>{" "}
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
                    Dropper ≈ {selectedFormulation.dropsPerMl ?? 20} drops/ml — use
                    the marked dropper from the pack, never a kitchen spoon.
                  </p>
                )}
              </div>
            )}
          </div>



          {weightNum != null && Number.isFinite(weightNum) && weightNum > 0 && (() => {
            const mf = pedMaintenanceFluids(weightNum);
            if (!mf) return null;
            return (
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                <p className="font-bold">
                  IV fluids for {weightNum} kg — Holliday–Segar: {mf.daily} ml/day
                  ({mf.hourly} ml/h)
                </p>
                <ul className="mt-1.5 space-y-1">
                  {restrictedFluidPlans(mf.daily).map((pl) => (
                    <li key={pl.label}>
                      <strong>{pl.label}:</strong> {pl.dailyMl} ml/day — {pl.note}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          <SaveButton
            tool="Ped Dose"
            build={() => {
              if (!selectedDrug || !(perDose > 0)) return null;
              return {
                title: `${selectedDrug.name} — ${weightNum ?? "?"} kg`,
                detail: `${perDose.toFixed(1)} mg/dose (${frequency}), daily ${cappedDaily.toFixed(0)} mg${volumeMl != null ? `, ${volumeMl.toFixed(2)} ml/dose` : ""}${egfr != null ? ` | eGFR ${egfr}` : ""}`,
              };
            }}
          />

          {scr != null && crCutoff && (
            <div
              className={`mb-4 rounded-lg border p-3 text-sm ${
                crElevated
                  ? "border-red-200 bg-red-50 text-red-950"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950"
              }`}
            >
              <p className="font-bold">
                Renal check — creatinine {scr} mg/dL (
                {crCutoff.ageGroup}: upper limit ≈ {crCutoff.limit})
              </p>
              {crElevated ? (
                <p className="mt-1">
                  Above the normal limit FOR THIS AGE (Harriet Lane normals) —
                  what looks mild in an adult is significant in a child.
                </p>
              ) : (
                <p className="mt-1">Within the normal range for this age group.</p>
              )}
              {crCutoff.note && <p className="mt-1 text-xs">{crCutoff.note}</p>}
              {egfr != null && egfrInfo ? (
                <div className="mt-2 border-t border-current/10 pt-2">
                  <p>
                    <strong>eGFR (bedside Schwartz):</strong> {egfr} mL/min/1.73 m²
                    — {egfrInfo.label}
                  </p>
                  <p className="mt-1">
                    <strong>{selectedDrug.name} at this eGFR:</strong>{" "}
                    {renalAction}
                  </p>
                </div>
              ) : (
                crElevated && (
                  <p className="mt-2 text-xs">
                    Enter height to compute eGFR (Schwartz) and get the exact
                    dose-adjustment band for this drug.
                  </p>
                )
              )}
            </div>
          )}
          {selectedDrug.ivAdministration?.giveSlowly && (
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
              <p className="font-bold">IV — give slowly</p>
              <p className="mt-1">{selectedDrug.ivAdministration.note}</p>
            </div>
          )}

          {selectedDrug.neonatalNote && isNeonate && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-bold">Neonate</p>
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
                        <div className="mt-1 space-y-0.5">
                          <p>
                            <strong>As drops:</strong> ≈ {Math.round(drops)} drops{" "}
                            <span className="text-emerald-800">
                              (dropper ≈ {dropsPerMl} drops/ml — always confirm on the bottle label)
                            </span>
                          </p>
                          {(() => {
                            const cap = selectedFormulation.dropperCapacityMl ?? 0;
                            if (cap <= 0 || volumeMl <= cap) return null;
                            const full = Math.floor(volumeMl / cap);
                            const rem = volumeMl - full * cap;
                            return (
                              <p>
                                <strong>Easy way:</strong> {full} full dropper
                                {full > 1 ? "s" : ""} ({cap} ml each)
                                {rem > 0.05
                                  ? ` + fill to the ${rem.toFixed(1)} ml mark`
                                  : ""}
                              </p>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-emerald-800/70">
                    Ref: {selectedDrug.referenceSource}
                  </p>
                </div>
              )}

              {exceedsMax && (
                <div className="mb-4 rounded-lg border border-red-200 bg-[var(--danger-bg)] p-3 text-sm font-semibold text-red-700">
                  Capped at {selectedDrug.maxDosePerDayMg} mg/day
                </div>
              )}
            </>
          )}

          {renalWarn && (
            <div className="mb-4 rounded-lg border border-red-200 bg-[var(--danger-bg)] p-3 text-sm font-semibold text-red-700">
              Check renal adjustment
            </div>
          )}

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <h3 className="text-base font-bold text-slate-900">4. Clinical guidelines</h3>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-950">
                <span aria-hidden>⚠</span> Cautions / contraindications
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {selectedDrug.cautionsAndContraindications.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-bold text-slate-900">
                Administration instructions
              </h4>
              <p className="text-sm text-slate-700">{selectedDrug.instructions}</p>
            </div>

            {selectedDrug.maxDosePerDayMg > 0 && (
              <div className="rounded-lg border-2 border-red-600 bg-red-50 p-3">
                <p className="text-sm font-bold text-red-700">
                  Max / day: {selectedDrug.maxDosePerDayMg} mg
                </p>
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
