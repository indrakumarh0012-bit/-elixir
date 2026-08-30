import type { MenuTarget } from "./SideMenu";

const TOOLS: { id: MenuTarget; icon: string; title: string; hue: string }[] = [
  { id: "pedDose", icon: "🧒", title: "Ped Dose Calculator", hue: "border-blue-200 bg-blue-50" },
  { id: "growth", icon: "📈", title: "Growth Charts", hue: "border-violet-200 bg-violet-50" },
  { id: "bp", icon: "🫀", title: "Ped-BP", hue: "border-cyan-200 bg-cyan-50" },
  { id: "crCl", icon: "🫘", title: "Creatinine Clearance", hue: "border-teal-200 bg-teal-50" },
  { id: "regimen", icon: "💊", title: "Polypharm", hue: "border-rose-200 bg-rose-50" },
  { id: "icu", icon: "🏥", title: "ICU Titration", hue: "border-orange-200 bg-orange-50" },
  { id: "ob", icon: "🤰", title: "OB / EDD", hue: "border-fuchsia-200 bg-fuchsia-50" },
  { id: "report", icon: "🛠️", title: "Report an Issue", hue: "border-amber-200 bg-amber-50" },
];

export default function HomeScreen({ onOpen }: { onOpen: (t: MenuTarget) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-3 py-6 md:px-6">
      <h2 className="text-2xl font-bold text-slate-900">Pocket-Med</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen(t.id)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition hover:shadow ${t.hue}`}
          >
            <span className="text-2xl" aria-hidden>{t.icon}</span>
            <span className="font-bold text-slate-900">{t.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
