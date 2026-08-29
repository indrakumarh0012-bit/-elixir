import {
  GROQ_URL,
  MAX_BODY_BYTES,
  clientIp,
  errorBody,
  originRejected,
  rateLimited,
  sanitizeRequest,
} from "../../shared/groqProxy";

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: RESPONSE_HEADERS,
  body: JSON.stringify(body),
});

export const handler = async (event: {
  httpMethod: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
}) => {
  const headers = event.headers ?? {};

  if (event.httpMethod === "GET") {
    return json(200, {
      configured: Boolean(process.env.GROQ_API_KEY?.trim()),
      service: "smart-elixir-groq-proxy",
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, errorBody("Method not allowed"));
  }

  if (originRejected(headers["origin"])) {
    return json(403, errorBody("Origin not allowed."));
  }

  if (rateLimited(clientIp(headers))) {
    return json(
      429,
      errorBody("Too many AI requests. Wait a few minutes and try again."),
    );
  }

  const rawBody = event.body ?? "";
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json(413, errorBody("Request too large."));
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return json(
      503,
      errorBody(
        "AI service is not configured. Owner: add GROQ_API_KEY in hosting settings and redeploy.",
      ),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody || "{}");
  } catch {
    return json(400, errorBody("Request body is not valid JSON."));
  }

  const sanitized = sanitizeRequest(parsed);
  if (!sanitized.ok) return json(400, errorBody(sanitized.message));

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitized.body),
    });

    return {
      statusCode: groqRes.status,
      headers: RESPONSE_HEADERS,
      body: await groqRes.text(),
    };
  } catch (error) {
    return json(
      502,
      errorBody(
        `AI proxy error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
};
