import { formatDate } from "../lib/obMath";

/**
 * Pregnancy wheel drawn from the patient's own dates: a 40-week dial with
 * week ticks, trimester arcs, the term window, and a needle at today's
 * gestational age. Soft sky/violet/pink palette instead of the classic
 * red-green wheel.
 */

const CX = 170;
const CY = 170;
const TOTAL = 280; // days on the dial (40 weeks)

function polar(day: number, r: number): [number, number] {
  const deg = (Math.min(Math.max(day, 0), TOTAL) / TOTAL) * 360 - 90;
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function arc(fromDay: number, toDay: number, r: number): string {
  const [x1, y1] = polar(fromDay, r);
  const [x2, y2] = polar(toDay, r);
  const large = toDay - fromDay > TOTAL / 2 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const TRIMESTERS = [
  { from: 0, to: 98, color: "#38bdf8", label: "T1" },
  { from: 98, to: 196, color: "#a78bfa", label: "T2" },
  { from: 196, to: 280, color: "#f472b6", label: "T3" },
];

export default function ObWheel({
  lmp,
  edd,
  gaDays,
  gaLabel,
  trimester,
}: {
  lmp: Date;
  edd: Date;
  gaDays: number;
  gaLabel: string;
  trimester: 1 | 2 | 3;
}) {
  const clamped = Math.min(Math.max(gaDays, 0), TOTAL);
  const [nx, ny] = polar(clamped, 96);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">Pregnancy wheel</h3>
      <div className="mx-auto max-w-xs">
        <svg viewBox="0 0 340 340" className="mt-2 w-full" role="img" aria-label={`Gestation wheel: ${gaLabel}`}>
          {/* trimester arcs — the active one drawn bolder */}
          {TRIMESTERS.map((t, i) => (
            <path
              key={t.label}
              d={arc(t.from, t.to, 122)}
              fill="none"
              stroke={t.color}
              strokeWidth={i + 1 === trimester ? 28 : 20}
              opacity={i + 1 === trimester ? 1 : 0.45}
            />
          ))}
          {/* term window 37–40 wk */}
          <path d={arc(259, 280, 102)} fill="none" stroke="#0d9488" strokeWidth="7" />
          {/* week ticks */}
          {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => {
            const day = w * 7;
            const big = w % 4 === 0;
            const [x1, y1] = polar(day, big ? 136 : 139);
            const [x2, y2] = polar(day, 145);
            return <line key={w} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth={big ? 2 : 1} />;
          })}
          {/* week numbers every 4 weeks */}
          {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map((w) => {
            const [x, y] = polar(w * 7, 158);
            return (
              <text key={w} x={x} y={y + 3} textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">
                {w}
              </text>
            );
          })}
          {/* LMP / EDD anchor at the top */}
          <polygon points={`${CX - 6},${CY - 150} ${CX + 6},${CY - 150} ${CX},${CY - 138}`} fill="#0f172a" />
          {/* needle at today's GA */}
          <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="42" fill="#f8fafc" stroke="#e2e8f0" />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">
            {gaLabel.replace(" weeks ", "w ").replace(/ days?$/, "d")}
          </text>
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b">
            TRIMESTER {trimester}
          </text>
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-sky-50 px-2 py-1.5">
          <p className="font-bold text-sky-900">LMP (wk 0)</p>
          <p className="text-slate-700">{formatDate(lmp)}</p>
        </div>
        <div className="rounded-md bg-slate-100 px-2 py-1.5">
          <p className="font-bold text-slate-900">Today</p>
          <p className="text-slate-700">{gaLabel}</p>
        </div>
        <div className="rounded-md bg-pink-50 px-2 py-1.5">
          <p className="font-bold text-pink-900">EDD (wk 40)</p>
          <p className="text-slate-700">{formatDate(edd)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Teal arc = term window (37–40 wk). Needle marks today's gestational
        age on the entered dates.
      </p>
    </div>
  );
}
