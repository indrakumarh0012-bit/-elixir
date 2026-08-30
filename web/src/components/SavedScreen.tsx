import { useSyncExternalStore } from "react";
import {
  deleteEntry,
  getCurrentProfile,
  getEntries,
  getVersion,
  subscribe,
} from "../lib/accounts";

export default function SavedScreen() {
  useSyncExternalStore(subscribe, getVersion);
  const profile = getCurrentProfile();
  const entries = getEntries();

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Saved Calculations</h2>
      {!profile ? (
        <p className="mt-2 text-sm text-slate-600">
          Sign in from the ☰ menu to save and view your calculations.
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          Nothing saved yet — use “💾 Save this calculation” inside any tool.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">
                  {e.title}
                </p>
                <span className="text-[11px] uppercase tracking-wide text-slate-400">{e.tool}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{e.detail}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <button
                  type="button"
                  onClick={() => deleteEntry(e.id)}
                  className="text-xs font-semibold text-rose-700 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
