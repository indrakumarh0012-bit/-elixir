import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = "SMART_ELIXIR_API_BASE";

/** Hosted backend URL (Netlify/Vercel). Used by the native APK for AI calls. */
export function getApiBaseUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_API_BASE_URL as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (Capacitor.isNativePlatform()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)?.trim();
      if (stored) return stored.replace(/\/$/, "");
    } catch {
      /* ignore */
    }
  }

  return "";
}

export function saveApiBaseUrl(url: string): void {
  const trimmed = url.trim().replace(/\/$/, "");
  try {
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when AI calls go through /api/groq on a hosted backend (no user API key). */
export function usesServerProxy(): boolean {
  if (getApiBaseUrl()) return true;
  if (Capacitor.isNativePlatform()) return false;
  return import.meta.env.PROD;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
