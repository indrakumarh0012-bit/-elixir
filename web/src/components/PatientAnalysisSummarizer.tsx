import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_SPECIALTIES,
  getSpecialties,
  medicalBooksDB,
} from "../data/medicalBooksDB";
import {
  analyzeNotesToPerforma,
  getGroqApiKey,
  saveGroqApiKey,
} from "../lib/buildPerforma";
import { isGroqConfigured } from "../lib/groqClient";
import {
  ACCEPT_ATTR,
  formatBytes,
  ingestRecordFile,
  type UploadedRecordFile,
} from "../lib/recordUpload";
import { EMPTY_PATIENT_SUMMARY } from "../summary/emptyPatientSummary";
import {
  copyPatientSummary,
  downloadPatientSummary,
} from "../summary/formatSummaryText";
import {
  archiveMany,
  loadSummaryArchive,
  removeArchivedSummary,
  type ArchivedSummary,
} from "../summary/summaryArchive";
import type { PatientSummary } from "../summary/types";
import PatientPerformaPanel from "./PatientPerformaPanel";
import ReferenceLibrary from "./ReferenceLibrary";
import RegimenAnalyzerUI from "./RegimenAnalyzerUI";

type SummarizerPane = "history" | "saved" | "regimen" | "books";

function printCurrentPerforma() {
  window.print();
}

/**
 * Past History: upload → multi-patient performas → copy/download/print → saved archive.
 */
export default function PatientAnalysisSummarizer() {
  const specialties = useMemo(
    () => getSpecialties().filter((s) => s !== ALL_SPECIALTIES),
    [],
  );
  const [pane, setPane] = useState<SummarizerPane>("history");
  const [specialty, setSpecialty] = useState(specialties[0] ?? "General Medicine");
  const [pastHistory, setPastHistory] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadedRecordFile[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [patientIndex, setPatientIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [archive, setArchive] = useState<ArchivedSummary[]>(() =>
    loadSummaryArchive(),
  );

  const [keyReady, setKeyReady] = useState(() => Boolean(getGroqApiKey()));
  const [keyDraft, setKeyDraft] = useState("");

  useEffect(() => {
    let active = true;
    isGroqConfigured().then((ready) => {
      if (active) setKeyReady(ready);
    });
    return () => {
      active = false;
    };
  }, []);

  const performaRef = useRef<HTMLDivElement>(null);

  const specialtyBooks = useMemo(
    () => medicalBooksDB.filter((b) => b.specialty === specialty),
    [specialty],
  );

  const current =
    patients[patientIndex] ?? EMPTY_PATIENT_SUMMARY;
  const patientCount = patients.length;

  const toggleBook = (id: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const flash = (msg: string) => {
    setActionMsg(msg);
    window.setTimeout(() => setActionMsg(null), 2500);
  };

  const runAnalysis = async (notes: string) => {
    setAnalyzing(true);
    setAnalyzeError(null);
    performaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const result = await analyzeNotesToPerforma(notes, specialty);
    setAnalyzing(false);
    if (!result.ok) {
      setAnalyzeError(result.error);
      return;
    }
    setPatients(result.patients);
    setPatientIndex(0);
    setAnalyzeError(null);
    archiveMany(result.patients);
    setArchive(loadSummaryArchive());
    flash(
      result.patients.length > 1
        ? `${result.patients.length} patients ready`
        : "Performa ready",
    );
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadBusy(true);
    setUploadError(null);
    setAnalyzeError(null);
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

      let combined = pastHistory.trim();
      for (const r of ok) {
        if (r.extractedText.trim()) {
          combined = combined
            ? `${combined}\n\n${r.extractedText}`
            : r.extractedText;
        }
      }

      if (combined.trim()) {
        setPastHistory(""); // do not show OCR/think in the paste box
        setUploadBusy(false);
        await runAnalysis(combined);
        return;
      }
      if (ok.length && !combined.trim()) {
        setUploadError("No text extracted");
      }
    } finally {
      setUploadBusy(false);
    }
  };

  const openArchived = (entry: ArchivedSummary) => {
    setPatients([entry.summary]);
    setPatientIndex(0);
    setPane("history");
    setAnalyzeError(null);
    window.setTimeout(() => {
      performaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const panes: { id: SummarizerPane; label: string }[] = [
    { id: "history", label: "Past History" },
    { id: "saved", label: "Saved" },
    { id: "regimen", label: "Regimen" },
    { id: "books", label: "Books" },
  ];

  const hasActiveSummary = Boolean(
    current.name || current.admissions.length > 0,
  );

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto max-w-7xl px-3 py-3 md:px-6">
          <h1 className="text-xl font-bold text-slate-900">Summarizer</h1>
          <div className="mt-3 flex flex-wrap gap-2">
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
                {p.id === "saved" && archive.length > 0
                  ? ` (${archive.length})`
                  : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pane === "history" && (
        <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 md:px-6">
          {!import.meta.env.PROD && !keyReady && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 print:hidden">
              <p className="text-sm font-semibold text-amber-950">
                Groq API key (local development only)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="gsk_…"
                  className="min-w-[220px] flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    saveGroqApiKey(keyDraft);
                    setKeyReady(Boolean(getGroqApiKey()));
                    setKeyDraft("");
                  }}
                  className="rounded-lg bg-amber-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Save key
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 print:hidden">
            <aside className="lg:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-500">Specialty</h2>
                <select
                  value={specialty}
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    setSelectedBookIds([]);
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {specialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-sm font-semibold text-slate-800">Books</p>
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  {specialtyBooks.map((book) => {
                    const on = selectedBookIds.includes(book.id);
                    return (
                      <li key={book.id}>
                        <button
                          type="button"
                          onClick={() => toggleBook(book.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                            on
                              ? "border-blue-600 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-900"
                          }`}
                        >
                          {book.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <section className="space-y-4 lg:col-span-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-500">
                  Upload PDF / image
                </h2>
                <label
                  className={`mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-6 ${
                    uploadBusy || analyzing
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-300 bg-slate-50 hover:border-blue-400"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {uploadBusy
                      ? "Reading…"
                      : analyzing
                        ? "Filling performa…"
                        : "Upload PDF / image"}
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept={ACCEPT_ATTR}
                    multiple
                    disabled={uploadBusy || analyzing}
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                {uploadError && (
                  <p className="mt-2 text-sm text-red-700">{uploadError}</p>
                )}
                {uploads.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {uploads.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium">
                          {u.name} · {formatBytes(u.sizeBytes)}
                          {u.message ? ` · ${u.message}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setUploads((prev) => prev.filter((x) => x.id !== u.id))
                          }
                          className="text-xs font-semibold text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  value={pastHistory}
                  onChange={(e) => setPastHistory(e.target.value)}
                  rows={5}
                  placeholder="Paste notes…"
                  className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  disabled={analyzing || !pastHistory.trim()}
                  onClick={() => void runAnalysis(pastHistory)}
                  className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzing ? "Analyzing…" : "Analyze"}
                </button>
              </div>
            </section>
          </div>

          <div
            ref={performaRef}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            {hasActiveSummary && !analyzing && !analyzeError && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  {patientCount > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={patientIndex <= 0}
                        onClick={() => setPatientIndex((i) => Math.max(0, i - 1))}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
                      >
                        ← Prev
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        Patient {patientIndex + 1} of {patientCount}
                      </span>
                      <button
                        type="button"
                        disabled={patientIndex >= patientCount - 1}
                        onClick={() =>
                          setPatientIndex((i) =>
                            Math.min(patientCount - 1, i + 1),
                          )
                        }
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyPatientSummary(current);
                      flash(ok ? "Copied to clipboard." : "Copy failed.");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadPatientSummary(current);
                      flash("Download started.");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={printCurrentPerforma}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold"
                  >
                    Print
                  </button>
                </div>
              </div>
            )}

            {actionMsg && (
              <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 print:hidden">
                {actionMsg}
              </p>
            )}

            <PatientPerformaPanel
              summary={current}
              analyzing={analyzing}
              error={analyzeError}
              specialty={specialty}
              onSummaryPatch={(next) => {
                setPatients((prev) => {
                  const copy = [...prev];
                  if (patientIndex >= 0 && patientIndex < copy.length) {
                    copy[patientIndex] = next;
                  }
                  return copy;
                });
              }}
              patientLabel={
                patientCount > 1
                  ? `Patient ${patientIndex + 1} of ${patientCount}`
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {pane === "saved" && (
        <div className="mx-auto max-w-3xl space-y-3 px-3 py-4 md:px-6 print:hidden">
          <h2 className="text-lg font-bold text-slate-900">
            Saved ({archive.length})
          </h2>
          {archive.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No saved summaries
            </p>
          ) : (
            <ul className="space-y-2">
              {archive.map((entry) => (
                <li
                  key={entry.archiveId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.summary.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Hospital ID:{" "}
                      <span className="font-mono font-semibold text-slate-800">
                        {entry.summary.hospitalId || "—"}
                      </span>
                      {" · "}
                      {entry.summary.sex} · Age {entry.summary.age || "—"} ·{" "}
                      {new Date(entry.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openArchived(entry)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadPatientSummary(entry.summary);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeArchivedSummary(entry.archiveId);
                        setArchive(loadSummaryArchive());
                      }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pane === "regimen" && (
        <div className="print:hidden">
          <RegimenAnalyzerUI />
        </div>
      )}
      {pane === "books" && (
        <div className="print:hidden">
          <ReferenceLibrary />
        </div>
      )}
    </div>
  );
}
