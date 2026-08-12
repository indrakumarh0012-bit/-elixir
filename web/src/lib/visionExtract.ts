import { getGroqApiKey } from "./buildPerforma";
import { groqChatCompletion, groqErrorMessage } from "./groqClient";
import { stripModelThinking } from "./stripModelThinking";
const VISION_MODEL = "qwen/qwen3.6-27b";

/**
 * Groq on_demand TPM for this model is 8000 (image tokens + prompt + max_tokens).
 * Keep images small and completion budget low.
 */
const ATTEMPTS = [
  { maxEdge: 768, q: 0.62 },
  { maxEdge: 512, q: 0.55 },
  { maxEdge: 384, q: 0.48 },
] as const;

const MAX_DATA_URL_CHARS = 280_000;
const MAX_COMPLETION_TOKENS = 1200;

const VISION_PROMPT = `Clinical OCR only. Read the image and OUTPUT THE EXTRACTED CLINICAL TEXT — nothing else.
NO <think>, NO thinking, NO analysis process, NO commentary, NO "looking at the image".
Fields: Hospital/Patient ID, Name, Age, Sex, Date, Diagnoses, drugs (name, dose, frequency, duration, instructions), labs (name, value, unit), advice/follow-up.
Uncertain: [?]. Illegible: [illegible]. English digits. Plain text. Do not invent drugs.`;

function scoreExtractedText(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  let score = Math.min(t.length, 8000);
  const hits = [
    /\bmg\b/i,
    /\bml\b/i,
    /\buhid\b/i,
    /\bhospital\b/i,
    /\btablet\b/i,
    /\bdiagnosis\b/i,
  ];
  for (const re of hits) if (re.test(t)) score += 120;
  return score;
}

async function blobFromCanvas(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) throw new Error("Canvas export failed");
  return blob;
}

function resizeEnhance(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxEdge: number,
): HTMLCanvasElement {
  const longest = Math.max(srcW, srcH);
  const scale = Math.min(1, maxEdge / Math.max(longest, 1));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = "contrast(1.25) brightness(1.05)";
  ctx.drawImage(source, 0, 0, w, h);
  ctx.filter = "none";
  return canvas;
}

async function loadBitmap(source: Blob | HTMLCanvasElement): Promise<{
  bitmap: ImageBitmap;
  w: number;
  h: number;
}> {
  if (source instanceof HTMLCanvasElement) {
    const blob = await blobFromCanvas(source, 0.7);
    const bitmap = await createImageBitmap(blob);
    return { bitmap, w: bitmap.width, h: bitmap.height };
  }
  const bitmap = await createImageBitmap(source);
  return { bitmap, w: bitmap.width, h: bitmap.height };
}

function fitJpeg(canvas: HTMLCanvasElement, startQ: number): string {
  let q = startQ;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > MAX_DATA_URL_CHARS && q > 0.35) {
    q -= 0.07;
    url = canvas.toDataURL("image/jpeg", q);
  }
  // Still too big → shrink canvas further
  if (url.length > MAX_DATA_URL_CHARS) {
    const small = document.createElement("canvas");
    const scale = 0.7;
    small.width = Math.max(1, Math.round(canvas.width * scale));
    small.height = Math.max(1, Math.round(canvas.height * scale));
    const sctx = small.getContext("2d");
    if (sctx) {
      sctx.drawImage(canvas, 0, 0, small.width, small.height);
      url = small.toDataURL("image/jpeg", 0.45);
    }
  }
  return url;
}

export async function buildCompactVisionDataUrl(
  source: Blob | HTMLCanvasElement,
  maxEdge = 768,
  jpegQ = 0.62,
): Promise<string> {
  const { bitmap, w, h } = await loadBitmap(source);
  try {
    const canvas = resizeEnhance(bitmap, w, h, maxEdge);
    return fitJpeg(canvas, jpegQ);
  } finally {
    bitmap.close();
  }
}

export async function buildBlurRecoveryVariants(
  source: Blob | HTMLCanvasElement,
): Promise<string[]> {
  return [await buildCompactVisionDataUrl(source)];
}

function isTokenLimitError(status: number, body: string): boolean {
  if (status === 413 || status === 429) return true;
  const b = body.toLowerCase();
  return (
    b.includes("request too large") ||
    b.includes("tokens per minute") ||
    b.includes("tpm") ||
    b.includes("rate_limit") ||
    b.includes("too many tokens")
  );
}

export async function extractTextFromImageDataUrl(
  dataUrl: string,
  apiKey?: string,
  prompt: string = VISION_PROMPT,
): Promise<string> {
  const key = apiKey || getGroqApiKey();
  if (!import.meta.env.PROD && !key) {
    throw new Error("AI key required to read images / scanned pages.");
  }

  const res = await groqChatCompletion(
    {
      model: VISION_MODEL,
      temperature: 0.05,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    },
    key,
  );

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 404) {
      throw new Error(
        "Vision model qwen/qwen3.6-27b not available on this Groq key.",
      );
    }
    const e = new Error(groqErrorMessage(res.status, err)) as Error & {
      status?: number;
      body?: string;
    };
    e.status = res.status;
    e.body = err;
    throw e;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return stripModelThinking(data.choices?.[0]?.message?.content ?? "");
}

async function tryVisionWithShrink(
  source: Blob | HTMLCanvasElement,
  apiKey?: string,
): Promise<string> {
  let lastErr: Error | null = null;

  for (let i = 0; i < ATTEMPTS.length; i++) {
    const { maxEdge, q } = ATTEMPTS[i];
    const dataUrl = await buildCompactVisionDataUrl(source, maxEdge, q);
    try {
      const text = stripModelThinking(
        await extractTextFromImageDataUrl(dataUrl, apiKey),
      );
      if (text.trim()) return text.trim();
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const status = (e as { status?: number }).status ?? 0;
      const body = (e as { body?: string }).body ?? lastErr.message;
      if (isTokenLimitError(status, body)) {
        // Wait for TPM window, then smaller image
        await new Promise((r) => setTimeout(r, 2000 + i * 1500));
        continue;
      }
      throw lastErr;
    }
  }

  throw (
    lastErr ||
    new Error(
      "Image too large for Groq TPM limit. Wait ~1 min and retry, or paste notes.",
    )
  );
}

export async function extractTextFromImageFile(
  file: File,
  apiKey?: string,
): Promise<string> {
  const text = await tryVisionWithShrink(file, apiKey);
  if (text.trim() && scoreExtractedText(text) >= 0) return text;
  throw new Error("Could not read text from this image.");
}

export async function extractTextFromPdfViaVision(
  file: File,
  apiKey?: string,
  maxPages = 3,
): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(doc.numPages, maxPages);
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.15 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    try {
      const text = await tryVisionWithShrink(canvas, apiKey);
      if (text) parts.push(`--- PDF page ${pageNum} ---\n${text}`);
    } catch (e) {
      parts.push(
        `--- PDF page ${pageNum} ---\n[${e instanceof Error ? e.message.slice(0, 100) : "error"}]`,
      );
    }
    if (pageNum < pageCount) {
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  if (doc.numPages > maxPages) {
    parts.push(`[Only first ${maxPages} of ${doc.numPages} pages read.]`);
  }

  return parts.join("\n\n");
}
