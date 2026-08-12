type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body: string) => void;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
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
      body: JSON.stringify(req.body ?? {}),
    });

    const text = await groqRes.text();
    res.status(groqRes.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (error) {
    return res.status(502).json({
      error: {
        message: `AI proxy error: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
}
