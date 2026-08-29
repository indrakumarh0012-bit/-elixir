import {
  GROQ_URL,
  MAX_BODY_BYTES,
  clientIp,
  errorBody,
  originRejected,
  rateLimited,
  sanitizeRequest,
} from "../shared/groqProxy";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body: string) => void;
};

/** Vercel may hand back a header as string[]; the proxy only wants the first. */
function flatten(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    out[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "GET") {
    return res.status(200).json({
      configured: Boolean(process.env.GROQ_API_KEY?.trim()),
      service: "smart-elixir-groq-proxy",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json(errorBody("Method not allowed"));
  }

  const headers = flatten(req.headers);

  if (originRejected(headers["origin"])) {
    return res.status(403).json(errorBody("Origin not allowed."));
  }

  if (rateLimited(clientIp(headers))) {
    return res
      .status(429)
      .json(errorBody("Too many AI requests. Wait a few minutes and try again."));
  }

  // Vercel parses JSON bodies for us, so measure the re-serialised size.
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return res.status(413).json(errorBody("Request too large."));
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json(
      errorBody(
        "AI service is not configured. Owner: add GROQ_API_KEY in hosting settings and redeploy.",
      ),
    );
  }

  let parsed: unknown = req.body;
  if (typeof req.body === "string") {
    try {
      parsed = JSON.parse(req.body || "{}");
    } catch {
      return res.status(400).json(errorBody("Request body is not valid JSON."));
    }
  }

  const sanitized = sanitizeRequest(parsed);
  if (!sanitized.ok) return res.status(400).json(errorBody(sanitized.message));

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitized.body),
    });

    const text = await groqRes.text();
    res.status(groqRes.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (error) {
    return res.status(502).json(
      errorBody(
        `AI proxy error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}
