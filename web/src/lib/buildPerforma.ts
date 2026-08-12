import {
  SYSTEM_EXTRACTION_PROMPT,
  USER_EXTRACTION_PREFIX,
} from "../summary/extractionPrompt";
import { parsePatientSummariesJson } from "../summary/parsePatientSummary";
import type { PatientSummary } from "../summary/types";
import { groqChatCompletion, groqErrorMessage, isGroqConfigured } from "./groqClient";
import { stripModelThinking } from "./stripModelThinking";
import { enrichPatientFromTextbooks } from "./textbookClinical";

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

  if (!(await isGroqConfigured())) {
    return {
      ok: false,
      error:
        "AI not connected. Paste your Groq key once in the yellow banner at the top (free from console.groq.com).",
    };
  }

  try {
    const res = await groqChatCompletion({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_EXTRACTION_PROMPT },
        {
          role: "user",
          content: USER_EXTRACTION_PREFIX + text.slice(0, 28000),
        },
      ],
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        error: groqErrorMessage(res.status, errText),
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
