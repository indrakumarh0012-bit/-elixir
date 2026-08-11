export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_UPLOAD_LABEL = "100 MB";

export const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;
export const ACCEPT_ATTR = ".pdf,image/png,image/jpeg,image/jpg,image/webp,application/pdf";

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

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Vite-friendly worker
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
 * Ingest one clinical record file (PDF or image), max 100 MB.
 * PDFs: client-side text extraction. Images: attached with preview; user should
 * confirm/transcribe clinical text into the notes box if OCR is needed later.
 */
export async function ingestRecordFile(file: File): Promise<UploadedRecordFile> {
  const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;

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
      const text = await extractPdfText(file);
      if (!text.trim()) {
        return {
          id,
          name: file.name,
          sizeBytes: file.size,
          kind: "pdf",
          status: "error",
          message:
            "No extractable text in PDF (may be scanned/image-only). Paste OCR text or upload a text PDF.",
          extractedText: "",
        };
      }
      return {
        id,
        name: file.name,
        sizeBytes: file.size,
        kind: "pdf",
        status: "ok",
        extractedText: `[From upload: ${file.name}]\n${text}`,
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

  // Image
  try {
    const previewUrl = await readAsDataUrl(file);
    return {
      id,
      name: file.name,
      sizeBytes: file.size,
      kind: "image",
      status: "ok",
      previewUrl,
      message:
        "Image attached. Type or paste any clinical text you can read from it into the notes box (vision OCR available in Streamlit with Groq).",
      extractedText: `[Image attached: ${file.name}, ${formatBytes(file.size)} — review preview and add transcribed clinical text below if needed]`,
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
