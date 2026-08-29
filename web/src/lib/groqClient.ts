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

/**
 * Analysing one record fans out into ~30 calls. Fired all at once they blow
 * straight through Groq's per-minute limits, every one comes back 429, and the
 * performa silently falls back to generic text. Two at a time with backoff on
 * 429 keeps the whole batch inside the budget instead.
 */
const MAX_CONCURRENT = 2;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1500;

let active = 0;
const waiting: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiting.push(() => {
      active += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  active -= 1;
  waiting.shift()?.();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Honour Retry-After when Groq sends it, else exponential backoff. */
function retryDelayMs(res: Response, attempt: number): number {
  const header = res.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 20_000);
  }
  return BASE_BACKOFF_MS * 2 ** attempt;
}

async function sendWithRetry(send: () => Promise<Response>): Promise<Response> {
  let res = await send();
  for (let attempt = 0; res.status === 429 && attempt < MAX_RETRIES; attempt++) {
    const delay = retryDelayMs(res, attempt);
    // Drain the body so the connection is not left hanging.
    await res.text().catch(() => "");
    await sleep(delay);
    res = await send();
  }
  return res;
}

export async function groqChatCompletion(
  body: GroqChatRequest,
  apiKey?: string,
): Promise<Response> {
  const key = apiKey || getGroqApiKey();
  if (key) {
    await acquireSlot();
    try {
      return await sendWithRetry(() =>
        fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
      );
    } finally {
      releaseSlot();
    }
  }

  if (usesServerProxy() && (await isServerProxyConfigured())) {
    await acquireSlot();
    try {
      return await sendWithRetry(() =>
        fetch(proxyUrl(PROXY_PATH), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    } finally {
      releaseSlot();
    }
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
