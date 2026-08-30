import { useMemo, useState } from "react";
import {
  calculateGestation,
  formatDate,
  type ObMethod,
} from "../lib/obMath";

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
    </div>
  );
}
