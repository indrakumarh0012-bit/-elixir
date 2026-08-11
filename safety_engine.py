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

def calculate_cr_cl(age, weight_kg, serum_cr, is_female=False):
    if serum_cr <= 0: return 0.0
    cr_cl = ((140 - age) * weight_kg) / (72 * serum_cr)
    if is_female: cr_cl *= 0.85
    return round(cr_cl, 1)

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
