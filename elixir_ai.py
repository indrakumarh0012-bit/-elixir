from openai import OpenAI, AuthenticationError, APIError
from gtts import gTTS

def get_groq_client(api_key):
    return OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

def _chat(prompt, groq_api_key, empty_message, temperature=0.2):
    if not groq_api_key:
        return empty_message
    try:
        client = get_groq_client(groq_api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
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
You are a clinical documentation summarizer for Smart-Elixir.
Write a SHORT, ACCURATE summary of ONLY what is written in the notes.

Specialty hint (for terminology only, do NOT invent content): {specialty}
Textbook names (Nelson/Williams/Harrison/Bailey/S.Das) are for language style only — do NOT add textbook advice that is not in the notes.

HARD RULES:
1) Use ONLY facts explicitly present in the notes. If something is not written, OMIT it. Do not write "Unknown", "Not mentioned", "N/A", "Suggested", or empty sections.
2) Do NOT invent diagnoses, labs, doses, routes, durations, differentials, red flags, or follow-up plans.
3) If multiple patients appear, make a separate summary for EACH patient (Patient 1, Patient 2, ...). Never merge treatments across patients.
4) List EACH treatment/drug on its OWN line/bullet — never combine many drugs into one paragraph.
5) For a treatment, include ONLY fields that are actually present among: drug name, dose, route (PO/IV/IM/etc.), frequency, duration, indication.
6) Keep numbers in English digits (e.g., 250 mg, 5 ml, 7 days).
7) Keep the summary concise. No filler, no teaching commentary, no checklists of missing data.

OUTPUT FORMAT (repeat per patient):

### Patient: <name or identifier if present, else Patient 1>
- Age / sex / weight: <only if present>
- Presentation: <only if present>
- Diagnosis: <only if present>
- Investigations: <only values/tests present>
- Treatments given:
  1. <Drug> — <dose if present>, <route if present>, <frequency if present>, <duration if present>
  2. <next drug/treatment separately>
- Other care: <fluids/procedures/advice only if present>
- Disposition / follow-up: <only if present>

If only one patient, still use this structure once.

NOTES:
{raw_notes}
""".strip()
    return _chat(prompt, groq_api_key, "⚠️ Please enter your Groq API Key in the sidebar.", temperature=0.1)

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
