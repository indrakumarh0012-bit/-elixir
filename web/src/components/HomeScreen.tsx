import type { MenuTarget } from "./SideMenu";

const TOOLS: { id: MenuTarget; icon: string; title: string; desc: string; hue: string }[] = [
  { id: "pedDose", icon: "🧒", title: "Ped Dose Calculator", desc: "73 drugs · Indian brands · renal panel · IV fluids", hue: "border-blue-200 bg-blue-50" },
  { id: "growth", icon: "📈", title: "Growth Charts", desc: "WHO 0–5 y · IAP 2015 5–18 y · centile & SD lines", hue: "border-violet-200 bg-violet-50" },
  { id: "bp", icon: "🫀", title: "Ped-BP", desc: "Day & night centiles by height · dengue shock flags", hue: "border-cyan-200 bg-cyan-50" },
  { id: "crCl", icon: "🫘", title: "Creatinine Clearance", desc: "127 drugs with CrCl-band dose adjustment", hue: "border-teal-200 bg-teal-50" },
  { id: "regimen", icon: "💊", title: "Polypharmacy", desc: "267 drugs · Beers/STOPP/START · alternatives", hue: "border-rose-200 bg-rose-50" },
  { id: "icu", icon: "🏥", title: "ICU Titration", desc: "Infusion rates · insulin · fluids · electrolytes", hue: "border-orange-200 bg-orange-50" },
  { id: "ob", icon: "🤰", title: "OB / EDD", desc: "Cycle & IVF-corrected dating · pregnancy drug check", hue: "border-fuchsia-200 bg-fuchsia-50" },
];

export default function HomeScreen({ onOpen }: { onOpen: (t: MenuTarget) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-3 py-6 md:px-6">
      <h2 className="text-2xl font-bold text-slate-900">Welcome to Pocket-Med</h2>
      <p className="mt-1 text-sm text-slate-600">
        Bedside clinical calculators — offline, reference-backed, no keys.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen(t.id)}
            className={`rounded-xl border p-4 text-left shadow-sm transition hover:shadow ${t.hue}`}
          >
            <p className="text-2xl" aria-hidden>{t.icon}</p>
            <p className="mt-1 font-bold text-slate-900">{t.title}</p>
            <p className="mt-0.5 text-xs text-slate-600">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
