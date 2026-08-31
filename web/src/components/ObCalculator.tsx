import { useMemo, useState } from "react";
import { searchDrugs } from "../clinical/clinicalData";
import { estimateCrCl } from "../lib/creatinineClearanceMath";
import { buildRenalDoseReport } from "../lib/renalDoseAdjust";
import { PREGNANCY_SAFETY } from "../data/pregnancySafety";
import {
  PREGNANCY_CONDITION_DOSING,
  pregnancyRenalNote,
  searchPregnancyConditions,
} from "../data/pregnancyConditionDosing";
import {
  acogRedatingThresholdDays,
  calculateGestation,
  diffDays,
  formatDate,
  type ObMethod,
} from "../lib/obMath";
import SaveButton from "./SaveButton";
import ObWheel from "./ObWheel";

const METHODS: { id: ObMethod; label: string; dateLabel: string }[] = [
  { id: "lmp", label: "LMP", dateLabel: "First day of last period" },
  { id: "scan", label: "Scan (USG)", dateLabel: "Scan date" },
  { id: "ivf5", label: "IVF — day-5 transfer", dateLabel: "Embryo transfer date" },
  { id: "ivf3", label: "IVF — day-3 transfer", dateLabel: "Embryo transfer date" },
  { id: "ovulation", label: "Ovulation / IUI", dateLabel: "Ovulation / IUI date" },
];

export default function ObCalculator() {
  const [method, setMethod] = useState<ObMethod>("lmp");
  // Scan (USG) covers both entries in one place: GA read on the scan, or the
  // EDD printed on the report (which back-calculates the LMP).
  const [scanMode, setScanMode] = useState<"ga" | "edd">("ga");
  const [dateStr, setDateStr] = useState("");
  const [cycle, setCycle] = useState<number | "">(28);
  const [scanWeeks, setScanWeeks] = useState<number | "">("");
  const [scanDays, setScanDays] = useState<number | "">(0);
  const [lmpCompare, setLmpCompare] = useState("");
  const [q, setQ] = useState("");
  const [manualWeeks, setManualWeeks] = useState<number | "">("");
  const [scr, setScr] = useState<number | "">("");
  const [momAge, setMomAge] = useState<number | "">("");
  const [momWeight, setMomWeight] = useState<number | "">("");
  const [selectedConds, setSelectedConds] = useState<string[]>([]);

  const drugMatches = useMemo(() => {
    const query = q.trim();
    if (query.length < 2) return [];
    return searchDrugs(query).slice(0, 6);
  }, [q]);

  // Cockcroft-Gault (female) from the values entered above the drug search.
  // Not validated in pregnancy (true GFR runs ~50% higher) — used only to
  // pick the renal dose band, which errs on the safe side.
  const momCrCl = useMemo(() => {
    if (momAge === "" || momWeight === "" || scr === "" || Number(scr) <= 0) return null;
    const r = estimateCrCl({
      sex: "Female",
      ageYears: Number(momAge),
      weightKg: Number(momWeight),
      heightCm: null,
      creatinine: Number(scr),
      unit: "mg/dL",
    });
    return r.valid ? r.crCl : null;
  }, [momAge, momWeight, scr]);

  const gaAtScan =
    scanWeeks === "" ? null : Number(scanWeeks) * 7 + (scanDays === "" ? 0 : Number(scanDays));

  const effMethod: ObMethod = method === "scan" && scanMode === "edd" ? "edd" : method;

  const result = useMemo(() => {
    if (!dateStr) return null;
    if (effMethod === "scan" && gaAtScan == null) return null;
    return calculateGestation(
      effMethod,
      new Date(dateStr + "T00:00:00"),
      new Date(),
      cycle === "" ? 28 : Number(cycle),
      gaAtScan ?? undefined,
    );
  }, [effMethod, dateStr, cycle, gaAtScan]);

  // LMP vs scan comparison per ACOG CO 700 when both are entered.
  const redating = useMemo(() => {
    if (effMethod !== "scan" || !result || !lmpCompare || gaAtScan == null) return null;
    const lmpRes = calculateGestation("lmp", new Date(lmpCompare + "T00:00:00"), new Date(), 28);
    if (!lmpRes) return null;
    const diff = Math.abs(diffDays(lmpRes.edd, result.edd));
    const { threshold, window } = acogRedatingThresholdDays(gaAtScan);
    return {
      lmpEdd: lmpRes.edd,
      scanEdd: result.edd,
      diff,
      threshold,
      window,
      useScan: diff > threshold,
    };
  }, [effMethod, result, lmpCompare, gaAtScan]);

  const active = METHODS.find((m) => m.id === method)!;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">OB / EDD</h2>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                method === m.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {method === "scan" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { id: "ga", label: "GA on the scan" },
              { id: "edd", label: "EDD on the report" },
            ] as { id: "ga" | "edd"; label: string }[]).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setScanMode(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  scanMode === m.id
                    ? "bg-fuchsia-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              {method === "scan"
                ? scanMode === "edd"
                  ? "EDD printed on the scan report"
                  : "Scan date"
                : active.dateLabel}
            </span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </label>
          {method === "scan" && scanMode === "ga" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">GA at scan — weeks</span>
                  <input
                    type="number" inputMode="numeric" min={5} max={42} data-adv="2"
                    value={scanWeeks}
                    onChange={(e) => { const v = e.target.value; setScanWeeks(v === "" ? "" : Number(v)); }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">+ days</span>
                  <input
                    type="number" inputMode="numeric" min={0} max={6} data-adv="1"
                    value={scanDays}
                    onChange={(e) => { const v = e.target.value; setScanDays(v === "" ? "" : Number(v)); }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  LMP date (optional — to compare with the scan)
                </span>
                <input
                  type="date"
                  value={lmpCompare}
                  onChange={(e) => setLmpCompare(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-slate-500"
                />
              </label>
            </>
          )}
          {method === "lmp" && (
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">
                Usual cycle length (days)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={20}
                max={45}
                data-adv="2"
                value={cycle}
                onChange={(e) => {
                  const v = e.target.value;
                  setCycle(v === "" ? "" : Number(v));
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
            </label>
          )}
        </div>
      </section>

      {result ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Today</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {result.gaLabel}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                EDD
              </dt>
              <dd className="text-lg font-bold text-slate-900">
                {formatDate(result.edd)}
              </dd>
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Trimester
              </dt>
              <dd className="text-lg font-bold text-slate-900">
                {result.trimester}
                {result.postTerm ? " (post-term)" : ""}
              </dd>
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Conception (est.)
              </dt>
              <dd className="text-lg font-bold text-slate-900">
                {formatDate(result.conceptionDate)}
              </dd>
            </div>
            {method !== "lmp" && (
              <div className="rounded-md border border-slate-300 bg-white px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {effMethod === "scan" || effMethod === "edd"
                    ? "LMP (calculated backwards)"
                    : "Working LMP (calculated)"}
                </dt>
                <dd className="text-lg font-bold text-slate-900">
                  {formatDate(result.derivedLmp)}
                </dd>
              </div>
            )}
          </dl>
          {(effMethod === "scan" || effMethod === "edd") && (
            <p className="mt-2 text-xs text-slate-600">
              LMP unknown? Use this calculated LMP ({formatDate(result.derivedLmp)})
              as the working LMP for records and gestational charting —{" "}
              {effMethod === "edd"
                ? "it is the EDD minus 280 days (Naegele reversed)."
                : "it is the scan date minus the scan GA."}{" "}
              (ACOG CO 700: the ultrasound dating then serves as official.)
            </p>
          )}
          <p className="mt-3 text-xs text-slate-700">{result.note}</p>
          <p className="mt-1 text-xs text-slate-500">
            A first-trimester ultrasound CRL that differs from menstrual dating
            by more than the accepted window should re-date the pregnancy —
            ultrasound dating then takes priority.
          </p>
        </div>
      ) : (
        dateStr === "" && (
          <p className="mt-4 text-sm text-slate-500">
            Enter the date to see gestational age, EDD and trimester.
          </p>
        )
      )}
      {result && (
        <ObWheel
          lmp={result.derivedLmp}
          edd={result.edd}
          gaDays={result.gaWeeks * 7 + result.gaDays}
          gaLabel={result.gaLabel}
          trimester={result.trimester}
        />
      )}
      {dateStr !== "" && !result && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          That date doesn't give a plausible ongoing pregnancy (negative or
          &gt; 45 weeks). Check the date and method.
        </p>
      )}

      {result && (
        <SaveButton
          tool="OB"
          build={() =>
            result
              ? {
                  title: `GA ${result.gaLabel}`,
                  detail: `EDD ${formatDate(result.edd)} · trimester ${result.trimester} · ${result.note}`,
                }
              : null
          }
        />
      )}
      <p className="mt-2 text-xs text-slate-500">
        Ref: Naegele rule with cycle correction · ultrasound dating and
        re-dating per ACOG Committee Opinion 700.
      </p>

      {redating && (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">
            LMP vs scan — which EDD to use (ACOG CO 700)
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">EDD by LMP</p>
              <p className="font-bold text-slate-900">{formatDate(redating.lmpEdd)}</p>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">EDD by scan</p>
              <p className="font-bold text-slate-900">{formatDate(redating.scanEdd)}</p>
            </div>
          </div>
          <p
            className={`mt-3 rounded-lg border p-3 text-sm font-semibold ${
              redating.useScan
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-950"
            }`}
          >
            Difference {redating.diff} day{redating.diff === 1 ? "" : "s"}. At a
            scan GA of {redating.window}, ultrasound re-dates the pregnancy when
            the difference exceeds {redating.threshold} days —{" "}
            {redating.useScan
              ? "USE THE ULTRASOUND EDD as the official due date."
              : "the LMP EDD stands (difference within the accepted window)."}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs text-slate-700">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-1 pr-2">GA at scan</th>
                  <th className="py-1 pr-2">Method</th>
                  <th className="py-1">Re-date if scan differs by</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100"><td className="py-1 pr-2">≤ 8w6d</td><td className="py-1 pr-2">CRL</td><td className="py-1">&gt; 5 days</td></tr>
                <tr className="border-t border-slate-100"><td className="py-1 pr-2">9w0d – 13w6d</td><td className="py-1 pr-2">CRL</td><td className="py-1">&gt; 7 days</td></tr>
                <tr className="border-t border-slate-100"><td className="py-1 pr-2">14w0d – 15w6d</td><td className="py-1 pr-2">BPD/HC/AC/FL</td><td className="py-1">&gt; 7 days</td></tr>
                <tr className="border-t border-slate-100"><td className="py-1 pr-2">16w0d – 21w6d</td><td className="py-1 pr-2">BPD/HC/AC/FL</td><td className="py-1">&gt; 10 days</td></tr>
                <tr className="border-t border-slate-100"><td className="py-1 pr-2">22w0d – 27w6d</td><td className="py-1 pr-2">BPD/HC/AC/FL</td><td className="py-1">&gt; 14 days</td></tr>
                <tr className="border-t border-slate-100"><td className="py-1 pr-2">≥ 28w0d</td><td className="py-1 pr-2">BPD/HC/AC/FL</td><td className="py-1">&gt; 21 days</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Ref: ACOG Committee Opinion 700 (Methods for Estimating the Due
            Date). Once an EDD is set by the best early scan it should not be
            changed by later scans. Comparison here uses a 28-day-cycle Naegele
            EDD for the LMP.
          </p>
        </section>
      )}

      {/* Drugs & comorbidities in pregnancy — one combined section */}
      {(() => {
        const gaWeeks =
          manualWeeks !== "" ? Number(manualWeeks) : result ? result.gaWeeks : null;
        const renal = scr !== "" && Number(scr) > 0 ? pregnancyRenalNote(Number(scr)) : null;
        const condMatches = searchPregnancyConditions(q).filter(
          (e) => !selectedConds.includes(e.condition),
        ).slice(0, 8);
        const cards = PREGNANCY_CONDITION_DOSING.filter((e) =>
          selectedConds.includes(e.condition),
        );
        const renalStyle =
          renal?.band === "alert"
            ? "border-red-200 bg-red-50 text-red-950"
            : renal?.band === "caution"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950";
        return (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Drugs &amp; comorbidities in pregnancy
            </h3>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Weeks</span>
                <input type="number" inputMode="numeric" min={1} max={44} data-adv="2"
                  value={manualWeeks !== "" ? manualWeeks : (result?.gaWeeks ?? "")}
                  onChange={(e) => { const v = e.target.value; setManualWeeks(v === "" ? "" : Number(v)); }}
                  placeholder={result ? String(result.gaWeeks) : "GA"}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Creatinine</span>
                <input type="number" inputMode="decimal" min={0} step="0.1" value={scr}
                  onChange={(e) => { const v = e.target.value; setScr(v === "" ? "" : Number(v)); }}
                  placeholder="mg/dL"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Age</span>
                <input type="number" inputMode="numeric" min={12} max={60} data-adv="2" value={momAge}
                  onChange={(e) => { const v = e.target.value; setMomAge(v === "" ? "" : Number(v)); }}
                  placeholder="y"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Weight</span>
                <input type="number" inputMode="decimal" min={30} step="0.5" value={momWeight}
                  onChange={(e) => { const v = e.target.value; setMomWeight(v === "" ? "" : Number(v)); }}
                  placeholder="kg"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-500" />
              </label>
            </div>
            {renal && (
              <p className={`mt-2 rounded-lg border p-2.5 text-xs ${renalStyle}`}>{renal.text}</p>
            )}
            {momCrCl != null && (
              <p className="mt-2 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-800">
                CrCl (Cockcroft-Gault, female): {momCrCl} mL/min — drug doses below adjust to this.
              </p>
            )}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a drug OR condition — e.g. enalapril, warfarin, epilepsy, TB, UTI…"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
            {drugMatches.length > 0 && (
              <ul className="mt-3 space-y-2">
                {drugMatches.map((d) => {
                  const entry = PREGNANCY_SAFETY[d.id];
                  const risk = entry?.risk;
                  const style =
                    risk === "avoid"
                      ? "border-red-200 bg-red-50 text-red-950"
                      : risk === "caution"
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : risk === "safe"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border-slate-200 bg-slate-50 text-slate-700";
                  const badge =
                    risk === "avoid" ? "AVOID" : risk === "caution" ? "CAUTION" : risk === "safe" ? "SAFE" : "NO DATA HERE";
                  const badgeBg =
                    risk === "avoid" ? "bg-red-700" : risk === "caution" ? "bg-amber-800" : risk === "safe" ? "bg-emerald-700" : "bg-slate-500";
                  return (
                    <li key={d.id} className={`rounded-lg border p-3 text-sm ${style}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold">{d.name}</p>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold text-white ${badgeBg}`}>
                          {badge}
                        </span>
                      </div>
                      {entry ? (
                        <>
                          <p className="mt-1">{entry.note}</p>
                          {entry.alternative && (
                            <p className="mt-1 font-semibold">Use instead: {entry.alternative}</p>
                          )}
                        </>
                      ) : (
                        <p className="mt-1">
                          Not yet rated in this app — check a formulary before prescribing in pregnancy.
                        </p>
                      )}
                      {risk !== "avoid" && momCrCl != null && (() => {
                        const report = buildRenalDoseReport(d, momCrCl);
                        return (
                          <div className="mt-2 rounded-md border border-slate-300 bg-white/80 p-2 text-slate-900">
                            <p className="text-xs font-bold uppercase tracking-wide">
                              Dose at CrCl {momCrCl} mL/min
                            </p>
                            {report.recommendations.length > 0 ? (
                              report.recommendations.map((r, i) => <p key={i} className="mt-1">{r}</p>)
                            ) : (
                              <p className="mt-1">
                                Standard dose: {d.standardDose} — no renal adjustment data held for this drug.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      {risk !== "avoid" && momCrCl == null && scr !== "" && Number(scr) > 0 && (
                        <p className="mt-2 text-xs font-semibold">
                          Add age and weight above for the exact renal dose at this creatinine.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {condMatches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {condMatches.map((e) => (
                  <button
                    key={e.condition}
                    type="button"
                    onClick={() => { setSelectedConds((prev) => [...prev, e.condition]); setQ(""); }}
                    className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-300"
                  >
                    + {e.condition}
                  </button>
                ))}
              </div>
            )}
            {q.trim().length >= 2 && drugMatches.length === 0 && condMatches.length === 0 && (
              <p className="mt-2 text-xs text-slate-600">
                No drug or pregnancy-condition entry matches — individualize with the treating specialist.
              </p>
            )}
            {cards.length > 0 && (
              <ul className="mt-4 space-y-3">
                {cards.map((e) => (
                  <li key={e.condition} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900">{e.condition}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedConds((prev) => prev.filter((c) => c !== e.condition))}
                        className="text-xs font-semibold text-slate-500 underline"
                      >
                        Remove
                      </button>
                    </div>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-900">
                      {e.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                    {e.timed && e.timed.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {e.timed.map((t, i) => {
                          const applies =
                            gaWeeks != null &&
                            (t.from == null || gaWeeks >= t.from) &&
                            (t.to == null || gaWeeks <= t.to);
                          const window =
                            t.from != null && t.to != null
                              ? `${t.from}\u2013${t.to} wk`
                              : t.from != null
                                ? `from ${t.from} wk`
                                : `until ${t.to} wk`;
                          return (
                            <p key={i}
                              className={`rounded-md px-2 py-1.5 text-xs font-semibold ${applies ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                              {applies ? `Applies now (${gaWeeks} wk): ` : `${window}: `}
                              {t.note}
                            </p>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-600">Ref: {e.ref}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })()}
    </div>
  );
}