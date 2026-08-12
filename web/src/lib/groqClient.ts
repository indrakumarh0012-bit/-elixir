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

export async function isGroqConfigured(): Promise<boolean> {
  if (usesServerProxy()) {
    try {
      const res = await fetch(proxyUrl(PROXY_PATH), { method: "GET" });
      if (!res.ok) return false;
      const data = (await res.json()) as { configured?: boolean };
      return data.configured === true;
    } catch {
      return false;
    }
  }
  return Boolean(getGroqApiKey());
}

/** Sync check: can we attempt an AI call (proxy or local dev key)? */
export function canAttemptAiCall(): boolean {
  return usesServerProxy() || Boolean(getGroqApiKey());
}

export async function groqChatCompletion(
  body: GroqChatRequest,
  apiKey?: string,
): Promise<Response> {
  if (usesServerProxy()) {
    return fetch(proxyUrl(PROXY_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const key = apiKey || getGroqApiKey();
  if (!key) {
    if (Capacitor.isNativePlatform()) {
      throw new Error(
        "AI not connected. Tap the setup banner at the top and enter your Netlify site URL (e.g. https://your-app.netlify.app).",
      );
    }
    throw new Error(
      "AI not configured. Add GROQ_API_KEY in Netlify environment variables and redeploy.",
    );
  }

  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function groqErrorMessage(status: number, errText: string): string {
  if (status === 401) {
    return "AI authentication failed. Check GROQ_API_KEY on Netlify and redeploy.";
  }
  if (status === 429) {
    return "AI rate limit reached. Wait a moment and try again.";
  }
  if (status === 503) {
    return "AI not set up yet. Add GROQ_API_KEY in Netlify → Site configuration → Environment variables, then redeploy.";
  }
  return `AI request failed (${status}). ${errText.slice(0, 160)}`;
}
