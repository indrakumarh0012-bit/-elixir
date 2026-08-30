/**
 * Obstetric dating.
 *
 * All methods reduce to one anchor: the conception-equivalent date
 * (= ovulation/fertilization). GA counts from a nominal LMP 14 days before
 * that anchor; EDD is anchor + 266 days (= LMP + 280 in a 28-day cycle).
 *
 * - LMP with cycle correction: ovulation is assumed (cycleLength − 14) days
 *   after LMP, so a 35-day cycle shifts EDD 7 days later than Naegele.
 * - IVF: fertilization date is known exactly — for a day-5 (blastocyst)
 *   transfer it is transfer − 5 days; day-3 transfer − 3 days.
 * - IUI / known ovulation: that date is the anchor itself.
 */

export type ObMethod = "lmp" | "ivf5" | "ivf3" | "ovulation";

export type ObResult = {
  gaWeeks: number;
  gaDays: number;
  gaLabel: string;
  edd: Date;
  conceptionDate: Date;
  trimester: 1 | 2 | 3;
  postTerm: boolean;
  preViable: boolean;
  note: string;
};

const DAY_MS = 86_400_000;

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

function daysBetween(a: Date, b: Date): number {
  const utc = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.floor((utc(b) - utc(a)) / DAY_MS);
}

export function calculateGestation(
  method: ObMethod,
  anchorDate: Date,
  today: Date,
  cycleLengthDays = 28,
): ObResult | null {
  if (Number.isNaN(anchorDate.getTime())) return null;

  let conception: Date;
  let note: string;
  switch (method) {
    case "lmp": {
      const cycle = Math.min(Math.max(cycleLengthDays || 28, 20), 45);
      const ovulationOffset = cycle - 14;
      conception = addDays(anchorDate, ovulationOffset);
      note =
        cycle === 28
          ? "Standard 28-day cycle (Naegele)."
          : `Corrected for a ${cycle}-day cycle: dates shift ${cycle - 28 > 0 ? "+" : ""}${cycle - 28} days versus Naegele.`;
      break;
    }
    case "ivf5":
      conception = addDays(anchorDate, -5);
      note = "IVF day-5 (blastocyst) transfer: fertilization = transfer date − 5 days. Most precise dating available.";
      break;
    case "ivf3":
      conception = addDays(anchorDate, -3);
      note = "IVF day-3 transfer: fertilization = transfer date − 3 days. Most precise dating available.";
      break;
    case "ovulation":
      conception = anchorDate;
      note = "Dated from known ovulation / IUI day.";
      break;
  }

  const nominalLmp = addDays(conception, -14);
  const totalDays = daysBetween(nominalLmp, today);
  if (totalDays < 0 || totalDays > 45 * 7) return null;

  const gaWeeks = Math.floor(totalDays / 7);
  const gaDays = totalDays % 7;
  const edd = addDays(conception, 266);
  const trimester: ObResult["trimester"] =
    gaWeeks < 14 ? 1 : gaWeeks < 28 ? 2 : 3;

  return {
    gaWeeks,
    gaDays,
    gaLabel: `${gaWeeks} weeks ${gaDays} day${gaDays === 1 ? "" : "s"}`,
    edd,
    conceptionDate: conception,
    trimester,
    postTerm: gaWeeks >= 42,
    preViable: gaWeeks < 24,
    note,
  };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
