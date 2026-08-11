import type { PatientSummary } from "../summary/types";
import { withSortedAdmissions } from "../summary/types";

export type ArchivedSummary = {
  archiveId: string;
  savedAt: number;
  summary: PatientSummary;
};

const STORAGE_KEY = "SMART_ELIXIR_SUMMARY_ARCHIVE";

export function loadSummaryArchive(): ArchivedSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchivedSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list: ArchivedSummary[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Save or update a summarized patient for future reference. */
export function archivePatientSummary(summary: PatientSummary): ArchivedSummary {
  const sorted = withSortedAdmissions(summary);
  const list = loadSummaryArchive();
  const archiveId =
    sorted.patientId?.trim() ||
    `arc-${sorted.name || "patient"}-${Date.now()}`.replace(/\s+/g, "-");

  const entry: ArchivedSummary = {
    archiveId,
    savedAt: Date.now(),
    summary: { ...sorted, patientId: sorted.patientId || archiveId },
  };

  const idx = list.findIndex(
    (x) =>
      x.archiveId === archiveId ||
      (x.summary.name &&
        x.summary.name === sorted.name &&
        String(x.summary.age) === String(sorted.age)),
  );
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);

  persist(list.slice(0, 200));
  return entry;
}

export function archiveMany(summaries: PatientSummary[]): ArchivedSummary[] {
  return summaries.map((s) => archivePatientSummary(s));
}

export function removeArchivedSummary(archiveId: string) {
  persist(loadSummaryArchive().filter((x) => x.archiveId !== archiveId));
}

export function clearSummaryArchive() {
  localStorage.removeItem(STORAGE_KEY);
}
