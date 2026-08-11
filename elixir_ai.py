from openai import OpenAI, AuthenticationError, APIError
from gtts import gTTS

def get_groq_client(api_key):
    return OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

def _chat(prompt, groq_api_key, empty_message):
    if not groq_api_key:
        return empty_message
    try:
        client = get_groq_client(groq_api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return response.choices[0].message.content
    except AuthenticationError:
        return "⚠️ Invalid Groq API key. Get a free key at https://console.groq.com/keys and paste it in the sidebar (or set GROQ_API_KEY in Streamlit secrets)."
    except APIError as e:
        return f"⚠️ Groq API error: {e.message or str(e)}"
    except Exception as e:
        return f"⚠️ Unexpected error: {e}"

def summarize_medical_history(raw_notes, groq_api_key, specialty="Auto"):
    specialty = (specialty or "Auto").strip()
    prompt = f"""
You are a senior clinical summarizer for Smart-Elixir.
Create a DETAILED clinical executive brief from the notes below.

REFERENCE FRAMEWORK (use the matching standard textbook style/structure):
- Pediatrics → Nelson Textbook of Pediatrics (+ Harriet Lane for drug dosing when relevant)
- Obstetrics & Gynecology → Williams Obstetrics / Williams Gynecology
- Internal Medicine → Harrison's Principles of Internal Medicine
- Surgery → Bailey & Love's Short Practice of Surgery and S. Das (A Manual on Clinical Surgery / operative principles as applicable)

Selected specialty hint from clinician: {specialty}
If specialty is Auto, infer the most likely specialty from the notes and state which textbook lens you used.

OUTPUT RULES:
1) Be detailed and clinically useful — not a vague one-liner summary.
2) Prefer facts present in the notes. If you add standard textbook-based expected treatment detail that is NOT explicitly in the notes, label it clearly as:
   "Suggested (textbook-aligned; confirm locally): ..."
3) NEVER invent lab values, imaging findings, or diagnoses not supported by the notes.
4) Keep ALL numbers, doses, frequencies, and durations in English digits/units (e.g., 500 mg, 7 days, Q8 hr).
5) For every drug/treatment, include when available (or mark Unknown):
   - Drug/intervention name
   - Dose (mg / mg/kg / mcg etc.)
   - Route: Oral (PO) / IV / IM / SC / PR / Inhalation / Topical / Other
   - Frequency
   - Duration
   - Indication
6) Use markdown with the exact section headings below.

# Clinical Executive Brief

## 1. Specialty & Reference Lens
- Inferred/selected specialty
- Primary textbook lens used

## 2. Patient Snapshot
- Age / sex / weight (if available)
- Key comorbidities / allergies
- Admission/context reason

## 3. Clinical Presentation
- Chief complaints and timeline
- Relevant positives/negatives from history & exam

## 4. Investigations
- Labs (with values/dates if present)
- Imaging / procedures

## 5. Working Diagnosis / Differentials
- Most likely diagnosis
- Important differentials

## 6. Treatment Plan (DETAILED)
Provide a table with columns:
| Therapy | Dose | Route (PO/IV/etc.) | Frequency | Duration | Indication | Source in notes / Suggested |

Then add short bullet notes for fluids, oxygen, supportive care, and non-drug interventions.

## 7. Monitoring & Red Flags
- Parameters to monitor
- When to escalate / danger signs

## 8. Disposition & Follow-up
- Discharge / admit / refer advice if present
- Follow-up timing and counseling points

## 9. Clinician Checklist
- Missing data that should be confirmed before acting
- Dose/route/duration items needing clarification

NOTES:
{raw_notes}
""".strip()
    return _chat(prompt, groq_api_key, "⚠️ Please enter your Groq API Key in the sidebar.")

def generate_kannada_discharge_text(clinical_plan, groq_api_key):
    prompt = (
        "Translate the following discharge instructions into simple Kannada for a patient.\n"
        "STRICT RULES:\n"
        "1) All words/sentences must be in Kannada script.\n"
        "2) Keep ALL numbers, doses, strengths, times, and dates in English digits only "
        "(example: 250 mg, 5 ml, 3 times, 12/08/2026). Never use Kannada numerals or number-words.\n"
        "3) Keep drug names and units (mg, ml, kg, hrs) in English.\n"
        "4) Do not add extra medical advice beyond the input.\n\n"
        f"Instructions:\n{clinical_plan}"
    )
    return _chat(prompt, groq_api_key, "ದಯವಿಟ್ಟು ಉಚಿತ Groq API Key ನಮೂದಿಸಿ.")

def create_kannada_audio(kannada_text, output_filename="kannada_instructions.mp3"):
    if not kannada_text or kannada_text.startswith("⚠️") or kannada_text.startswith("ದಯವಿಟ್ಟು"):
        return None
    tts = gTTS(text=kannada_text, lang="kn", slow=False)
    tts.save(output_filename)
    return output_filename
