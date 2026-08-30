import { useState, useSyncExternalStore } from "react";
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
  const entries = [...getEntries()].sort((a, b) => b.at - a.at);
  const [openId, setOpenId] = useState<string | null>(null);

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
        <>
          <p className="mt-1 text-xs text-slate-500">
            Newest first — tap a calculation to open its full detail.
          </p>
          <ul className="mt-3 space-y-2">
            {entries.map((e, i) => {
              const open = openId === e.id;
              return (
                <li key={e.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : e.id)}
                    className="flex w-full items-start justify-between gap-2 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {entries.length - i}. {e.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(e.at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {e.tool}
                      </span>
                      <span className="text-slate-400" aria-hidden>
                        {open ? "▾" : "▸"}
                      </span>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                        {e.detail
                          .split(/\s+[·|]\s+/)
                          .filter((part) => part.trim().length > 0)
                          .map((part, j) => (
                            <li key={j} className="whitespace-pre-wrap">{part.trim()}</li>
                          ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          Saved on{" "}
                          {new Date(e.at).toLocaleString("en-IN", {
                            dateStyle: "full",
                            timeStyle: "medium",
                          })}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteEntry(e.id)}
                          className="text-xs font-semibold text-rose-700 underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
