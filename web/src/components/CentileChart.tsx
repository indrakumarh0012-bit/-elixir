/**
 * Centile chart: reference curves with the patient's exact point marked by a
 * red dot and dashed crosshair, centile labels on the right edge, and a
 * "marked exactly" line underneath. Only the relevant sex + parameter chart
 * is ever built.
 */

export type ChartCurve = { label: string; pts: [number, number][] };

export type ChartSpec = {
  title: string;
  yUnit: string;
  xLabel: string;
  curves: ChartCurve[];
  patient: { x: number; y: number; caption: string };
  xTicks: { at: number; label: string }[];
  refNote: string;
};

const W = 360;
const H = 250;
const M = { l: 40, r: 34, t: 10, b: 26 };

export default function CentileChart({ spec }: { spec: ChartSpec }) {
  const xs = spec.curves[0].pts.map((p) => p[0]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const allY = spec.curves.flatMap((c) => c.pts.map((p) => p[1])).concat(spec.patient.y);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const yPad = (yMax - yMin) * 0.08 || 1;
  const y0 = yMin - yPad;
  const y1 = yMax + yPad;

  const px = (x: number) => M.l + ((x - xMin) / (xMax - xMin)) * (W - M.l - M.r);
  const py = (y: number) => H - M.b - ((y - y0) / (y1 - y0)) * (H - M.t - M.b);

  const path = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join(" ");

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => y0 + ((y1 - y0) * i) / yTickCount);
  const mid = Math.floor(spec.curves.length / 2);
  const cpx = px(Math.min(Math.max(spec.patient.x, xMin), xMax));
  const cpy = py(spec.patient.y);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="text-sm font-bold text-slate-900">{spec.title}</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={spec.patient.caption}>
        {/* grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={M.l} y1={py(t)} x2={W - M.r} y2={py(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={M.l - 4} y={py(t) + 3} textAnchor="end" fontSize="8" fill="#64748b">
              {t >= 100 ? t.toFixed(0) : t.toFixed(1)}
            </text>
          </g>
        ))}
        {spec.xTicks.map((t) => (
          <g key={t.at}>
            <line x1={px(t.at)} y1={M.t} x2={px(t.at)} y2={H - M.b} stroke="#f1f5f9" strokeWidth="1" />
            <text x={px(t.at)} y={H - M.b + 12} textAnchor="middle" fontSize="8" fill="#64748b">
              {t.label}
            </text>
          </g>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle" fontSize="8" fontWeight="600" fill="#475569">
          {spec.xLabel}
        </text>
        {/* centile curves */}
        {spec.curves.map((c, i) => (
          <g key={c.label}>
            <path
              d={path(c.pts)}
              fill="none"
              stroke={i === mid ? "#0f766e" : "#94a3b8"}
              strokeWidth={i === mid ? 2 : 1.1}
            />
            <text
              x={W - M.r + 2}
              y={py(c.pts[c.pts.length - 1][1]) + 3}
              fontSize="8"
              fontWeight="700"
              fill={i === mid ? "#0f766e" : "#64748b"}
            >
              {c.label}
            </text>
          </g>
        ))}
        {/* patient crosshair + dot */}
        <line x1={cpx} y1={M.t} x2={cpx} y2={H - M.b} stroke="#dc2626" strokeWidth="1" strokeDasharray="4 3" />
        <line x1={M.l} y1={cpy} x2={W - M.r} y2={cpy} stroke="#dc2626" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx={cpx} cy={cpy} r="4.5" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
      <p className="mt-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-950">
        ● {spec.patient.caption}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">{spec.refNote}</p>
    </div>
  );
}
