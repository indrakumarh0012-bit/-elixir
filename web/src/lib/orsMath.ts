/**
 * WHO / IMNCI diarrhoea rehydration plans (A, B, C) with low-osmolarity ORS.
 * Ref: WHO Pocket Book of Hospital Care for Children (2013), IMNCI India,
 * IAP guidelines on acute gastroenteritis.
 */

export type DehydrationLevel = "none" | "some" | "severe";

export type OrsPlan = {
  plan: "A" | "B" | "C";
  title: string;
  /** Headline volume instruction, computed from weight where available. */
  volumeText: string;
  steps: string[];
  zinc: string;
};

const round25 = (n: number) => Math.round(n / 25) * 25;

/** WHO Plan B age-band volumes when the weight is unknown. */
function planBByAge(ageMonths: number | null): string {
  if (ageMonths == null) return "approx. 75 ml/kg over 4 hours";
  if (ageMonths < 4) return "200–400 ml over 4 hours";
  if (ageMonths < 12) return "400–600 ml over 4 hours";
  if (ageMonths < 24) return "600–800 ml over 4 hours";
  if (ageMonths < 60) return "800–1200 ml over 4 hours";
  return "1200–2200 ml over 4 hours";
}

export function zincDose(ageMonths: number | null): string {
  if (ageMonths != null && ageMonths < 6) {
    return "Zinc 10 mg once daily for 14 days (under 6 months).";
  }
  return "Zinc 20 mg once daily for 14 days (6 months and older).";
}

export function orsPlan(
  level: DehydrationLevel,
  weightKg: number | null,
  ageMonths: number | null,
): OrsPlan {
  const zinc = zincDose(ageMonths);

  if (level === "none") {
    const perStool =
      ageMonths == null
        ? "50–200 ml"
        : ageMonths < 24
          ? "50–100 ml"
          : ageMonths <= 120
            ? "100–200 ml"
            : "as much as wanted";
    const approx =
      weightKg != null ? ` (≈ ${Math.round(weightKg * 10)} ml at 10 ml/kg)` : "";
    return {
      plan: "A",
      title: "Plan A — no dehydration (treat at home)",
      volumeText: `ORS ${perStool} after EACH loose stool${approx}.`,
      steps: [
        "Give extra fluids: ORS plus breast milk / home fluids (rice water, buttermilk, plain water). Continue normal feeding — do not starve.",
        "Give with a cup and spoon in small sips. If the child vomits, wait 10 minutes, then continue more slowly.",
        "Return IMMEDIATELY if: blood in stool, repeated vomiting, drinking poorly, fever, or the child becomes lethargic — danger signs.",
        "Review in 5 days if not improving.",
      ],
      zinc,
    };
  }

  if (level === "some") {
    const total = weightKg != null ? `${round25(weightKg * 75)} ml` : null;
    return {
      plan: "B",
      title: "Plan B — some dehydration (ORS in the facility, 4 hours)",
      volumeText: total
        ? `ORS ${total} over 4 hours (75 ml/kg × ${weightKg} kg).`
        : `ORS ${planBByAge(ageMonths)}.`,
      steps: [
        "Give slowly with a cup and spoon — small frequent sips; continue breastfeeding throughout.",
        "If the child vomits, wait 10 minutes, then restart more slowly (about a spoon every 2–3 minutes).",
        "Eyelid puffiness = overhydration: stop ORS, give plain water / breast milk, restart when it settles.",
        "REASSESS at 4 hours and reclassify: no dehydration → Plan A; still some → repeat Plan B and start offering food; worse → Plan C.",
      ],
      zinc,
    };
  }

  const infant = ageMonths != null && ageMonths < 12;
  const first = weightKg != null ? `${round25(weightKg * 30)} ml` : "30 ml/kg";
  const second = weightKg != null ? `${round25(weightKg * 70)} ml` : "70 ml/kg";
  const orsSip = weightKg != null ? `${Math.round(weightKg * 5)} ml/h` : "5 ml/kg/h";
  return {
    plan: "C",
    title: "Plan C — severe dehydration (IV fluids NOW)",
    volumeText: `Ringer's lactate 100 ml/kg IV: first ${first} over ${infant ? "1 hour" : "30 minutes"}, then ${second} over ${infant ? "5 hours" : "2.5 hours"}${infant ? " (infant < 12 months)" : ""}.`,
    steps: [
      "Start IV/IO immediately (NS if RL unavailable). If the radial pulse is still very weak after the first bolus, repeat it.",
      `Start ORS ${orsSip} by mouth as soon as the child can drink, alongside the IV.`,
      "Reassess every 15–30 minutes (pulse, perfusion, sensorium); after the IV volume is in, reclassify and continue Plan B or A.",
      "No IV access and cannot drink → NG tube ORS 20 ml/kg/h for 6 hours; refer urgently.",
      "In severe acute malnutrition, rehydrate more cautiously (ReSoMal per protocol) — full Plan C rates risk overload.",
    ],
    zinc,
  };
}
