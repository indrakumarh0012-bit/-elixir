import { useEffect, useState } from "react";
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
import ReportIssue from "./components/ReportIssue";
import ToolIcon from "./components/ToolIcon";

type AppTab = MenuTarget;

export default function App() {
  const [tab, setTab] = useState<AppTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  // Inputs marked data-adv="N" jump focus to the next field once N digits
  // are typed, so a full entry never needs a manual tap on the next box.
  useEffect(() => {
    const onInput = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      const adv = Number(el.dataset.adv);
      if (!adv) return;
      if (el.value.replace(/\D/g, "").length < adv) return;
      const scope = el.closest("main") ?? document.body;
      const fields = Array.from(
        scope.querySelectorAll<HTMLElement>("input, select, textarea"),
      ).filter((f) => !f.hasAttribute("disabled"));
      const i = fields.indexOf(el);
      if (i >= 0 && i + 1 < fields.length) fields[i + 1].focus();
    };
    document.addEventListener("input", onInput);
    return () => document.removeEventListener("input", onInput);
  }, []);

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
      active: "bg-blue-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      id: "growth",
      label: "Growth Charts",
      shortLabel: "Growth",
      active: "bg-violet-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      id: "bp",
      label: "Ped-BP",
      shortLabel: "Ped-BP",
      active: "bg-cyan-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      id: "crCl",
      label: "Creatinine Clearance",
      shortLabel: "CrCl",
      active: "bg-teal-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      id: "regimen",
      label: "Polypharm",
      shortLabel: "Polypharm",
      active: "bg-rose-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      id: "icu",
      label: "ICU Titration",
      shortLabel: "ICU",
      active: "bg-orange-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
    {
      id: "ob",
      label: "OB / EDD",
      shortLabel: "OB",
      active: "bg-fuchsia-900 text-white shadow-sm",
      idle: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-header border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 md:px-6">
          <div className="flex shrink-0 items-center gap-2">
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
              className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold tracking-tight text-slate-900"
            >
              <img
                src={`${import.meta.env.BASE_URL}icon.svg`}
                alt=""
                className="h-5 w-5 rounded"
              />
              Pocket-Med
            </button>
          </div>
          <nav className="flex w-full flex-wrap gap-1.5 lg:ml-auto lg:w-auto lg:justify-end" aria-label="Main navigation">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
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
        <ToolIcon id={tab} className="tool-watermark" strokeWidth={1} />
        {tab === "home" && <HomeScreen onOpen={(t) => setTab(t)} />}
        {tab === "saved" && <SavedScreen />}
        {tab === "pedDose" && <PediatricDosageCalculator />}
        {tab === "growth" && <GrowthCalculator />}
        {tab === "bp" && <BpCentiles />}
        {tab === "crCl" && <CreatinineClearance />}
        {tab === "regimen" && <RegimenAnalyzerUI />}
        {tab === "icu" && <IcuTitration />}
        {tab === "ob" && <ObCalculator />}
        {tab === "report" && <ReportIssue />}
      </main>

      <footer className="border-t border-[var(--line)] bg-white px-3 py-4 text-center text-xs leading-relaxed text-[var(--muted)] md:px-6">
        Pocket-Med is a clinical decision-support tool for licensed healthcare
        professionals. It does not replace clinical judgment, diagnosis, or
        emergency care. Verify all doses and plans before prescribing.
      </footer>
    </div>
  );
}
