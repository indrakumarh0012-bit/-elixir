import { useState, useSyncExternalStore } from "react";
import {
  getCurrentProfile,
  getVersion,
  saveCalculation,
  subscribe,
} from "../lib/accounts";

export default function SaveButton({
  tool,
  build,
}: {
  tool: string;
  /** Return null when there is nothing meaningful to save yet. */
  build: () => { title: string; detail: string } | null;
}) {
  useSyncExternalStore(subscribe, getVersion);
  const profile = getCurrentProfile();
  const [flash, setFlash] = useState<string | null>(null);

  const onSave = () => {
    const payload = build();
    if (!payload) {
      setFlash("Nothing to save yet — complete the calculation first.");
    } else if (!profile) {
      setFlash("Sign in from the ☰ menu to save to your account.");
    } else if (saveCalculation(tool, payload.title, payload.detail)) {
      setFlash(`Saved to ${profile.name}'s account ✓`);
    }
    window.setTimeout(() => setFlash(null), 2600);
  };

  return (
    <div className="mt-4 print:hidden">
      <button
        type="button"
        onClick={onSave}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        💾 Save this calculation
      </button>
      {flash && <p className="mt-1.5 text-xs font-medium text-slate-600">{flash}</p>}
    </div>
  );
}
