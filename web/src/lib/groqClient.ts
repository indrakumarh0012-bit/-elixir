import { Capacitor } from "@capacitor/core";
import { getGroqApiKey } from "./buildPerforma";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const PROXY_PATH = "/api/groq";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.replace(/\/$/, "") ?? "";

export type GroqChatRequest = {
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
};

function proxyUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function shouldUseServerProxy(): boolean {
  if (API_BASE) return true;
  if (Capacitor.isNativePlatform()) return false;
  return import.meta.env.PROD;
}

export async function isGroqConfigured(): Promise<boolean> {
  if (shouldUseServerProxy()) {
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

export async function groqChatCompletion(
  body: GroqChatRequest,
  apiKey?: string,
): Promise<Response> {
  if (shouldUseServerProxy()) {
    return fetch(proxyUrl(PROXY_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const key = apiKey || getGroqApiKey();
  if (!key) {
    throw new Error(
      "AI key not set. Build the APK with VITE_API_BASE_URL pointing to your hosted backend, or save a Groq key in local dev.",
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
    return "AI authentication failed. Owner: check GROQ_API_KEY on the hosted backend.";
  }
  if (status === 429) {
    return "AI rate limit reached. Wait a moment and try again, or upgrade your Groq plan.";
  }
  if (status === 503) {
    return "AI service is not configured yet. Owner: deploy backend with GROQ_API_KEY.";
  }
  return `AI request failed (${status}). ${errText.slice(0, 160)}`;
}
