import { useEffect, useState } from "react";
import { saveGroqApiKey } from "../lib/buildPerforma";
import { isNativeApp, saveApiBaseUrl } from "../lib/apiBase";
import { invalidateServerProxyCache, isGroqConfigured } from "../lib/groqClient";

export default function AiSetupBanner() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [hidden, setHidden] = useState(false);
  const native = isNativeApp();

  const refresh = () => {
    invalidateServerProxyCache();
    void isGroqConfigured().then(setConfigured);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (hidden || configured === null || configured) return null;

  const saveUrl = () => {
    saveApiBaseUrl(urlDraft);
    setUrlDraft("");
    refresh();
  };

  const saveKey = () => {
    saveGroqApiKey(keyDraft);
    setKeyDraft("");
    refresh();
  };

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 md:px-6">
      <div className="mx-auto max-w-7xl space-y-2">
        <p className="font-semibold">One-time AI setup (Summarizer, Books, images)</p>
        {native ? (
          <>
            <p className="text-amber-900">
              Option A: enter your Netlify site URL. Option B: paste your Groq key
              below (saved only on this device).
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://your-app.netlify.app"
                className="min-w-[200px] flex-1 rounded-lg border border-amber-400 px-3 py-2"
              />
              <button
                type="button"
                onClick={saveUrl}
                disabled={!urlDraft.trim().startsWith("http")}
                className="rounded-lg bg-amber-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
              >
                Save URL
              </button>
            </div>
          </>
        ) : (
          <p className="text-amber-900">
            Netlify asking to upgrade? Skip it — paste your free Groq key below.
            It stays on <strong>this device only</strong> (not shared with others).
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="gsk_… from console.groq.com/keys"
            className="min-w-[240px] flex-1 rounded-lg border border-amber-400 px-3 py-2"
          />
          <button
            type="button"
            onClick={saveKey}
            disabled={!keyDraft.trim().startsWith("gsk_")}
            className="rounded-lg bg-amber-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Save Groq key
          </button>
        </div>
        <p className="text-xs text-amber-800">
          Get a free key:{" "}
          <a
            href="https://console.groq.com/keys"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            console.groq.com/keys
          </a>
        </p>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-xs text-amber-800 underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
