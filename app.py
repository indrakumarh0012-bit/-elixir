import streamlit as st
from safety_engine import (
    calculate_cr_cl,
    verify_pediatric_dose,
    PEDIATRIC_DRUG_DB,
    calculate_pediatric_dose,
)
from elixir_ai import summarize_medical_history
from document_ingest import ingest_uploaded_file

st.set_page_config(page_title="Smart-Elixir Platform", page_icon="🏥", layout="wide")
st.title("🏥 Smart-Elixir: Clinical AI & Patient Safety Hub")

def _secret(name, default=""):
    try:
        return st.secrets[name]
    except Exception:
        return default

with st.sidebar:
    st.header("🔑 Credentials")
    groq_api_key = st.text_input(
        "Groq API Key (Free)",
        type="password",
        value=_secret("GROQ_API_KEY"),
        help="Get a free key at https://console.groq.com/keys — or set GROQ_API_KEY in Streamlit Cloud secrets.",
    )

tab1, tab2, tab3 = st.tabs(
    ["📑 Summarizer", "🛡️ Pediatrics & CrCl", "🧮 Ped Dose Calculator"]
)

with tab1:
    st.caption(
        "Factual summary only from your notes: each patient separate, each treatment listed separately. "
        "No invented doses or empty sections."
    )
    specialty = st.selectbox(
        "Specialty lens",
        [
            "Auto",
            "Pediatrics (Nelson)",
            "OBG (Williams)",
            "Medicine (Harrison)",
            "Surgery (Bailey & Love / S. Das)",
        ],
    )
    uploaded = st.file_uploader(
        "Upload notes PDF or image (max 15 MB)",
        type=["pdf", "png", "jpg", "jpeg", "webp"],
        accept_multiple_files=False,
    )
    raw_notes = st.text_area("Paste Previous Hospital Notes / Lab History", height=220)
    if st.button("⚡ Generate Executive Brief"):
        notes = raw_notes.strip()
        if uploaded is not None:
            with st.spinner("Reading uploaded file..."):
                ok, extracted = ingest_uploaded_file(uploaded, groq_api_key)
            if not ok:
                st.error(extracted)
                st.stop()
            notes = (notes + "\n\n" if notes else "") + f"[From upload: {uploaded.name}]\n{extracted}"
            with st.expander("Extracted text from upload"):
                st.text(extracted[:8000])
        if not notes:
            st.warning("Paste clinical notes and/or upload a PDF/image first.")
        else:
            with st.spinner("Processing clinical summary with Groq..."):
                st.markdown(summarize_medical_history(notes, groq_api_key, specialty))

with tab2:
    col_peds, col_renal = st.columns(2)
    with col_peds:
        st.markdown("### 👶 Pediatric Verify Dose")
        st.caption(
            f"{len(PEDIATRIC_DRUG_DB)} drugs — antibiotics + OPD "
            "(cold/cough/fever/vomit/abdomen/allergy/scabies)."
        )
        categories = sorted({m.get("category", "General") for m in PEDIATRIC_DRUG_DB.values()})
        cat = st.selectbox("Filter by category", ["All"] + categories, key="verify_cat")
        drug_options = sorted(
            [
                k for k, v in PEDIATRIC_DRUG_DB.items()
                if cat == "All" or v.get("category") == cat
            ]
        )
        p_weight = st.number_input("Child Weight (kg)", 2.0, 80.0, 12.0, key="verify_wt")
        p_drug = st.selectbox("Select Medication", drug_options, key="verify_drug")
        meta = PEDIATRIC_DRUG_DB[p_drug]
        st.write(f"**Routes:** {', '.join(meta.get('routes', []))}")
        if meta.get("indications"):
            st.write(f"**Common use:** {meta['indications']}")
        st.write(f"**How to take:** {meta.get('how_to_take', '')}")
        if meta.get("contraindications"):
            st.warning(f"**Contraindications / cautions:** {meta['contraindications']}")
        p_dose = st.number_input("Prescribed Single Dose (mg)", 0.0, 5000.0, 150.0, key="verify_dose")
        p_freq = st.number_input(
            "Doses per day",
            1,
            8,
            int(meta.get("default_doses_per_day", 3)),
            key="verify_freq",
        )
        st.info(meta.get("notes", ""))
        if st.button("Verify Pediatric Dose"):
            res = verify_pediatric_dose(p_drug, p_dose, p_weight, p_freq)
            st.write(res["message"])
            st.caption(f"Suggested single-dose range: {res.get('range', '')}")
            if res.get("contraindications"):
                st.warning(f"Contraindications: {res['contraindications']}")

    with col_renal:
        st.markdown("### 🩺 Creatinine Clearance (CrCl)")
        st.caption("Cockcroft–Gault equation")
        a_sex = st.radio("Sex", ["Male", "Female"], horizontal=True, key="cr_sex")
        a_age = st.number_input("Age (years)", 18, 110, 60, key="cr_age")
        a_weight = st.number_input("Actual Body Weight (kg)", 30.0, 200.0, 60.0, key="cr_wt")
        a_height = st.number_input(
            "Height (cm) — optional for IBW/AjBW",
            0.0, 220.0, 165.0,
            help="If ABW > 120% of IBW, Adjusted Body Weight is used.",
            key="cr_ht",
        )
        cr_unit = st.selectbox("Serum Creatinine Unit", ["mg/dL", "µmol/L"], key="cr_unit")
        if cr_unit == "mg/dL":
            a_cr = st.number_input("Serum Creatinine", 0.2, 20.0, 1.2, step=0.1, key="cr_val_mg")
        else:
            a_cr = st.number_input("Serum Creatinine", 10.0, 2000.0, 106.0, step=1.0, key="cr_val_umol")

        result = calculate_cr_cl(
            age=a_age,
            weight_kg=a_weight,
            serum_cr=a_cr,
            is_female=(a_sex == "Female"),
            cr_unit=cr_unit,
            height_cm=a_height if a_height > 0 else None,
        )
        st.metric("Estimated CrCl", f"{result['cr_cl']} mL/min")
        st.caption(
            f"Weight used: **{result['weight_used']} kg** ({result['weight_basis']})"
            + (f" · IBW {result['ibw']} kg" if result["ibw"] is not None else "")
            + (f" · AjBW {result['ajbw']} kg" if result["ajbw"] is not None else "")
            + f" · Gender factor {result['gender_factor']}"
        )
        st.info(
            "Cockcroft–Gault is preferred for drug dosing. "
            "Inaccurate in AKI / unstable creatinine."
        )

with tab3:
    st.markdown("### 🧮 Pediatric Dose Calculator")
    st.caption(
        "Suggested mg/kg from formulary ranges. Modify mg/kg if needed; weight gives exact mg."
    )
    c1, c2 = st.columns(2)
    with c1:
        calc_age_years = st.number_input("Age (years)", 0.0, 18.0, 3.0, step=0.5, key="calc_age")
        calc_wt = st.number_input("Weight (kg)", 1.0, 100.0, 14.0, step=0.1, key="calc_wt")
        calc_cat = st.selectbox(
            "Category",
            ["All"] + sorted({m.get("category", "General") for m in PEDIATRIC_DRUG_DB.values()}),
            key="calc_cat",
        )
        calc_drugs = sorted(
            [
                k for k, v in PEDIATRIC_DRUG_DB.items()
                if calc_cat == "All" or v.get("category") == calc_cat
            ]
        )
        calc_drug = st.selectbox("Medicine", calc_drugs, key="calc_drug")
        meta = PEDIATRIC_DRUG_DB[calc_drug]
        calc_route = st.selectbox("Route", meta.get("routes", ["PO"]), key="calc_route")
    with c2:
        st.write(f"**Usual mg/kg/dose:** {meta['min_mg_kg']} – {meta['max_mg_kg']}")
        default_mgkg = round((meta["min_mg_kg"] + meta["max_mg_kg"]) / 2, 2) if meta["max_mg_kg"] else 0.0
        calc_mgkg = st.number_input(
            "Dose (mg/kg) — editable",
            0.0, 200.0, float(default_mgkg), step=0.05, key="calc_mgkg",
        )
        calc_freq = st.number_input(
            "Doses per day", 1, 8, int(meta.get("default_doses_per_day", 3)), key="calc_freq",
        )
        st.write(f"**How to take:** {meta.get('how_to_take', '')}")
        if meta.get("contraindications"):
            st.warning(f"**Contraindications:** {meta['contraindications']}")
        st.caption(meta.get("notes", ""))

    calc = calculate_pediatric_dose(
        calc_drug, calc_wt, calc_mgkg, calc_freq, calc_route, age_years=calc_age_years
    )
    if calc.get("ok"):
        if calc.get("single_dose_mg") is not None:
            m1, m2, m3 = st.columns(3)
            m1.metric("Exact single dose", f"{calc['single_dose_mg']} mg")
            m2.metric("Total per day", f"{calc['daily_dose_mg']} mg")
            m3.metric("Route", calc["route"])
            st.success(
                f"For {calc_wt} kg @ {calc_mgkg} mg/kg → **{calc['single_dose_mg']} mg** "
                f"{calc['route']} × {calc_freq}/day"
            )
            st.caption(
                f"Suggested single-dose window: "
                f"{calc.get('suggested_min_mg')}–{calc.get('suggested_max_mg')} mg"
            )
            if calc.get("warnings"):
                for w in calc["warnings"]:
                    st.warning(w)
        else:
            st.info(calc.get("message", ""))
        st.write("**Instructions:**", calc.get("how_to_take", ""))
    else:
        st.error(calc.get("message", "Could not calculate."))
