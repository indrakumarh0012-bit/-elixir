import { useEffect, useState } from "react";
import { getGroqApiKey } from "../lib/buildPerforma";
import { isNativeApp, saveApiBaseUrl } from "../lib/apiBase";
import GroqKeySetupCard from "./GroqKeySetupCard";

export default function AiSetupBanner() {
  const [hasKey, setHasKey] = useState(() => Boolean(getGroqApiKey()));
  const [urlDraft, setUrlDraft] = useState("");
  const [hidden, setHidden] = useState(false);
  const native = isNativeApp();

  useEffect(() => {
    setHasKey(Boolean(getGroqApiKey()));
  }, []);

  if (hidden || hasKey) return null;

  return (
    <div className="border-b-4 border-amber-500 bg-amber-100 px-3 py-3 md:px-6">
      <div className="mx-auto max-w-7xl space-y-3">
        {native && (
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="Or paste Netlify URL (optional)"
              className="min-w-[200px] flex-1 rounded-lg border border-amber-400 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                saveApiBaseUrl(urlDraft);
                setUrlDraft("");
              }}
              disabled={!urlDraft.trim().startsWith("http")}
              className="rounded-lg bg-amber-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save URL
            </button>
          </div>
        )}
        <GroqKeySetupCard variant="compact" />
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-xs text-amber-900 underline"
        >
          Dismiss banner
        </button>
      </div>
    </div>
  );
}
