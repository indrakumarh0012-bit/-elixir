import { useState, useSyncExternalStore } from "react";
import {
  createProfile,
  getCurrentProfile,
  getProfiles,
  getVersion,
  signOut,
  subscribe,
  switchProfile,
} from "../lib/accounts";

export type MenuTarget =
  | "home" | "pedDose" | "growth" | "bp" | "crCl" | "regimen" | "icu" | "ob" | "saved";

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
];

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
  const profiles = getProfiles();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const signIn = () => {
    const p = createProfile(name, phone);
    if (!p) {
      setErr("Enter a name and a valid phone number (8–15 digits).");
      return;
    }
    setErr(null);
    setName("");
    setPhone("");
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
          <p className="text-xs text-slate-500">Clinical calculators &amp; checks</p>
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
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              <span aria-hidden>{l.icon}</span> {l.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          {profile ? (
            <>
              <p className="text-sm font-bold text-slate-900">{profile.name}</p>
              <p className="text-xs text-slate-500">{profile.phone}</p>
              {profiles.length > 1 && (
                <select
                  value={profile.id}
                  onChange={(e) => switchProfile(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.phone}
                    </option>
                  ))}
                </select>
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
              <p className="text-sm font-bold text-slate-900">Sign in / Sign up</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                inputMode="tel"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
              <button
                type="button"
                onClick={signIn}
                className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue
              </button>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                Your account and saved calculations stay on this device only.
                OTP verification arrives when a server backend is connected.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
