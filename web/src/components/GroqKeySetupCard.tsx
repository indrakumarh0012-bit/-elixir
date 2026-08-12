import { useState } from "react";
import { getGroqApiKey, saveGroqApiKey } from "../lib/buildPerforma";
import { invalidateServerProxyCache } from "../lib/groqClient";

type Props = {
  /** Sticky bar at top of Summarizer */
  variant?: "panel" | "compact";
};

/**
 * One-time Groq API key — saved in this browser/phone (localStorage).
 * Enter once; Summarizer, Books, and image upload use it automatically.
 */
export default function GroqKeySetupCard({ variant = "panel" }: Props) {
  const [keyDraft, setKeyDraft] = useState("");
  const [savedKey, setSavedKey] = useState(() => getGroqApiKey());
  const [editing, setEditing] = useState(() => !getGroqApiKey());
  const [message, setMessage] = useState<string | null>(null);

  const save = () => {
    const trimmed = keyDraft.trim();
    if (!trimmed.startsWith("gsk_")) {
      setMessage("Key must start with gsk_");
      return;
    }
    saveGroqApiKey(trimmed);
    invalidateServerProxyCache();
    setSavedKey(trimmed);
    setKeyDraft("");
    setEditing(false);
    setMessage("API key saved on this device — you won't need to enter it again.");
    window.setTimeout(() => setMessage(null), 4000);
  };

  const remove = () => {
    saveGroqApiKey("");
    invalidateServerProxyCache();
    setSavedKey("");
    setEditing(true);
    setMessage("API key removed. Paste a new key when ready.");
  };

  if (!editing && savedKey) {
    return (
      <div
        className={`print:hidden ${
          variant === "panel"
            ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
            : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-emerald-900">
            Groq API key saved on this device
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setKeyDraft("");
            }}
            className="text-xs font-semibold text-emerald-800 underline"
          >
            Change key
          </button>
        </div>
        {message && (
          <p className="mt-1 text-xs text-emerald-800">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`print:hidden ${
        variant === "panel"
          ? "rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm"
          : "rounded-lg border-2 border-amber-400 bg-amber-50 p-3"
      }`}
    >
      <h2 className="text-lg font-bold text-amber-950">
        Groq API key — enter once
      </h2>
      <p className="mt-1 text-sm text-amber-900">
        Paste your free key below and tap <strong>Save</strong>. It stays on
        this phone/browser — Summarizer, Books, and image upload work without
        entering it again.
      </p>
      <p className="mt-1 text-xs text-amber-800">
        Get a key:{" "}
        <a
          href="https://console.groq.com/keys"
          className="font-semibold underline"
          target="_blank"
          rel="noreferrer"
        >
          console.groq.com/keys
        </a>
      </p>

      <label className="mt-4 block text-sm font-semibold text-amber-950">
        API key
        <input
          type="password"
          name="groq-api-key"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          placeholder="gsk_xxxxxxxxxxxxxxxx"
          className="mt-2 w-full rounded-lg border-2 border-amber-500 bg-white px-4 py-3 text-base font-mono shadow-inner outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-300"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!keyDraft.trim().startsWith("gsk_")}
          className="rounded-lg bg-amber-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-950 disabled:opacity-50"
        >
          Save API key
        </button>
        {savedKey && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setKeyDraft("");
            }}
            className="rounded-lg border border-amber-600 px-4 py-2.5 text-sm font-semibold text-amber-900"
          >
            Cancel
          </button>
        )}
        {savedKey && editing && (
          <button
            type="button"
            onClick={remove}
            className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-800"
          >
            Remove saved key
          </button>
        )}
      </div>

      {message && (
        <p
          className={`mt-2 text-sm font-semibold ${
            message.includes("saved") ? "text-emerald-800" : "text-red-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
