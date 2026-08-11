import streamlit as st
import urllib.parse
from safety_engine import calculate_cr_cl, verify_pediatric_dose, PEDIATRIC_DRUG_DB
from elixir_ai import summarize_medical_history, generate_kannada_discharge_text, create_kannada_audio
from whatsapp_dispatch import build_whatsapp_message, send_whatsapp_cloud_api
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
    st.markdown("---")
    patient_phone = st.text_input("Patient WhatsApp Number", "+919876543210")
    followup_date = st.date_input("Next Follow-up Date")
    st.markdown("---")
    st.caption(
        "Direct WhatsApp send needs Meta Cloud API secrets: "
        "`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`."
    )

tab1, tab2, tab3 = st.tabs(["📑 Summarizer", "🛡️ Safety Guard", "📲 Kannada Dispatch"])

with tab1:
    st.caption(
        "Detailed brief with dose / route (PO vs IV) / duration, aligned to "
        "Nelson (Pediatrics), Williams (OBG), Harrison (Medicine), Bailey & Love + S. Das (Surgery)."
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
            with st.spinner("Processing detailed clinical brief with Groq..."):
                st.markdown(summarize_medical_history(notes, groq_api_key, specialty))

with tab2:
    col_peds, col_renal = st.columns(2)
    with col_peds:
        st.markdown("### 👶 Pediatric Dosing")
        st.caption("Reference: Harriet Lane Handbook formulary (primary)")
        p_weight = st.number_input("Child Weight (kg)", 2.0, 60.0, 12.0)
        p_drug = st.selectbox("Select Medication", list(PEDIATRIC_DRUG_DB.keys()))
        p_dose = st.number_input("Prescribed Single Dose (mg)", 1.0, 1000.0, 150.0)
        p_freq = st.number_input(
            "Doses per day",
            1,
            8,
            int(PEDIATRIC_DRUG_DB[p_drug].get("default_doses_per_day", 3)),
        )
        st.info(PEDIATRIC_DRUG_DB[p_drug]["notes"])
        if st.button("Verify Pediatric Dose"):
            res = verify_pediatric_dose(p_drug, p_dose, p_weight, p_freq)
            st.write(res["message"])
            st.caption(f"Suggested single-dose range: {res.get('range', '')}")
            if res.get("source"):
                st.caption(f"Source: {res['source']}")

    with col_renal:
        st.markdown("### 🩺 Adult Renal Clearance (CrCl)")
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
            "Inaccurate in AKI / unstable creatinine. CKD-EPI is preferred for CKD staging."
        )

with tab3:
    clinical_plan = st.text_area(
        "Enter Care Plan in English",
        value="Take Paracetamol 250mg syrup. Return next week.",
    )
    if st.button("🌐 Generate Kannada Translation & Audio"):
        with st.spinner("Translating with Groq..."):
            k_text = generate_kannada_discharge_text(clinical_plan, groq_api_key)
        st.session_state["k_text"] = k_text
        st.session_state["audio_path"] = create_kannada_audio(k_text)
        if not (k_text.startswith("⚠️") or k_text.startswith("ದಯವಿಟ್ಟು")):
            st.session_state["wa_message"] = build_whatsapp_message(k_text, followup_date)

    if "k_text" in st.session_state:
        k_text = st.session_state["k_text"]
        if k_text.startswith("⚠️") or k_text.startswith("ದಯವಿಟ್ಟು"):
            st.error(k_text)
        else:
            wa_message = st.session_state.get("wa_message") or build_whatsapp_message(k_text, followup_date)
            st.session_state["wa_message"] = wa_message

            st.subheader("Kannada instructions")
            st.success(k_text)
            if st.session_state.get("audio_path"):
                st.audio(st.session_state["audio_path"], format="audio/mp3")

            st.subheader("WhatsApp message (reminder + instructions)")
            st.code(wa_message, language=None)

            if st.button("📤 Send on WhatsApp now", type="primary"):
                ok, info = send_whatsapp_cloud_api(
                    patient_phone,
                    wa_message,
                    token=_secret("WHATSAPP_TOKEN"),
                    phone_number_id=_secret("WHATSAPP_PHONE_NUMBER_ID"),
                )
                if ok:
                    st.success(info)
                else:
                    st.error(info)
                    encoded_msg = urllib.parse.quote(wa_message)
                    whatsapp_url = f"https://wa.me/{patient_phone.replace('+', '').replace(' ', '')}?text={encoded_msg}"
                    st.warning(
                        "Fallback: opens WhatsApp with the full message pre-filled. "
                        "WhatsApp always requires tapping Send once unless Cloud API is configured."
                    )
                    st.link_button("Open pre-filled WhatsApp chat", whatsapp_url)
