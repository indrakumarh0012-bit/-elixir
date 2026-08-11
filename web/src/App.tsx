import { useState } from "react";
import CreatinineClearance from "./components/CreatinineClearance";
import PatientAnalysisSummarizer from "./components/PatientAnalysisSummarizer";
import PediatricDosageCalculator from "./components/PediatricDosageCalculator";

type AppTab = "summarizer" | "pedDose" | "crCl";

export default function App() {
  const [tab, setTab] = useState<AppTab>("summarizer");

  const tabs: { id: AppTab; label: string }[] = [
    { id: "summarizer", label: "Summarizer" },
    { id: "pedDose", label: "Ped Dose Calculator" },
    { id: "crCl", label: "Creatinine Clearance" },
  ];

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 md:px-6">
          <p className="text-lg font-bold tracking-tight text-[var(--accent)]">
            Smart-Elixir
          </p>
          <nav className="flex flex-wrap gap-2">
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
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tab === "summarizer" && <PatientAnalysisSummarizer />}
      {tab === "pedDose" && <PediatricDosageCalculator />}
      {tab === "crCl" && <CreatinineClearance />}
    </main>
  );
}
