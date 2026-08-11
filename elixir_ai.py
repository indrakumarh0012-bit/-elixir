import os
from openai import OpenAI
from gtts import gTTS

def get_groq_client(api_key):
    return OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

def summarize_medical_history(raw_notes, groq_api_key):
    if not groq_api_key: return "⚠️ Please enter your Groq API Key in the sidebar."
    client = get_groq_client(groq_api_key)
    prompt = f"You are a Clinical Summarizer. Create a 1-page Executive Brief from these notes:\n{raw_notes}"
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    return response.choices[0].message.content

def generate_kannada_discharge_text(clinical_plan, groq_api_key):
    if not groq_api_key: return "ದಯವಿಟ್ಟು ಉಚಿತ Groq API Key ನಮೂದಿಸಿ."
    client = get_groq_client(groq_api_key)
    prompt = f"Translate the following discharge instructions into simple Kannada for a patient:\n{clinical_plan}"
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    return response.choices[0].message.content

def create_kannada_audio(kannada_text, output_filename="kannada_instructions.mp3"):
    tts = gTTS(text=kannada_text, lang='kn', slow=False)
    tts.save(output_filename)
    return output_filename
