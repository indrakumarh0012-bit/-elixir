/**
 * Pediatric drug schema + India (Bengaluru private OPD) common formulations.
 * Decision support only — verify brand label, Cloherty (neonates), Harriet Lane / Nelson / IAP.
 */

export type DosageForm =
  | "Syrup"
  | "Suspension (dry powder)"
  | "Drops"
  | "Tablet / DT"
  | "Capsule"
  | "Injection (IV/IM)"
  | "Cream / Topical"
  | "Inhalation / Neb"
  | "Other";

export interface DrugFormulation {
  form: DosageForm;
  /** e.g. "125 mg/5 ml" */
  strengthLabel: string;
  /** Numerator mg in the labeled volume */
  strengthMg: number;
  /** Denominator ml (5 for mg/5 ml; 1 for mg/ml drops) */
  strengthVolumeMl: number;
  /** Brands commonly stocked in Indian / Bengaluru private setups */
  commonBrandsIndia: string[];
  packSizes?: string[];
  /** Dropper capacity if applicable */
  dropperCapacityMl?: number;
  /** Usual calibration: many pediatric droppers ≈ 20 drops/ml — confirm on bottle */
  dropsPerMl?: number;
}

export interface IvAdminNote {
  giveSlowly: boolean;
  note: string;
}

export interface PediatricDrug {
  id: string;
  name: string;
  category: string;
  recommendedDose: string;
  defaultDoseMgPerKg: number;
  maxDosePerDayMg: number;
  frequencyOptions: string[];
  defaultFrequency: string;
  defaultDosesPerDay: number;
  /** All clinically used routes for this medicine */
  route: string[];
  cautionsAndContraindications: string[];
  instructions: string;
  referenceSource: string;
  renalAdjustment: boolean;
  formulations: DrugFormulation[];
  ivAdministration?: IvAdminNote;
  neonatalNote?: string;
}

export function dosesPerDayFromFrequency(freq: string): number {
  const map: Record<string, number> = {
    q4h: 6,
    q6h: 4,
    q8h: 3,
    q12h: 2,
    q24h: 1,
    OD: 1,
    BD: 2,
    TDS: 3,
    QID: 4,
  };
  return map[freq] ?? 1;
}

/** mg → ml using labeled strength */
export function mgToMl(doseMg: number, f: DrugFormulation): number | null {
  if (!f.strengthVolumeMl || !f.strengthMg) return null;
  const mgPerMl = f.strengthMg / f.strengthVolumeMl;
  if (mgPerMl <= 0) return null;
  return doseMg / mgPerMl;
}

export function mlToDrops(ml: number, dropsPerMl = 20): number {
  return ml * dropsPerMl;
}

function f(
  form: DosageForm,
  strengthLabel: string,
  strengthMg: number,
  strengthVolumeMl: number,
  brands: string[],
  extra: Partial<DrugFormulation> = {},
): DrugFormulation {
  return {
    form,
    strengthLabel,
    strengthMg,
    strengthVolumeMl,
    commonBrandsIndia: brands,
    ...extra,
  };
}

export const pediatricDrugsDB: PediatricDrug[] = [
  {
    id: "amox_po",
    name: "Amoxicillin",
    category: "Antibiotic - Oral",
    recommendedDose:
      "Standard: 40–50 mg/kg/day PO ÷ q8–12h. High-dose AOM/CAP: 80–90 mg/kg/day ÷ q12h. Max 2–3 g/day.",
    defaultDoseMgPerKg: 45,
    maxDosePerDayMg: 3000,
    frequencyOptions: ["q8h", "q12h", "BD", "TDS"],
    defaultFrequency: "q12h",
    defaultDosesPerDay: 2,
    route: ["PO"],
    cautionsAndContraindications: [
      "Penicillin hypersensitivity",
      "Rash risk in EBV",
      "Adjust if CrCl < 30 mL/min",
    ],
    instructions: "Shake reconstituted syrup well. May take with/without food. Finish course.",
    referenceSource: "Harriet Lane / Nelson / IAP",
    renalAdjustment: true,
    neonatalNote:
      "Neonate dosing often differs (Cloherty): e.g. ≤3 mo commonly 20–30 mg/kg/day ÷ q12h — confirm GA/PNA.",
    formulations: [
      f("Suspension (dry powder)", "125 mg/5 ml", 125, 5, ["Mox", "Novamox", "Cipmox", "Trimox"], {
        packSizes: ["30 ml", "60 ml"],
      }),
      f("Suspension (dry powder)", "250 mg/5 ml", 250, 5, ["Mox", "Novamox", "Flemoxin"], {
        packSizes: ["30 ml", "60 ml"],
      }),
      f("Drops", "100 mg/ml", 100, 1, ["Mox drops", "Novamox drops"], {
        dropperCapacityMl: 1,
        dropsPerMl: 20,
        packSizes: ["10 ml"],
      }),
      f("Tablet / DT", "125 mg DT / 250 mg / 500 mg", 250, 1, ["Novamox", "Mox"], {}),
    ],
  },
  {
    id: "amox_clav_po",
    name: "Amoxicillin-Clavulanate",
    category: "Antibiotic - Oral",
    recommendedDose:
      "45 mg/kg/day ÷ q12h (standard) or 90 mg/kg/day ÷ q12h high-dose (amoxicillin component). Prefer 7:1 / 14:1.",
    defaultDoseMgPerKg: 45,
    maxDosePerDayMg: 4000,
    frequencyOptions: ["q12h", "BD"],
    defaultFrequency: "q12h",
    defaultDosesPerDay: 2,
    route: ["PO"],
    cautionsAndContraindications: [
      "Prior Augmentin cholestatic jaundice",
      "Severe penicillin allergy",
      "Diarrhea common",
    ],
    instructions: "Give with food. Shake well. Match strength carefully (228.5 / 457 / 642.9 mg/5 ml etc.).",
    referenceSource: "Harriet Lane / IAP STG",
    renalAdjustment: true,
    formulations: [
      f("Suspension (dry powder)", "228.5 mg/5 ml (200/28.5)", 200, 5, ["Augmentin Duo", "Clavam", "Moxclav"], {
        packSizes: ["30 ml"],
      }),
      f("Suspension (dry powder)", "457 mg/5 ml (400/57)", 400, 5, ["Augmentin DDS", "Moxclav BD"], {
        packSizes: ["30 ml"],
      }),
      f("Suspension (dry powder)", "642.9 mg/5 ml (600/42.9) ES", 600, 5, ["Augmentin ES", "Clavam Forte"], {
        packSizes: ["30 ml", "50 ml", "100 ml"],
      }),
      f("Drops", "56.25 mg/ml approx (product-specific)", 56.25, 1, ["Clavam drops", "Moxclav drops"], {
        dropperCapacityMl: 1,
        dropsPerMl: 20,
        packSizes: ["10 ml"],
      }),
    ],
  },
  {
    id: "cefpodoxime_po",
    name: "Cefpodoxime Proxetil",
    category: "Antibiotic - Oral",
    recommendedDose: "10 mg/kg/day ÷ BD (max often 200–400 mg/day by age).",
    defaultDoseMgPerKg: 10,
    maxDosePerDayMg: 400,
    frequencyOptions: ["BD", "q12h"],
    defaultFrequency: "BD",
    defaultDosesPerDay: 2,
    route: ["PO"],
    cautionsAndContraindications: ["Cephalosporin allergy", "Diarrhea"],
    instructions: "Give with food. Common Bengaluru OPD 3rd-gen oral choice.",
    referenceSource: "Harriet Lane / IAP",
    renalAdjustment: true,
    formulations: [
      f("Suspension (dry powder)", "50 mg/5 ml", 50, 5, ["Cepodem", "Cefoprox", "Gudcef"], { packSizes: ["30 ml"] }),
      f("Suspension (dry powder)", "100 mg/5 ml", 100, 5, ["Cepodem", "Cefoprox"], { packSizes: ["30 ml"] }),
      f("Tablet / DT", "100 mg / 200 mg", 100, 1, ["Cepodem", "Gudcef"], {}),
    ],
  },
  {
    id: "cefixime_po",
    name: "Cefixime",
    category: "Antibiotic - Oral",
    recommendedDose: "8 mg/kg/day PO ÷ q12–24h. Max 400 mg/day.",
    defaultDoseMgPerKg: 8,
    maxDosePerDayMg: 400,
    frequencyOptions: ["OD", "BD", "q12h", "q24h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: ["Cephalosporin hypersensitivity", "Diarrhea"],
    instructions: "Shake suspension. Once/twice daily as written.",
    referenceSource: "Harriet Lane / IAP STG",
    renalAdjustment: true,
    formulations: [
      f("Suspension (dry powder)", "50 mg/5 ml", 50, 5, ["Taxim-O", "Zifi", "Cefspan"], { packSizes: ["30 ml", "50 ml"] }),
      f("Suspension (dry powder)", "100 mg/5 ml", 100, 5, ["Taxim-O", "Zifi"], { packSizes: ["30 ml"] }),
      f("Drops", "25 mg/ml", 25, 1, ["Taxim-O drops", "Zifi drops"], {
        dropperCapacityMl: 1,
        dropsPerMl: 20,
        packSizes: ["10 ml"],
      }),
      f("Tablet / DT", "100 mg / 200 mg DT", 100, 1, ["Taxim-O", "Zifi"], {}),
    ],
  },
  {
    id: "cefdinir_po",
    name: "Cefdinir",
    category: "Antibiotic - Oral",
    recommendedDose: "14 mg/kg/day ÷ q12–24h. Max 600 mg/day.",
    defaultDoseMgPerKg: 14,
    maxDosePerDayMg: 600,
    frequencyOptions: ["OD", "BD", "q12h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: ["Iron binding — reddish stools", "Cephalosporin allergy"],
    instructions: "Avoid simultaneous iron. Shake well.",
    referenceSource: "Harriet Lane",
    renalAdjustment: true,
    formulations: [
      f("Suspension (dry powder)", "125 mg/5 ml", 125, 5, ["Sefdin", "Aldinir", "Cefdiel"], { packSizes: ["30 ml"] }),
      f("Capsule", "300 mg", 300, 1, ["Omnicef generics"], {}),
    ],
  },
  {
    id: "cephalexin_po",
    name: "Cephalexin",
    category: "Antibiotic - Oral",
    recommendedDose: "25–50 mg/kg/day ÷ q6–8h. Max ~4 g/day.",
    defaultDoseMgPerKg: 50,
    maxDosePerDayMg: 4000,
    frequencyOptions: ["q6h", "q8h", "TDS", "QID"],
    defaultFrequency: "q8h",
    defaultDosesPerDay: 3,
    route: ["PO"],
    cautionsAndContraindications: ["Cephalosporin/PCN cross-allergy caution"],
    instructions: "Finish course. Useful for SSTI in OPD.",
    referenceSource: "Harriet Lane",
    renalAdjustment: true,
    formulations: [
      f("Suspension (dry powder)", "125 mg/5 ml", 125, 5, ["Phexin", "Sporidex"], { packSizes: ["30 ml", "60 ml"] }),
      f("Suspension (dry powder)", "250 mg/5 ml", 250, 5, ["Phexin", "Sporidex"], { packSizes: ["30 ml", "60 ml"] }),
      f("Drops", "100 mg/ml", 100, 1, ["Phexin drops"], { dropperCapacityMl: 1, dropsPerMl: 20, packSizes: ["10 ml"] }),
      f("Capsule", "250 mg / 500 mg", 250, 1, ["Phexin", "Sporidex"], {}),
    ],
  },
  {
    id: "azithromycin_po",
    name: "Azithromycin",
    category: "Antibiotic - Oral",
    recommendedDose: "10 mg/kg day 1 then 5 mg/kg days 2–5 (AOM/CAP) or 12 mg/kg daily × 5 (pharyngitis).",
    defaultDoseMgPerKg: 10,
    maxDosePerDayMg: 500,
    frequencyOptions: ["OD", "q24h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO", "IV"],
    cautionsAndContraindications: ["QT prolongation caution", "Prior cholestatic jaundice with azithromycin"],
    instructions: "Once daily. Shake suspension. IV: hospital — infuse per label (not IV push).",
    referenceSource: "Harriet Lane / IAP STG",
    renalAdjustment: false,
    ivAdministration: {
      giveSlowly: true,
      note: "IV azithromycin: dilute and infuse over ≥60 minutes. Do NOT give as IV bolus/push.",
    },
    formulations: [
      f("Suspension (dry powder)", "100 mg/5 ml", 100, 5, ["Azithral", "Azee", "Zady"], { packSizes: ["15 ml"] }),
      f("Suspension (dry powder)", "200 mg/5 ml", 200, 5, ["Azithral", "Azee"], { packSizes: ["15 ml", "30 ml"] }),
      f("Tablet / DT", "100 / 250 / 500 mg", 250, 1, ["Azithral", "Azee"], {}),
      f("Injection (IV/IM)", "500 mg vial", 500, 1, ["Azithral IV"], {}),
    ],
  },
  {
    id: "ceftriaxone_iv",
    name: "Ceftriaxone",
    category: "Antibiotic - IV",
    recommendedDose: "50–75 mg/kg/day (up to 100 mg/kg/day meningitis). Max 4 g/day.",
    defaultDoseMgPerKg: 50,
    maxDosePerDayMg: 4000,
    frequencyOptions: ["q24h", "q12h", "OD"],
    defaultFrequency: "q24h",
    defaultDosesPerDay: 1,
    route: ["IV", "IM"],
    cautionsAndContraindications: [
      "Neonates <28 days — biliary sludging/kernicterus risk (esp. with calcium)",
      "Cephalosporin allergy",
    ],
    instructions: "Clinic/hospital injection. IM deep; IV diluted.",
    referenceSource: "Harriet Lane / Cloherty (neonates)",
    renalAdjustment: false,
    neonatalNote: "Avoid/contraindicated in many neonatal settings with IV calcium — follow Cloherty.",
    ivAdministration: {
      giveSlowly: true,
      note: "IV: infuse over 30 minutes (adults/children). Do not mix with calcium-containing solutions. Neonates: follow Cloherty/institutional policy.",
    },
    formulations: [
      f("Injection (IV/IM)", "250 mg / 500 mg / 1 g vial", 1000, 1, ["Monocef", "Xone", "Oframax"], {
        packSizes: ["vial"],
      }),
    ],
  },
  {
    id: "paracetamol_po",
    name: "Paracetamol (Acetaminophen)",
    category: "Analgesic / Antipyretic",
    recommendedDose: "10–15 mg/kg/dose q4–6h. Max ~60–90 mg/kg/day or 4 g/day.",
    defaultDoseMgPerKg: 60,
    maxDosePerDayMg: 4000,
    frequencyOptions: ["q4h", "q6h", "QID"],
    defaultFrequency: "q6h",
    defaultDosesPerDay: 4,
    route: ["PO", "PR", "IV"],
    cautionsAndContraindications: ["Severe liver disease", "Check total acetaminophen from combinations"],
    instructions: "Measure syrup carefully. Drops for infants — use marked dropper only.",
    referenceSource: "Harriet Lane / Cloherty (neonates)",
    renalAdjustment: true,
    neonatalNote: "Neonatal intervals may be q6–8h — confirm Cloherty / NICU protocol.",
    ivAdministration: {
      giveSlowly: true,
      note: "IV paracetamol (Ofirmev/generic): infuse over 15 minutes. Do not IV push undiluted outside protocol.",
    },
    formulations: [
      f("Syrup", "120 mg/5 ml", 120, 5, ["Crocin", "Calpol", "Dolo", "Pyrigesic"], { packSizes: ["60 ml", "100 ml"] }),
      f("Syrup", "250 mg/5 ml", 250, 5, ["Dolo 250", "Calpol 250", "Crocin 250"], { packSizes: ["60 ml"] }),
      f("Drops", "100 mg/ml", 100, 1, ["Crocin drops", "Calpol drops", "Dolo drops"], {
        dropperCapacityMl: 1,
        dropsPerMl: 20,
        packSizes: ["15 ml"],
      }),
      f("Tablet / DT", "500 mg / 650 mg", 500, 1, ["Dolo 650", "Crocin"], {}),
      f("Injection (IV/IM)", "10 mg/ml (100 ml bottle = 1 g)", 10, 1, ["Perfalgan", "Febrinil IV"], {}),
    ],
  },
  {
    id: "ibuprofen_po",
    name: "Ibuprofen",
    category: "Analgesic / Antipyretic",
    recommendedDose: "5–10 mg/kg/dose q6–8h. Max ~40 mg/kg/day.",
    defaultDoseMgPerKg: 30,
    maxDosePerDayMg: 2400,
    frequencyOptions: ["q6h", "q8h", "TDS"],
    defaultFrequency: "q8h",
    defaultDosesPerDay: 3,
    route: ["PO", "IV"],
    cautionsAndContraindications: [
      "Dehydration / renal risk",
      "Often avoid <6 months",
      "Active ulcer / NSAID allergy",
    ],
    instructions: "Give after food. Not if child is poorly drinking.",
    referenceSource: "Harriet Lane / Nelson",
    renalAdjustment: true,
    formulations: [
      f("Syrup", "100 mg/5 ml", 100, 5, ["Ibugesic", "Brufen", "Combiflam suspension"], { packSizes: ["60 ml", "100 ml"] }),
      f("Tablet / DT", "200 mg / 400 mg", 200, 1, ["Brufen", "Ibugesic"], {}),
    ],
  },
  {
    id: "mefenamic_pcm_combo",
    name: "Mefenamic acid + Paracetamol (combo)",
    category: "Analgesic - Combination (India)",
    recommendedDose: "Use sparingly in children; prefer plain PCM/ibuprofen. If used, follow age/weight on brand label.",
    defaultDoseMgPerKg: 0,
    maxDosePerDayMg: 0,
    frequencyOptions: ["TDS", "q8h"],
    defaultFrequency: "TDS",
    defaultDosesPerDay: 3,
    route: ["PO"],
    cautionsAndContraindications: [
      "Not first-line in young children",
      "Double-count paracetamol risk",
      "NSAID cautions",
    ],
    instructions: "Common private OPD combo brands — check each component dose; avoid stacking with plain PCM.",
    referenceSource: "Brand label / caution — not Harriet Lane first-line",
    renalAdjustment: true,
    formulations: [
      f("Syrup", "Mefenamic 50 mg + PCM 125 mg / 5 ml (brand-specific)", 125, 5, ["Meftal-P", "Hilin-P", "Pacimol MF"], {
        packSizes: ["60 ml"],
      }),
      f("Tablet / DT", "Mefenamic 500 + PCM 325/500 (adult)", 500, 1, ["Meftal Forte"], {}),
    ],
  },
  {
    id: "cetirizine_po",
    name: "Cetirizine",
    category: "Antihistamine",
    recommendedDose: "~0.25 mg/kg once daily (age-banded often 2.5–5–10 mg).",
    defaultDoseMgPerKg: 0.25,
    maxDosePerDayMg: 10,
    frequencyOptions: ["OD", "q24h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: ["Severe renal impairment — adjust", "Mild sedation"],
    instructions: "Once daily. Drops useful in toddlers.",
    referenceSource: "Harriet Lane / Nelson",
    renalAdjustment: true,
    formulations: [
      f("Syrup", "5 mg/5 ml", 5, 5, ["Cetzine", "Alerid", "Okacet"], { packSizes: ["30 ml", "60 ml"] }),
      f("Drops", "10 mg/ml", 10, 1, ["Cetzine drops", "Alerid drops"], {
        dropperCapacityMl: 1,
        dropsPerMl: 20,
        packSizes: ["10 ml"],
      }),
      f("Tablet / DT", "10 mg", 10, 1, ["Cetzine", "Alerid"], {}),
    ],
  },
  {
    id: "levocet_ambroxol_combo",
    name: "Levocetirizine + Ambroxol / Montelukast combos",
    category: "Cold-Cough - Combination (India)",
    recommendedDose: "Follow age on brand label; avoid multi-ingredient syrups in infants.",
    defaultDoseMgPerKg: 0,
    maxDosePerDayMg: 0,
    frequencyOptions: ["OD", "BD"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: [
      "Many OTC cold combos not recommended <4–6 years",
      "Sedation / overdose risk with stacking antihistamines",
    ],
    instructions: "Very common in Bengaluru private pharmacies — prefer single-agent when possible.",
    referenceSource: "IAP caution on irrational combinations / brand label",
    renalAdjustment: false,
    formulations: [
      f("Syrup", "Levocet 2.5 mg + Ambroxol 30 mg / 5 ml (varies)", 2.5, 5, ["Xyzal A", "1-AL AX", "Lazine Plus"], {
        packSizes: ["60 ml", "100 ml"],
      }),
      f("Syrup", "Montelukast 4 mg + Levocet 2.5 mg / 5 ml (varies)", 4, 5, ["Montair LC Kid", "Telekast L Kid"], {
        packSizes: ["60 ml"],
      }),
    ],
  },
  {
    id: "ondansetron_po",
    name: "Ondansetron",
    category: "Antiemetic",
    recommendedDose: "0.1–0.15 mg/kg/dose (max often 8 mg/dose).",
    defaultDoseMgPerKg: 0.45,
    maxDosePerDayMg: 24,
    frequencyOptions: ["q8h", "TDS", "OD"],
    defaultFrequency: "q8h",
    defaultDosesPerDay: 3,
    route: ["PO", "IV", "IM"],
    cautionsAndContraindications: ["Long QT", "QT-prolonging drugs"],
    instructions: "Oral dissolve / syrup. IV: dilute and give slowly.",
    referenceSource: "Harriet Lane",
    renalAdjustment: false,
    ivAdministration: {
      giveSlowly: true,
      note: "IV ondansetron: give over 2–5 minutes (or infused diluted). Rapid push may cause dizziness/eye issues — prefer slow IV.",
    },
    formulations: [
      f("Syrup", "2 mg/5 ml", 2, 5, ["Emeset", "Zofer", "Ondem"], { packSizes: ["30 ml"] }),
      f("Tablet / DT", "4 mg / 8 mg MD", 4, 1, ["Emeset", "Zofer"], {}),
      f("Injection (IV/IM)", "2 mg/ml (2 ml / 4 ml ampoule)", 2, 1, ["Emeset inj", "Zofer inj"], {}),
    ],
  },
  {
    id: "domperidone_po",
    name: "Domperidone",
    category: "Antiemetic",
    recommendedDose: "0.25–0.5 mg/kg/dose TDS short course.",
    defaultDoseMgPerKg: 0.75,
    maxDosePerDayMg: 30,
    frequencyOptions: ["TDS", "q8h"],
    defaultFrequency: "TDS",
    defaultDosesPerDay: 3,
    route: ["PO"],
    cautionsAndContraindications: ["QT / cardiac risk — avoid prolonged use"],
    instructions: "Before meals. Short course only. Very common Bengaluru OPD syrup.",
    referenceSource: "Regional practice + cardiac cautions",
    renalAdjustment: false,
    formulations: [
      f("Syrup", "1 mg/ml (5 mg/5 ml)", 5, 5, ["Domstal", "Domperi", "Motinorm"], { packSizes: ["30 ml", "60 ml"] }),
      f("Drops", "10 mg/ml", 10, 1, ["Domstal drops"], { dropperCapacityMl: 1, dropsPerMl: 20, packSizes: ["5–10 ml"] }),
      f("Tablet / DT", "10 mg", 10, 1, ["Domstal"], {}),
    ],
  },
  {
    id: "omeprazole_po",
    name: "Omeprazole",
    category: "GI - PPI",
    recommendedDose: "0.7–1.4 mg/kg/day OD.",
    defaultDoseMgPerKg: 1,
    maxDosePerDayMg: 40,
    frequencyOptions: ["OD", "q24h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO", "IV"],
    cautionsAndContraindications: ["PPI hypersensitivity", "Severe liver disease caution"],
    instructions: "Before food. Capsules — do not crush delayed-release unless advised.",
    referenceSource: "Harriet Lane",
    renalAdjustment: false,
    ivAdministration: {
      giveSlowly: true,
      note: "IV omeprazole/pantoprazole: reconstitute and infuse over 15–30 minutes (not rapid bolus unless protocol).",
    },
    formulations: [
      f("Suspension (dry powder) / sachets", "Product-specific (often 10–20 mg)", 10, 1, ["Omez", "Ociper"], {}),
      f("Capsule", "10 mg / 20 mg", 20, 1, ["Omez", "Losec generics"], {}),
      f("Injection (IV/IM)", "40 mg vial", 40, 1, ["Omez IV"], {}),
    ],
  },
  {
    id: "nitrofurantoin",
    name: "Nitrofurantoin",
    category: "UTI Prophylaxis / Treatment",
    recommendedDose: "Treatment 5–7 mg/kg/day ÷ q6h; prophylaxis 1–2 mg/kg OD HS.",
    defaultDoseMgPerKg: 2,
    maxDosePerDayMg: 400,
    frequencyOptions: ["OD", "q6h", "q24h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: ["<1–2 months contraindicated", "G6PD caution", "Low CrCl"],
    instructions: "With food. Suspension less common — capsules often opened per advice for older kids.",
    referenceSource: "Nelson / Harriet Lane",
    renalAdjustment: true,
    formulations: [
      f("Capsule", "50 mg / 100 mg", 100, 1, ["Martifur", "Furadantin", "Niftran"], {}),
      f("Suspension (dry powder)", "25 mg/5 ml (if available)", 25, 5, ["Furadantin suspension (limited)"], {
        packSizes: ["60 ml"],
      }),
    ],
  },
  {
    id: "cotrimoxazole_po",
    name: "Cotrimoxazole (TMP-SMX)",
    category: "Antibiotic - Oral",
    recommendedDose: "TMP 6–10 mg/kg/day ÷ q12h (treatment). Dose on TMP.",
    defaultDoseMgPerKg: 8,
    maxDosePerDayMg: 320,
    frequencyOptions: ["BD", "q12h"],
    defaultFrequency: "q12h",
    defaultDosesPerDay: 2,
    route: ["PO", "IV"],
    cautionsAndContraindications: ["<2 months contraindicated", "Sulfa allergy"],
    instructions: "Hydrate well. Pediatric DS strengths vary — calculate TMP carefully.",
    referenceSource: "Harriet Lane / Nelson",
    renalAdjustment: true,
    ivAdministration: {
      giveSlowly: true,
      note: "IV cotrimoxazole: dilute thoroughly and infuse over 60–90 minutes. Do not rapid bolus.",
    },
    formulations: [
      f("Suspension", "TMP 40 mg + SMX 200 mg / 5 ml", 40, 5, ["Septran", "Bactrim", "Ciplin"], {
        packSizes: ["50 ml", "100 ml"],
      }),
      f("Tablet / DT", "TMP 80 + SMX 400 (SS) / DS double", 80, 1, ["Septran", "Bactrim DS"], {}),
    ],
  },
  {
    id: "metronidazole_po",
    name: "Metronidazole",
    category: "Antibiotic - Oral",
    recommendedDose: "~30 mg/kg/day ÷ q6–8h (indication-specific).",
    defaultDoseMgPerKg: 30,
    maxDosePerDayMg: 2000,
    frequencyOptions: ["q8h", "TDS", "q6h"],
    defaultFrequency: "q8h",
    defaultDosesPerDay: 3,
    route: ["PO", "IV"],
    cautionsAndContraindications: ["Avoid alcohol (teens)", "Neurotoxicity prolonged high dose"],
    instructions: "With food if GI upset.",
    referenceSource: "Harriet Lane",
    renalAdjustment: true,
    ivAdministration: {
      giveSlowly: true,
      note: "IV metronidazole: usually infused over 30–60 minutes. Avoid rapid IV push.",
    },
    formulations: [
      f("Suspension", "200 mg/5 ml", 200, 5, ["Flagyl", "Metrogyl"], { packSizes: ["30 ml", "60 ml"] }),
      f("Tablet / DT", "200 / 400 mg", 400, 1, ["Flagyl", "Metrogyl"], {}),
      f("Injection (IV/IM)", "5 mg/ml (100 ml = 500 mg)", 5, 1, ["Metrogyl IV"], {}),
    ],
  },
  {
    id: "salbutamol_inh",
    name: "Salbutamol (Albuterol)",
    category: "Respiratory",
    recommendedDose: "Prefer MDI+spacer / neb; oral syrup if used ~0.1–0.15 mg/kg/dose.",
    defaultDoseMgPerKg: 0.15,
    maxDosePerDayMg: 16,
    frequencyOptions: ["q4h", "q6h", "q8h"],
    defaultFrequency: "q6h",
    defaultDosesPerDay: 4,
    route: ["Inhalation", "PO", "IV", "Nebulization"],
    cautionsAndContraindications: ["Tachycardia/tremor with overuse"],
    instructions: "Use spacer with MDI. Neb: 2.5 mg/2.5 ml respules common.",
    referenceSource: "Harriet Lane / IAP STG",
    renalAdjustment: false,
    ivAdministration: {
      giveSlowly: true,
      note: "IV salbutamol (severe asthma, ICU): controlled infusion only — not ward IV push.",
    },
    formulations: [
      f("Syrup", "2 mg/5 ml", 2, 5, ["Asthalin", "Ventorlin"], { packSizes: ["100 ml"] }),
      f("Inhalation / Neb", "2.5 mg/2.5 ml respule", 2.5, 2.5, ["Asthalin respules"], {}),
      f("Inhalation / Neb", "MDI 100 mcg/puff", 0.1, 1, ["Asthalin inhaler"], {}),
    ],
  },
  {
    id: "prednisolone_po",
    name: "Prednisolone",
    category: "Steroid",
    recommendedDose: "Asthma flare often 1–2 mg/kg/day short course (max commonly 40–60 mg/day).",
    defaultDoseMgPerKg: 1,
    maxDosePerDayMg: 60,
    frequencyOptions: ["OD", "BD"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: ["Do not stop suddenly after long courses", "Infection risk"],
    instructions: "With food, morning if OD.",
    referenceSource: "Nelson / Harriet Lane",
    renalAdjustment: false,
    formulations: [
      f("Syrup", "5 mg/5 ml", 5, 5, ["Omnacortil", "Predone"], { packSizes: ["30 ml", "60 ml"] }),
      f("Tablet / DT", "5 / 10 / 20 mg", 5, 1, ["Omnacortil", "Wysolone"], {}),
    ],
  },
  {
    id: "permethrin_5",
    name: "Permethrin 5% Cream",
    category: "Dermatology - Scabies",
    recommendedDose: "Topical neck-to-toe; wash 8–14h; often repeat day 7.",
    defaultDoseMgPerKg: 0,
    maxDosePerDayMg: 0,
    frequencyOptions: ["OD"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["Topical"],
    cautionsAndContraindications: ["Chrysanthemum/permethrin allergy"],
    instructions: "Treat family contacts; wash clothes/bedding. Include head in infants.",
    referenceSource: "Nelson / IAP STG",
    renalAdjustment: false,
    formulations: [
      f("Cream / Topical", "5% w/w cream 30 g", 0, 1, ["Perlice", "Scaboma", "Elimite generics"], {
        packSizes: ["30 g"],
      }),
      f("Cream / Topical", "1% rinse (lice — different strength)", 0, 1, ["Perlice lotion 1%"], {}),
    ],
  },
  {
    id: "ors",
    name: "ORS (WHO low-osmolarity)",
    category: "GI - Supportive",
    recommendedDose: "ml/kg based — not mg/kg. Small frequent sips.",
    defaultDoseMgPerKg: 0,
    maxDosePerDayMg: 0,
    frequencyOptions: ["OD"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO"],
    cautionsAndContraindications: ["Shock / severe vomit — IV assessment"],
    instructions: "Mix 1 sachet in 1 L clean water (or as pack). Electral / ORS-L common.",
    referenceSource: "WHO / IAP",
    renalAdjustment: false,
    formulations: [
      f("Other", "WHO ORS powder sachet → 1 L", 0, 1000, ["Electral", "ORS-L", "Peditral"], {
        packSizes: ["21.8 g sachet / 4.2 g for 200 ml packs"],
      }),
    ],
  },

  // --- Antiseizure ---
  {
    id: "levetiracetam",
    name: "Levetiracetam",
    category: "Antiseizure",
    recommendedDose: "Start ~20–40 mg/kg/day ÷ BD; titrate (max often 60 mg/kg/day, abs max ~3000 mg/day).",
    defaultDoseMgPerKg: 30,
    maxDosePerDayMg: 3000,
    frequencyOptions: ["BD", "q12h"],
    defaultFrequency: "BD",
    defaultDosesPerDay: 2,
    route: ["PO", "IV"],
    cautionsAndContraindications: ["Behavioral/mood changes", "Dose adjust renal impairment"],
    instructions: "Regular timing. Do not miss doses. IV loading in hospital for status pathways.",
    referenceSource: "Harriet Lane / Cloherty (neonatal seizures protocols)",
    renalAdjustment: true,
    neonatalNote: "Neonatal seizure regimens are protocol-specific — use Cloherty / NICU seizure pathway.",
    ivAdministration: {
      giveSlowly: true,
      note: "IV levetiracetam: dilute and infuse over 15 minutes (loading sometimes per protocol over 5–15 min). Avoid undiluted rapid push.",
    },
    formulations: [
      f("Syrup", "100 mg/ml", 100, 1, ["Levipil", "Levera", "Torleva"], { packSizes: ["100 ml"] }),
      f("Tablet / DT", "250 / 500 / 750 mg", 500, 1, ["Levipil", "Keppra generics"], {}),
      f("Injection (IV/IM)", "100 mg/ml vial", 100, 1, ["Levipil IV", "Levera IV"], {}),
    ],
  },
  {
    id: "valproate",
    name: "Sodium Valproate / Divalproex",
    category: "Antiseizure",
    recommendedDose: "Start ~10–15 mg/kg/day; maintenance often 20–40 mg/kg/day ÷ BD–TDS (levels guided).",
    defaultDoseMgPerKg: 20,
    maxDosePerDayMg: 3000,
    frequencyOptions: ["BD", "TDS", "q12h"],
    defaultFrequency: "BD",
    defaultDosesPerDay: 2,
    route: ["PO", "IV"],
    cautionsAndContraindications: [
      "Hepatotoxicity risk (esp. young children, mitochondrial disease)",
      "Teratogenicity (adolescents)",
      "Pancreatitis rare",
    ],
    instructions: "With food. Monitor LFTs as advised. Syrup common in Indian ped neuro OPD.",
    referenceSource: "Harriet Lane / Nelson",
    renalAdjustment: false,
    ivAdministration: {
      giveSlowly: true,
      note: "IV valproate: loading infusions typically over 60 minutes (protocol-dependent). Not rapid IV push.",
    },
    formulations: [
      f("Syrup", "200 mg/5 ml", 200, 5, ["Valparin", "Encorate", "Torvate"], { packSizes: ["100 ml"] }),
      f("Tablet / DT", "200 / 300 / 500 mg", 500, 1, ["Encorate Chrono", "Valparin Chrono"], {}),
      f("Injection (IV/IM)", "100 mg/ml", 100, 1, ["Valparin IV"], {}),
    ],
  },
  {
    id: "phenytoin",
    name: "Phenytoin",
    category: "Antiseizure",
    recommendedDose: "Maintenance ~5–8 mg/kg/day ÷ BD–TDS; loading separate (status) — hospital only.",
    defaultDoseMgPerKg: 5,
    maxDosePerDayMg: 300,
    frequencyOptions: ["BD", "TDS", "q8h"],
    defaultFrequency: "BD",
    defaultDosesPerDay: 2,
    route: ["PO", "IV"],
    cautionsAndContraindications: [
      "Narrow therapeutic index — levels",
      "IV: cardiac arrhythmia risk if given fast",
      "Interaction-heavy",
    ],
    instructions: "Consistent timing with/without food as advised. Suspension shake well.",
    referenceSource: "Harriet Lane / Cloherty (neonates)",
    renalAdjustment: false,
    neonatalNote: "Neonatal loading/maintenance per Cloherty — different from older children.",
    ivAdministration: {
      giveSlowly: true,
      note: "CRITICAL: IV phenytoin max 50 mg/min adults; children typically ≤1–3 mg/kg/min (often ≤25–50 mg/min absolute). Dilute in NS only. Prefer fosphenytoin when available. Cardiac monitoring.",
    },
    formulations: [
      f("Suspension", "30 mg/5 ml / 125 mg/5 ml (check label)", 125, 5, ["Eptoin suspension"], { packSizes: ["100 ml"] }),
      f("Tablet / DT", "50 / 100 mg", 100, 1, ["Eptoin"], {}),
      f("Injection (IV/IM)", "50 mg/ml", 50, 1, ["Eptoin inj"], {}),
    ],
  },
  {
    id: "phenobarbital",
    name: "Phenobarbital",
    category: "Antiseizure",
    recommendedDose: "Maintenance ~3–5 mg/kg/day; neonatal loading often 20 mg/kg IV (Cloherty/NICU).",
    defaultDoseMgPerKg: 5,
    maxDosePerDayMg: 200,
    frequencyOptions: ["OD", "BD", "q12h"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PO", "IV", "IM"],
    cautionsAndContraindications: ["Sedation/respiratory depression", "Enzyme inducer interactions"],
    instructions: "Same time daily. Major neonatal first-line per many Indian NICUs — use Cloherty.",
    referenceSource: "Cloherty / Harriet Lane",
    renalAdjustment: true,
    neonatalNote: "First-line neonatal antiseizure in many protocols — loading + maintenance per Cloherty.",
    ivAdministration: {
      giveSlowly: true,
      note: "IV phenobarbital: give slowly (e.g. ≤1 mg/kg/min, max often 30 mg/min) with respiratory/cardiac monitoring. Do not rapid bolus.",
    },
    formulations: [
      f("Syrup", "20 mg/5 ml", 20, 5, ["Gardenal", "Pheneton"], { packSizes: ["60 ml"] }),
      f("Tablet / DT", "30 / 60 mg", 30, 1, ["Gardenal"], {}),
      f("Injection (IV/IM)", "200 mg/ml", 200, 1, ["Phenobarbitone inj"], {}),
    ],
  },
  {
    id: "carbamazepine",
    name: "Carbamazepine",
    category: "Antiseizure",
    recommendedDose: "Start low; maintenance often 10–30 mg/kg/day ÷ BD–TDS.",
    defaultDoseMgPerKg: 20,
    maxDosePerDayMg: 1600,
    frequencyOptions: ["BD", "TDS", "q8h", "q12h"],
    defaultFrequency: "BD",
    defaultDosesPerDay: 2,
    route: ["PO"],
    cautionsAndContraindications: [
      "Stevens–Johnson risk (esp. HLA-B*1502 in some populations)",
      "Hyponatremia",
      "Bone marrow suppression rare",
    ],
    instructions: "With food. Do not stop suddenly. Suspension available in India.",
    referenceSource: "Harriet Lane / Nelson",
    renalAdjustment: false,
    formulations: [
      f("Suspension", "100 mg/5 ml", 100, 5, ["Tegretol", "Zen"], { packSizes: ["100 ml"] }),
      f("Tablet / DT", "100 / 200 / 400 mg", 200, 1, ["Tegretol", "Tegrital", "Zen"], {}),
    ],
  },
  {
    id: "clobazam",
    name: "Clobazam",
    category: "Antiseizure",
    recommendedDose: "Often 0.1–0.5 mg/kg/day ÷ OD–BD (titrate; max commonly 20–40 mg/day older children).",
    defaultDoseMgPerKg: 0.3,
    maxDosePerDayMg: 40,
    frequencyOptions: ["OD", "BD"],
    defaultFrequency: "BD",
    defaultDosesPerDay: 2,
    route: ["PO"],
    cautionsAndContraindications: ["Sedation", "Dependence / withdrawal", "Respiratory depression with other sedatives"],
    instructions: "Common adjunct in Indian epilepsy OPD. Regular schedule.",
    referenceSource: "Harriet Lane / pediatric neurology practice",
    renalAdjustment: false,
    formulations: [
      f("Suspension / drops", "Product-specific (often 2.5–5 mg/5 ml or drops)", 2.5, 5, ["Frisium", "Lobazam"], {
        packSizes: ["variable"],
      }),
      f("Tablet / DT", "5 / 10 / 20 mg", 10, 1, ["Frisium", "Lobazam"], {}),
    ],
  },
  {
    id: "midazolam",
    name: "Midazolam (rescue)",
    category: "Antiseizure - Emergency",
    recommendedDose: "Buccal/IN/IV rescue per seizure plan (often 0.2–0.3 mg/kg buccal — protocol-specific).",
    defaultDoseMgPerKg: 0.2,
    maxDosePerDayMg: 20,
    frequencyOptions: ["OD"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["Buccal", "IN", "IV", "IM", "PR"],
    cautionsAndContraindications: ["Respiratory depression", "Only with rescue plan / oxygen available"],
    instructions: "Emergency antiseizure rescue — train caregivers. Hospital IV for status.",
    referenceSource: "IAP seizure action / Harriet Lane / Cloherty",
    renalAdjustment: false,
    neonatalNote: "Neonatal sedation/seizure use is NICU specialist only — Cloherty protocols.",
    ivAdministration: {
      giveSlowly: true,
      note: "IV midazolam for seizures/sedation: titrate slowly with airway support ready. Continuous infusion in ICU only.",
    },
    formulations: [
      f("Injection (IV/IM)", "1 mg/ml / 5 mg/ml", 5, 1, ["Mezolam", "Fulsed"], {}),
      f("Other", "Buccal midazolam 5–10 mg/ml preparations (brand-specific)", 5, 1, ["Buccolam / local buccal prep"], {}),
    ],
  },
  {
    id: "diazepam",
    name: "Diazepam (rescue)",
    category: "Antiseizure - Emergency",
    recommendedDose: "PR/IV rescue ~0.2–0.5 mg/kg (protocol). Max single often 10 mg.",
    defaultDoseMgPerKg: 0.3,
    maxDosePerDayMg: 20,
    frequencyOptions: ["OD"],
    defaultFrequency: "OD",
    defaultDosesPerDay: 1,
    route: ["PR", "IV", "PO", "IM"],
    cautionsAndContraindications: ["Respiratory depression", "Avoid repeated stacking without airway plan"],
    instructions: "Rectal diazepam still used in some Indian homes with training; prefer buccal midazolam where available.",
    referenceSource: "Harriet Lane / IAP",
    renalAdjustment: false,
    ivAdministration: {
      giveSlowly: true,
      note: "IV diazepam: give slowly (≤1–2 mg/min typically) — rapid IV risks hypotension/respiratory arrest.",
    },
    formulations: [
      f("Injection (IV/IM)", "5 mg/ml", 5, 1, ["Calmpose", "Valium generics"], {}),
      f("Other", "Rectal solution / tube (brand-specific)", 5, 1, ["local PR diazepam"], {}),
      f("Tablet / DT", "5 / 10 mg", 5, 1, ["Calmpose"], {}),
    ],
  },
];

export function searchPediatricDrugs(query: string): PediatricDrug[] {
  const q = query.trim().toLowerCase();
  if (!q) return pediatricDrugsDB;
  return pediatricDrugsDB.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.formulations.some(
        (x) =>
          x.strengthLabel.toLowerCase().includes(q) ||
          x.commonBrandsIndia.some((b) => b.toLowerCase().includes(q)),
      ),
  );
}
