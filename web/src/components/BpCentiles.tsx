import { useMemo, useState } from "react";
import {
  assessBp,
  bpCentiles,
  dippingPercent,
  type BpPeriod,
  type BpSex,
} from "../lib/bpMath";
import { centileBandLabel, zBandCompact } from "../lib/growthMath";

const BAND_STYLES = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-900",
  caution: "border-amber-200 bg-amber-50 text-amber-900",
  alert: "border-red-200 bg-red-50 text-red-900",
} as const;

function num(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

export default function BpCentiles() {
  const [sex, setSex] = useState<BpSex>("male");
  const [height, setHeight] = useState<number | "">("");
  const [daySbp, setDaySbp] = useState<number | "">("");
  const [dayDbp, setDayDbp] = useState<number | "">("");
  const [nightSbp, setNightSbp] = useState<number | "">("");
  const [nightDbp, setNightDbp] = useState<number | "">("");

  const h = height === "" ? null : Number(height);
  const heightOk = h != null && h >= 105 && h <= 200;

  const rows = useMemo(() => {
    if (!heightOk || h == null) return null;
    const make = (period: BpPeriod) => ({
      period,
      sbp: bpCentiles(sex, period, "sbp", h),
      dbp: bpCentiles(sex, period, "dbp", h),
    });
    return [make("day"), make("night"), make("24h")];
  }, [sex, h, heightOk]);

  const assessments = useMemo(() => {
    if (!heightOk || h == null) return [];
    const list: { label: string; value: number; a: NonNullable<ReturnType<typeof assessBp>> }[] = [];
    const push = (label: string, period: BpPeriod, comp: "sbp" | "dbp", v: number | "") => {
      if (v === "") return;
      const a = assessBp(sex, period, comp, h, Number(v));
      if (a) list.push({ label, value: Number(v), a });
    };
    push("Daytime systolic", "day", "sbp", daySbp);
    push("Daytime diastolic", "day", "dbp", dayDbp);
    push("Night systolic", "night", "sbp", nightSbp);
    push("Night diastolic", "night", "dbp", nightDbp);
    return list;
  }, [sex, h, heightOk, daySbp, dayDbp, nightSbp, nightDbp]);

  const dip =
    daySbp !== "" && nightSbp !== ""
      ? dippingPercent(Number(daySbp), Number(nightSbp))
      : null;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold text-cyan-800">
        Pediatric BP Centiles — day &amp; night (ABPM)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Wühl 2002 ambulatory BP reference by height (120–185 cm boys, 120–175 cm
        girls). Enter height to see every centile line; add measured values to
        place the child on them.
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
                  ? s === "male"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-pink-500 text-white shadow-sm"
                  : s === "male"
                    ? "bg-blue-50 text-blue-800 hover:bg-blue-100"
                    : "bg-pink-50 text-pink-700 hover:bg-pink-100"
              }`}
            >
              {s === "male" ? "Boy" : "Girl"}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <label className="block col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-600">Height (cm)</span>
            <input type="number" inputMode="decimal" value={height}
              onChange={(e) => setHeight(num(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Day SBP</span>
            <input type="number" inputMode="numeric" value={daySbp}
              onChange={(e) => setDaySbp(num(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Day DBP</span>
            <input type="number" inputMode="numeric" value={dayDbp}
              onChange={(e) => setDayDbp(num(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Night SBP</span>
            <input type="number" inputMode="numeric" value={nightSbp}
              onChange={(e) => setNightSbp(num(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Night DBP</span>
            <input type="number" inputMode="numeric" value={nightDbp}
              onChange={(e) => setNightDbp(num(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>
        </div>
        {height !== "" && !heightOk && (
          <p className="mt-2 text-xs text-amber-700">
            Reference covers roughly 120–185 cm; values outside are clamped to
            the nearest edge.
          </p>
        )}
      </section>

      {assessments.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {assessments.map(({ label, value, a }) => (
            <div key={label} className={`rounded-lg border p-3 ${BAND_STYLES[a.band]}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-sm">{value} mmHg</p>
              </div>
              <p className="mt-1 text-lg font-bold">{a.classification}</p>
              <p className="mt-1 text-xs">
                {centileBandLabel(a.percentile)} · {zBandCompact(a.z)} SD
              </p>
            </div>
          ))}
        </div>
      )}

      {dip != null && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${dip >= 10 ? BAND_STYLES.normal : BAND_STYLES.caution}`}>
          <strong>Nocturnal dip:</strong> {dip}%{" "}
          {dip >= 10
            ? "— normal dipper (≥ 10%)."
            : "— blunted dipping (< 10%): associated with secondary hypertension and target-organ risk."}
        </div>
      )}

      {rows && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            Centile lines at this height ({sex === "male" ? "boy" : "girl"},{" "}
            {height} cm) — mmHg
          </h3>
          <table className="mt-2 w-full min-w-[540px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-1 pr-2">Period</th>
                <th className="py-1 pr-2">BP</th>
                <th className="py-1 pr-2">5th</th>
                <th className="py-1 pr-2">10th</th>
                <th className="py-1 pr-2">50th</th>
                <th className="py-1 pr-2">90th</th>
                <th className="py-1 pr-2">95th</th>
                <th className="py-1">99th</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap(({ period, sbp, dbp }) =>
                [
                  { comp: "Systolic", c: sbp },
                  { comp: "Diastolic", c: dbp },
                ].map(({ comp, c }) => (
                  <tr key={period + comp} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 font-semibold capitalize text-slate-700">
                      {period}
                    </td>
                    <td className="py-1.5 pr-2 text-slate-700">{comp}</td>
                    <td className="py-1.5 pr-2">{c.p5}</td>
                    <td className="py-1.5 pr-2">{c.p10}</td>
                    <td className="py-1.5 pr-2 font-bold">{c.p50}</td>
                    <td className="py-1.5 pr-2 text-amber-700">{c.p90}</td>
                    <td className="py-1.5 pr-2 font-bold text-red-700">{c.p95}</td>
                    <td className="py-1.5">{c.p99}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            ≥ 95th centile = ambulatory hypertension; 90th–95th = elevated.
            Reference: Wühl et al., J Hypertens 2002 (height-normalized ABPM).
          </p>
        </div>
      )}
    </div>
  );
}
