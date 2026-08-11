import { citeBook } from "../data/textbookEditions";
import type { MedicalTextbook } from "../data/medicalBooksDB";
import { getGroqApiKey } from "./buildPerforma";
import { stripModelThinking } from "./stripModelThinking";
import { stripReferLanguage } from "./textbookClinicalShared";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const MODELS = [
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
] as const;

const RULES = `You teach from ONE named latest-edition textbook.
WRITE detailed authentic clinical content (mechanisms, diagnosis approach, key management principles, red flags, monitoring).
FORBIDDEN as a substitute for content: "refer to", "see chapter", "consult the book", "confirm in", "read the textbook", "this is only a scaffold".
You MAY end with one line: Ref: <exact book citation>.
Use conservative textbook consensus only. Do not invent page numbers, trials, or rare unverified claims.
English digits. No markdown asterisks or dash bullets — use numbered points.`;

async function chat(system: string, user: string): Promise<string> {
  const key = getGroqApiKey();
  if (!key) {
    throw new Error("AI key not set. Save Groq key once in Summarizer, then try again.");
  }

  let last = "No model available.";
  for (const model of MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_tokens: 3200,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (res.status === 404) {
        last = `Model ${model} unavailable.`;
        continue;
      }
      if (!res.ok) {
        last = await res.text();
        if (res.status === 401 || res.status === 429) {
          throw new Error(last.slice(0, 180));
        }
        continue;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = stripModelThinking(
        data.choices?.[0]?.message?.content ?? "",
      );
      if (text) return text;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      if (last.includes("401") || last.includes("AI key")) {
        throw e instanceof Error ? e : new Error(last);
      }
    }
  }
  throw new Error(last.slice(0, 200));
}

function looksEmptyOrRefer(text: string): boolean {
  const body = text.toLowerCase().replace(/ref:\s*[^\n]+/gi, "");
  return (
    body.trim().length < 120 ||
    /refer (to|the)|see (the )?(chapter|textbook|book)|connect your groq|scaffold only|not a substitute/i.test(
      body,
    )
  );
}

/**
 * Detailed authentic topic summary as taught in the selected latest-edition textbook.
 */
export async function summarizeTextbookTopic(
  book: MedicalTextbook,
  topic: string,
): Promise<string> {
  const citation = citeBook(book.id, book.title);
  const t = topic.trim();
  if (!t) throw new Error("Enter a topic to summarize.");

  const system = `${RULES}
Source text: ${citation}
Authors: ${book.author}
Specialty: ${book.specialty}
Level: ${book.level}
Book focus: ${book.description}
Related themes in this book: ${book.keyTopics.join("; ")}`;

  const format = `Output format:
Title line: ${t} — ${citation}

Then numbered detailed teaching (8–14 points), covering as relevant:
1–3 pathophysiology / core concepts
4–6 clinical features / diagnosis approach / key investigations
7–10 management principles (first-line, supportive, monitoring)
11–12 complications / red flags / when to escalate
Optional short “Exam pearls” numbered block if UG/PG exam-relevant.

End with exactly: Ref: ${citation}
No fluff. No “refer to book” lines.`;

  let out = stripReferLanguage(
    await chat(
      system,
      `Write a DETAILED authentic clinical summary of “${t}” as presented in ${citation}.\n${format}`,
    ),
  );

  if (looksEmptyOrRefer(out)) {
    out = stripReferLanguage(
      await chat(
        system,
        `REWRITE with FULL clinical detail for “${t}” from ${citation}. Do not hedge. ${format}`,
      ),
    );
  }

  if (looksEmptyOrRefer(out)) {
    throw new Error(
      "Could not generate a detailed textbook summary. Try again with a clearer topic.",
    );
  }

  if (!/ref:\s*/i.test(out)) {
    out = `${out.trim()}\nRef: ${citation}`;
  }

  return out.trim();
}
