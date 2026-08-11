from pediatric_drug_db import PEDIATRIC_DRUG_DB, calculate_pediatric_dose, list_drugs_by_category

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

    # Device/age/volume-based entries
    if rules["min_mg_kg"] == 0 and rules["max_mg_kg"] == 0 and rules.get("absolute_max_single_mg", 0) == 0:
        return {
            "status": "INFO",
            "message": f"ℹ️ {key}: not verified as mg/kg × weight. See how-to-take / notes.",
            "range": "N/A (age/device/volume based)",
            "notes": rules.get("notes", ""),
            "source": rules.get("source", ""),
            "routes": rules.get("routes", []),
            "how_to_take": rules.get("how_to_take", ""),
        }

    min_rec = round(rules["min_mg_kg"] * weight_kg, 1)
    max_rec = round(min(rules["max_mg_kg"] * weight_kg, rules["absolute_max_single_mg"]), 1)
    total_daily = prescribed_mg * doses_per_day
    max_daily_by_wt = rules["max_daily_mg_kg"] * weight_kg
    max_daily = min(max_daily_by_wt, rules.get("absolute_max_daily_mg", max_daily_by_wt))
    range_str = f"{min_rec}–{max_rec} mg/dose"
    meta = {
        "range": range_str,
        "notes": rules.get("notes", ""),
        "source": rules.get("source", ""),
        "routes": rules.get("routes", []),
        "how_to_take": rules.get("how_to_take", ""),
        "contraindications": rules.get("contraindications", ""),
        "indications": rules.get("indications", ""),
    }

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
                f"usual limit ({round(max_daily, 1)} mg/day)."
            ),
            **meta,
        }
    return {
        "status": "SAFE",
        "message": f"🟢 SAFE DOSE: {prescribed_mg} mg is within usual pediatric limits.",
        **meta,
    }

# Harriet Lane acetaminophen PO/PR age–weight quick table (formulary)
PARACETAMOL_AGE_TABLE = [
    {"age_label": "0–3 mo", "age_months_min": 0, "age_months_max": 3, "wt_min": 2.7, "wt_max": 5.0, "dose_mg": 40},
    {"age_label": "4–11 mo", "age_months_min": 4, "age_months_max": 11, "wt_min": 5.1, "wt_max": 7.7, "dose_mg": 80},
    {"age_label": "1–2 yr", "age_months_min": 12, "age_months_max": 24, "wt_min": 7.8, "wt_max": 10.5, "dose_mg": 120},
    {"age_label": "2–3 yr", "age_months_min": 25, "age_months_max": 36, "wt_min": 10.6, "wt_max": 15.9, "dose_mg": 160},
    {"age_label": "4–5 yr", "age_months_min": 37, "age_months_max": 60, "wt_min": 16.0, "wt_max": 21.4, "dose_mg": 240},
    {"age_label": "6–8 yr", "age_months_min": 61, "age_months_max": 96, "wt_min": 21.5, "wt_max": 26.8, "dose_mg": 320},
    {"age_label": "9–10 yr", "age_months_min": 97, "age_months_max": 120, "wt_min": 26.9, "wt_max": 32.3, "dose_mg": 400},
    {"age_label": "11 yr", "age_months_min": 121, "age_months_max": 132, "wt_min": 32.4, "wt_max": 43.2, "dose_mg": 480},
]

def age_years_to_months(age_years):
    return round(float(age_years) * 12, 1)

def suggest_paracetamol_by_age(age_years):
    months = age_years_to_months(age_years)
    for row in PARACETAMOL_AGE_TABLE:
        if row["age_months_min"] <= months <= row["age_months_max"]:
            return row
    if months < 0:
        return None
    if months > 132:
        return {
            "age_label": ">11 yr / adolescent",
            "age_months_min": 133,
            "age_months_max": 216,
            "wt_min": 43.0,
            "wt_max": 70.0,
            "dose_mg": 650,
            "note": "Harriet Lane adult single dose often 325–650 mg; prefer weight-based 10–15 mg/kg (max 1000 mg).",
        }
    return None

def calculate_pediatric_dose(
    drug_name,
    weight_kg,
    mg_per_kg,
    doses_per_day=None,
    age_years=None,
):
    """
    Exact single-dose calculator from editable mg/kg × weight.
    Caps to absolute max single dose from Harriet Lane DB when present.
    """
    key = drug_name.strip().upper()
    if key not in PEDIATRIC_DRUG_DB:
        return {"ok": False, "message": f"Drug '{drug_name}' not in Harriet Lane safety database."}

    rules = PEDIATRIC_DRUG_DB[key]
    if weight_kg <= 0:
        return {"ok": False, "message": "Weight must be > 0 kg."}
    if mg_per_kg <= 0:
        return {"ok": False, "message": "mg/kg must be > 0."}

    if doses_per_day is None:
        doses_per_day = rules.get("default_doses_per_day", 3)

    raw_single = mg_per_kg * weight_kg
    capped_single = min(raw_single, rules["absolute_max_single_mg"])
    single_mg = round(capped_single, 1)
    daily_mg = round(single_mg * doses_per_day, 1)

    hl_min = rules["min_mg_kg"]
    hl_max = rules["max_mg_kg"]
    hl_single_min = round(hl_min * weight_kg, 1)
    hl_single_max = round(min(hl_max * weight_kg, rules["absolute_max_single_mg"]), 1)

    max_daily_by_wt = rules["max_daily_mg_kg"] * weight_kg
    max_daily = min(max_daily_by_wt, rules.get("absolute_max_daily_mg", max_daily_by_wt))

    warnings = []
    if mg_per_kg < hl_min:
        warnings.append(f"Selected {mg_per_kg} mg/kg is below Harriet Lane usual min ({hl_min} mg/kg).")
    if mg_per_kg > hl_max:
        warnings.append(f"Selected {mg_per_kg} mg/kg is above Harriet Lane usual max ({hl_max} mg/kg).")
    if raw_single > rules["absolute_max_single_mg"]:
        warnings.append(
            f"Calculated dose capped at absolute max single dose {rules['absolute_max_single_mg']} mg."
        )
    if daily_mg > max_daily:
        warnings.append(
            f"Total daily ({daily_mg} mg) exceeds Harriet Lane daily max ({round(max_daily, 1)} mg)."
        )

    age_hint = None
    if key == "PARACETAMOL" and age_years is not None:
        age_hint = suggest_paracetamol_by_age(age_years)

    return {
        "ok": True,
        "drug": key,
        "weight_kg": weight_kg,
        "mg_per_kg": mg_per_kg,
        "single_dose_mg": single_mg,
        "doses_per_day": doses_per_day,
        "daily_dose_mg": daily_mg,
        "hl_suggested_mg_kg": f"{hl_min}–{hl_max}",
        "hl_single_range_mg": f"{hl_single_min}–{hl_single_max}",
        "max_daily_mg": round(max_daily, 1),
        "notes": rules.get("notes", ""),
        "source": rules.get("source", ""),
        "warnings": warnings,
        "age_table_hint": age_hint,
    }
