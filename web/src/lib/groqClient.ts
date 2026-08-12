import { Capacitor } from "@capacitor/core";
import { getGroqApiKey } from "./buildPerforma";
import { getApiBaseUrl, usesServerProxy } from "./apiBase";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const PROXY_PATH = "/api/groq";

export type GroqChatRequest = {
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
};

function proxyUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

let cachedServerConfigured: boolean | undefined;

export function invalidateServerProxyCache(): void {
  cachedServerConfigured = undefined;
}

async function isServerProxyConfigured(): Promise<boolean> {
  if (!usesServerProxy()) return false;
  if (cachedServerConfigured !== undefined) return cachedServerConfigured;
  try {
    const res = await fetch(proxyUrl(PROXY_PATH), { method: "GET" });
    if (!res.ok) {
      cachedServerConfigured = false;
      return false;
    }
    const data = (await res.json()) as { configured?: boolean };
    cachedServerConfigured = data.configured === true;
    return cachedServerConfigured;
  } catch {
    cachedServerConfigured = false;
    return false;
  }
}

export async function isGroqConfigured(): Promise<boolean> {
  if (await isServerProxyConfigured()) return true;
  return Boolean(getGroqApiKey());
}

/** Sync check: can we attempt an AI call (saved key or possible server proxy)? */
export function canAttemptAiCall(): boolean {
  return Boolean(getGroqApiKey()) || usesServerProxy();
}

export async function groqChatCompletion(
  body: GroqChatRequest,
  apiKey?: string,
): Promise<Response> {
  const key = apiKey || getGroqApiKey();
  if (key) {
    return fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  if (usesServerProxy() && (await isServerProxyConfigured())) {
    return fetch(proxyUrl(PROXY_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  throw new Error(
    Capacitor.isNativePlatform()
      ? "AI not connected. Paste your Groq key in the setup box (gsk_…)."
      : "AI not connected. Scroll up and paste your Groq key in the setup box (starts with gsk_).",
  );
}

export function groqErrorMessage(status: number, errText: string): string {
  if (status === 401) {
    return "Groq key rejected. Paste a fresh key from console.groq.com in the yellow setup banner.";
  }
  if (status === 429) {
    return "AI rate limit reached. Wait a moment and try again.";
  }
  if (status === 503) {
    return "Server AI not configured. Paste your Groq key in the yellow banner — works without Netlify upgrade.";
  }
  return `AI request failed (${status}). ${errText.slice(0, 160)}`;
}
