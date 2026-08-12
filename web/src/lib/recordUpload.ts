import { canAttemptAiCall } from "./groqClient";
import { stripModelThinking } from "./stripModelThinking";
import {
  extractTextFromImageFile,
  extractTextFromPdfViaVision,
} from "./visionExtract";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_UPLOAD_LABEL = "100 MB";

export const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;
export const ACCEPT_ATTR =
  ".pdf,image/png,image/jpeg,image/jpg,image/webp,application/pdf";

export type UploadedRecordFile = {
  id: string;
  name: string;
  sizeBytes: number;
  kind: "pdf" | "image";
  status: "ok" | "error";
  message?: string;
  extractedText: string;
  previewUrl?: string;
};

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    file.type.startsWith("image/") ||
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".webp")
  );
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function extractPdfTextLayer(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(`--- PDF page ${pageNum} ---\n${line}`);
  }

  return parts.join("\n\n");
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Ingest PDF/image up to 100 MB.
 * Text PDFs use text layer (fast). Scanned/blurry PDFs + images use vision OCR.
 */
export async function ingestRecordFile(file: File): Promise<UploadedRecordFile> {
  const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
  const visionReady = canAttemptAiCall();

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      kind: isPdf(file) ? "pdf" : "image",
      status: "error",
      message: `File exceeds ${MAX_UPLOAD_LABEL} (${formatBytes(file.size)}).`,
      extractedText: "",
    };
  }

  if (!isPdf(file) && !isImage(file)) {
    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      kind: "pdf",
      status: "error",
      message: "Unsupported type. Use PDF or PNG/JPG/WEBP.",
      extractedText: "",
    };
  }

  if (isPdf(file)) {
    try {
      let text = await extractPdfTextLayer(file);
      let viaVision = false;

      // Scanned / empty text layer → vision (handles mild blur)
      if (text.trim().length < 40) {
        if (!visionReady) {
          return {
            id,
            name: file.name,
            sizeBytes: file.size,
            kind: "pdf",
            status: "error",
            message:
              "Scanned PDF needs AI. Paste your Groq key in the yellow banner at the top.",
            extractedText: "",
          };
        }
        text = await extractTextFromPdfViaVision(file);
        viaVision = true;
      }

      if (!text.trim()) {
        return {
          id,
          name: file.name,
          sizeBytes: file.size,
          kind: "pdf",
          status: "error",
          message: "Could not read text from this PDF.",
          extractedText: "",
        };
      }

      return {
        id,
        name: file.name,
        sizeBytes: file.size,
        kind: "pdf",
        status: "ok",
        message: viaVision
          ? "Scanned/blurry PDF read with smart vision."
          : undefined,
        extractedText: `[From upload: ${file.name}]\n${stripModelThinking(text)}`,
      };
    } catch (e) {
      return {
        id,
        name: file.name,
        sizeBytes: file.size,
        kind: "pdf",
        status: "error",
        message: `PDF read failed: ${e instanceof Error ? e.message : String(e)}`,
        extractedText: "",
      };
    }
  }

  // Image — always vision (works on mild blur / phone photos)
  try {
    const previewUrl = await readAsDataUrl(file);
    if (!visionReady) {
      return {
        id,
        name: file.name,
        sizeBytes: file.size,
        kind: "image",
        status: "error",
        previewUrl,
            message:
              "Image upload needs AI. Paste your Groq key in the yellow banner at the top (free from console.groq.com).",
        extractedText: "",
      };
    }

    const text = await extractTextFromImageFile(file);
    if (!text.trim()) {
      return {
        id,
        name: file.name,
        sizeBytes: file.size,
        kind: "image",
        status: "error",
        previewUrl,
        message: "No clinical text could be read from this image.",
        extractedText: "",
      };
    }

    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      kind: "image",
      status: "ok",
      previewUrl,
      message: "Image read with smart vision (blur-tolerant).",
      extractedText: `[From upload: ${file.name}]\n${stripModelThinking(text)}`,
    };
  } catch (e) {
    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      kind: "image",
      status: "error",
      message: `Image read failed: ${e instanceof Error ? e.message : String(e)}`,
      extractedText: "",
    };
  }
}
