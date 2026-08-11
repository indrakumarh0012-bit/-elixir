PEDIATRIC_DRUG_DB = {
    "PARACETAMOL": {
        "min_mg_kg": 10.0, "max_mg_kg": 15.0, "absolute_max_single_mg": 1000.0,
        "max_daily_mg_kg": 60.0, "notes": "Give every 4-6 hrs PRN. Max 4 doses/24 hrs."
    },
    "AMOXICILLIN": {
        "min_mg_kg": 20.0, "max_mg_kg": 30.0, "absolute_max_single_mg": 1000.0,
        "max_daily_mg_kg": 90.0, "notes": "Standard dosing every 8 hours."
    }
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

def verify_pediatric_dose(drug_name, prescribed_mg, weight_kg, doses_per_day=3):
    key = drug_name.strip().upper()
    if key not in PEDIATRIC_DRUG_DB:
        return {"status": "UNKNOWN", "message": f"Drug '{drug_name}' not in safety database."}

    rules = PEDIATRIC_DRUG_DB[key]
    min_rec = round(rules["min_mg_kg"] * weight_kg, 1)
    max_rec = round(min(rules["max_mg_kg"] * weight_kg, rules["absolute_max_single_mg"]), 1)
    total_daily = prescribed_mg * doses_per_day
    max_daily = rules["max_daily_mg_kg"] * weight_kg

    if prescribed_mg > max_rec:
        return {"status": "ERROR", "message": f"🔴 OVERDOSE: Prescribed {prescribed_mg} mg exceeds single max safe dose ({max_rec} mg).", "range": f"{min_rec}–{max_rec} mg"}
    elif prescribed_mg < min_rec:
        return {"status": "WARNING", "message": f"🟡 UNDERDOSE: Prescribed {prescribed_mg} mg is below therapeutic threshold ({min_rec} mg).", "range": f"{min_rec}–{max_rec} mg"}
    elif total_daily > max_daily:
        return {"status": "ERROR", "message": f"🔴 DAILY MAX EXCEEDED: Total daily dose ({total_daily} mg) exceeds limit ({max_daily} mg/day).", "range": f"{min_rec}–{max_rec} mg"}
    else:
        return {"status": "SAFE", "message": f"🟢 SAFE DOSE: {prescribed_mg} mg is within standard limits.", "range": f"{min_rec}–{max_rec} mg"}
