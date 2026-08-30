/**
 * Pregnancy comorbidity dosing guide: for each maternal condition, the drug,
 * dose and timing changes required during pregnancy, with the guideline the
 * advice is taken from. `timed` notes carry gestational-week windows so the
 * UI can flag what applies at the entered gestational age.
 *
 * Sources are named per entry: NICE, ACOG, RCOG, WHO, ATA 2017, ADA, GINA,
 * ILAE, ESC 2018, EULAR, AASLD, and standard obstetric texts (Williams).
 */

export type TimedNote = {
  /** applies from this completed week of gestation (inclusive) */
  from?: number;
  /** applies until this completed week of gestation (inclusive) */
  to?: number;
  note: string;
};

export type PregDosingEntry = {
  condition: string;
  aliases?: string[];
  changes: string[];
  timed?: TimedNote[];
  ref: string;
};

export const PREGNANCY_CONDITION_DOSING: PregDosingEntry[] = [
  {
    condition: "Hypothyroidism",
    aliases: ["thyroid", "levothyroxine", "TSH"],
    changes: [
      "Increase levothyroxine by 25–30% as soon as pregnancy is confirmed (simplest method: take 2 extra tablets per week, i.e. 9 doses/week).",
      "Check TSH every 4 weeks until 20 weeks, then once per trimester; target TSH < 2.5 mIU/L.",
      "Timing: take on an empty stomach, 30–60 min before food; separate from iron and calcium supplements by at least 4 hours.",
      "Return to the pre-pregnancy dose immediately after delivery; recheck TSH at 6 weeks postpartum.",
    ],
    ref: "ATA 2017 thyroid-in-pregnancy guideline",
  },
  {
    condition: "Hyperthyroidism (Graves)",
    aliases: ["thyrotoxicosis", "graves", "carbimazole", "PTU"],
    changes: [
      "First trimester: use propylthiouracil (PTU) 50–150 mg every 8 h — carbimazole/methimazole is teratogenic in weeks 6–10.",
      "After the first trimester, switch back to carbimazole/methimazole (lower hepatotoxicity than PTU); conversion ≈ PTU 100 mg : carbimazole 10 mg.",
      "Use the lowest dose keeping free T4 at or just above the upper limit; requirements usually fall as pregnancy advances — many can stop by the third trimester.",
      "Never use block-and-replace in pregnancy; radioiodine is absolutely contraindicated.",
    ],
    timed: [{ to: 13, note: "PTU preferred now (organogenesis window)." }, { from: 14, note: "Switch to carbimazole/methimazole from now if still needed." }],
    ref: "ATA 2017 · Endocrine Society",
  },
  {
    condition: "Diabetes mellitus (pre-existing, type 1 or 2)",
    aliases: ["T1DM", "T2DM", "insulin", "sugar"],
    changes: [
      "Stop SGLT2 inhibitors, GLP-1 agonists, and sulfonylureas other than glibenclamide before or at conception; insulin is the standard; metformin may be continued.",
      "Insulin needs often DIP around 9–16 weeks (hypoglycaemia risk — reduce basal 10–20% if lows), then RISE steadily from ~16 weeks, commonly to 1.5–2× the pre-pregnancy dose by the third trimester.",
      "Targets: fasting < 95 mg/dL, 1-h post-meal < 140, 2-h < 120; check HbA1c each trimester.",
      "Halve insulin immediately after delivery of the placenta — requirements crash to at or below pre-pregnancy doses.",
      "Folic acid 5 mg daily from pre-conception to 12 weeks; aspirin 75–150 mg from 12 weeks for pre-eclampsia prevention.",
    ],
    timed: [{ from: 12, note: "Start aspirin 75–150 mg nightly if not already started." }],
    ref: "NICE NG3 · ADA Standards of Care",
  },
  {
    condition: "Gestational diabetes",
    aliases: ["GDM", "OGTT"],
    changes: [
      "Trial of diet and exercise for 1–2 weeks; start metformin and/or insulin if fasting ≥ 95 mg/dL or 1-h post-meal ≥ 140 mg/dL persists.",
      "Insulin doses escalate with gestation — review at least every 1–2 weeks in the third trimester.",
      "STOP all glucose-lowering treatment immediately after delivery; check fasting glucose before discharge and a 75-g OGTT or fasting glucose at 6–13 weeks postpartum.",
    ],
    ref: "NICE NG3 · ADA",
  },
  {
    condition: "Hypertension (chronic)",
    aliases: ["HTN", "high blood pressure", "amlodipine", "telmisartan"],
    changes: [
      "STOP ACE inhibitors, ARBs and direct renin inhibitors at conception (fetal renal toxicity) — switch the same day, do not taper.",
      "First-line replacements: labetalol 100 mg twice daily (titrate to max 2.4 g/day), modified-release nifedipine 10–20 mg twice daily, or methyldopa 250 mg 2–3 times daily.",
      "Avoid atenolol (growth restriction) and start no new thiazides; target BP ≤ 135/85 mmHg.",
      "Add aspirin 75–150 mg nightly from 12 weeks until 36 weeks for pre-eclampsia prophylaxis.",
      "Methyldopa should be switched to another agent within 2 days after delivery (postnatal depression risk).",
    ],
    timed: [{ from: 12, to: 36, note: "Aspirin prophylaxis window — give 75–150 mg at night." }],
    ref: "NICE NG133 · ACOG PB 203",
  },
  {
    condition: "Pre-eclampsia / high pre-eclampsia risk",
    aliases: ["PIH", "toxemia", "eclampsia"],
    changes: [
      "Aspirin 75–150 mg nightly from 12 weeks (before 16 weeks gives most benefit) until 36 weeks.",
      "Calcium 1.5–2 g elemental per day where dietary intake is low (WHO).",
      "Severe hypertension (≥ 160/110): IV labetalol (20 mg then escalating), oral nifedipine 10 mg repeated, or IV hydralazine 5–10 mg — with continuous monitoring.",
      "Magnesium sulfate for severe pre-eclampsia/eclampsia: 4 g IV loading over 5–15 min, then 1 g/h infusion for 24 h after delivery or last seizure (Zuspan). Halve maintenance and monitor levels if creatinine raised.",
    ],
    ref: "NICE NG133 · WHO · MAGPIE",
  },
  {
    condition: "Epilepsy",
    aliases: ["seizure", "lamotrigine", "levetiracetam", "valproate"],
    changes: [
      "NEVER start or continue valproate in pregnancy unless no alternative controls seizures (neural tube defects, neurodevelopmental harm); avoid topiramate where possible.",
      "Lamotrigine and levetiracetam clearance rises 2–3×: check a pre-pregnancy (baseline) level, then monthly levels, and up-titrate the dose to keep the baseline level.",
      "Taper the increased dose back over 2–3 weeks after delivery to avoid postpartum toxicity.",
      "Folic acid 5 mg daily from before conception through at least the first trimester.",
      "Do not stop antiseizure medication abruptly — uncontrolled seizures are more dangerous to the pregnancy than the preferred drugs.",
    ],
    ref: "ILAE · NICE epilepsies NG217 · MBRRACE",
  },
  {
    condition: "Venous thromboembolism (DVT / PE)",
    aliases: ["DVT", "pulmonary embolism", "warfarin", "clot"],
    changes: [
      "Switch warfarin and all DOACs (rivaroxaban, apixaban, dabigatran) to low-molecular-weight heparin as soon as pregnancy is confirmed — ideally by 6 weeks.",
      "Treatment dose: enoxaparin 1 mg/kg every 12 h based on booking weight (dalteparin 100 IU/kg q12h).",
      "Prophylactic dose: enoxaparin 40 mg once daily (60 mg if 90–130 kg).",
      "Timing around delivery: omit LMWH once labour starts; no regional anaesthesia within 24 h of a treatment dose (12 h of a prophylactic dose).",
      "Continue anticoagulation at least 6 weeks postpartum (minimum 3 months total for an antenatal event); warfarin and LMWH are both safe in breastfeeding.",
    ],
    ref: "RCOG Green-top 37a/b",
  },
  {
    condition: "Thrombophilia / antiphospholipid syndrome",
    aliases: ["APLA", "APS", "recurrent miscarriage"],
    changes: [
      "Obstetric APS: aspirin 75–150 mg from positive pregnancy test PLUS prophylactic LMWH (enoxaparin 40 mg daily) once fetal heart seen.",
      "Continue LMWH until 6 weeks postpartum.",
    ],
    ref: "EULAR 2019 · RCOG",
  },
  {
    condition: "Mechanical heart valve",
    aliases: ["prosthetic valve"],
    changes: [
      "High-risk specialist decision: options are dose-adjusted LMWH twice daily with anti-Xa monitoring (peak 0.8–1.2 IU/mL), or continuing warfarin when the dose is ≤ 5 mg/day after counselling (embryopathy risk in weeks 6–12).",
      "Warfarin must be replaced by heparin by 36 weeks in all cases before delivery.",
      "Refer to a joint cardiac-obstetric clinic — do not manage on a calculator.",
    ],
    ref: "ESC 2018 pregnancy & heart disease",
  },
  {
    condition: "Atrial fibrillation / SVT",
    aliases: ["arrhythmia", "palpitations"],
    changes: [
      "Stop DOACs; anticoagulate with LMWH where indicated.",
      "Rate control: metoprolol or digoxin at usual doses (digoxin levels fall — may need modest increase; unreliable assay in pregnancy).",
      "Adenosine is safe for acute SVT termination at standard doses.",
      "Avoid amiodarone (fetal thyroid) except life-threatening arrhythmia.",
    ],
    ref: "ESC 2018",
  },
  {
    condition: "Heart failure / cardiomyopathy",
    aliases: ["peripartum cardiomyopathy", "low EF"],
    changes: [
      "STOP ACE inhibitors, ARBs, ARNI (sacubitril-valsartan), MRAs (spironolactone/eplerenone) and SGLT2 inhibitors.",
      "Use instead: hydralazine + oral nitrates for afterload, metoprolol succinate or bisoprolol (continue beta-blocker if already on it), furosemide only for congestion (watch placental perfusion).",
      "Joint cardiac-obstetric care is mandatory.",
    ],
    ref: "ESC 2018",
  },
  {
    condition: "Asthma",
    aliases: ["wheeze", "inhaler", "budesonide"],
    changes: [
      "Continue inhaled corticosteroids at the usual dose — budesonide has the largest safety dataset; stopping ICS is the main cause of deterioration.",
      "SABA (salbutamol) and LABA/formoterol combinations continue unchanged; montelukast may continue if it was needed for control.",
      "Exacerbations: treat exactly as non-pregnant, including oral prednisolone 40 mg — undertreatment harms the fetus more than steroids.",
    ],
    ref: "GINA · BTS/SIGN",
  },
  {
    condition: "Depression",
    aliases: ["SSRI", "antidepressant", "sertraline"],
    changes: [
      "Sertraline 50 mg (titrate as needed) is the preferred SSRI; citalopram is an alternative. Avoid starting paroxetine (cardiac malformation signal).",
      "Do not stop an effective antidepressant abruptly — relapse risk outweighs medication risk in moderate–severe depression.",
      "Third-trimester SSRI exposure: brief neonatal adaptation syndrome possible — inform the paediatric team; no dose change needed.",
    ],
    ref: "NICE CG192 antenatal mental health",
  },
  {
    condition: "Anxiety disorder",
    aliases: ["panic", "GAD"],
    changes: [
      "Sertraline is first-line, as in depression.",
      "Avoid regular benzodiazepines, especially near term (neonatal hypotonia and withdrawal); if unavoidable, use the lowest dose short-term.",
      "Promethazine is an accepted short-term option for severe sleep or anxiety symptoms.",
    ],
    ref: "NICE CG192",
  },
  {
    condition: "Bipolar disorder",
    aliases: ["lithium", "mania"],
    changes: [
      "Avoid valproate and carbamazepine entirely.",
      "If lithium is continued: clearance rises, so check levels every 4 weeks until 36 weeks, then WEEKLY; dose usually needs increasing; hold lithium during labour and give the pre-pregnancy dose after delivery with a level check.",
      "Anomaly scan with fetal echocardiography (Ebstein anomaly risk is small but real).",
      "Quetiapine or olanzapine are reasonable alternatives when switching is planned.",
    ],
    ref: "NICE CG192",
  },
  {
    condition: "Schizophrenia / psychosis",
    aliases: ["antipsychotic", "olanzapine"],
    changes: [
      "Continue the effective antipsychotic — relapse is the greater danger; olanzapine and quetiapine carry the most reassurance data.",
      "Olanzapine/quetiapine worsen glucose tolerance: screen for gestational diabetes with an OGTT at 24–28 weeks.",
      "Avoid depot initiation in pregnancy; do not use anticholinergics routinely.",
    ],
    ref: "NICE CG192",
  },
  {
    condition: "Urinary tract infection",
    aliases: ["UTI", "cystitis", "dysuria", "bacteriuria"],
    changes: [
      "Treat even asymptomatic bacteriuria (pyelonephritis and preterm-labour risk): 7 days of treatment, then repeat culture.",
      "Nitrofurantoin 100 mg twice daily — but AVOID from 36 weeks (neonatal haemolysis risk); cephalexin 500 mg twice–three times daily is the alternative.",
      "Avoid trimethoprim in the first trimester (folate antagonist) and fluoroquinolones throughout.",
      "Fosfomycin 3 g single dose is an accepted alternative.",
    ],
    timed: [{ from: 36, note: "Do not use nitrofurantoin from now — switch to cephalexin." }],
    ref: "NICE NG109 · IDSA",
  },
  {
    condition: "Pyelonephritis",
    aliases: ["kidney infection"],
    changes: [
      "Admit; IV ceftriaxone 1–2 g once daily (or cefuroxime 1.5 g q8h) until afebrile 48 h, then oral step-down (cephalexin) to complete 10–14 days.",
      "Avoid gentamicin unless resistant organism forces it (fetal ototoxicity — if used, once-daily dosing with levels).",
    ],
    ref: "Williams Obstetrics · IDSA",
  },
  {
    condition: "Tuberculosis",
    aliases: ["TB", "ATT", "rifampicin", "isoniazid"],
    changes: [
      "Standard 4-drug therapy (isoniazid, rifampicin, ethambutol, pyrazinamide) at usual weight-band doses is SAFE and should not be interrupted.",
      "Add pyridoxine 25 mg daily with isoniazid.",
      "Streptomycin and other aminoglycosides are contraindicated (congenital deafness).",
      "Rifampicin near delivery: give the neonate vitamin K at birth (haemorrhagic disease risk).",
    ],
    ref: "WHO TB guidelines · NTEP India",
  },
  {
    condition: "HIV",
    aliases: ["ART", "antiretroviral", "dolutegravir"],
    changes: [
      "Continue or start ART without interruption — dolutegravir-based regimens (TLD) are recommended including at conception.",
      "No routine dose changes for TLD; check viral load at booking and around 36 weeks to plan delivery.",
      "Avoid stopping any component; missed suppression, not the drugs, is the transmission risk. Neonatal prophylaxis per national protocol.",
    ],
    ref: "WHO 2021 · NACO",
  },
  {
    condition: "Hepatitis B",
    aliases: ["HBV", "HBsAg"],
    changes: [
      "Check HBV DNA: if > 200,000 IU/mL, start tenofovir disoproxil 300 mg daily from 28 weeks to reduce vertical transmission; continue 4–12 weeks postpartum.",
      "Newborn needs hepatitis B vaccine AND immunoglobulin within 12 h of birth regardless of maternal treatment.",
    ],
    timed: [{ from: 28, note: "Tenofovir prophylaxis window starts now for high viral load." }],
    ref: "AASLD · WHO 2020",
  },
  {
    condition: "Malaria",
    aliases: ["falciparum", "vivax", "chloroquine"],
    changes: [
      "Uncomplicated falciparum: artemisinin combination therapy (ACT) at standard doses in ALL trimesters (WHO 2022 now includes the first trimester).",
      "Severe malaria: IV artesunate at standard weight-based dosing — do not reduce the dose.",
      "Vivax: chloroquine standard 3-day course; DEFER primaquine until after delivery (fetal G6PD unknown) — give weekly chloroquine prophylaxis instead until then.",
    ],
    ref: "WHO malaria guidelines 2023",
  },
  {
    condition: "Anemia (iron deficiency)",
    aliases: ["IDA", "low hemoglobin", "iron"],
    changes: [
      "Oral elemental iron 100–200 mg daily (or alternate-day dosing — better absorbed, fewer side effects); take away from tea/calcium; recheck Hb in 2–3 weeks (expect ≥ 1 g/dL rise).",
      "IV iron (ferric carboxymaltose or iron sucrose) from the SECOND trimester when oral iron fails, is not tolerated, or Hb < 8 g/dL near term; contraindicated in the first trimester.",
      "Continue folic acid throughout; treat for 3 months after Hb normalises to refill stores.",
    ],
    timed: [{ from: 14, note: "IV iron becomes an option from the second trimester." }],
    ref: "FOGSI/GOI anemia protocol · BSH",
  },
  {
    condition: "Sickle cell disease",
    aliases: ["SCD", "hydroxyurea"],
    changes: [
      "STOP hydroxyurea ideally 3 months before conception; stop immediately if found pregnant on it.",
      "Folic acid 5 mg daily throughout; continue penicillin prophylaxis if asplenic.",
      "Aspirin 75–150 mg from 12 weeks (pre-eclampsia risk); consider prophylactic LMWH with additional risk factors or admission.",
      "Crises: treat aggressively — hydration, oxygen, opioid analgesia at standard doses (avoid NSAIDs after 28 weeks).",
    ],
    ref: "RCOG Green-top 61",
  },
  {
    condition: "Thalassemia",
    aliases: ["chelation", "deferasirox"],
    changes: [
      "STOP iron chelators (deferasirox, deferiprone, desferrioxamine) before conception; desferrioxamine may be considered after the first trimester only for severe overload under specialist care.",
      "Folic acid 5 mg daily; transfusion targets unchanged; monitor cardiac iron pre-pregnancy.",
    ],
    ref: "UK Thalassaemia Society · RCOG",
  },
  {
    condition: "Immune thrombocytopenia",
    aliases: ["ITP", "low platelets"],
    changes: [
      "Treat when platelets < 20–30 ×10⁹/L or bleeding: prednisolone 20 mg daily (lowest effective) is first-line; IVIG 1 g/kg when a rapid rise is needed.",
      "Target ≥ 50 ×10⁹/L for delivery and ≥ 70–80 for neuraxial anaesthesia.",
      "Avoid rituximab and thrombopoietin agonists unless refractory (specialist).",
    ],
    ref: "ASH 2019 ITP guideline",
  },
  {
    condition: "Rheumatoid arthritis",
    aliases: ["RA", "methotrexate", "DMARD"],
    changes: [
      "STOP methotrexate 1–3 months before conception (folic acid 5 mg after exposure); STOP leflunomide with cholestyramine washout.",
      "SAFE to continue: hydroxychloroquine, sulfasalazine (with folic acid 5 mg), azathioprine, low-dose prednisolone.",
      "NSAIDs: avoid in the first trimester if possible and STOP by 28 weeks (ductus arteriosus).",
      "Biologics: certolizumab has least placental transfer and can continue throughout; other TNF inhibitors usually stop in the third trimester.",
    ],
    timed: [{ from: 28, note: "All NSAIDs contraindicated from now." }],
    ref: "EULAR 2016 · BSR 2023",
  },
  {
    condition: "Systemic lupus erythematosus",
    aliases: ["SLE", "lupus"],
    changes: [
      "CONTINUE hydroxychloroquine in every lupus pregnancy — stopping doubles flare risk.",
      "Aspirin 75–150 mg from 12 weeks (pre-eclampsia prevention).",
      "STOP mycophenolate (switch to azathioprine ≥ 6 weeks pre-conception) and cyclophosphamide.",
      "Flares: prednisolone at the lowest effective dose; azathioprine, tacrolimus and ciclosporin are compatible.",
      "Anti-Ro/La positive: fetal heart-rate surveillance weeks 16–26 (congenital heart block).",
    ],
    ref: "EULAR 2016 · ACR reproductive health 2020",
  },
  {
    condition: "Inflammatory bowel disease",
    aliases: ["IBD", "Crohn", "ulcerative colitis", "mesalazine"],
    changes: [
      "Continue mesalazine/sulfasalazine (add folic acid 5 mg with sulfasalazine) and azathioprine at usual doses — flares harm the pregnancy more.",
      "STOP methotrexate and tofacitinib.",
      "Anti-TNF (infliximab/adalimumab) continue at least to the early third trimester; if stopped, give the last dose around 24–26 weeks and avoid live vaccines in the infant for 6 months.",
      "Steroids for flares as in non-pregnant patients.",
    ],
    ref: "ECCO pregnancy consensus · Toronto consensus",
  },
  {
    condition: "Organ transplant recipient",
    aliases: ["tacrolimus", "renal transplant", "ciclosporin"],
    changes: [
      "Tacrolimus and ciclosporin CONTINUE — but levels FALL as pregnancy progresses: check levels every 2–4 weeks and increase the dose to maintain the pre-pregnancy trough.",
      "STOP mycophenolate ≥ 6 weeks before conception; replace with azathioprine.",
      "Prednisolone continues at the usual dose.",
      "Reduce tacrolimus back stepwise after delivery as levels rise again.",
    ],
    ref: "KDIGO · AST consensus",
  },
  {
    condition: "Chronic kidney disease",
    aliases: ["CKD", "renal impairment", "proteinuria"],
    changes: [
      "STOP ACE inhibitors and ARBs at conception; use labetalol/nifedipine for BP.",
      "Interpretation changes: pregnancy raises GFR ~50%, so a creatinine ≥ 0.8–0.9 mg/dL that looks 'normal' already suggests reduced reserve; eGFR equations are NOT validated in pregnancy — follow serum creatinine trends.",
      "Renally cleared drugs (LMWH, cephalosporins, gabapentin) may paradoxically need HIGHER or more frequent dosing early in pregnancy when GFR is supranormal — but dose-reduce as for CKD when creatinine is raised.",
      "Aspirin 75–150 mg from 12 weeks; monitor for superimposed pre-eclampsia.",
    ],
    ref: "KDIGO · NICE NG133 · Williams Obstetrics",
  },
  {
    condition: "Prolactinoma",
    aliases: ["cabergoline", "pituitary adenoma"],
    changes: [
      "Microadenoma: STOP cabergoline/bromocriptine once pregnancy is confirmed; monitor symptoms (headache, visual fields) each trimester.",
      "Macroadenoma: usually continue the dopamine agonist through pregnancy — endocrinology decision.",
    ],
    ref: "Endocrine Society 2011",
  },
  {
    condition: "Migraine",
    aliases: ["headache"],
    changes: [
      "Acute: paracetamol 1 g first-line; sumatriptan is acceptable when needed; anti-emetic (metoclopramide short-course) helps.",
      "AVOID: ergotamine (uterotonic — contraindicated), aspirin analgesic doses and NSAIDs after 28 weeks, opioid overuse.",
      "Prophylaxis if needed: propranolol 40–80 mg twice daily (lowest effective) or amitriptyline 10–25 mg at night; STOP topiramate and valproate; stop candesartan/lisinopril prophylaxis.",
    ],
    timed: [{ from: 28, note: "NSAIDs contraindicated from now." }],
    ref: "AHS · NICE headaches",
  },
  {
    condition: "Peptic ulcer / GERD",
    aliases: ["reflux", "heartburn", "omeprazole"],
    changes: [
      "Step up: lifestyle → antacids/alginates (Gaviscon) → ranitidine-alternatives famotidine 20–40 mg → omeprazole 20 mg daily (safe, most data of the PPIs).",
      "H. pylori eradication: usually DEFER until after delivery and breastfeeding; treat only complicated disease.",
    ],
    ref: "ACG pregnancy monograph",
  },
  {
    condition: "Nausea & vomiting of pregnancy / hyperemesis",
    aliases: ["morning sickness", "vomiting", "HG"],
    changes: [
      "First-line: doxylamine 10 mg + pyridoxine 10 mg at night (up to QID per label).",
      "Second-line: promethazine 12.5–25 mg or metoclopramide 10 mg TDS (metoclopramide max 5 days — dystonia).",
      "Ondansetron 4–8 mg: effective third-line; counsel on the small first-trimester oral-cleft signal.",
      "Hyperemesis: give IV thiamine 100 mg BEFORE any dextrose (Wernicke prevention); rehydrate with saline, not dextrose first.",
    ],
    ref: "RCOG Green-top 69 · ACOG",
  },
  {
    condition: "Constipation",
    aliases: ["laxative"],
    changes: [
      "Fibre and fluids first; lactulose 15 mL twice daily or macrogol are safe throughout.",
      "Senna is acceptable short-term; avoid castor oil (uterine contractions) and liquid paraffin.",
    ],
    ref: "NICE antenatal care",
  },
  {
    condition: "Allergic rhinitis / urticaria",
    aliases: ["antihistamine", "cetirizine", "allergy"],
    changes: [
      "Loratadine 10 mg or cetirizine 10 mg daily are the preferred antihistamines.",
      "Intranasal budesonide/beclometasone safe for rhinitis; avoid oral decongestants (pseudoephedrine) in the first trimester.",
    ],
    ref: "BSACI · ACOG",
  },
  {
    condition: "Vaginal candidiasis",
    aliases: ["thrush", "fluconazole", "candida"],
    changes: [
      "Topical clotrimazole for 7 days (longer course needed than non-pregnant; pessary at night).",
      "AVOID oral fluconazole, especially in the first trimester (malformation and miscarriage signals).",
    ],
    ref: "CDC STI guidelines 2021",
  },
  {
    condition: "Bacterial vaginosis",
    aliases: ["BV", "discharge"],
    changes: [
      "Oral metronidazole 400–500 mg twice daily for 7 days (avoid the 2-g single dose in pregnancy); clindamycin cream is an alternative.",
    ],
    ref: "CDC 2021 · BASHH",
  },
  {
    condition: "Chlamydia",
    aliases: ["STI"],
    changes: [
      "Azithromycin 1 g single dose (repeat test-of-cure at 4 weeks — required in pregnancy).",
      "AVOID doxycycline (teeth/bone) and ofloxacin.",
    ],
    ref: "CDC 2021",
  },
  {
    condition: "Gonorrhea",
    changes: [
      "Ceftriaxone 500 mg IM single dose (1 g if ≥ 150 kg); test-of-cure in pregnancy.",
      "Avoid fluoroquinolones and tetracyclines.",
    ],
    ref: "CDC 2021",
  },
  {
    condition: "Syphilis",
    aliases: ["VDRL", "penicillin"],
    changes: [
      "Benzathine penicillin G 2.4 MU IM — single dose for early syphilis, weekly ×3 for late/unknown duration. Penicillin is the ONLY treatment that protects the fetus.",
      "Penicillin allergy: desensitise and still give penicillin — do not substitute doxycycline.",
      "Warn about the Jarisch-Herxheimer reaction (can trigger contractions after 20 weeks).",
    ],
    ref: "CDC 2021 · WHO",
  },
  {
    condition: "Genital herpes",
    aliases: ["HSV", "aciclovir"],
    changes: [
      "First episode or recurrences: aciclovir 400 mg three times daily for 5 days at standard doses (safe in all trimesters).",
      "Suppression: aciclovir 400 mg three times daily from 36 weeks until delivery for anyone with recurrences in pregnancy.",
      "First episode in the third trimester → discuss caesarean delivery.",
    ],
    timed: [{ from: 36, note: "Start suppressive aciclovir 400 mg TDS now if there were recurrences." }],
    ref: "RCOG/BASHH · ACOG PB 220",
  },
  {
    condition: "Influenza",
    aliases: ["flu", "oseltamivir"],
    changes: [
      "Oseltamivir 75 mg twice daily for 5 days at the standard dose — start within 48 h of symptoms; do not withhold for pregnancy (higher complication risk).",
      "Inactivated influenza vaccine is recommended in any trimester.",
    ],
    ref: "CDC · WHO",
  },
  {
    condition: "Intrahepatic cholestasis of pregnancy",
    aliases: ["ICP", "obstetric cholestasis", "itching", "UDCA"],
    changes: [
      "Ursodeoxycholic acid 300 mg twice–three times daily improves itch (weak effect on outcomes — counsel accordingly).",
      "Weekly bile acids/LFTs; bile acids ≥ 100 µmol/L → plan delivery around 35–36 weeks.",
      "Vitamin K 10 mg daily orally if steatorrhoea or prolonged PT.",
    ],
    ref: "RCOG Green-top 43 · PITCHES trial",
  },
  {
    condition: "Obesity (BMI ≥ 30)",
    aliases: ["high BMI"],
    changes: [
      "Folic acid 5 mg (not 400 µg) until 12 weeks; vitamin D 10 µg daily.",
      "Aspirin 75–150 mg from 12 weeks when another moderate risk factor is present.",
      "LMWH prophylaxis doses go UP by weight band (e.g. enoxaparin 40 mg → 60 mg for 90–130 kg); reassess VTE risk at every admission.",
    ],
    ref: "RCOG Green-top 72 · NICE",
  },
  {
    condition: "Dyslipidemia",
    aliases: ["statin", "cholesterol"],
    changes: [
      "Statins are conventionally WITHHELD in pregnancy (the FDA removed the blanket contraindication in 2021, but routine continuation is still not advised outside familial hypercholesterolaemia — specialist decision).",
      "Stop ezetimibe and fibrates; severe hypertriglyceridaemia (pancreatitis risk) is managed with diet, omega-3 and specialist input.",
    ],
    ref: "FDA 2021 · ESC",
  },
  {
    condition: "Glaucoma",
    aliases: ["eye drops", "timolol"],
    changes: [
      "Use the lowest effective drop dose with punctal occlusion for 2 min to cut systemic absorption.",
      "Timolol 0.25% and brimonidine are commonly continued (stop brimonidine before delivery — neonatal CNS depression); avoid oral carbonic anhydrase inhibitors in the first trimester.",
    ],
    ref: "EGS guideline",
  },
  {
    condition: "Myasthenia gravis",
    aliases: ["pyridostigmine"],
    changes: [
      "Continue pyridostigmine at the usual oral dose (may need more frequent smaller doses as gastric emptying changes); avoid IV cholinesterase inhibitors (uterine contractions).",
      "Prednisolone/azathioprine may continue; STOP mycophenolate and methotrexate.",
      "CAUTION: magnesium sulfate (for pre-eclampsia) can precipitate severe crisis — use only for eclampsia itself with anaesthetic support; many aminoglycosides also worsen weakness.",
    ],
    ref: "International MG consensus 2020",
  },
  {
    condition: "Multiple sclerosis",
    aliases: ["MS", "interferon"],
    changes: [
      "Interferon-beta and glatiramer may continue when disease activity requires; natalizumab continuation is a specialist decision (rebound risk if stopped).",
      "STOP teriflunomide (cholestyramine washout) and fingolimod ≥ 2 months pre-conception.",
      "Relapses: methylprednisolone pulses at standard doses are acceptable.",
    ],
    ref: "AAN · ECTRIMS",
  },
  {
    condition: "Psoriasis",
    aliases: ["acitretin"],
    changes: [
      "STOP acitretin (3-year washout needed — switch pre-conception) and methotrexate.",
      "Emollients, moderate topical steroids and calcipotriol (small areas) are fine; ciclosporin or certolizumab for severe disease.",
      "Narrowband UVB is safe — supplement folic acid.",
    ],
    ref: "BAD guideline",
  },
  {
    condition: "Acne",
    aliases: ["isotretinoin", "retinoid"],
    changes: [
      "STOP isotretinoin immediately — major teratogen; also stop topical retinoids and oral tetracyclines.",
      "Use instead: topical azelaic acid, benzoyl peroxide, topical/oral erythromycin.",
    ],
    ref: "AAD · MHRA",
  },
  {
    condition: "Pain (chronic / musculoskeletal)",
    aliases: ["analgesic", "backache", "NSAID"],
    changes: [
      "Paracetamol 500 mg–1 g up to four times daily is the analgesic of choice throughout.",
      "NSAIDs (ibuprofen, diclofenac): avoid in the first trimester if possible, and CONTRAINDICATED from 28 weeks (premature ductus closure, oligohydramnios); from 20 weeks use only briefly if essential.",
      "Opioids: lowest dose, shortest course; sustained use near term → neonatal withdrawal, alert paediatrics.",
      "Stop gabapentinoids unless epilepsy/neuropathic pain justifies them (discuss).",
    ],
    timed: [{ from: 20, to: 27, note: "NSAIDs only if essential and briefly — check amniotic fluid if > 48 h use." }, { from: 28, note: "NSAIDs contraindicated from now." }],
    ref: "FDA 2020 NSAID warning · RCOG",
  },
  {
    condition: "Threatened preterm labour",
    aliases: ["tocolysis", "steroids for lungs", "preterm"],
    changes: [
      "Antenatal corticosteroids between 24+0 and 33+6 weeks (consider to 36+6): betamethasone 12 mg IM, 2 doses 24 h apart (or dexamethasone 6 mg q12h ×4).",
      "Tocolysis: nifedipine 20 mg oral then 10–20 mg q6–8h (first-line); avoid combining with magnesium; atosiban where available.",
      "Magnesium sulfate 4 g IV for fetal neuroprotection when delivery < 32 weeks is imminent.",
    ],
    timed: [{ from: 24, to: 34, note: "Corticosteroid window — give betamethasone if delivery risk." }],
    ref: "NICE NG25 · ACOG",
  },
  {
    condition: "Scabies / head lice",
    changes: ["Permethrin 5% cream (scabies) or 1% lotion (lice) — safe in pregnancy; AVOID oral ivermectin (limited data) and lindane."],
    ref: "CDC · BNF",
  },
  {
    condition: "Intestinal worms",
    aliases: ["deworming", "albendazole"],
    changes: ["Defer albendazole/mebendazole until after the first trimester; single-dose albendazole 400 mg is then acceptable (WHO deworming programmes include pregnant women in T2/3)."],
    ref: "WHO",
  },
  {
    condition: "Vitamin D deficiency",
    changes: ["Cholecalciferol 1,000–2,000 IU daily is safe; treat proven deficiency with up to 4,000 IU/day — avoid stoss (mega-dose) regimens in pregnancy."],
    ref: "RCOG · Endocrine Society",
  },
  {
    condition: "Restless legs syndrome",
    changes: [
      "Check ferritin — treat with iron when < 75 µg/L (most pregnancy RLS is iron-responsive).",
      "Avoid starting dopamine agonists; severe refractory cases are specialist territory.",
    ],
    ref: "IRLSSG",
  },
  {
    condition: "Hypothyroidism (subclinical)",
    aliases: ["subclinical thyroid"],
    changes: [
      "TPO-antibody positive with TSH above the trimester reference: start levothyroxine ~50 µg daily and titrate 4-weekly.",
      "TPO-negative with TSH < 10: treatment is reasonable but evidence weaker — many treat in pregnancy.",
    ],
    ref: "ATA 2017",
  },
  {
    condition: "Cancer (on chemotherapy)",
    aliases: ["chemo", "malignancy", "oncology"],
    changes: [
      "Chemotherapy is generally DEFERRED past the first trimester; many regimens (e.g. anthracycline-based) can be given in T2/T3 at standard body-surface-area doses — do not dose-reduce for pregnancy alone.",
      "Stop chemotherapy ~3 weeks before planned delivery (marrow recovery); no methotrexate at any gestation.",
      "Trastuzumab and endocrine therapy (tamoxifen, AIs) are withheld during pregnancy.",
      "All decisions belong to a joint oncology-obstetric MDT.",
    ],
    ref: "ESMO pregnancy & cancer 2020",
  },
  {
    condition: "COVID-19",
    aliases: ["coronavirus", "SARS-CoV-2"],
    changes: [
      "Symptomatic treatment with paracetamol; avoid NSAIDs after 28 weeks as usual.",
      "Hospitalised needing oxygen: prednisolone 40 mg oral/hydrocortisone IV replaces dexamethasone for maternal benefit when fetal lung maturation is NOT the aim; use dexamethasone doses only when steroids for fetal lungs are also indicated.",
      "LMWH thromboprophylaxis for admitted patients unless delivery imminent.",
    ],
    ref: "RCOG COVID-19 guidance",
  },
  {
    condition: "Lactation (postpartum dosing planning)",
    aliases: ["breastfeeding"],
    changes: [
      "Most drug doses return to pre-pregnancy values after delivery — plan the step-down at discharge (insulin halves; lamotrigine tapers over 2–3 weeks; levothyroxine back to booking dose; tacrolimus down as levels rise).",
      "Warfarin, LMWH, most antibiotics, SSRIs (sertraline) and antiepileptics are breastfeeding-compatible; avoid codeine (ultrarapid metabolisers) and estrogen pills in the first 6 weeks.",
    ],
    ref: "LactMed · NICE",
  },
];

/** Search entries by condition name or alias (case-insensitive substring). */
export function searchPregnancyConditions(query: string): PregDosingEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return PREGNANCY_CONDITION_DOSING.filter(
    (e) =>
      e.condition.toLowerCase().includes(q) ||
      (e.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
  ).slice(0, 10);
}

/**
 * Pregnancy renal context for a serum creatinine (mg/dL).
 * Pregnancy norms are LOWER than non-pregnant: mean ~0.5, upper limit ~0.8.
 */
export function pregnancyRenalNote(scr: number): {
  band: "normal" | "caution" | "alert";
  text: string;
} {
  if (scr <= 0.8)
    return {
      band: "normal",
      text: `Creatinine ${scr} mg/dL is within the pregnancy range (GFR rises ~50%, so normal pregnancy creatinine is ~0.4–0.8 mg/dL). Renally cleared drugs are cleared faster than usual — standard or upper-range doses are typically needed.`,
    };
  if (scr <= 1.1)
    return {
      band: "caution",
      text: `Creatinine ${scr} mg/dL is ABOVE the pregnancy range (upper limit ~0.8 mg/dL) even though it would look normal outside pregnancy — this suggests reduced renal reserve. Recheck, look for pre-eclampsia, and dose renally cleared drugs cautiously. eGFR equations are not validated in pregnancy; follow the creatinine trend.`,
    };
  return {
    band: "alert",
    text: `Creatinine ${scr} mg/dL indicates significant renal impairment in pregnancy. Involve obstetric medicine/nephrology; dose-adjust renally cleared drugs (LMWH, magnesium sulfate maintenance, aminoglycosides, aciclovir) and avoid nephrotoxins. eGFR equations are not validated in pregnancy.`,
  };
}
