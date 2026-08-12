import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    if (installed) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  if (installed || hidden) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="border-b border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-950 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          Install <strong>Smart-Elixir</strong> on this device for quick access
          (works offline for calculators).
        </p>
        <div className="flex flex-wrap gap-2">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
            >
              Install app
            </button>
          ) : (
            <span className="text-xs text-blue-800">
              Chrome: menu (⋮) → <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>
            </span>
          )}
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="rounded-lg px-2 py-1.5 text-blue-700 hover:bg-blue-100"
            aria-label="Dismiss install banner"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
