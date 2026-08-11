import {
  SYSTEM_EXTRACTION_PROMPT,
  USER_EXTRACTION_PREFIX,
} from "../summary/extractionPrompt";
import { parsePatientSummariesJson } from "../summary/parsePatientSummary";
import type { PatientSummary } from "../summary/types";
import { stripModelThinking } from "./stripModelThinking";
import { enrichPatientFromTextbooks } from "./textbookClinical";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function getGroqApiKey(): string {
  const fromEnv = (import.meta.env.VITE_GROQ_API_KEY as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem("SMART_ELIXIR_GROQ_KEY")?.trim() || "";
  } catch {
    return "";
  }
}

export function saveGroqApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem("SMART_ELIXIR_GROQ_KEY", key.trim());
    else localStorage.removeItem("SMART_ELIXIR_GROQ_KEY");
  } catch {
    /* ignore */
  }
}

/**
 * Analyze notes/PDF text → one or more patient performas,
 * then fill MOA / pathophysiology / treatment critique from specialty textbooks.
 */
export async function analyzeNotesToPerforma(
  notes: string,
  specialty = "General Medicine",
): Promise<
  | { ok: true; patients: PatientSummary[] }
  | { ok: false; error: string }
> {
  const text = notes.trim();
  if (!text) {
    return {
      ok: false,
      error: "No clinical text to analyze. Upload a PDF with extractable text.",
    };
  }

  const key = getGroqApiKey();
  if (!key) {
    return {
      ok: false,
      error:
        "AI key not set. Owner: save Groq key once below, then upload again.",
    };
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_EXTRACTION_PROMPT },
          {
            role: "user",
            content: USER_EXTRACTION_PREFIX + text.slice(0, 28000),
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) {
        return {
          ok: false,
          error: "Invalid Groq API key. Update the key once and try again.",
        };
      }
      return {
        ok: false,
        error: `Analysis failed (${res.status}). ${errText.slice(0, 160)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = stripModelThinking(
      data.choices?.[0]?.message?.content ?? "",
    );
    const parsed = parsePatientSummariesJson(content);
    if (!parsed.ok) {
      return {
        ok: false,
        error: "Could not structure the summary. Try again or paste clearer notes.",
      };
    }
    const enriched = await Promise.all(
      parsed.patients.map((p) => enrichPatientFromTextbooks(p, specialty)),
    );
    return { ok: true, patients: enriched };
  } catch (e) {
    return {
      ok: false,
      error: `Network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
