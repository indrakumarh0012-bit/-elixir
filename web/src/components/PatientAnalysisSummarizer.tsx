import { useMemo, useState } from "react";
import {
  ALL_SPECIALTIES,
  getSpecialties,
  medicalBooksDB,
  type MedicalTextbook,
} from "../data/medicalBooksDB";
import {
  ACCEPT_ATTR,
  formatBytes,
  ingestRecordFile,
  MAX_UPLOAD_LABEL,
  type UploadedRecordFile,
} from "../lib/recordUpload";
import ReferenceLibrary from "./ReferenceLibrary";
import RegimenAnalyzerUI from "./RegimenAnalyzerUI";

type SummarizerPane = "history" | "regimen" | "books";

function levelBadge(level: MedicalTextbook["level"]): string {
  if (level === "UG Standard") return "bg-emerald-100 text-emerald-800";
  if (level === "PG / Superspecialty") return "bg-violet-100 text-violet-800";
  return "bg-orange-100 text-orange-800";
}

/**
 * Unified Summarizer: past history + specialty textbooks + drugs/polypharmacy analysis.
 * PDF/image uploads up to 100 MB are required for patient-record analysis.
 */
export default function PatientAnalysisSummarizer() {
  const specialties = useMemo(
    () => getSpecialties().filter((s) => s !== ALL_SPECIALTIES),
    [],
  );
  const [pane, setPane] = useState<SummarizerPane>("history");
  const [specialty, setSpecialty] = useState(specialties[0] ?? "General Medicine");
  const [pastHistory, setPastHistory] = useState("");
  const [analysisOut, setAnalysisOut] = useState<string | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadedRecordFile[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const specialtyBooks = useMemo(
    () => medicalBooksDB.filter((b) => b.specialty === specialty),
    [specialty],
  );

  const selectedBooks = useMemo(
    () => medicalBooksDB.filter((b) => selectedBookIds.includes(b.id)),
    [selectedBookIds],
  );

  const toggleBook = (id: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      const results: UploadedRecordFile[] = [];
      for (const file of Array.from(fileList)) {
        results.push(await ingestRecordFile(file));
      }
      const failed = results.filter((r) => r.status === "error");
      if (failed.length) {
        setUploadError(failed.map((f) => `${f.name}: ${f.message}`).join(" · "));
      }
      const ok = results.filter((r) => r.status === "ok");
      setUploads((prev) => [...prev, ...ok]);
      for (const r of ok) {
        if (r.extractedText.trim()) {
          setPastHistory((prev) =>
            prev.trim()
              ? `${prev.trim()}\n\n${r.extractedText}`
              : r.extractedText,
          );
        }
      }
    } finally {
      setUploadBusy(false);
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((u) => u.id !== id);
    });
  };

  const runHistoryAnalysis = () => {
    const notes = pastHistory.trim();
    if (!notes && uploads.length === 0) {
      setAnalysisOut(
        "Paste past hospital / OPD notes and/or upload PDF/image records (up to 100 MB) first.",
      );
      return;
    }
    if (!notes) {
      setAnalysisOut(
        "Upload processed, but no clinical text is in the notes box yet. For image-only or scanned PDFs, type/paste the readable clinical text, then analyze again.",
      );
      return;
    }
    const bookLines =
      selectedBooks.length > 0
        ? selectedBooks
            .map(
              (b) =>
                `• ${b.title} (${b.level}) — focus: ${b.keyTopics.slice(0, 3).join("; ")}`,
            )
            .join("\n")
        : specialtyBooks
            .slice(0, 4)
            .map((b) => `• ${b.title} (${b.level})`)
            .join("\n");

    const topics = (
      selectedBooks.length > 0 ? selectedBooks : specialtyBooks.slice(0, 3)
    ).flatMap((b) => b.keyTopics);

    const uploadLines =
      uploads.length > 0
        ? uploads
            .map(
              (u) =>
                `• ${u.name} (${u.kind}, ${formatBytes(u.sizeBytes)})`,
            )
            .join("\n")
        : "• None (text paste only)";

    setAnalysisOut(
      [
        `PATIENT PAST-HISTORY ANALYSIS SCAFFOLD`,
        `Specialty lens: ${specialty}`,
        ``,
        `--- Uploaded records (max ${MAX_UPLOAD_LABEL} each) ---`,
        uploadLines,
        ``,
        `--- Source notes (verbatim basis; do not invent) ---`,
        notes.slice(0, 6000),
        notes.length > 6000 ? "\n[…truncated]" : "",
        ``,
        `--- Textbook references for this specialty ---`,
        bookLines,
        ``,
        `--- Structured clinical checklist ---`,
        `1. Separate each patient episode / admission clearly.`,
        `2. List each treatment line separately (drug, dose, route, frequency, duration).`,
        `3. Flag polypharmacy, duplicates, and missing START therapies on the Regimen tab.`,
        `4. Cross-check key topics: ${[...new Set(topics)].slice(0, 8).join("; ") || "—"}.`,
        `5. Reconcile labs (Cr, electrolytes) with renal dosing on Regimen / CrCl tabs.`,
        ``,
        `Next step (required): open “Drugs & Polypharmacy” and enter the medication list from these notes.`,
        `Then use “Textbook Library” to deepen topic summaries under ${specialty}.`,
      ].join("\n"),
    );
  };

  const panes: { id: SummarizerPane; label: string }[] = [
    { id: "history", label: "Past History + Books" },
    { id: "regimen", label: "Drugs & Polypharmacy" },
    { id: "books", label: "Full Textbook Library" },
  ];

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-3 py-4 md:px-6">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Patient Summary Analyzer
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Analyze past records with specialty textbooks, upload PDF/images up to{" "}
            {MAX_UPLOAD_LABEL}, then reconcile drugs, DDIs, Beers/STOPP/START, and
            polypharmacy.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {panes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPane(p.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  pane === p.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pane === "history" && (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 py-4 lg:grid-cols-5 md:px-6">
          <aside className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Specialty for past-record analysis
              </h2>
              <select
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  setSelectedBookIds([]);
                }}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Select textbooks to guide analysis
              </p>
              <p className="text-xs text-slate-500">
                All standard & superspecialty books for this subject are listed.
              </p>
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                {specialtyBooks.map((book) => {
                  const on = selectedBookIds.includes(book.id);
                  return (
                    <li key={book.id}>
                      <button
                        type="button"
                        onClick={() => toggleBook(book.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          on
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200"
                        }`}
                      >
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${levelBadge(book.level)}`}
                        >
                          {book.level}
                        </span>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {book.title}
                        </p>
                        <p className="text-xs text-slate-500">{book.author}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="space-y-4 lg:col-span-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Upload patient records (required option)
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                PDF or images (PNG/JPG/WEBP), up to <strong>{MAX_UPLOAD_LABEL}</strong>{" "}
                per file. Multiple files allowed. PDF text is extracted into the notes
                box automatically.
              </p>
              <label
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition ${
                  uploadBusy
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"
                }`}
              >
                <span className="text-sm font-semibold text-slate-800">
                  {uploadBusy
                    ? "Reading upload…"
                    : "Click or drop PDF / images here"}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Max {MAX_UPLOAD_LABEL} each · PDF, PNG, JPG, WEBP
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept={ACCEPT_ATTR}
                  multiple
                  disabled={uploadBusy}
                  onChange={(e) => {
                    void handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {uploadError && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  {uploadError}
                </p>
              )}
              {uploads.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {uploads.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u.kind.toUpperCase()} · {formatBytes(u.sizeBytes)}
                        </p>
                        {u.message && (
                          <p className="mt-1 text-xs text-amber-800">{u.message}</p>
                        )}
                        {u.previewUrl && (
                          <img
                            src={u.previewUrl}
                            alt={u.name}
                            className="mt-2 max-h-40 rounded border border-slate-200 object-contain"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUpload(u.id)}
                        className="text-xs font-semibold text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Past hospital / OPD records
              </h2>
              <textarea
                value={pastHistory}
                onChange={(e) => setPastHistory(e.target.value)}
                rows={12}
                placeholder="Paste prior notes, or upload PDF/images above (up to 100 MB). Keep each patient and each treatment separate…"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none ring-blue-600 focus:ring-2"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runHistoryAnalysis}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Analyze past history with selected books
                </button>
                <button
                  type="button"
                  onClick={() => setPane("regimen")}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Continue → Drugs & Polypharmacy
                </button>
              </div>
            </div>

            {analysisOut && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Analysis output
                </h3>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                  {analysisOut}
                </pre>
                {selectedBooks.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Active textbook lenses
                    </p>
                    <ul className="mt-2 space-y-2">
                      {selectedBooks.map((b) => (
                        <li
                          key={b.id}
                          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900"
                        >
                          <strong>{b.title}</strong> — {b.description}
                          <br />
                          <span className="text-xs">
                            Topics: {b.keyTopics.join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {pane === "regimen" && <RegimenAnalyzerUI />}
      {pane === "books" && <ReferenceLibrary />}
    </div>
  );
}
