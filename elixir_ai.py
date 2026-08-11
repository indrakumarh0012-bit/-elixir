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

def summarize_medical_history(raw_notes, groq_api_key):
    prompt = f"You are a Clinical Summarizer. Create a 1-page Executive Brief from these notes:\n{raw_notes}"
    return _chat(prompt, groq_api_key, "⚠️ Please enter your Groq API Key in the sidebar.")

def generate_kannada_discharge_text(clinical_plan, groq_api_key):
    prompt = f"Translate the following discharge instructions into simple Kannada for a patient:\n{clinical_plan}"
    return _chat(prompt, groq_api_key, "ದಯವಿಟ್ಟು ಉಚಿತ Groq API Key ನಮೂದಿಸಿ.")

def create_kannada_audio(kannada_text, output_filename="kannada_instructions.mp3"):
    if not kannada_text or kannada_text.startswith("⚠️") or kannada_text.startswith("ದಯವಿಟ್ಟು"):
        return None
    tts = gTTS(text=kannada_text, lang="kn", slow=False)
    tts.save(output_filename)
    return output_filename
