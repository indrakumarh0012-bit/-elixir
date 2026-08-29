import { useMemo, useState } from "react";
import {
  heightForAge,
  toMonths,
  weightForAge,
  WHO_MAX_MONTHS,
  type GrowthResult,
  type Sex,
} from "../lib/growthMath";

const BAND_STYLES: Record<GrowthResult["band"], string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-900",
  caution: "border-amber-200 bg-amber-50 text-amber-900",
  alert: "border-red-200 bg-red-50 text-red-900",
};

function numOrEmpty(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function ResultCard({
  title,
  value,
  unit,
  result,
}: {
  title: string;
  value: number | "";
  unit: string;
  result: GrowthResult | null;
}) {
  if (value === "" || Number(value) <= 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-sm text-slate-500">
          Enter {title.toLowerCase().includes("weight") ? "weight" : "height"} to
          see the result.
        </p>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-sm text-slate-500">
          Not available for this age.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${BAND_STYLES[result.band]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm">
          {value} {unit}
        </p>
      </div>

      <p className="mt-2 text-2xl font-bold">{result.classification}</p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-white/70 px-2 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Z-score
          </dt>
          <dd className="text-lg font-bold">
            {result.z > 0 ? `+${result.z}` : result.z} SD
          </dd>
        </div>
        <div className="rounded-md bg-white/70 px-2 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Percentile
          </dt>
          <dd className="text-lg font-bold">{result.percentile}</dd>
        </div>
        <div className="rounded-md bg-white/70 px-2 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Median
          </dt>
          <dd className="text-lg font-bold">{result.median.toFixed(1)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs opacity-80">
        {result.reference}
        {result.measurement ? ` · measured as ${result.measurement}` : ""}
      </p>
    </div>
  );
}

/**
 * Height-for-age and weight-for-age against the WHO Child Growth Standards.
 * Everything recalculates as the numbers are typed — there is no submit step.
 */
export default function GrowthCalculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [years, setYears] = useState<number | "">(1);
  const [months, setMonths] = useState<number | "">(0);
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");

  const ageMonths = useMemo(
    () => toMonths(years === "" ? 0 : Number(years), months === "" ? 0 : Number(months)),
    [years, months],
  );

  const overFive = ageMonths > WHO_MAX_MONTHS;

  const wfa = useMemo(
    () =>
      weight === "" ? null : weightForAge(Number(weight), ageMonths, sex),
    [weight, ageMonths, sex],
  );
  const hfa = useMemo(
    () =>
      height === "" ? null : heightForAge(Number(height), ageMonths, sex),
    [height, ageMonths, sex],
  );

  const ageLabel =
    ageMonths < 24
      ? `${ageMonths} month${ageMonths === 1 ? "" : "s"}`
      : `${Math.floor(ageMonths / 12)} y ${ageMonths % 12} m`;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold text-slate-900">
        Growth — height &amp; weight for age
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Type the numbers; the z-score, percentile and interpretation update as
        you go.
      </p>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                sex === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {s === "male" ? "Boy" : "Girl"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Age — years</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={years}
              onChange={(e) => setYears(numOrEmpty(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Age — months</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              value={months}
              onChange={(e) => setMonths(numOrEmpty(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Weight (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(numOrEmpty(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Height / length (cm)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={height}
              onChange={(e) => setHeight(numOrEmpty(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Age entered: {ageLabel}
          {ageMonths < 24
            ? " · under 2 years, measure length lying down"
            : " · from 2 years, measure height standing"}
        </p>
      </section>

      {overFive ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            Over 5 years — IAP charts are not loaded yet
          </p>
          <p className="mt-1">
            The WHO standards built in here stop at 5 years (60 months). Indian
            children above 5 are read against the IAP 2015 charts, and those
            reference numbers are not in this app yet, so nothing is calculated
            for this age rather than showing a figure from the wrong chart.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ResultCard
            title="Weight for age"
            value={weight}
            unit="kg"
            result={wfa}
          />
          <ResultCard
            title="Height / length for age"
            value={height}
            unit="cm"
            result={hfa}
          />
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Z-scores use the WHO LMS method on completed months, with WHO's
        correction beyond ±3 SD for weight. Cross-check against the printed
        chart before acting on a borderline result.
      </p>
    </div>
  );
}
