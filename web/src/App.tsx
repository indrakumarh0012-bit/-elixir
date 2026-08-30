import { useState } from "react";
import HomeScreen from "./components/HomeScreen";
import SavedScreen from "./components/SavedScreen";
import SideMenu, { type MenuTarget } from "./components/SideMenu";
import BpCentiles from "./components/BpCentiles";
import CreatinineClearance from "./components/CreatinineClearance";
import GrowthCalculator from "./components/GrowthCalculator";
import IcuTitration from "./components/IcuTitration";
import PediatricDosageCalculator from "./components/PediatricDosageCalculator";
import ObCalculator from "./components/ObCalculator";
import RegimenAnalyzerUI from "./components/RegimenAnalyzerUI";

type AppTab = MenuTarget;

export default function App() {
  const [tab, setTab] = useState<AppTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);

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
      id: "bp",
      label: "Ped-BP",
      shortLabel: "Ped-BP",
      active: "bg-cyan-600 text-white shadow-sm",
      idle: "bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
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
    {
      id: "icu",
      label: "ICU Titration",
      shortLabel: "ICU",
      active: "bg-orange-600 text-white shadow-sm",
      idle: "bg-orange-50 text-orange-800 hover:bg-orange-100",
    },
    {
      id: "ob",
      label: "OB / EDD",
      shortLabel: "OB",
      active: "bg-fuchsia-600 text-white shadow-sm",
      idle: "bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-header border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg px-2 py-1.5 text-xl leading-none text-slate-700 hover:bg-slate-100"
            >
              ☰
            </button>
            <button
              type="button"
              onClick={() => setTab("home")}
              className="brand-text text-lg font-extrabold tracking-tight"
            >
              Pocket-Med
            </button>
          </div>
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

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={(t) => setTab(t)} />

      <main className={`tool-stage tool-${tab} flex-1`}>
        {tab === "home" && <HomeScreen onOpen={(t) => setTab(t)} />}
        {tab === "saved" && <SavedScreen />}
        {tab === "pedDose" && <PediatricDosageCalculator />}
        {tab === "growth" && <GrowthCalculator />}
        {tab === "bp" && <BpCentiles />}
        {tab === "crCl" && <CreatinineClearance />}
        {tab === "regimen" && <RegimenAnalyzerUI />}
        {tab === "icu" && <IcuTitration />}
        {tab === "ob" && <ObCalculator />}
      </main>

      <footer className="border-t border-[var(--line)] bg-white px-3 py-4 text-center text-xs leading-relaxed text-[var(--muted)] md:px-6">
        Pocket-Med is a clinical decision-support tool for licensed healthcare
        professionals. It does not replace clinical judgment, diagnosis, or
        emergency care. Verify all doses and plans before prescribing.
      </footer>
    </div>
  );
}
