PEDIATRIC_DRUG_DB = {
    # Primary reference: Harriet Lane Handbook — Chapter 29 Drug Dosages (formulary)
    "PARACETAMOL": {
        "min_mg_kg": 10.0,
        "max_mg_kg": 15.0,
        "absolute_max_single_mg": 1000.0,
        "max_daily_mg_kg": 90.0,
        "absolute_max_daily_mg": 4000.0,
        "default_doses_per_day": 4,
        "notes": (
            "Harriet Lane: Acetaminophen/Paracetamol PO/PR 10–15 mg/kg/dose Q4–6 hr; "
            "max 90 mg/kg/24 hr or 4 g/24 hr (adult max also 5 doses/24 hr). "
            "IV regimens differ — verify separately."
        ),
        "source": "Harriet Lane Handbook formulary (Acetaminophen)",
    },
    "AMOXICILLIN": {
        # Per-dose range assumes standard child dosing divided Q8 hr (TID): 25–50 mg/kg/24 hr
        "min_mg_kg": 8.0,
        "max_mg_kg": 17.0,
        "absolute_max_single_mg": 1000.0,
        "max_daily_mg_kg": 50.0,
        "absolute_max_daily_mg": 3000.0,
        "high_dose_daily_mg_kg": 90.0,
        "default_doses_per_day": 3,
        "notes": (
            "Harriet Lane: Child standard 25–50 mg/kg/24 hr ÷ Q8–12 hr PO; "
            "high-dose (resistant S. pneumoniae / AOM / sinusitis / CAP) 80–90 mg/kg/24 hr ÷ Q8–12 hr; "
            "max usually 2–3 g/24 hr (some experts up to 4 g/24 hr). "
            "Neonate–≤3 mo: 20–30 mg/kg/24 hr ÷ Q12 hr."
        ),
        "source": "Harriet Lane Handbook formulary (Amoxicillin)",
    },
    "IBUPROFEN": {
        "min_mg_kg": 5.0,
        "max_mg_kg": 10.0,
        "absolute_max_single_mg": 800.0,
        "max_daily_mg_kg": 40.0,
        "absolute_max_daily_mg": 2400.0,
        "default_doses_per_day": 4,
        "notes": (
            "Harriet Lane–aligned analgesic dosing: typically 5–10 mg/kg/dose PO Q6–8 hr; "
            "usual max ~40 mg/kg/24 hr. Avoid in dehydration / significant renal impairment."
        ),
        "source": "Harriet Lane Handbook (analgesic reference use)",
    },
}

def ideal_body_weight_kg(height_cm, is_female=False):
    """Devine IBW from height in cm."""
    height_in = height_cm / 2.54
    base = 45.5 if is_female else 50.0
    return round(base + 2.3 * (height_in - 60), 1)

def adjusted_body_weight_kg(actual_kg, ibw_kg):
    """AjBW = IBW + 0.4 × (ABW − IBW)."""
    return round(ibw_kg + 0.4 * (actual_kg - ibw_kg), 1)

def dosing_weight_kg(actual_kg, height_cm=None, is_female=False):
    """
    Pick weight for Cockcroft-Gault:
    - If height given and ABW > 120% of IBW (overweight/obese), use AjBW.
    - Otherwise use actual body weight.
    """
    if height_cm is None or height_cm <= 0:
        return actual_kg, "ABW", None, None

    ibw = ideal_body_weight_kg(height_cm, is_female)
    if actual_kg > 1.2 * ibw:
        ajbw = adjusted_body_weight_kg(actual_kg, ibw)
        return ajbw, "AjBW", ibw, ajbw
    return actual_kg, "ABW", ibw, None

def calculate_cr_cl(
    age,
    weight_kg,
    serum_cr,
    is_female=False,
    cr_unit="mg/dL",
    height_cm=None,
):
    """
    Cockcroft-Gault creatinine clearance (mL/min).

    mg/dL:  CrCl = ((140 − age) × weight) / (72 × Scr) × [0.85 if female]
    µmol/L: CrCl = ((140 − age) × weight × k) / Scr
            k = 1.23 (male) or 1.04 (female)
    """
    if serum_cr <= 0 or age <= 0 or weight_kg <= 0:
        return {
            "cr_cl": 0.0,
            "weight_used": weight_kg,
            "weight_basis": "ABW",
            "ibw": None,
            "ajbw": None,
            "gender_factor": 0.85 if is_female else 1.0,
        }

    wt, basis, ibw, ajbw = dosing_weight_kg(weight_kg, height_cm, is_female)
    gender_factor = 0.85 if is_female else 1.0

    unit = (cr_unit or "mg/dL").strip().lower()
    if unit in ("umol/l", "µmol/l", "μmol/l", "umol", "µmol"):
        k = 1.04 if is_female else 1.23
        cr_cl = ((140 - age) * wt * k) / serum_cr
    else:
        cr_cl = ((140 - age) * wt) / (72 * serum_cr) * gender_factor

    return {
        "cr_cl": round(cr_cl, 1),
        "weight_used": wt,
        "weight_basis": basis,
        "ibw": ibw,
        "ajbw": ajbw,
        "gender_factor": gender_factor,
    }

def verify_pediatric_dose(drug_name, prescribed_mg, weight_kg, doses_per_day=None):
    key = drug_name.strip().upper()
    if key not in PEDIATRIC_DRUG_DB:
        return {"status": "UNKNOWN", "message": f"Drug '{drug_name}' not in safety database."}

    rules = PEDIATRIC_DRUG_DB[key]
    if doses_per_day is None:
        doses_per_day = rules.get("default_doses_per_day", 3)

    min_rec = round(rules["min_mg_kg"] * weight_kg, 1)
    max_rec = round(min(rules["max_mg_kg"] * weight_kg, rules["absolute_max_single_mg"]), 1)
    total_daily = prescribed_mg * doses_per_day
    max_daily_by_wt = rules["max_daily_mg_kg"] * weight_kg
    max_daily = min(max_daily_by_wt, rules.get("absolute_max_daily_mg", max_daily_by_wt))
    range_str = f"{min_rec}–{max_rec} mg/dose"
    meta = {"range": range_str, "notes": rules.get("notes", ""), "source": rules.get("source", "")}

    if prescribed_mg > max_rec:
        return {
            "status": "ERROR",
            "message": f"🔴 OVERDOSE: Prescribed {prescribed_mg} mg exceeds single max safe dose ({max_rec} mg).",
            **meta,
        }
    if prescribed_mg < min_rec:
        return {
            "status": "WARNING",
            "message": f"🟡 UNDERDOSE: Prescribed {prescribed_mg} mg is below therapeutic threshold ({min_rec} mg).",
            **meta,
        }
    if total_daily > max_daily:
        return {
            "status": "ERROR",
            "message": (
                f"🔴 DAILY MAX EXCEEDED: Total daily dose ({total_daily} mg) exceeds "
                f"Harriet Lane limit ({round(max_daily, 1)} mg/day)."
            ),
            **meta,
        }
    return {
        "status": "SAFE",
        "message": f"🟢 SAFE DOSE: {prescribed_mg} mg is within Harriet Lane standard limits.",
        **meta,
    }
