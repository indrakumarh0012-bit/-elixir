/**
 * Parse textbook-style prose into sections + clean points (no *, -, # noise).
 */
import { stripModelThinking } from "../lib/stripModelThinking";

export type ClinicalSection = {
  title: string;
  points: string[];
};

function stripMdNoise(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*{1,3}\s*/, "")
    .replace(/^_{1,3}\s*/, "")
    .replace(/^[-–—•▪▸►]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function isHeading(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^#{1,6}\s+\S/.test(t)) return true;
  if (/^\*\*[^*].+\*\*:?\s*$/.test(t)) return true;
  if (/^[A-Z][A-Z0-9 /&(),.-]{2,80}:?\s*$/.test(t) && t.length < 90) return true;
  if (/^\d+[.)]\s+[A-Za-z].{0,80}$/.test(t) && /[:：]\s*$/.test(t)) return true;
  // "1. Definition / overview" style short titles
  if (/^\d+[.)]\s+[A-Za-z][^.]{2,70}$/.test(t) && t.split(/\s+/).length <= 12) {
    return true;
  }
  return false;
}

function splitLongParagraph(text: string): string[] {
  const cleaned = stripMdNoise(text);
  if (!cleaned) return [];
  // Prefer sentence splits for long blocks
  if (cleaned.length > 160 && /[.!?]\s+/.test(cleaned)) {
    return cleaned
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [cleaned];
}

/** Turn free text into titled colorful point sections. */
export function parseClinicalPoints(raw: string): ClinicalSection[] {
  const text = stripModelThinking(raw ?? "").trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[-=*_]{3,}$/.test(l));

  const sections: ClinicalSection[] = [];
  let current: ClinicalSection | null = null;

  const pushPoint = (p: string) => {
    const bits = splitLongParagraph(p);
    if (!current) {
      current = { title: "Overview", points: [] };
      sections.push(current);
    }
    for (const b of bits) {
      if (b) current.points.push(b);
    }
  };

  for (const line of lines) {
    if (isHeading(line)) {
      const title = stripMdNoise(line).replace(/[:：]\s*$/, "");
      current = { title: title || "Section", points: [] };
      sections.push(current);
      continue;
    }
    // bullet-ish or plain line → point
    pushPoint(line);
  }

  // Drop empty sections
  return sections.filter((s) => s.points.length > 0 || s.title);
}

/** Rotating accent themes for sections (readable, not purple-default). */
export const SECTION_THEMES = [
  {
    wrap: "border-teal-200 bg-teal-50",
    title: "text-teal-900",
    badge: "bg-teal-600 text-white",
    point: "bg-white border-teal-100 text-slate-800",
    num: "bg-teal-500 text-white",
  },
  {
    wrap: "border-sky-200 bg-sky-50",
    title: "text-sky-900",
    badge: "bg-sky-600 text-white",
    point: "bg-white border-sky-100 text-slate-800",
    num: "bg-sky-500 text-white",
  },
  {
    wrap: "border-amber-200 bg-amber-50",
    title: "text-amber-950",
    badge: "bg-amber-600 text-white",
    point: "bg-white border-amber-100 text-slate-800",
    num: "bg-amber-500 text-white",
  },
  {
    wrap: "border-rose-200 bg-rose-50",
    title: "text-rose-900",
    badge: "bg-rose-600 text-white",
    point: "bg-white border-rose-100 text-slate-800",
    num: "bg-rose-500 text-white",
  },
  {
    wrap: "border-emerald-200 bg-emerald-50",
    title: "text-emerald-900",
    badge: "bg-emerald-600 text-white",
    point: "bg-white border-emerald-100 text-slate-800",
    num: "bg-emerald-500 text-white",
  },
  {
    wrap: "border-orange-200 bg-orange-50",
    title: "text-orange-950",
    badge: "bg-orange-600 text-white",
    point: "bg-white border-orange-100 text-slate-800",
    num: "bg-orange-500 text-white",
  },
] as const;

const JUNK_HEADING =
  /^(think(?:ing)?|thought process|analysis|reasoning|overview|introduction|step\s*\d*|let me|here(?:'s| is)|note|notes|summary of|pathophysiology of|definition|etiology|pathogenesis|clinical features|lab(?:oratory)?|imaging|complications|natural history|textbook|references?|ref)\b/i;

/** Flat crisp points + short refs for disease pathophysiology (no section headings). */
export function parsePathophysiologyFlat(raw: string): {
  points: string[];
  references: string;
} {
  const text = stripModelThinking(raw ?? "").trim();
  if (!text) return { points: [], references: "" };

  let body = text;
  let references = "";

  const refMatch = body.match(
    /(?:^|\n)\s*(?:REF(?:ERENCES?)?|Refs?|Sources?)\s*[:：]\s*(.+)\s*$/i,
  );
  if (refMatch) {
    references = stripMdNoise(refMatch[1]).replace(/[.;]+$/, "");
    body = body.slice(0, refMatch.index).trim();
  }

  const points: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || /^[-=*_]{3,}$/.test(t)) continue;
    if (isHeading(t) || JUNK_HEADING.test(stripMdNoise(t))) continue;
    const cleaned = stripMdNoise(t);
    if (!cleaned || cleaned.length < 8) continue;
    if (JUNK_HEADING.test(cleaned)) continue;
    // Drop meta / process lines
    if (
      /^(i will|let me|thinking|first,|second,|in conclusion)/i.test(cleaned)
    ) {
      continue;
    }
    points.push(cleaned);
  }

  // If model returned one blob, split to sentences (cap)
  if (points.length <= 1 && body.length > 80) {
    const sentences = stripMdNoise(body)
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12 && !JUNK_HEADING.test(s));
    return {
      points: sentences.slice(0, 10),
      references,
    };
  }

  return { points: points.slice(0, 10), references };
}

