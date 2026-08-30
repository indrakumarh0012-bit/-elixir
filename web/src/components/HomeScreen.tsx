import type { MenuTarget } from "./SideMenu";
import ToolIcon from "./ToolIcon";

const TOOLS: { id: MenuTarget; title: string }[] = [
  { id: "pedDose", title: "Ped Dose Calculator" },
  { id: "growth", title: "Growth Charts" },
  { id: "bp", title: "Ped-BP" },
  { id: "crCl", title: "Creatinine Clearance" },
  { id: "regimen", title: "Polypharm" },
  { id: "icu", title: "ICU Titration" },
  { id: "ob", title: "OB / EDD" },
  { id: "report", title: "Report an Issue" },
];

export default function HomeScreen({ onOpen }: { onOpen: (t: MenuTarget) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-3 py-6 md:px-6">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Pocket-Med" className="h-16 w-auto" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen(t.id)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 hover:shadow"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ToolIcon id={t.id} className="h-5 w-5" />
            </span>
            <span className="font-bold text-slate-900">{t.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
