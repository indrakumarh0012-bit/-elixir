/**
 * Semicircular BMI meter: coloured segments per the Indian consensus cutoffs
 * with a needle marking the calculated BMI, plus a body-silhouette scale with
 * the matching figure highlighted.
 */

const MIN = 12;
const MAX = 40;

const SEGS = [
  { from: MIN, to: 18.5, color: "#3b82f6", label: "Underweight", range: "< 18.5" },
  { from: 18.5, to: 23, color: "#22c55e", label: "Normal", range: "18.5–22.9" },
  { from: 23, to: 25, color: "#f59e0b", label: "Overweight", range: "23–24.9" },
  { from: 25, to: 30, color: "#f97316", label: "Obese", range: "25–29.9" },
  { from: 30, to: MAX, color: "#dc2626", label: "Severely obese", range: "≥ 30" },
];

const CX = 120;
const CY = 118;
const R = 88;

function angleFor(bmi: number): number {
  const b = Math.min(Math.max(bmi, MIN), MAX);
  return 180 - (180 * (b - MIN)) / (MAX - MIN);
}

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
}

function arcPath(fromBmi: number, toBmi: number, r: number): string {
  const [x1, y1] = polar(angleFor(fromBmi), r);
  const [x2, y2] = polar(angleFor(toBmi), r);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function segIndex(bmi: number): number {
  const i = SEGS.findIndex((s) => bmi < s.to);
  return i === -1 ? SEGS.length - 1 : i;
}

/** Simple body silhouette that widens with each category. */
function Figure({ color, wide, active }: { color: string; wide: number; active: boolean }) {
  return (
    <svg viewBox="0 0 40 64" className={active ? "h-14 w-9" : "h-12 w-8 opacity-40"} aria-hidden>
      <circle cx="20" cy="9" r="7" fill={color} />
      <ellipse cx="20" cy="33" rx={wide} ry="16" fill={color} />
      <rect x={20 - wide * 0.7} y="45" width={wide * 0.55} height="17" rx="2.5" fill={color} />
      <rect x={20 + wide * 0.15} y="45" width={wide * 0.55} height="17" rx="2.5" fill={color} />
      {active && (
        <rect x="1" y="1" width="38" height="62" rx="6" fill="none" stroke="#0f172a" strokeWidth="2" />
      )}
    </svg>
  );
}

export default function BmiGauge({ bmi }: { bmi: number }) {
  const active = segIndex(bmi);
  const needleAngle = angleFor(bmi);
  const [tipX, tipY] = polar(needleAngle, R - 26);
  const widths = [5, 6.2, 7.6, 9.2, 11];

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">BMI meter (Indian cutoffs)</h3>
      <div className="mx-auto max-w-sm">
        <svg viewBox="0 0 240 132" className="mt-2 w-full" role="img" aria-label={`BMI ${bmi}: ${SEGS[active].label}`}>
          {SEGS.map((s, i) => (
            <path
              key={s.label}
              d={arcPath(s.from, s.to, R)}
              fill="none"
              stroke={s.color}
              strokeWidth={i === active ? 30 : 22}
              strokeLinecap="butt"
              opacity={i === active ? 1 : 0.55}
            />
          ))}
          {[18.5, 23, 25, 30].map((b) => {
            const [x, y] = polar(angleFor(b), R + 22);
            return (
              <text key={b} x={x} y={y} textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">
                {b}
              </text>
            );
          })}
          {/* needle marking the exact BMI */}
          <line x1={CX} y1={CY} x2={tipX} y2={tipY} stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="9" fill="#0f172a" />
        </svg>
      </div>
      <div className="mt-1 flex items-end justify-between px-1">
        {SEGS.map((s, i) => (
          <div key={s.label} className="flex w-1/5 flex-col items-center text-center">
            <Figure color={s.color} wide={widths[i]} active={i === active} />
            <p className={`mt-1 text-[10px] font-bold leading-tight ${i === active ? "text-slate-900" : "text-slate-400"}`}>
              {s.label}
            </p>
            <p className={`text-[10px] leading-tight ${i === active ? "font-semibold text-slate-700" : "text-slate-400"}`}>
              {s.range}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
