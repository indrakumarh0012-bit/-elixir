import type { PatientSummary } from "./types";
import { withSortedAdmissions } from "./types";

/** Optional sample performa (not shown in UI by default). */
export const MOCK_PATIENT_SUMMARY: PatientSummary = withSortedAdmissions({
  patientId: "PX-2026-0042",
  hospitalId: "UHID-77821",
  name: "Ramesh Kumar",
  sex: "Male",
  age: 58,
  comorbidities: [
    "Type 2 Diabetes Mellitus",
    "Hypertension",
    "CKD Stage 3",
    "Ischemic Heart Disease",
  ],
  admissions: [
    {
      id: "adm-2026-06",
      admissionDate: "June 2026",
      timestamp: Date.UTC(2026, 5, 1),
      clinicalPresentation: [
        "Fever with chills for 4 days",
        "Productive cough with yellowish sputum",
        "Right-sided pleuritic chest pain",
      ],
      examinationFindings:
        "Febrile (38.6°C), tachypneic (RR 24). SpO2 92% RA. Bronchial breath sounds right lower zone.",
      investigations: {
        abnormal: [
          "TLC 18,400 /µL",
          "CRP 96 mg/L",
          "CXR: right lower lobe consolidation",
          "Creatinine 1.8 mg/dL",
        ],
        importantNormal: ["Troponin-I negative", "Blood culture no growth 48h"],
      },
      treatmentGiven: [
        {
          genericName: "Amoxicillin–Clavulanate",
          brandName: "Augmentin",
          contents: "Amoxicillin + Clavulanic acid (IV 1.2 g; oral 625 mg tabs)",
          drugClass: "Beta-lactam antibiotic / beta-lactamase inhibitor",
          mechanismOfAction:
            "Inhibits bacterial cell-wall synthesis; clavulanate inhibits beta-lactamases.",
          dosage: "1.2 g IV q8h → step-down 625 mg PO BID",
          duration: "7 days total (IV until defervescence, then oral to complete 7 days)",
          instructions:
            "IV in hospital; oral after meals twice daily. Complete full course even if improving.",
          cautions:
            "Allergy to penicillins; diarrhea / C. diff risk; dose-adjust in severe CKD; monitor LFTs if prolonged.",
        },
        {
          genericName: "Azithromycin",
          brandName: "Azithral",
          contents: "Azithromycin 500 mg tablet",
          drugClass: "Macrolide antibiotic",
          mechanismOfAction:
            "Binds 50S ribosomal subunit → inhibits bacterial protein synthesis.",
          dosage: "500 mg PO once daily",
          duration: "3 consecutive days",
          instructions: "Take 1 hour before or 2 hours after food. Do not crush.",
          cautions:
            "QT prolongation risk; avoid with other QT-prolonging drugs; hepatic caution.",
        },
        {
          genericName: "Paracetamol",
          brandName: "Dolo",
          contents: "Paracetamol 650 mg tablet",
          drugClass: "Non-opioid analgesic / antipyretic",
          mechanismOfAction:
            "Central COX inhibition → antipyretic and analgesic effect.",
          dosage: "650 mg PO every 6–8 hours SOS",
          duration: "Up to 5 days as needed for fever/pain",
          instructions: "With or without food. Space doses ≥6 hours.",
          cautions: "Max 3 g/day in CKD; avoid overdose / alcohol; hepatotoxicity risk.",
        },
      ],
      followUpAndAdvice: [
        "Repeat CXR in 2–3 weeks if cough persists",
        "OPD review in 7 days with CBC and creatinine",
      ],
    },
    {
      id: "adm-2026-08",
      admissionDate: "August 2026",
      timestamp: Date.UTC(2026, 7, 1),
      clinicalPresentation: [
        "Progressive dyspnea on exertion",
        "Bilateral leg swelling",
        "Orthopnea",
      ],
      examinationFindings:
        "BP 168/98, HR 102 irregular. Raised JVP. Bilateral basal creps. Pedal edema ++.",
      investigations: {
        abnormal: [
          "ECG: AF with fast VR",
          "BNP 842 pg/mL",
          "Creatinine 2.1 mg/dL",
        ],
        importantNormal: ["Troponin-I negative"],
      },
      treatmentGiven: [
        {
          genericName: "Furosemide",
          brandName: "Lasix",
          contents: "Furosemide 40 mg (IV/oral)",
          drugClass: "Loop diuretic",
          mechanismOfAction:
            "Inhibits Na-K-2Cl cotransporter in thick ascending limb → diuresis.",
          dosage: "40 mg IV BID → 40 mg PO morning",
          duration: "IV 3 days then oral ongoing as needed for edema",
          instructions: "Morning oral dose after breakfast; monitor daily weight and urine output.",
          cautions:
            "Hypokalemia, hypovolemia, ototoxicity with rapid IV; monitor electrolytes and creatinine.",
        },
        {
          genericName: "Ramipril",
          brandName: "Cardace",
          contents: "Ramipril 2.5 mg capsule",
          drugClass: "ACE inhibitor",
          mechanismOfAction:
            "Inhibits angiotensin-converting enzyme → ↓ angiotensin II / aldosterone.",
          dosage: "2.5 mg PO once daily",
          duration: "Long-term — titrate in OPD",
          instructions: "Prefer evening dose. Hold if SBP <100 mmHg or significant rise in K+/Cr.",
          cautions:
            "Hyperkalemia, acute kidney injury, cough, angioedema; avoid in bilateral RAS / pregnancy.",
        },
      ],
      followUpAndAdvice: [
        "Cardiology OPD in 5 days with ECG and electrolytes",
        "Salt restriction and daily weight chart",
      ],
    },
  ],
});
