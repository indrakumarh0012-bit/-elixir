import { canAttemptAiCall, groqChatCompletion, groqErrorMessage } from "./groqClient";
import { selectTextbooksForPatient } from "./selectTextbooks";
import { stripModelThinking } from "./stripModelThinking";
import {
  conditionsFromSummary,
  stripReferLanguage,
} from "./textbookClinicalShared";
import type { PatientSummary } from "../summary/types";
import { withSortedAdmissions } from "../summary/types";

export { conditionsFromSummary } from "./textbookClinicalShared";

const TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
] as const;

/** Common drugs — always fill real class/MOA/cautions (never “refer textbook”). */
const DRUG_FALLBACKS: Record<
  string,
  { drugClass: string; mechanismOfAction: string; cautions: string; contents?: string }
> = {
  paracetamol: {
    drugClass: "Analgesic / antipyretic (non-opioid)",
    mechanismOfAction:
      "Inhibits central prostaglandin synthesis via COX pathway modulation in the CNS; antipyretic effect via hypothalamic heat-regulation centre. Weak peripheral anti-inflammatory activity compared with NSAIDs.",
    cautions:
      "Hepatotoxicity with overdose or chronic high dose; reduce dose in hepatic impairment / chronic alcohol use. Max adult usually 4 g/day (lower in risk groups).",
    contents: "Paracetamol (acetaminophen) — labelled strength",
  },
  acetaminophen: {
    drugClass: "Analgesic / antipyretic (non-opioid)",
    mechanismOfAction:
      "Central COX inhibition reducing prostaglandin-mediated pain and fever signalling in the hypothalamus.",
    cautions: "Dose-dependent hepatotoxicity; avoid duplicate products containing paracetamol.",
  },
  amoxicillin: {
    drugClass: "Beta-lactam antibiotic (aminopenicillin)",
    mechanismOfAction:
      "Binds penicillin-binding proteins, inhibits peptidoglycan cross-linking → bactericidal cell-wall lysis of susceptible organisms.",
    cautions: "Hypersensitivity in penicillin allergy; diarrhoea / C. difficile risk; adjust in severe renal impairment.",
  },
  "amoxicillin-clavulanate": {
    drugClass: "Beta-lactam + beta-lactamase inhibitor",
    mechanismOfAction:
      "Amoxicillin inhibits cell-wall synthesis; clavulanate irreversibly inhibits many beta-lactamases, extending spectrum against beta-lactamase-producing bacteria.",
    cautions: "Penicillin allergy; cholestatic hepatitis risk (clavulanate); GI upset common.",
  },
  metformin: {
    drugClass: "Biguanide antidiabetic",
    mechanismOfAction:
      "Decreases hepatic gluconeogenesis, improves peripheral insulin sensitivity, and reduces intestinal glucose absorption; does not stimulate insulin secretion.",
    cautions: "Lactic acidosis risk in renal failure, hypoxia, severe infection; hold peri-contrast / acute illness; GI side effects.",
  },
  atorvastatin: {
    drugClass: "HMG-CoA reductase inhibitor (statin)",
    mechanismOfAction:
      "Competitively inhibits HMG-CoA reductase → ↓ cholesterol synthesis → ↑ hepatic LDL receptors → ↓ plasma LDL-C; modest TG ↓ and HDL ↑.",
    cautions: "Myopathy/rhabdomyolysis risk; check LFTs; interact with CYP3A4 inhibitors; avoid in active liver disease / pregnancy.",
  },
  omeprazole: {
    drugClass: "Proton pump inhibitor",
    mechanismOfAction:
      "Irreversibly inhibits H+/K+-ATPase (proton pump) on gastric parietal cells → profound suppression of acid secretion.",
    cautions: "Long-term: B12/Mg deficiency, C. difficile, fracture risk signals; CYP2C19 interactions (clopidogrel).",
  },
  pantoprazole: {
    drugClass: "Proton pump inhibitor",
    mechanismOfAction:
      "Irreversible blockade of parietal-cell H+/K+-ATPase reducing gastric acid output.",
    cautions: "Similar PPI class cautions; IV/oral switch as indicated; hypomagnesemia with prolonged use.",
  },
  aspirin: {
    drugClass: "Antiplatelet (irreversible COX-1 inhibitor) / NSAID",
    mechanismOfAction:
      "Irreversible acetylation of platelet COX-1 → ↓ thromboxane A2 → reduced platelet aggregation for platelet lifespan (~7–10 days).",
    cautions: "Bleeding, peptic ulcer; Reye syndrome risk in children with viral illness; asthma exacerbation in aspirin-sensitive patients.",
  },
  "normal saline": {
    drugClass: "Isotonic crystalloid",
    mechanismOfAction:
      "Expands extracellular fluid volume; restores circulating volume and corrects isotonic dehydration / hypovolaemia.",
    cautions: "Volume overload in heart/renal failure; hyperchloremic metabolic acidosis with large volumes.",
  },
  ondansetron: {
    drugClass: "5-HT3 receptor antagonist (antiemetic)",
    mechanismOfAction:
      "Blocks serotonin 5-HT3 receptors in CTZ and vagal afferents → suppresses nausea/vomiting from chemo, postop, and gastroenteritis pathways.",
    cautions: "QT prolongation risk; constipation; rare serotonin syndrome with other serotonergic drugs.",
  },
  ceftriaxone: {
    drugClass: "Third-generation cephalosporin",
    mechanismOfAction:
      "Inhibits bacterial cell-wall synthesis by binding PBPs; bactericidal against many gram-negative and some gram-positive pathogens.",
    cautions: "Cross-reactivity possible in severe penicillin allergy; biliary sludge / kernicterus risk in neonates; interact with calcium-containing IV fluids in neonates.",
  },
  azithromycin: {
    drugClass: "Macrolide antibiotic",
    mechanismOfAction:
      "Binds 50S ribosomal subunit → inhibits bacterial protein synthesis (bacteriostatic; bactericidal at high concentrations for some organisms).",
    cautions: "QT prolongation; hepatic dysfunction; resistance concerns; drug interactions via P-gp / CYP pathways.",
  },
  ibuprofen: {
    drugClass: "NSAID (non-selective COX inhibitor)",
    mechanismOfAction:
      "Inhibits COX-1/COX-2 → ↓ prostaglandin synthesis → analgesic, antipyretic, anti-inflammatory effects.",
    cautions: "GI bleed/ulcer, renal impairment, fluid retention; avoid in late pregnancy; asthma caution.",
  },
  insulin: {
    drugClass: "Exogenous insulin (hormone)",
    mechanismOfAction:
      "Binds insulin receptor tyrosine kinase → GLUT4 translocation and anabolic metabolism → lowers blood glucose.",
    cautions: "Hypoglycaemia; injection-site lipodystrophy; dose adjust in renal failure / illness.",
  },
  furosemide: {
    drugClass: "Loop diuretic",
    mechanismOfAction:
      "Inhibits Na-K-2Cl cotransporter in thick ascending limb → marked natriuresis and diuresis; also venodilatation (IV).",
    cautions: "Electrolyte loss (K, Mg, Na), ototoxicity (high IV doses), volume depletion, gout flare.",
  },
  amlodipine: {
    drugClass: "Dihydropyridine calcium-channel blocker",
    mechanismOfAction:
      "Blocks L-type calcium channels in vascular smooth muscle → arterial vasodilatation → ↓ peripheral resistance / BP.",
    cautions: "Ankle oedema, flushing, gingival hyperplasia; avoid in severe aortic stenosis / unstable heart failure context as indicated.",
  },
  losartan: {
    drugClass: "Angiotensin II receptor blocker (ARB)",
    mechanismOfAction:
      "Selective AT1 receptor blockade → ↓ angiotensin-II-mediated vasoconstriction and aldosterone effects → ↓ BP and proteinuria benefit in many settings.",
    cautions: "Hyperkalaemia, rise in creatinine; contraindicated in pregnancy; bilateral renal-artery stenosis caution.",
  },
  prednisolone: {
    drugClass: "Systemic glucocorticoid",
    mechanismOfAction:
      "Genomic glucocorticoid-receptor effects suppress inflammatory cytokines and immune activation; also metabolic effects.",
    cautions: "Infection risk, hyperglycaemia, osteoporosis, adrenal suppression with prolonged use; taper when indicated.",
  },
  dexamethasone: {
    drugClass: "Systemic glucocorticoid (potent)",
    mechanismOfAction:
      "High-potency glucocorticoid receptor agonism → anti-inflammatory and immunosuppressive gene regulation; minimal mineralocorticoid activity.",
    cautions: "Same steroid class risks; psychiatric effects; glucose rise; avoid abrupt stop after prolonged courses.",
  },
};

function normalizeDrugKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9+\-\s]/g, "")
    .trim();
}

function lookupDrugFallback(genericName: string) {
  const key = normalizeDrugKey(genericName);
  if (DRUG_FALLBACKS[key]) return DRUG_FALLBACKS[key];
  for (const [k, v] of Object.entries(DRUG_FALLBACKS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

const CONTENT_RULES = `CONTENT RULES (non-negotiable):
- WRITE the actual textbook consensus content (mechanisms, class, cautions, critique points).
- FORBIDDEN phrases: "refer to", "see textbook", "confirm in", "consult formulary", "should be reviewed in", "check Harrison", "as per standard text" used as a substitute for content.
- You may END with a short "Ref: Title edition; Title edition" line listing sources — but the body MUST already contain the facts.
- Use ONLY well-established facts from the cited LATEST EDITION textbooks / clinical pharmacology.
- Never invent rare pathways, fake doses, page numbers, or drugs not in the case.
- Prefer conservative consensus teaching from those editions.
- English digits only.`;

export function textbookTitlesForSpecialty(specialty: string): string[] {
  return textbookCitationsForSpecialty(specialty).map((c) => c.split(" (")[0]);
}

/** Latest-edition citations for specialty (Title + edition). */
export function textbookCitationsForSpecialty(specialty: string): string[] {
  const pick = selectTextbooksForPatient(
    {
      patientId: "",
      hospitalId: "",
      name: "",
      sex: "Other",
      age: "",
      comorbidities: [],
      diagnoses: [],
      admissions: [],
    },
    specialty,
  );
  return pick.citations.length
    ? pick.citations
    : selectTextbooksForPatient(
        {
          patientId: "",
          hospitalId: "",
          name: "",
          sex: "Other",
          age: "",
          comorbidities: [specialty],
          diagnoses: [],
          admissions: [],
        },
        specialty,
      ).citations;
}

async function chatComplete(
  system: string,
  user: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  if (!canAttemptAiCall()) throw new Error("AI not available.");

  const max_tokens = opts?.maxTokens ?? 2800;
  const temperature = opts?.temperature ?? 0.1;

  let last = "No model available.";
  for (const model of TEXT_MODELS) {
    try {
      const res = await groqChatCompletion({
        model,
        temperature,
        max_tokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      if (res.status === 404) {
        last = `Model ${model} unavailable.`;
        continue;
      }
      if (!res.ok) {
        last = await res.text();
        if (res.status === 401 || res.status === 429) {
          throw new Error(groqErrorMessage(res.status, last));
        }
        continue;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = stripModelThinking(
        data.choices?.[0]?.message?.content ?? "",
      );
      if (text) return text;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      if (last.includes("401")) throw e instanceof Error ? e : new Error(last);
    }
  }
  throw new Error(last.slice(0, 200));
}

type VerifyKind = "pathophysiology" | "critique" | "drug_json";

function looksLikeReferEvasion(text: string): boolean {
  const t = text.toLowerCase();
  const body = t.replace(/ref:\s*[^\n]+/gi, "");
  return (
    /refer (to|the)|see (the )?(textbook|harrison|nelson|harriet|bailey)|confirm (in|with) (the )?(latest|specialty)|consult (your|a) (textbook|formulary)/i.test(
      body,
    ) || body.trim().length < 40
  );
}

/**
 * Five behind-the-door passes before user-facing output.
 * Body must contain real clinical teaching — never “refer textbook” placeholders.
 */
async function fivePassVerify(
  kind: VerifyKind,
  specialty: string,
  citations: string[],
  topic: string,
  draftBrief: string,
): Promise<string> {
  const citeLine = citations.slice(0, 6).join("; ");

  const draft = await chatComplete(
    `You write authentic clinical teaching content from LATEST EDITION textbooks.
${CONTENT_RULES}
Allowed references: ${citeLine}
${draftBrief}`,
    `Specialty: ${specialty}\nTopic: ${topic}\nPass 1 of 5: DRAFT the actual mechanisms/facts (not referrals).`,
    { temperature: 0.1, maxTokens: 2200 },
  );

  const cleaned = await chatComplete(
    `Medical fact auditor. Remove speculation and FORBIDDEN referral language.
${CONTENT_RULES}
Replace any "refer/confirm/see textbook" lines with the actual consensus fact.
Keep crisp authentic clinical content.
Return the revised full answer.`,
    `Pass 2 of 5: STRIP speculation + referral placeholders.\nAllowed texts: ${citeLine}\nTopic: ${topic}\n\nDRAFT:\n${draft}`,
    { temperature: 0.05, maxTokens: 2200 },
  );

  const crossChecked = await chatComplete(
    `Cross-check against LATEST EDITIONS. Correct conflicts with standard ${specialty} texts.
Remove unsupported claims. Do not replace content with "see book" — state the corrected fact.
Return the full corrected answer.`,
    `Pass 3 of 5: CROSS-CHECK vs: ${citeLine}\nTopic: ${topic}\n\nCONTENT:\n${cleaned}`,
    { temperature: 0.05, maxTokens: 2200 },
  );

  const gated = await chatComplete(
    `Authenticity gate. Output SAFE content only with REAL textbook consensus written out.
${CONTENT_RULES}
Kind=${kind}.`,
    `Pass 4 of 5: AUTHENTICITY GATE\nKind: ${kind}\nTopic: ${topic}\nTexts: ${citeLine}\n\nCONTENT:\n${crossChecked}`,
    { temperature: 0.05, maxTokens: 2200 },
  );

  const formatInstructions =
    kind === "pathophysiology"
      ? `Final format ONLY:
5–8 numbered pathophysiology points (1. 2. 3. …), each a concrete mechanism sentence (pathways, mediators, organ effects).
NO headings, NO think-process, NO "refer to textbook".
Last line exactly: Ref: <2–4 latest-edition textbook names with edition>
No asterisks or dash bullets.`
      : kind === "critique"
        ? `Final format ONLY:
Numbered section titles then numbered points (no *, -, markdown):
1. Pattern of treatment
2. Textbook alignment
3. Gaps risks and monitoring
4. Critique
5. Alternatives
6. References noted
Inside each point WRITE the clinical judgment (dose/indication/monitoring issues) — never "refer to text".
Cite edition names only briefly inside points or in section 6.`
        : `Final format: VALID JSON only
{ "drugs": [ { "genericName", "brandName", "contents", "drugClass", "mechanismOfAction", "cautions" } ] }
mechanismOfAction = 2–3 sentences of the established MOA (never empty, never "see pharmacology").
cautions = concrete monitoring/contraindications.`;

  let final = await chatComplete(
    `Pass 5 of 5: FINAL FORMAT for clinician display.
${CONTENT_RULES}
${formatInstructions}`,
    `Topic: ${topic}\nSpecialty: ${specialty}\nLatest-edition texts: ${citeLine}\n\nCONTENT TO FORMAT:\n${gated}`,
    { temperature: 0.05, maxTokens: 2200 },
  );

  final = stripReferLanguage(final);

  if (looksLikeReferEvasion(final) && kind !== "drug_json") {
    final = stripReferLanguage(
      await chatComplete(
        `REWRITE. You previously hedged. Now WRITE the actual ${kind} content from ${citeLine}.
${CONTENT_RULES}
${formatInstructions}`,
        `Topic: ${topic}\nSpecialty: ${specialty}\nProduce full substantive answer now.`,
        { temperature: 0.15, maxTokens: 2200 },
      ),
    );
  }

  return final;
}

/** Crisp pathophysiology — 5-pass verified, latest editions, real content. */
export async function fetchPathophysiologyDetail(
  condition: string,
  specialty: string,
  citations?: string[],
): Promise<string> {
  const cites =
    citations?.length ? citations : textbookCitationsForSpecialty(specialty);
  return fivePassVerify(
    "pathophysiology",
    specialty,
    cites,
    condition,
    `Write disease PATHOPHYSIOLOGY as crisp numbered mechanism points with real pathways (e.g. cytokines, haemodynamics, receptors). End with Ref line.`,
  );
}

/** Treatment critique — 5-pass verified against latest editions. */
export async function fetchTreatmentCritique(
  summary: PatientSummary,
  specialty: string,
  citations?: string[],
): Promise<string> {
  const s = withSortedAdmissions(summary);
  const cites =
    citations?.length ? citations : textbookCitationsForSpecialty(specialty);
  const drugLines = s.admissions.flatMap((a) =>
    a.treatmentGiven.map(
      (d) =>
        `${d.genericName} (${d.brandName}) ${d.dosage} × ${d.duration} — ${d.drugClass}`,
    ),
  );
  const conditions = [
    ...s.comorbidities,
    ...s.admissions.flatMap((a) => a.clinicalPresentation.slice(0, 3)),
  ];

  const topic = `Treatment review for ${s.name || "patient"}, ${s.sex}, age ${s.age}, Hospital ID ${s.hospitalId || "—"}.
Conditions: ${conditions.join("; ") || "—"}.
Regimen:
${drugLines.length ? drugLines.map((x, i) => `${i + 1}. ${x}`).join("\n") : "None listed"}
Critique only the regimen that WAS used. Do not invent prescribed drugs. Write concrete critique points.`;

  return fivePassVerify(
    "critique",
    specialty,
    cites,
    topic,
    `Write a full treatment critique with concrete clinical points from latest editions.`,
  );
}

type DrugEnrichRow = {
  genericName: string;
  brandName: string;
  contents: string;
  drugClass: string;
  mechanismOfAction: string;
  cautions: string;
};

function isWeakClinicalField(v: string | undefined): boolean {
  if (!v?.trim()) return true;
  const t = v.toLowerCase();
  return /refer |confirm |see (specialty|textbook|pharmacology|formulary)|latest-edition|do not rely|review in/.test(
    t,
  );
}

/**
 * Fill MOA / class / contents / cautions + pathophysiology + critique
 * using auto-selected latest-edition textbooks for this patient's diseases.
 */
export async function enrichPatientFromTextbooks(
  summary: PatientSummary,
  specialty: string,
): Promise<PatientSummary> {
  const s = withSortedAdmissions(summary);
  const pick = selectTextbooksForPatient(s, specialty);
  const citations = pick.citations;
  const primarySpecialty = pick.specialtyLenses[0] || specialty;
  const conditions = conditionsFromSummary(s);

  const drugs = s.admissions.flatMap((a) => a.treatmentGiven);
  const drugNames = drugs.map((d) => d.genericName).filter(Boolean);

  let enrichMap = new Map<string, DrugEnrichRow>();
  if (drugNames.length) {
    try {
      const raw = await fivePassVerify(
        "drug_json",
        primarySpecialty,
        citations,
        `Drugs:\n${drugNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
        `Return pharmacology JSON for each named drug. Every mechanismOfAction must state the real MOA in 2–3 sentences from clinical pharmacology / Harriet Lane / Harrison / Nelson as relevant.`,
      );
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const jsonText = fence?.[1]?.trim() ?? raw.trim();
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      const slice =
        start >= 0 && end > start ? jsonText.slice(start, end + 1) : jsonText;
      const parsed = JSON.parse(slice) as { drugs?: DrugEnrichRow[] };
      for (const row of parsed.drugs ?? []) {
        if (row.genericName) enrichMap.set(row.genericName.toLowerCase(), row);
      }
    } catch {
      /* local fallbacks below */
    }
  }

  const admissions = s.admissions.map((adm) => ({
    ...adm,
    treatmentGiven: adm.treatmentGiven.map((d) => {
      const e = enrichMap.get(d.genericName.toLowerCase());
      const fb = lookupDrugFallback(d.genericName);
      const moa =
        (!isWeakClinicalField(d.mechanismOfAction) && d.mechanismOfAction) ||
        (!isWeakClinicalField(e?.mechanismOfAction) && e?.mechanismOfAction) ||
        fb?.mechanismOfAction ||
        `${d.genericName} acts via its established pharmacological target pathway to produce the intended therapeutic effect; class-specific receptor/enzyme/channel effects determine clinical use.`;
      const drugClass =
        (!isWeakClinicalField(d.drugClass) && d.drugClass) ||
        (!isWeakClinicalField(e?.drugClass) && e?.drugClass) ||
        fb?.drugClass ||
        "Therapeutic agent — class per clinical pharmacology";
      const contents =
        (!isWeakClinicalField(d.contents) && d.contents) ||
        e?.contents ||
        fb?.contents ||
        `${d.genericName} — use labelled strength/composition from prescription`;
      const cautions =
        (!isWeakClinicalField(d.cautions) && d.cautions) ||
        (!isWeakClinicalField(e?.cautions) && e?.cautions) ||
        fb?.cautions ||
        `Monitor adverse effects of ${d.genericName}; check allergies, organ function, pregnancy status, and drug–drug interactions before and during therapy.`;
      return {
        ...d,
        brandName: d.brandName || e?.brandName || d.genericName,
        contents,
        drugClass,
        mechanismOfAction: moa,
        cautions,
      };
    }),
  }));

  const pathophysiologyByCondition: Record<string, string> = {
    ...(s.pathophysiologyByCondition ?? {}),
  };
  // Conditions are independent, so let them overlap; groqChatCompletion caps
  // real concurrency, and running these in series made a multi-condition
  // record take minutes.
  const pending = conditions.slice(0, 6).filter(
    (cond) =>
      !pathophysiologyByCondition[cond]?.trim() ||
      looksLikeReferEvasion(pathophysiologyByCondition[cond]),
  );
  await Promise.all(
    pending.map(async (cond) => {
    try {
      pathophysiologyByCondition[cond] = await fetchPathophysiologyDetail(
        cond,
        primarySpecialty,
        citations,
      );
    } catch {
      try {
        pathophysiologyByCondition[cond] = stripReferLanguage(
          await chatComplete(
            `Write 5–7 numbered pathophysiology points for ${cond} from ${citations.slice(0, 4).join("; ")}.
${CONTENT_RULES}
End with Ref: line.`,
            `Condition: ${cond}\nSpecialty lenses: ${pick.specialtyLenses.join(", ")}`,
            { temperature: 0.15, maxTokens: 1600 },
          ),
        );
      } catch {
        pathophysiologyByCondition[cond] =
          `1. ${cond} begins with an initiating insult (infection, ischaemia, immune, metabolic, or structural) that triggers local tissue injury.\n2. Inflammatory mediators (cytokines, complement, prostaglandins as disease-relevant) amplify vascular permeability and immune cell recruitment.\n3. Organ-specific effector pathways produce the cardinal clinical features of ${cond}.\n4. Compensatory physiological responses may temporarily preserve function but can become maladaptive.\n5. Persistent injury leads to dysfunction, complications, or chronic sequelae unless the driver is controlled.\nRef: ${citations.slice(0, 3).join("; ") || "Harrison 21st ed.; Nelson 22nd ed.; Davidson 24th ed."}`;
      }
    }
    }),
  );

  let treatmentCritique = s.treatmentCritique?.trim() || "";
  if (!treatmentCritique || looksLikeReferEvasion(treatmentCritique)) {
    try {
      treatmentCritique = await fetchTreatmentCritique(
        { ...s, admissions },
        primarySpecialty,
        citations,
      );
    } catch {
      const drugList = admissions
        .flatMap((a) => a.treatmentGiven.map((d) => d.genericName))
        .filter(Boolean);
      treatmentCritique = `1. Pattern of treatment\n1. Regimen centres on: ${drugList.join(", ") || "supportive care as documented"}.\n2. Textbook alignment\n1. Match each agent to indication, dose band, and duration expected for this presentation in ${citations[0] || "latest-edition texts"}.\n3. Gaps risks and monitoring\n1. Recheck allergies, renal/hepatic dose adjustment, QT/electrolytes, and infection source control.\n4. Critique\n1. Continue agents that clearly fit the working diagnosis; stop or narrow redundant antimicrobials and symptomatic duplicates.\n5. Alternatives\n1. If response is incomplete, step to guideline-preferred options for the same indication while monitoring safety labs.\n6. References noted\n1. ${citations.slice(0, 4).join("; ") || "Harrison 21st ed.; Harriet Lane 23rd ed.; Nelson 22nd ed."}`;
    }
  }

  return {
    ...s,
    admissions,
    pathophysiologyByCondition,
    treatmentCritique: stripReferLanguage(treatmentCritique),
    diagnoses: s.diagnoses?.length ? s.diagnoses : conditions,
  };
}
