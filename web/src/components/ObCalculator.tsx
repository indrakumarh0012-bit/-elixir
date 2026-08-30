import { useMemo, useState } from "react";
import { searchDrugs } from "../clinical/clinicalData";
import { PREGNANCY_SAFETY } from "../data/pregnancySafety";
import {
  calculateGestation,
  formatDate,
  type ObMethod,
} from "../lib/obMath";
import SaveButton from "./SaveButton";

const METHODS: { id: ObMethod; label: string; dateLabel: string }[] = [
  { id: "lmp", label: "LMP", dateLabel: "First day of last period" },
  { id: "ivf5", label: "IVF — day-5 transfer", dateLabel: "Embryo transfer date" },
  { id: "ivf3", label: "IVF — day-3 transfer", dateLabel: "Embryo transfer date" },
  { id: "ovulation", label: "Ovulation / IUI", dateLabel: "Ovulation / IUI date" },
];

export default function ObCalculator() {
  const [method, setMethod] = useState<ObMethod>("lmp");
  const [dateStr, setDateStr] = useState("");
  const [cycle, setCycle] = useState<number | "">(28);
  const [drugQuery, setDrugQuery] = useState("");

  const drugMatches = useMemo(() => {
    const q = drugQuery.trim();
    if (q.length < 2) return [];
    return searchDrugs(q).slice(0, 8);
  }, [drugQuery]);

  const result = useMemo(() => {
    if (!dateStr) return null;
    return calculateGestation(
      method,
      new Date(dateStr + "T00:00:00"),
      new Date(),
      cycle === "" ? 28 : Number(cycle),
    );
  }, [method, dateStr, cycle]);

  const active = METHODS.find((m) => m.id === method)!;

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold text-fuchsia-800">
        Gestational Age &amp; EDD
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Pick how the pregnancy is dated; results correct for cycle length and
        IVF timing automatically.
      </p>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                method === m.id
                  ? "bg-fuchsia-600 text-white shadow-sm"
                  : "bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              {active.dateLabel}
            </span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </label>
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
        <div className="mt-4 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4">
          <p className="text-sm font-semibold text-fuchsia-900">Today</p>
          <p className="mt-1 text-3xl font-bold text-fuchsia-900">
            {result.gaLabel}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
          </dl>
          <p className="mt-3 text-xs text-fuchsia-900/80">{result.note}</p>
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
        Ref: Naegele rule with cycle correction · ACOG/FOGSI dating practice.
      </p>

      {/* Pregnancy drug safety */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-fuchsia-800">
          Pregnancy drug check
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Search any drug — safe (green), weigh/adjust (amber), avoid with the
          alternative to use instead (red).
        </p>
        <input
          value={drugQuery}
          onChange={(e) => setDrugQuery(e.target.value)}
          placeholder="e.g. warfarin, enalapril, thyroxine, ibuprofen…"
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
                risk === "avoid"
                  ? "AVOID"
                  : risk === "caution"
                    ? "CAUTION"
                    : risk === "safe"
                      ? "SAFE"
                      : "NO DATA HERE";
              const badgeBg =
                risk === "avoid"
                  ? "bg-red-700"
                  : risk === "caution"
                    ? "bg-amber-600"
                    : risk === "safe"
                      ? "bg-emerald-700"
                      : "bg-slate-500";
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
                        <p className="mt-1 font-semibold">
                          Use instead: {entry.alternative}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1">
                      Not yet rated in this app — check a formulary before
                      prescribing in pregnancy.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 rounded-lg border border-fuchsia-100 bg-fuchsia-50 p-3 text-sm text-fuchsia-950">
          <p className="font-bold">Dosing changes in pregnancy — the ones that bite</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li><strong>Kidneys speed up:</strong> GFR rises ~50%, so a "normal" creatinine of 1.0 mg/dL is ABNORMAL in pregnancy (upper normal ≈ 0.8) — and renally cleared drugs may need MORE, not less.</li>
            <li><strong>Thyroxine:</strong> increase ~25–30% at conception; TSH every 4–6 weeks.</li>
            <li><strong>Levetiracetam / lamotrigine:</strong> levels fall — check each trimester and up-titrate.</li>
            <li><strong>Insulin:</strong> requirements climb steadily, especially T2–T3.</li>
            <li><strong>LMWH:</strong> weight changes — re-dose; anti-Xa on treatment doses.</li>
            <li><strong>Lithium:</strong> clearance rises — monthly levels; hold at delivery, then dose drops back.</li>
          </ol>
          <p className="mt-2 text-xs">
            Tip: in the Polypharmacy tab, add "Pregnancy" as a condition —
            every drug in the regimen is then screened against this same
            safety data automatically.
          </p>
        </div>
      </section>
    </div>
  );
}