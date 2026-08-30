import { useState, useSyncExternalStore } from "react";
import {
  getCurrentProfile,
  getVersion,
  signIn,
  signOut,
  signUp,
  subscribe,
} from "../lib/accounts";
import ToolIcon, { TOOL_TEXT } from "./ToolIcon";

export type MenuTarget =
  | "home" | "pedDose" | "growth" | "bp" | "bmi" | "crCl" | "regimen" | "icu" | "insulin" | "ob" | "saved" | "report";

const LINK_GROUPS: {
  heading: string | null;
  links: { id: MenuTarget; label: string }[];
}[] = [
  { heading: null, links: [{ id: "home", label: "Home" }] },
  {
    heading: "Medicine",
    links: [
      { id: "crCl", label: "Creatinine Clearance" },
      { id: "insulin", label: "Insulin" },
      { id: "icu", label: "ICU Titration" },
      { id: "regimen", label: "Polypharm" },
      { id: "bmi", label: "BMI" },
    ],
  },
  {
    heading: "Pediatrics",
    links: [
      { id: "pedDose", label: "Ped Dose Calculator" },
      { id: "growth", label: "Growth Charts" },
      { id: "bp", label: "Ped-BP" },
    ],
  },
  { heading: "OBG", links: [{ id: "ob", label: "OB / EDD" }] },
  {
    heading: null,
    links: [
      { id: "saved", label: "Saved Calculations" },
      { id: "report", label: "Report an Issue" },
    ],
  },
];

const inputCls =
  "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500";

export default function SideMenu({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (t: MenuTarget) => void;
}) {
  useSyncExternalStore(subscribe, getVersion);
  const profile = getCurrentProfile();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const result =
      mode === "signup"
        ? await signUp("", phone, password)
        : await signIn(phone, password);
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setPhone("");
    setPassword("");
    setMode("signin");
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-slate-900/40"
      />
      <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Pocket-Med" className="h-10 w-auto" />
        </div>
        <nav className="flex-1 p-2">
          {LINK_GROUPS.map((group, gi) => (
            <div key={group.heading ?? `group-${gi}`} className="mb-1 last:mb-0">
              {group.heading && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {group.heading}
                </p>
              )}
              {group.links.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onNavigate(l.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <ToolIcon id={l.id} className={`h-4.5 w-4.5 ${TOOL_TEXT[l.id]}`} /> {l.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          {profile ? (
            <>
              <p className="text-sm font-bold text-slate-900">{profile.phone}</p>
              {profile.name !== profile.phone && (
                <p className="text-xs text-slate-600">{profile.name}</p>
              )}
              <button
                type="button"
                onClick={signOut}
                className="mt-2 text-xs font-semibold text-rose-700 underline"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErr(null); }}
                  className={`flex-1 rounded-md px-2 py-1.5 ${mode === "signin" ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErr(null); }}
                  className={`flex-1 rounded-md px-2 py-1.5 ${mode === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
                >
                  Sign up
                </button>
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                inputMode="tel"
                className={inputCls}
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Password (min 6 digits)" : "Password"}
                type="password"
                inputMode="numeric"
                className={inputCls}
              />
              {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">
                Accounts and saved calculations stay on this device.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
