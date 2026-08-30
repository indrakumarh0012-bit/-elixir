import { useState, useSyncExternalStore } from "react";
import {
  getCurrentProfile,
  getVersion,
  signIn,
  signOut,
  signUp,
  subscribe,
} from "../lib/accounts";

export type MenuTarget =
  | "home" | "pedDose" | "growth" | "bp" | "crCl" | "regimen" | "icu" | "ob" | "saved" | "report";

const LINKS: { id: MenuTarget; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "pedDose", label: "Ped Dose Calculator", icon: "🧒" },
  { id: "growth", label: "Growth Charts", icon: "📈" },
  { id: "bp", label: "Ped-BP", icon: "🫀" },
  { id: "crCl", label: "Creatinine Clearance", icon: "🫘" },
  { id: "regimen", label: "Polypharmacy", icon: "💊" },
  { id: "icu", label: "ICU Titration", icon: "🏥" },
  { id: "ob", label: "OB / EDD", icon: "🤰" },
  { id: "saved", label: "Saved Calculations", icon: "📁" },
  { id: "report", label: "Report an Issue", icon: "🛠️" },
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
  const [name, setName] = useState("");
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
        ? await signUp(name, phone, password)
        : await signIn(phone, password);
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setName("");
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
        <div className="border-b border-slate-200 p-4">
          <p className="brand-text text-lg font-extrabold">Pocket-Med</p>
          <p className="text-xs text-slate-600">Clinical calculators &amp; checks</p>
        </div>
        <nav className="flex-1 p-2">
          {LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onNavigate(l.id);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              <span aria-hidden>{l.icon}</span> {l.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          {profile ? (
            <>
              <p className="text-sm font-bold text-slate-900">{profile.name}</p>
              <p className="text-xs text-slate-600">{profile.phone}</p>
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
              {mode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputCls}
                />
              )}
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
                placeholder="Password"
                type="password"
                className={inputCls}
              />
              {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">
                Accounts and saved calculations stay on this device only — the
                password protects them locally. Google / Apple sign-in and OTP
                need a server backend and are not offered yet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
