import { useMemo } from "react";
import { parsePathophysiologyFlat } from "../summary/formatClinicalPoints";

const POINT_COLORS = [
  "border-teal-200 bg-teal-50 text-teal-950",
  "border-sky-200 bg-sky-50 text-sky-950",
  "border-amber-200 bg-amber-50 text-amber-950",
  "border-rose-200 bg-rose-50 text-rose-950",
  "border-emerald-200 bg-emerald-50 text-emerald-950",
  "border-orange-200 bg-orange-50 text-orange-950",
] as const;

const NUM_COLORS = [
  "bg-teal-600",
  "bg-sky-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-orange-600",
] as const;

type Props = {
  disease: string;
  text: string;
};

/** Disease click → crisp pathophysiology points only; short refs at end. */
export default function PathophysiologyPoints({ disease, text }: Props) {
  const { points, references } = useMemo(
    () => parsePathophysiologyFlat(text),
    [text],
  );

  if (!text.trim()) {
    return null;
  }

  if (points.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-slate-800">{text.trim()}</p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-bold text-slate-900">{disease}</p>
      <ol className="space-y-2">
        {points.map((point, i) => (
          <li
            key={`${i}-${point.slice(0, 24)}`}
            className={`flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-snug shadow-sm ${POINT_COLORS[i % POINT_COLORS.length]}`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${NUM_COLORS[i % NUM_COLORS.length]}`}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 font-medium">{point}</span>
          </li>
        ))}
      </ol>
      {references ? (
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Ref: </span>
          {references}
        </p>
      ) : null}
    </div>
  );
}
