import { useMemo, useState } from "react";
import { analyzeRegimen } from "../clinical/AnalysisEngine";
import SaveButton from "./SaveButton";
import { CONDITIONS_CATALOG, KNOWN_CONDITIONS, searchDrugs } from "../clinical/clinicalData";
import type { DrugRecord, PatientProfile } from "../clinical/types";

function severityClass(severity: string): string {
  if (severity === "Contraindicated" || severity === "Major") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (severity === "Moderate") {
    return "border-orange-200 bg-orange-50 text-orange-900";
  }
  return "border-slate-200 bg-slate-50 text-slate-800";
}

export default function RegimenAnalyzerUI() {
  const [ageYears, setAgeYears] = useState(72);
  const [weightKg, setWeightKg] = useState(68);
  const [creatinineMgDl, setCreatinineMgDl] = useState<number | "">(1.4);
  const [sex, setSex] = useState<"Male" | "Female">("Female");
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionQuery, setConditionQuery] = useState("");
  const [regimen, setRegimen] = useState<DrugRecord[]>([]);
  const [drugQuery, setDrugQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const suggestions = useMemo(() => searchDrugs(drugQuery), [drugQuery]);

  const patient: PatientProfile = useMemo(
    () => ({
      ageYears,
      weightKg,
      creatinineMgDl: creatinineMgDl === "" ? undefined : Number(creatinineMgDl),
      sex,
      conditions,
    }),
    [ageYears, weightKg, creatinineMgDl, sex, conditions],
  );

  const report = useMemo(
    () => analyzeRegimen(patient, regimen),
    [patient, regimen],
  );

  const addDrug = (drug: DrugRecord) => {
    setRegimen((prev) => (prev.some((d) => d.id === drug.id) ? prev : [...prev, drug]));
    setDrugQuery("");
    setPickerOpen(false);
  };

  const removeDrug = (id: string) => {
    setRegimen((prev) => prev.filter((d) => d.id !== id));
  };

  const toggleCondition = (c: string) => {
    setConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const conditionMatches = useMemo(() => {
    const q = conditionQuery.trim().toLowerCase();
    if (!q) return [];
    return CONDITIONS_CATALOG.filter(
      (c) => c.toLowerCase().includes(q) && !conditions.includes(c),
    ).slice(0, 12);
  }, [conditionQuery, conditions]);


  return (
    <div className="bg-slate-50 px-3 py-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-rose-800">Polypharmacy Analyzer</h1>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Section A */}
          <section className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Patient context
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-slate-800">
                  Age (years)
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={ageYears}
                    onChange={(e) => setAgeYears(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  Weight (kg)
                  <input
                    type="number"
                    min={1}
                    max={250}
                    step={0.1}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  Serum Cr (mg/dL)
                  <input
                    type="number"
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={creatinineMgDl}
                    onChange={(e) =>
                      setCreatinineMgDl(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-800">Sex</legend>
                  <div className="mt-1 flex gap-2">
                    {(["Male", "Female"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSex(s)}
                        className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${
                          sex === s
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Conditions ({conditions.length} selected)
              </p>
              {conditions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCondition(c)}
                      title="Tap to remove"
                      className="rounded-full border border-rose-600 bg-rose-600 px-3 py-1 text-xs font-medium text-white"
                    >
                      {c} ✕
                    </button>
                  ))}
                </div>
              )}
              <input
                value={conditionQuery}
                onChange={(e) => setConditionQuery(e.target.value)}
                placeholder="Search any condition — e.g. parkinson, glaucoma, falls…"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
              {conditionMatches.length > 0 && (
                <ul className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  {conditionMatches.map((c) => (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => {
                          toggleCondition(c);
                          setConditionQuery("");
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-rose-50"
                      >
                        {c}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {conditionQuery.trim() && conditionMatches.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  No match — tap Enter to add "{conditionQuery.trim()}" as a custom
                  condition.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      toggleCondition(conditionQuery.trim());
                      setConditionQuery("");
                    }}
                    className="font-semibold text-rose-700 underline"
                  >
                    Add it
                  </button>
                </p>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-500">Common:</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {KNOWN_CONDITIONS.filter((c) => !conditions.includes(c)).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCondition(c)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-rose-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Current regimen
              </h2>
              <div className="relative mt-3">
                <input
                  type="search"
                  value={drugQuery}
                  onChange={(e) => {
                    setDrugQuery(e.target.value);
                    setPickerOpen(true);
                  }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder="Search medication to add…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-600 focus:ring-2"
                />
                {pickerOpen && (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {suggestions.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => addDrug(d)}
                        >
                          <span className="font-semibold text-slate-900">{d.name}</span>
                          <span className="text-xs text-slate-500">{d.class}</span>
                        </button>
                      </li>
                    ))}
                    {suggestions.length === 0 && (
                      <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
                    )}
                  </ul>
                )}
              </div>

              <ul className="mt-3 space-y-2">
                {regimen.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        {d.class} · {d.standardDose}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDrug(d.id)}
                      className="text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {regimen.length === 0 && (
                  <li className="text-sm text-slate-500">
                    Add medications from the search bar to analyze the regimen.
                  </li>
                )}
              </ul>
            </div>
          </section>

          {/* Section B */}
          <section className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Clinical intelligence summary
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Age category:{" "}
                <strong className="capitalize">{report.ageCategory}</strong>
                {report.estimatedCrClMlMin != null && (
                  <>
                    {" "}
                    · Estimated CrCl:{" "}
                    <strong>{report.estimatedCrClMlMin} mL/min</strong>
                  </>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Polypharmacy & regimen burden
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Active medications: <strong>{report.medicationCount}</strong>
              </p>
              {report.polypharmacyAlerts.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No polypharmacy flags yet — add medications from past records.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {report.polypharmacyAlerts.map((p, i) => (
                    <li
                      key={`${p.title}-${i}`}
                      className={`rounded-lg border p-3 text-sm ${
                        p.severity === "High"
                          ? "border-red-200 bg-red-50 text-red-900"
                          : p.severity === "Moderate"
                            ? "border-orange-200 bg-orange-50 text-orange-950"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    >
                      <p className="font-bold">
                        [{p.severity}] {p.title}
                      </p>
                      <p className="mt-1">{p.detail}</p>
                      <p className="mt-1 font-semibold">{p.recommendation}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Practical drug interactions
              </h3>
              {report.interactions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No documented practical DDIs among current regimen pairs.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {report.interactions.map((f) => (
                    <li
                      key={`${f.drugAName}-${f.drugBName}-${f.interaction.severity}`}
                      className={`rounded-lg border p-3 text-sm ${severityClass(f.interaction.severity)}`}
                    >
                      <p className="font-bold">
                        {f.drugAName} + {f.drugBName}{" "}
                        <span className="font-semibold">({f.interaction.severity})</span>
                      </p>
                      <p className="mt-1">{f.interaction.clinicalEffect}</p>
                      <p className="mt-2 font-semibold">
                        Management: {f.interaction.managementAction}
                      </p>
                      {f.interaction.timingAdjustment && (
                        <p className="mt-2 rounded-md bg-blue-50 px-2 py-1.5 text-blue-800">
                          Timing: {f.interaction.timingAdjustment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {report.ageCategory === "geriatric" && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Geriatric alerts (Beers / STOPP)
                </h3>
                {report.geriatricAlerts.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No Beers/STOPP flags on current medications.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {report.geriatricAlerts.map((g, i) => (
                      <li
                        key={`${g.type}-${i}`}
                        className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900"
                      >
                        <p className="font-bold">{g.type}</p>
                        <p className="mt-1">{g.ruleDescription}</p>
                        <p className="mt-1 font-semibold">
                          Recommendation: {g.recommendation}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {report.startAlerts.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  START criteria (therapy gaps)
                </h3>
                <ul className="mt-3 space-y-2">
                  {report.startAlerts.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
                    >
                      <p className="font-bold">{s.relatedCondition}</p>
                      <p className="mt-1">{s.ruleDescription}</p>
                      <p className="mt-1 font-semibold">{s.recommendation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.ageCategory === "pediatric" && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Pediatric optimization
                </h3>
                {report.pediatricDoses.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No pediatric dose rules on selected medications.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {report.pediatricDoses.map((p) => (
                      <li
                        key={p.drugId}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
                      >
                        <p className="font-bold">{p.drugName}</p>
                        <p className="mt-1">{p.rule}</p>
                        <p className="mt-1 font-semibold">{p.calculatedDoseLabel}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Pharmacokinetics & renal
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                Estimated CrCl:{" "}
                <strong>
                  {report.estimatedCrClMlMin != null
                    ? `${report.estimatedCrClMlMin} mL/min`
                    : "Enter age, weight, and creatinine"}
                </strong>
              </p>
              {report.renalAlerts.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No renal adjustment flags at current CrCl.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {report.renalAlerts.map((r) => (
                    <li
                      key={r.drugId}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                    >
                      <p className="font-bold">
                        {r.drugName} — CrCl below {r.renalAdjustmentLimit} mL/min
                      </p>
                      <p className="mt-1">{r.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {report.diseaseDrugAlerts.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Disease–drug cautions (for this patient's conditions)
                </h3>
                <ul className="mt-3 space-y-2">
                  {report.diseaseDrugAlerts.map((a, i) => (
                    <li
                      key={`${a.drugId}-${a.condition}-${i}`}
                      className={`rounded-lg border p-3 text-sm ${
                        a.severity === "High"
                          ? "border-red-200 bg-red-50 text-red-900"
                          : "border-amber-200 bg-amber-50 text-amber-950"
                      }`}
                    >
                      <p className="font-bold">
                        {a.drugName} × {a.condition}
                      </p>
                      <p className="mt-1">{a.rule}</p>
                      <p className="mt-1 font-semibold">→ {a.recommendation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Drug-by-drug point-wise analysis */}
            {report.drugDetails.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Drug-by-drug analysis (point-wise)
                </h3>

                {report.therapeuticDuplications.length > 0 && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    <p className="font-bold">Therapeutic duplication</p>
                    <ul className="mt-1 list-decimal space-y-1 pl-5">
                      {report.therapeuticDuplications.map((dup) => (
                        <li key={dup.className}>
                          Two or more drugs of the same class —{" "}
                          <strong>{dup.className}</strong>: {dup.drugNames.join(", ")}.
                          Usually one should be stopped.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.anticholinergicBurden.count > 0 && (
                  <div
                    className={`mt-3 rounded-lg border p-3 text-sm ${
                      report.anticholinergicBurden.count >= 2
                        ? "border-red-200 bg-red-50 text-red-900"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    <p className="font-bold">
                      Anticholinergic burden: {report.anticholinergicBurden.count} drug
                      {report.anticholinergicBurden.count > 1 ? "s" : ""} (
                      {report.anticholinergicBurden.drugNames.join(", ")})
                    </p>
                    <p className="mt-1">{report.anticholinergicBurden.note}</p>
                  </div>
                )}

                <ul className="mt-3 space-y-3">
                  {report.drugDetails.map((d) => {
                    const verdictStyle =
                      d.verdict === "stop-or-review"
                        ? "border-red-300 bg-red-50"
                        : d.verdict === "adjust"
                          ? "border-orange-300 bg-orange-50"
                          : d.verdict === "caution"
                            ? "border-amber-300 bg-amber-50"
                            : "border-emerald-200 bg-emerald-50";
                    const verdictLabel =
                      d.verdict === "stop-or-review"
                        ? "STOP / REVIEW"
                        : d.verdict === "adjust"
                          ? "ADJUST DOSE"
                          : d.verdict === "caution"
                            ? "CAUTION"
                            : "CONTINUE";
                    const verdictBadge =
                      d.verdict === "stop-or-review"
                        ? "bg-red-700"
                        : d.verdict === "adjust"
                          ? "bg-orange-600"
                          : d.verdict === "caution"
                            ? "bg-amber-600"
                            : "bg-emerald-700";
                    const points: { label: string; items: string[] }[] = [
                      { label: "Beers criteria", items: d.beersPoints },
                      { label: "STOPP", items: d.stoppPoints },
                      { label: "START", items: d.startPoints },
                      { label: "Renal (at this patient's CrCl)", items: d.renalPoints },
                      { label: "Interactions in this regimen", items: d.interactionPoints },
                    ].filter((x) => x.items.length > 0);
                    return (
                      <li key={d.drugId} className={`rounded-lg border p-3 text-sm ${verdictStyle}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-slate-900">{d.drugName}</p>
                          <span className={`rounded px-2 py-0.5 text-[11px] font-bold text-white ${verdictBadge}`}>
                            {verdictLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {d.drugClass} · {d.standardDose}
                          {d.anticholinergic ? " · anticholinergic" : ""}
                        </p>
                        {d.alternatives && (
                          <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                              If stopping — alternatives
                            </p>
                            <p className="mt-0.5 text-blue-900">{d.alternatives}</p>
                          </div>
                        )}
                        {points.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-600">
                            No Beers/STOPP/START, renal or interaction flags for this patient.
                          </p>
                        ) : (
                          points.map((sec) => (
                            <div key={sec.label} className="mt-2">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                {sec.label}
                              </p>
                              <ol className="mt-0.5 list-decimal space-y-1 pl-5 text-slate-800">
                                {sec.items.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ol>
                            </div>
                          ))
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <SaveButton
              tool="Polypharmacy"
              build={() => {
                if (!regimen.length) return null;
                return {
                  title: `Regimen — ${regimen.length} drugs, ${patient.ageYears} y`,
                  detail:
                    regimen.map((d) => d.name.split(" (")[0]).join(", ") +
                    `\nInteractions ${report.interactions.length} · disease–drug ${report.diseaseDrugAlerts.length} · STOP/REVIEW ${report.drugDetails.filter((x) => x.verdict === "stop-or-review").length}` +
                    (report.estimatedCrClMlMin != null ? `\nCrCl ${report.estimatedCrClMlMin} ml/min` : ""),
                };
              }}
            />
            <p className="mt-2 text-xs text-slate-500">
              Ref: AGS Beers 2023 · STOPP/START v3 · drug labels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
