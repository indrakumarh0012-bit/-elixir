import { useState } from "react";
import { sendToInbox } from "../lib/reportChannel";

const CATEGORIES = [
  "Wrong dose / calculation result",
  "Missing drug or condition",
  "Reference / guideline concern",
  "App bug (crash, display, saving)",
  "Suggestion / new feature",
] as const;

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500";

export default function ReportIssue() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [tool, setTool] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "held" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (description.trim().length < 10) {
      setError("Please describe the issue in a little more detail (at least 10 characters).");
      return;
    }
    setError(null);
    setStatus("sending");
    const r = await sendToInbox(`Pocket-Med issue report: ${category}`, {
      category,
      tool: tool.trim() || "(not specified)",
      description: description.trim(),
      reporter_contact: contact.trim() || "(not provided)",
      app_url: window.location.href,
      reported_at: new Date().toISOString(),
    });
    if (r.ok) {
      setStatus(r.pendingActivation ? "held" : "sent");
      setDescription("");
      setTool("");
      setContact("");
    } else {
      setStatus("failed");
      setError(
        r.reason === "network"
          ? "Could not reach the report service — check the internet connection and try again."
          : `The report service did not accept the submission (${r.reason}). Please try again later.`,
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-3 py-5 md:px-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Report an Issue</h2>
      <p className="mt-1 text-sm font-medium text-slate-800">
        Spotted a wrong dose, a missing drug, or an app bug? Your report goes
        straight to the Pocket-Med maintainer and helps keep the calculators safe.
      </p>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm md:p-5">
        <label className="block text-sm font-bold text-slate-900">
          What kind of issue?
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-900">
          Which tool? <span className="font-medium text-slate-600">(optional)</span>
          <input
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            placeholder="e.g. Ped Dose Calculator — amoxicillin"
            className={inputCls}
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-900">
          Describe the issue
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What did you enter, what did the app show, and what did you expect? Please include values so it can be re-checked."
            className={inputCls}
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-900">
          Your contact <span className="font-medium text-slate-600">(optional, for follow-up)</span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or phone (only if you want a reply)"
            className={inputCls}
          />
        </label>

        {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        {status === "sent" && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            Report delivered — thank you. It will be reviewed and cross-checked
            against the references.
          </p>
        )}
        {status === "held" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            Report received and queued. The report channel is awaiting its
            one-time activation on the maintainer's side — the report will be
            delivered once that is completed.
          </p>
        )}
        {status === "failed" && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            Could not send the report — you may be offline. Please try again when
            you have an internet connection.
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={status === "sending"}
          className="mt-4 w-full rounded-xl bg-amber-800 px-4 py-3 text-sm font-bold text-white shadow hover:bg-amber-900 disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send report"}
        </button>

        <p className="mt-3 text-[11px] leading-snug text-slate-600">
          Reports are delivered to the app maintainer for review. Do not include
          patient-identifying information in your report.
        </p>
      </div>
    </div>
  );
}
