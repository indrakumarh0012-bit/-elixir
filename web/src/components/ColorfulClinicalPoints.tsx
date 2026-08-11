import { useMemo } from "react";
import {
  parseClinicalPoints,
  SECTION_THEMES,
} from "../summary/formatClinicalPoints";

type Props = {
  text: string;
  emptyHint?: string;
  /** Slightly denser for critique footer */
  compact?: boolean;
};

/** Colorful numbered points — strips markdown stars / dashes / think process from LLM text. */
export default function ColorfulClinicalPoints({
  text,
  emptyHint = "No detail yet.",
  compact = false,
}: Props) {
  const sections = useMemo(() => parseClinicalPoints(text), [text]);

  if (!text.trim()) {
    return emptyHint ? (
      <p className="text-sm text-slate-500">{emptyHint}</p>
    ) : null;
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-slate-800">{text.trim()}</p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {sections.map((sec, si) => {
        const theme = SECTION_THEMES[si % SECTION_THEMES.length];
        return (
          <div
            key={`${sec.title}-${si}`}
            className={`rounded-xl border p-3 sm:p-4 ${theme.wrap}`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold ${theme.badge}`}
              >
                {si + 1}
              </span>
              <h4 className={`text-sm font-bold tracking-tight ${theme.title}`}>
                {sec.title}
              </h4>
            </div>
            <ol className="space-y-2">
              {sec.points.map((point, pi) => (
                <li
                  key={`${si}-${pi}`}
                  className={`flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-relaxed shadow-sm ${theme.point}`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${theme.num}`}
                  >
                    {pi + 1}
                  </span>
                  <span className="min-w-0 flex-1">{point}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
