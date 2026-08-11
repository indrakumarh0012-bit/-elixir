import { useMemo, useState } from "react";
import {
  conditionsFromSummary,
  fetchPathophysiologyDetail,
} from "../lib/textbookClinical";
import type { PatientSummary } from "../summary/types";
import { withSortedAdmissions } from "../summary/types";
import ColorfulClinicalPoints from "./ColorfulClinicalPoints";
import PathophysiologyPoints from "./PathophysiologyPoints";

type Props = {
  summary: PatientSummary;
  analyzing?: boolean;
  error?: string | null;
  /** Optional label e.g. Patient 2 of 5 */
  patientLabel?: string;
  specialty?: string;
  /** Persist pathophysiology loaded on click back into parent state */
  onSummaryPatch?: (next: PatientSummary) => void;
};

function field(value: string | undefined, fallback: string): string {
  const t = (value ?? "").trim();
  return t || fallback;
}

/** Clean chronological patient performa (print target: #patient-performa-print). */
export default function PatientPerformaPanel({
  summary,
  analyzing = false,
  error = null,
  patientLabel,
  specialty = "General Medicine",
  onSummaryPatch,
}: Props) {
  const [copiedHospitalId, setCopiedHospitalId] = useState(false);
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [pathoBusy, setPathoBusy] = useState(false);
  const [pathoError, setPathoError] = useState<string | null>(null);

  const sorted = useMemo(() => withSortedAdmissions(summary), [summary]);
  const admissions = sorted.admissions;
  const hasPatient = Boolean(summary.name || admissions.length > 0);
  const hospitalId = (summary.hospitalId || "").trim();
  const conditions = useMemo(() => conditionsFromSummary(sorted), [sorted]);
  const pathoMap = sorted.pathophysiologyByCondition ?? {};
  const critique = (sorted.treatmentCritique ?? "").trim();

  const copyHospitalId = async () => {
    if (!hospitalId) return;
    try {
      await navigator.clipboard.writeText(hospitalId);
      setCopiedHospitalId(true);
      window.setTimeout(() => setCopiedHospitalId(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const openCondition = async (cond: string) => {
    setActiveCondition(cond);
    setPathoError(null);
    if (pathoMap[cond]?.trim()) return;
    setPathoBusy(true);
    try {
      const detail = await fetchPathophysiologyDetail(cond, specialty);
      const next: PatientSummary = {
        ...sorted,
        pathophysiologyByCondition: {
          ...pathoMap,
          [cond]: detail,
        },
      };
      onSummaryPatch?.(next);
    } catch (e) {
      setPathoError(
        e instanceof Error ? e.message : "Could not load pathophysiology.",
      );
    } finally {
      setPathoBusy(false);
    }
  };

  if (analyzing) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-blue-900">Filling performa…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!hasPatient) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-slate-700">Performa</p>
      </div>
    );
  }

  return (
    <div id="patient-performa-print">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Performa</h2>
        {patientLabel ? (
          <span className="text-sm font-semibold text-blue-700">{patientLabel}</span>
        ) : null}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-blue-700">Demographics</h3>

        <div className="mt-3 rounded-lg border-2 border-blue-300 bg-blue-50 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
            Hospital ID
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="select-all break-all font-mono text-lg font-bold tracking-wide text-slate-900">
              {hospitalId || "—"}
            </code>
            <button
              type="button"
              disabled={!hospitalId}
              onClick={() => void copyHospitalId()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 print:hidden"
            >
              {copiedHospitalId ? "Copied" : "Copy Hospital ID"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Name</p>
            <p className="font-bold text-slate-900">{summary.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Sex</p>
            <p className="font-bold text-slate-900">{summary.sex}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Age</p>
            <p className="font-bold text-slate-900">{summary.age || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Patient ID</p>
            <p className="text-sm font-semibold text-slate-700">
              {summary.patientId || "—"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">Comorbidities</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {summary.comorbidities.length === 0 ? (
            <span className="text-sm text-slate-500">None listed</span>
          ) : (
            summary.comorbidities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => void openCondition(c)}
                className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 print:pointer-events-none"
              >
                {c}
              </button>
            ))
          )}
        </div>

        {(summary.diagnoses?.length || conditions.length > 0) && (
          <>
            <p className="mt-4 text-xs font-semibold text-slate-500">Diagnoses</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(summary.diagnoses?.length
                ? summary.diagnoses
                : conditions
              ).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => void openCondition(d)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold print:pointer-events-none ${
                    activeCondition === d
                      ? "bg-blue-700 text-white"
                      : "bg-blue-100 text-blue-900 hover:bg-blue-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {activeCondition && (
        <section className="mt-4 rounded-xl border border-teal-200 bg-white p-4 shadow-sm print:break-inside-avoid">
          {pathoBusy ? (
            <p className="text-sm text-slate-600">Loading pathophysiology…</p>
          ) : pathoError ? (
            <p className="text-sm text-red-700">{pathoError}</p>
          ) : (
            <PathophysiologyPoints
              disease={activeCondition}
              text={field(
                pathoMap[activeCondition],
                `1. ${activeCondition}: inflammatory and organ-specific effector pathways produce the clinical picture.\n2. Mediators and haemodynamic or structural changes amplify injury.\n3. Compensatory responses may become maladaptive if the driver persists.\nRef: Harrison 21st ed.; Nelson 22nd ed.; Davidson 24th ed.`,
              )}
            />
          )}
        </section>
      )}

      <div className="relative mt-6 space-y-5 border-l-2 border-blue-200 pl-5">
        {admissions.map((adm, idx) => (
          <article
            key={adm.id}
            className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="absolute -left-[1.65rem] top-5 h-3.5 w-3.5 rounded-full border-2 border-blue-600 bg-white print:hidden" />
            <h3 className="text-lg font-bold text-blue-800">
              {adm.admissionDate}
              <span className="ml-2 text-xs font-semibold text-slate-500">
                ({idx + 1}/{admissions.length})
              </span>
            </h3>

            <section className="mt-4">
              <h4 className="text-sm font-bold text-blue-700">
                Clinically Presented With
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {adm.clinicalPresentation.length === 0 ? (
                  <li className="list-none text-slate-500">—</li>
                ) : (
                  adm.clinicalPresentation.map((item) => (
                    <li key={item}>{item}</li>
                  ))
                )}
              </ul>
            </section>

            <section className="mt-4">
              <h4 className="text-sm font-bold text-blue-700">On Examination</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {adm.examinationFindings || "—"}
              </p>
            </section>

            <section className="mt-4">
              <h4 className="mb-2 text-sm font-bold text-blue-700">Investigations</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                  <p className="text-xs font-bold uppercase text-red-700">Abnormal</p>
                  <ul className="mt-2 space-y-1 text-sm text-red-800">
                    {adm.investigations.abnormal.length === 0 ? (
                      <li className="text-slate-500">—</li>
                    ) : (
                      adm.investigations.abnormal.map((x) => (
                        <li key={x}>• {x}</li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs font-bold uppercase text-emerald-800">
                    Important Normals
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {adm.investigations.importantNormal.length === 0 ? (
                      <li className="text-slate-500">—</li>
                    ) : (
                      adm.investigations.importantNormal.map((x) => (
                        <li key={x}>• {x}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <h4 className="mb-3 text-sm font-bold text-blue-700">Treatment Given</h4>
              {adm.treatmentGiven.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                <ol className="space-y-4">
                  {adm.treatmentGiven.map((drug, i) => (
                    <li
                      key={`${drug.genericName}-${i}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Drug {i + 1} of {adm.treatmentGiven.length}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {drug.genericName}
                        {drug.brandName ? (
                          <span className="font-semibold text-blue-800">
                            {" "}
                            ({drug.brandName})
                          </span>
                        ) : null}
                      </p>

                      <dl className="mt-3 grid gap-2 text-sm">
                        <div>
                          <dt className="font-semibold text-slate-600">Brand</dt>
                          <dd className="text-slate-900">
                            {field(drug.brandName, drug.genericName)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-600">Contents</dt>
                          <dd className="text-slate-900">
                            {field(
                              drug.contents,
                              `${drug.genericName} — use labelled strength/composition`,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-600">Class of drug</dt>
                          <dd className="text-slate-900">
                            {field(
                              drug.drugClass,
                              "Therapeutic agent (class from clinical pharmacology)",
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-600">
                            Mechanism of action
                          </dt>
                          <dd className="whitespace-pre-wrap text-slate-900">
                            {field(
                              drug.mechanismOfAction,
                              `${drug.genericName} acts on its established pharmacological target (enzyme, receptor, channel, or cell wall/pathway) to produce the intended therapeutic effect.`,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-600">Dosage</dt>
                          <dd className="text-slate-900">{drug.dosage || "—"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-600">
                            Duration (detail)
                          </dt>
                          <dd className="text-slate-900">{drug.duration || "—"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-600">
                            Instructions to use
                          </dt>
                          <dd className="whitespace-pre-wrap text-slate-900">
                            {drug.instructions || "—"}
                          </dd>
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                          <dt className="font-semibold text-amber-900">Cautions</dt>
                          <dd className="mt-0.5 whitespace-pre-wrap text-amber-950">
                            {field(
                              drug.cautions,
                              `Monitor adverse effects of ${drug.genericName}; check allergies, organ function, and interactions.`,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <h4 className="text-sm font-bold text-amber-900">
                Advice on Discharge &amp; Follow-Up
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-amber-950">
                {adm.followUpAndAdvice.length === 0 ? (
                  <li>—</li>
                ) : (
                  adm.followUpAndAdvice.map((advice) => (
                    <li key={advice}>✓ {advice}</li>
                  ))
                )}
              </ul>
            </section>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid">
        <h3 className="text-base font-bold text-slate-900">Treatment critique</h3>
        <p className="mt-0.5 text-xs text-slate-500">{specialty}</p>
        <div className="mt-4">
          <ColorfulClinicalPoints
            compact
            text={critique}
            emptyHint=""
          />
        </div>
      </section>
    </div>
  );
}
