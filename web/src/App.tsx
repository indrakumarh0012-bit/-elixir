import { useState } from "react";
import CreatinineClearance from "./components/CreatinineClearance";
import GrowthCalculator from "./components/GrowthCalculator";
import PediatricDosageCalculator from "./components/PediatricDosageCalculator";
import RegimenAnalyzerUI from "./components/RegimenAnalyzerUI";

type AppTab = "pedDose" | "growth" | "crCl" | "regimen";

export default function App() {
  const [tab, setTab] = useState<AppTab>("pedDose");

  const tabs: {
    id: AppTab;
    label: string;
    shortLabel: string;
    active: string;
    idle: string;
  }[] = [
    {
      id: "pedDose",
      label: "Ped Dose Calculator",
      shortLabel: "Ped Dose",
      active: "bg-blue-600 text-white shadow-sm",
      idle: "bg-blue-50 text-blue-800 hover:bg-blue-100",
    },
    {
      id: "growth",
      label: "Growth Charts",
      shortLabel: "Growth",
      active: "bg-violet-600 text-white shadow-sm",
      idle: "bg-violet-50 text-violet-800 hover:bg-violet-100",
    },
    {
      id: "crCl",
      label: "Creatinine Clearance",
      shortLabel: "CrCl",
      active: "bg-teal-600 text-white shadow-sm",
      idle: "bg-teal-50 text-teal-800 hover:bg-teal-100",
    },
    {
      id: "regimen",
      label: "Polypharmacy",
      shortLabel: "Polypharm",
      active: "bg-rose-600 text-white shadow-sm",
      idle: "bg-rose-50 text-rose-800 hover:bg-rose-100",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-header border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 md:px-6">
          <p className="brand-text text-lg font-extrabold tracking-tight">
            Smart-Elixir
          </p>
          <nav className="flex flex-wrap gap-2" aria-label="Main navigation">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === t.id ? t.active : t.idle
                }`}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="brand-ribbon" />
      </header>

      <main className="flex-1">
        {tab === "pedDose" && <PediatricDosageCalculator />}
        {tab === "growth" && <GrowthCalculator />}
        {tab === "crCl" && <CreatinineClearance />}
        {tab === "regimen" && <RegimenAnalyzerUI />}
      </main>

      <footer className="border-t border-[var(--line)] bg-white px-3 py-4 text-center text-xs leading-relaxed text-[var(--muted)] md:px-6">
        Smart-Elixir is a clinical decision-support tool for licensed healthcare
        professionals. It does not replace clinical judgment, diagnosis, or
        emergency care. Verify all doses and plans before prescribing.
      </footer>
    </div>
  );
}
