import { citeBook } from "../data/textbookEditions";
import type { MedicalTextbook } from "../data/medicalBooksDB";
import { canAttemptAiCall, groqChatCompletion, groqErrorMessage } from "./groqClient";
import { stripModelThinking } from "./stripModelThinking";
import { stripReferLanguage } from "./textbookClinicalShared";

const MODELS = [
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
] as const;

const RULES = `You teach from ONE named latest-edition textbook.
WRITE specific, textbook-faithful clinical teaching — not vague overviews.
Every point must name concrete findings, doses, routes, frequencies, durations, monitoring, and escalation triggers when the topic involves treatment.
Use standard clinical terminology for the concept (e.g. "oral amoxicillin 40–90 mg/kg/day divided q8–12h", "IV ceftriaxone 50–100 mg/kg/day", "target SpO2 ≥94%", "furosemide 20–40 mg IV bolus").
FORBIDDEN: "refer to book", "see chapter", "consult the text", "as per guidelines" without giving the actual guideline content, generic phrases like "supportive care" without specifics.
Structure with clear section headings. Use numbered points under each heading.
You MAY end with one line: Ref: <exact book citation>.
English digits. No markdown asterisks.`;

async function chat(system: string, user: string): Promise<string> {
  if (!canAttemptAiCall()) {
    throw new Error(
      "AI not available. Add GROQ_API_KEY on Netlify (website) or enter your Netlify URL in the setup banner (installed app).",
    );
  }

  let last = "No model available.";
  for (const model of MODELS) {
    try {
      const res = await groqChatCompletion({
        model,
        temperature: 0.15,
        max_tokens: 3200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      if (res.status === 404) {
        last = `Model ${model} unavailable.`;
        continue;
      }
      if (!res.ok) {
        last = await res.text();
        if (res.status === 401 || res.status === 429) {
          throw new Error(groqErrorMessage(res.status, last));
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

  const format = `Output format — use these exact section headings:

1. Definition and core concept
2. Pathophysiology / mechanism
3. Clinical features and red flags
4. Diagnosis and key investigations
5. Treatment — first-line (name drug, dose, route, frequency, duration)
6. Treatment — alternatives and when to escalate
7. Monitoring and complications
8. Exam pearls (if UG/PG relevant)

Under each heading write 2–5 numbered, specific, textbook-standard points.
Include exact drug names, doses, routes, and intervals wherever treatment is discussed.
End with exactly: Ref: ${citation}
No fluff. No "refer to book" lines.`;

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
