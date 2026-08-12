import { useState } from "react";
import { getGroqApiKey, saveGroqApiKey } from "../lib/buildPerforma";
import { invalidateServerProxyCache } from "../lib/groqClient";

type Props = {
  compact?: boolean;
};

/** Visible Groq key entry — shown until a key is saved on this device. */
export default function GroqKeySetupCard({ compact = false }: Props) {
  const [keyDraft, setKeyDraft] = useState("");
  const [ready, setReady] = useState(() => Boolean(getGroqApiKey()));
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveGroqApiKey(keyDraft);
    invalidateServerProxyCache();
    setKeyDraft("");
    setReady(Boolean(getGroqApiKey()));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  if (ready) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 print:hidden">
        AI connected on this device.
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-2 border-amber-400 bg-amber-50 print:hidden ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-base font-bold text-amber-950">
        Step 1 — Paste your Groq API key (one time)
      </p>
      <p className="mt-1 text-sm text-amber-900">
        Get a free key at{" "}
        <a
          href="https://console.groq.com/keys"
          className="font-semibold underline"
          target="_blank"
          rel="noreferrer"
        >
          console.groq.com/keys
        </a>
        . Saved only on this phone. No Netlify upgrade needed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="password"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          placeholder="gsk_…"
          className="min-w-[220px] flex-1 rounded-lg border border-amber-500 bg-white px-3 py-2.5 text-sm"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={save}
          disabled={!keyDraft.trim().startsWith("gsk_")}
          className="rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save key
        </button>
      </div>
      {saved && (
        <p className="mt-2 text-sm font-semibold text-emerald-800">
          Saved — try Summarizer or Books now.
        </p>
      )}
    </div>
  );
}
