/**
 * Platform-agnostic guards for the Groq proxy.
 *
 * The proxy calls Groq with the *site owner's* key, so an unguarded endpoint is
 * an open relay that anyone can point at their own workload. Shared by the
 * Netlify function and the Vercel route so the two cannot drift apart.
 */

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Models the client is allowed to ask for. Keep in sync with src/lib/. */
const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
]);

/** Vision data URLs are capped at 280k chars client-side; this leaves headroom. */
export const MAX_BODY_BYTES = 512_000;
const MAX_COMPLETION_TOKENS = 4096;
const MAX_MESSAGES = 12;
const MAX_CONTENT_PARTS = 8;

const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

export const errorBody = (message: string) => ({ error: { message } });

function allowedOrigins(): string[] {
  return [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
  ]
    .map((o) => o?.trim().replace(/\/$/, ""))
    .filter((o): o is string => Boolean(o));
}

/**
 * A real browser cannot forge Origin, so this stops other sites from driving
 * this endpoint. It is *not* a defence against curl — the schema, token and
 * rate limits are what bound the damage there. Requests with no Origin at all
 * (the Capacitor app, non-browser clients) are allowed through to the rest.
 */
export function originRejected(origin: string | undefined): boolean {
  const value = origin?.trim().replace(/\/$/, "");
  if (!value) return false;
  const allowed = allowedOrigins();
  if (allowed.length === 0) return false; // unconfigured: rely on the other limits
  return !allowed.includes(value);
}

/**
 * Best-effort per-instance throttle. Netlify/Vercel may run several instances,
 * so this bounds sustained abuse from one IP rather than guaranteeing a global cap.
 */
export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_MAX_REQUESTS;
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function sanitizeContent(content: unknown): string | ContentPart[] | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content) || content.length > MAX_CONTENT_PARTS) return null;

  const parts: ContentPart[] = [];
  for (const raw of content) {
    if (!raw || typeof raw !== "object") return null;
    const part = raw as Record<string, unknown>;
    if (part.type === "text" && typeof part.text === "string") {
      parts.push({ type: "text", text: part.text });
      continue;
    }
    if (part.type === "image_url") {
      const url = (part.image_url as { url?: unknown } | undefined)?.url;
      // data: URLs only — never let a caller point Groq at an arbitrary host.
      if (typeof url !== "string" || !url.startsWith("data:image/")) return null;
      parts.push({ type: "image_url", image_url: { url } });
      continue;
    }
    return null;
  }
  return parts;
}

export type SanitizeResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; message: string };

/**
 * Rebuild the upstream request from scratch, so unknown keys (tools, n, stream,
 * …) can never reach Groq on the owner's key.
 */
export function sanitizeRequest(raw: unknown): SanitizeResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const req = raw as Record<string, unknown>;

  const model = typeof req.model === "string" ? req.model : "";
  if (!ALLOWED_MODELS.has(model)) {
    return { ok: false, message: `Model not allowed: ${model || "(missing)"}` };
  }

  if (!Array.isArray(req.messages) || req.messages.length === 0) {
    return { ok: false, message: "messages must be a non-empty array." };
  }
  if (req.messages.length > MAX_MESSAGES) {
    return { ok: false, message: "Too many messages." };
  }

  const messages: { role: string; content: string | ContentPart[] }[] = [];
  for (const entry of req.messages) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, message: "Malformed message." };
    }
    const { role, content } = entry as Record<string, unknown>;
    if (role !== "system" && role !== "user" && role !== "assistant") {
      return { ok: false, message: `Role not allowed: ${String(role)}` };
    }
    const clean = sanitizeContent(content);
    if (clean === null) return { ok: false, message: "Malformed message content." };
    messages.push({ role, content: clean });
  }

  const body: Record<string, unknown> = { model, messages };

  if (typeof req.temperature === "number" && Number.isFinite(req.temperature)) {
    body.temperature = Math.min(2, Math.max(0, req.temperature));
  }
  if (typeof req.max_tokens === "number" && Number.isFinite(req.max_tokens)) {
    body.max_tokens = Math.min(
      MAX_COMPLETION_TOKENS,
      Math.max(1, Math.floor(req.max_tokens)),
    );
  } else {
    body.max_tokens = MAX_COMPLETION_TOKENS;
  }

  return { ok: true, body };
}

/** First client IP from the platform's proxy headers. */
export function clientIp(headers: Record<string, string | undefined>): string {
  return (
    headers["x-nf-client-connection-ip"] ??
    headers["x-real-ip"] ??
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    "unknown"
  );
}
