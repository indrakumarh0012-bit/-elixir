import { useEffect, useState } from "react";
import { isNativeApp, saveApiBaseUrl } from "../lib/apiBase";
import { isGroqConfigured } from "../lib/groqClient";

export default function AiSetupBanner() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [hidden, setHidden] = useState(false);
  const native = isNativeApp();

  const refresh = () => {
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

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 md:px-6">
      <div className="mx-auto max-w-7xl space-y-2">
        <p className="font-semibold">
          {native
            ? "One-time setup — connect AI (Summarizer & Books)"
            : "AI not configured on this site"}
        </p>
        {native ? (
          <>
            <p>
              Enter the Netlify URL where Smart-Elixir is hosted. You only do
              this once — then Summarizer, image upload, and Books all work.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://your-app.netlify.app"
                className="min-w-[240px] flex-1 rounded-lg border border-amber-400 px-3 py-2"
              />
              <button
                type="button"
                onClick={saveUrl}
                disabled={!urlDraft.trim().startsWith("http")}
                className="rounded-lg bg-amber-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                Save & connect
              </button>
            </div>
          </>
        ) : (
          <p>
            Owner: Netlify → <strong>Site configuration</strong> →{" "}
            <strong>Environment variables</strong> → add{" "}
            <code className="rounded bg-amber-100 px-1">GROQ_API_KEY</code> →{" "}
            <strong>Trigger deploy</strong>. Get a free key at{" "}
            <a
              href="https://console.groq.com/keys"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              console.groq.com
            </a>
            .
          </p>
        )}
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
