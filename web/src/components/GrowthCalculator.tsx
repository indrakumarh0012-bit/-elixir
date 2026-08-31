import { useMemo, useState } from "react";
import {
  centileBandCompact,
  centileBandLabel,
  headCircForAge,
  heightForAge,
  zBandCompact,
  zBandLabel,
  weightForAge,
  GROWTH_MAX_MONTHS,
  type GrowthResult,
  type Sex,
} from "../lib/growthMath";
import CentileChart, { type ChartSpec } from "./CentileChart";
import { iapChartSpec, whoChartSpec } from "../lib/growthChartSpecs";
import SaveButton from "./SaveButton";

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
          Enter {title.toLowerCase().includes("weight")
            ? "weight"
            : title.toLowerCase().includes("head")
              ? "head circumference"
              : "height"} to see the result.
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
          <dd className="text-lg font-bold">{zBandCompact(result.z)} SD</dd>
        </div>
        <div className="rounded-md bg-white/70 px-2 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Centile
          </dt>
          <dd className="text-lg font-bold">
            {centileBandCompact(result.percentile)}
          </dd>
        </div>
        <div className="rounded-md bg-white/70 px-2 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Median
          </dt>
          <dd className="text-lg font-bold">{result.median.toFixed(1)}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-sm font-semibold">
        On the chart: {centileBandLabel(result.percentile)} ·{" "}
        {zBandLabel(result.z)}.
      </p>

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
  const [ageValue, setAgeValue] = useState<number | "">(1);
  const [ageUnit, setAgeUnit] = useState<"years" | "months" | "days" | "hours">("years");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [hc, setHc] = useState<number | "">("");

  const ageMonths = useMemo(() => {
    const n = ageValue === "" ? 0 : Number(ageValue);
    if (ageUnit === "years") return n * 12;
    if (ageUnit === "months") return n;
    if (ageUnit === "days") return n / 30.4375;
    return n / 730.5; // hours of life
  }, [ageValue, ageUnit]);

  const overMax = ageMonths > GROWTH_MAX_MONTHS;

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
  const hcfa = useMemo(
    () => (hc === "" ? null : headCircForAge(Number(hc), ageMonths, sex)),
    [hc, ageMonths, sex],
  );

  const ageLabel =
    ageUnit === "hours"
      ? `${ageValue || 0} h of life`
      : ageMonths < 1
        ? `${Math.round(ageMonths * 30.4375)} day${Math.round(ageMonths * 30.4375) === 1 ? "" : "s"}`
        : ageMonths < 24
          ? `${Math.round(ageMonths * 10) / 10} month${ageMonths === 1 ? "" : "s"}`
          : `${Math.floor(ageMonths / 12)} y ${Math.round(ageMonths % 12)} m`;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Growth Charts</h2>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                sex === s
                  ? s === "male"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-rose-900 text-white shadow-sm"
                  : s === "male"
                    ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {s === "male" ? "Boy" : "Girl"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="col-span-2 block">
            <span className="text-xs font-semibold text-slate-600">Age</span>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={ageValue}
                onChange={(e) => setAgeValue(numOrEmpty(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-violet-500"
              />
              <select
                value={ageUnit}
                onChange={(e) => setAgeUnit(e.target.value as typeof ageUnit)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
                <option value="days">Days</option>
                <option value="hours">Hours of life</option>
              </select>
            </div>
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-violet-500"
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-violet-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Head circumference (cm)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={hc}
              onChange={(e) => setHc(numOrEmpty(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-violet-500"
            />
          </label>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Age entered: {ageLabel}
          {ageMonths < 24
            ? " · under 2 years, measure length lying down"
            : " · from 2 years, measure height standing"}
          {ageMonths > 60 &&
            ageMonths <= GROWTH_MAX_MONTHS &&
            " · 5–18 y read against the IAP 2015 Indian charts"}
        </p>
      </section>

      {overMax ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Charts here cover 0–18 years</p>
          <p className="mt-1">
            Above 18 use adult assessment (BMI), not growth charts.
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
          {hc !== "" && (
            <ResultCard
              title="Head circumference for age"
              value={hc}
              unit="cm"
              result={hcfa}
            />
          )}
        </div>
      )}

      {!overMax && (() => {
        const ageYears = ageMonths / 12;
        const cap = (label: string, val: number, unit: string, r: GrowthResult | null) =>
          r
            ? `${label} ${val} ${unit} at ${ageLabel} — ${centileBandCompact(r.percentile)} centile, ${zBandCompact(r.z)} SD`
            : "";
        const charts: ChartSpec[] = [];
        if (wfa && weight !== "") {
          charts.push(
            ageMonths <= 60
              ? whoChartSpec("weight", sex, ageMonths, Number(weight), cap("Weight", Number(weight), "kg", wfa))
              : iapChartSpec("weight", sex, ageYears, Number(weight), cap("Weight", Number(weight), "kg", wfa)),
          );
        }
        if (hfa && height !== "") {
          charts.push(
            ageMonths <= 60
              ? whoChartSpec("height", sex, ageMonths, Number(height), cap("Height", Number(height), "cm", hfa))
              : iapChartSpec("height", sex, ageYears, Number(height), cap("Height", Number(height), "cm", hfa)),
          );
        }
        if (hcfa && hc !== "" && ageMonths <= 60) {
          charts.push(whoChartSpec("hc", sex, ageMonths, Number(hc), cap("Head circumference", Number(hc), "cm", hcfa)));
        }
        if (charts.length === 0) return null;
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {charts.map((spec) => (
              <CentileChart key={spec.title} spec={spec} />
            ))}
          </div>
        );
      })()}

      <SaveButton
        tool="Growth"
        build={() => {
          if (!wfa && !hfa && !hcfa) return null;
          const parts: string[] = [];
          if (wfa) parts.push(`Weight ${weight} kg: ${centileBandCompact(wfa.percentile)} centile, ${zBandCompact(wfa.z)} SD — ${wfa.classification}`);
          if (hfa) parts.push(`Height ${height} cm: ${centileBandCompact(hfa.percentile)} centile, ${zBandCompact(hfa.z)} SD — ${hfa.classification}`);
          if (hcfa) parts.push(`Head circumference ${hc} cm: ${centileBandCompact(hcfa.percentile)} centile, ${zBandCompact(hcfa.z)} SD — ${hcfa.classification}`);
          return {
            title: `Growth — ${sex === "male" ? "boy" : "girl"} ${ageLabel}`,
            detail: parts.join("\n"),
          };
        }}
      />

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Z-scores use the WHO LMS method on completed months, with WHO's
        correction beyond ±3 SD for weight. Cross-check against the printed
        chart before acting on a borderline result.
      </p>
    </div>
  );
}
