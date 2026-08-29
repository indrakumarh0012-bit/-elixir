import { useState } from "react";
import CreatinineClearance from "./components/CreatinineClearance";
import GrowthCalculator from "./components/GrowthCalculator";
import PediatricDosageCalculator from "./components/PediatricDosageCalculator";
import RegimenAnalyzerUI from "./components/RegimenAnalyzerUI";

type AppTab = "pedDose" | "growth" | "crCl" | "regimen";

export default function App() {
  const [tab, setTab] = useState<AppTab>("pedDose");

  const tabs: { id: AppTab; label: string; shortLabel: string }[] = [
    { id: "pedDose", label: "Ped Dose Calculator", shortLabel: "Ped Dose" },
    { id: "growth", label: "Growth Charts", shortLabel: "Growth" },
    { id: "crCl", label: "Creatinine Clearance", shortLabel: "CrCl" },
    { id: "regimen", label: "Regimen / Polypharmacy", shortLabel: "Regimen" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-header border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 md:px-6">
          <p className="text-lg font-bold tracking-tight text-[var(--accent)]">
            Smart-Elixir
          </p>
          <nav className="flex flex-wrap gap-2" aria-label="Main navigation">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === t.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel}</span>
              </button>
            ))}
          </nav>
        </div>
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
