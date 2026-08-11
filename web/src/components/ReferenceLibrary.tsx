import { useMemo, useState } from "react";
import {
  ALL_SPECIALTIES,
  getSpecialties,
  medicalBooksDB,
  type MedicalTextbook,
} from "../data/medicalBooksDB";

function levelBadgeClass(level: MedicalTextbook["level"]): string {
  if (level === "UG Standard") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (level === "PG / Superspecialty") return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-orange-100 text-orange-800 border-orange-200";
}

export default function ReferenceLibrary() {
  const specialties = useMemo(() => getSpecialties(), []);
  const [activeSpecialty, setActiveSpecialty] = useState(ALL_SPECIALTIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<MedicalTextbook | null>(null);
  const [topicQuery, setTopicQuery] = useState("");
  const [summaryPreview, setSummaryPreview] = useState<string | null>(null);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return medicalBooksDB.filter((book) => {
      const specialtyOk =
        activeSpecialty === ALL_SPECIALTIES || book.specialty === activeSpecialty;
      if (!specialtyOk) return false;
      if (!q) return true;
      return (
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q)
      );
    });
  }, [activeSpecialty, searchQuery]);

  const openBook = (book: MedicalTextbook) => {
    setSelectedBook(book);
    setTopicQuery("");
    setSummaryPreview(null);
  };

  const closeModal = () => {
    setSelectedBook(null);
    setTopicQuery("");
    setSummaryPreview(null);
  };

  const requestSummary = (topic?: string) => {
    if (!selectedBook) return;
    const t = (topic ?? topicQuery).trim();
    if (!t) return;
    setTopicQuery(t);
    setSummaryPreview(
      `Clinical lens: ${selectedBook.title} (${selectedBook.author})\n` +
        `Topic: ${t}\n\n` +
        `${selectedBook.description}\n\n` +
        `Suggested focus areas from this text: ${selectedBook.keyTopics.join("; ")}.\n\n` +
        `Connect your Groq / notes summarizer to generate a live chapter-style summary for “${t}”. ` +
        `This preview is a reference scaffold only — not a substitute for the primary textbook.`,
    );
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col gap-4 px-3 py-4 md:flex-row md:px-6">
      {/* Specialty sidebar */}
      <aside className="w-full shrink-0 md:w-56 lg:w-64">
        <div className="rounded-xl border border-[var(--line)] bg-white p-3 shadow-sm">
          <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Specialty
          </h2>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {specialties.map((spec) => {
              const active = spec === activeSpecialty;
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setActiveSpecialty(spec)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-blue-600 font-semibold text-white shadow-sm"
                      : "text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  {spec}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <section className="min-w-0 flex-1">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] md:text-3xl">
            Medical Reference Library
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Browse standard and superspecialty textbooks by specialty, then open a
            topic summary scaffold for clinical notes.
          </p>
          <div className="mt-4">
            <label className="sr-only" htmlFor="book-search">
              Search books
            </label>
            <input
              id="book-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Showing {filteredBooks.length} of {medicalBooksDB.length} titles
            {activeSpecialty !== ALL_SPECIALTIES ? ` · ${activeSpecialty}` : ""}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
            <article
              key={book.id}
              className="flex flex-col rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span
                  className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${levelBadgeClass(book.level)}`}
                >
                  {book.level}
                </span>
                <span className="text-[11px] font-medium text-[var(--muted)]">
                  {book.specialty}
                </span>
              </div>
              <h3 className="text-base font-bold leading-snug text-slate-900">
                {book.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{book.author}</p>
              <p className="mt-3 line-clamp-3 flex-1 text-sm text-[var(--muted)]">
                {book.description}
              </p>
              <button
                type="button"
                onClick={() => openBook(book)}
                className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Summarize Topics
              </button>
            </article>
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-10 text-center text-sm text-[var(--muted)]">
            No books match this specialty and search. Try another filter.
          </div>
        )}
      </section>

      {/* Summary modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-modal-title"
          onClick={closeModal}
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {selectedBook.specialty} · {selectedBook.level}
                </p>
                <h2
                  id="summary-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {selectedBook.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selectedBook.author}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">
              {selectedBook.description}
            </p>

            <div className="mt-5">
              <label
                htmlFor="topic-ai"
                className="mb-1.5 block text-sm font-semibold text-slate-800"
              >
                Ask AI to summarize a topic from this book
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="topic-ai"
                  type="text"
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") requestSummary();
                  }}
                  placeholder="e.g. neonatal jaundice workup…"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none ring-blue-600 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => requestSummary()}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Summarize
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Suggestion chips (click to fill):
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedBook.keyTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => requestSummary(topic)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {summaryPreview && (
              <div className="mt-5 rounded-xl border border-[var(--line)] bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">Summary preview</h3>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                  {summaryPreview}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
