import type { MenuTarget } from "./SideMenu";
import ToolIcon, { TOOL_BG, TOOL_SOFT } from "./ToolIcon";

export const TOOL_SECTIONS: {
  heading: string;
  tools: { id: MenuTarget; title: string }[];
}[] = [
  {
    heading: "Medicine",
    tools: [
      { id: "crCl", title: "Creatinine Clearance" },
      { id: "insulin", title: "Insulin" },
      { id: "icu", title: "ICU Titration" },
      { id: "regimen", title: "Polypharm" },
      { id: "bmi", title: "BMI" },
    ],
  },
  {
    heading: "Pediatrics",
    tools: [
      { id: "pedDose", title: "Ped Dose Calculator" },
      { id: "growth", title: "Growth Charts" },
      { id: "bp", title: "Ped-BP" },
    ],
  },
  {
    heading: "OBG",
    tools: [{ id: "ob", title: "OB / EDD" }],
  },
];

export default function HomeScreen({ onOpen }: { onOpen: (t: MenuTarget) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-3 py-6 md:px-6">
      {TOOL_SECTIONS.map((section) => (
        <section key={section.heading} className="mb-6 last:mb-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            {section.heading}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpen(t.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition hover:shadow ${TOOL_SOFT[t.id]}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${TOOL_BG[t.id]}`}>
                  <ToolIcon id={t.id} className="h-5 w-5" />
                </span>
                <span className="font-bold text-slate-900">{t.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
