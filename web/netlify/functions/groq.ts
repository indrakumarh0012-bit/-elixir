const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
  body: JSON.stringify(body),
});

export const handler = async (event: {
  httpMethod: string;
  body?: string | null;
}) => {
  if (event.httpMethod === "GET") {
    return json(200, {
      configured: Boolean(process.env.GROQ_API_KEY?.trim()),
      service: "smart-elixir-groq-proxy",
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return json(503, {
      error: {
        message:
          "AI service is not configured. Owner: add GROQ_API_KEY in hosting settings and redeploy.",
      },
    });
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: event.body ?? "{}",
    });

    const text = await groqRes.text();
    return {
      statusCode: groqRes.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
      body: text,
    };
  } catch (error) {
    return json(502, {
      error: {
        message: `AI proxy error: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
};
