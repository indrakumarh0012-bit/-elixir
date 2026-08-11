import base64
from io import BytesIO

from pypdf import PdfReader
from openai import OpenAI, AuthenticationError, APIError

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}

def validate_upload(file):
    if file is None:
        return False, "No file uploaded."
    size = getattr(file, "size", None)
    if size is None:
        data = file.getvalue()
        size = len(data)
    if size > MAX_UPLOAD_BYTES:
        return False, f"File exceeds 15 MB limit ({size / (1024 * 1024):.1f} MB)."
    return True, ""

def extract_text_from_pdf(file_bytes):
    reader = PdfReader(BytesIO(file_bytes))
    chunks = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            chunks.append(f"--- PDF page {i} ---\n{text.strip()}")
    if not chunks:
        return ""
    return "\n\n".join(chunks)

def extract_text_from_image(file_bytes, mime, groq_api_key):
    """Use Groq vision to read clinical text from an image."""
    if not groq_api_key:
        return "⚠️ Please enter your Groq API Key to read image uploads."
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"
    client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=groq_api_key)
    prompt = (
        "Extract ALL clinical text from this medical document image. "
        "Preserve drug names, doses, routes (PO/IV/IM), frequencies, durations, labs, and dates. "
        "Keep numbers in English digits. Return plain text only."
    )
    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content or ""
    except AuthenticationError:
        return "⚠️ Invalid Groq API key — cannot read image."
    except APIError as e:
        return f"⚠️ Groq vision API error: {e.message or str(e)}"
    except Exception as e:
        return f"⚠️ Image read failed: {e}"

def ingest_uploaded_file(uploaded_file, groq_api_key=""):
    ok, err = validate_upload(uploaded_file)
    if not ok:
        return False, err

    file_bytes = uploaded_file.getvalue()
    name = (uploaded_file.name or "").lower()
    mime = uploaded_file.type or ""

    if mime == "application/pdf" or name.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
        if not text.strip():
            return False, "No extractable text found in PDF (it may be a scanned image-only PDF)."
        return True, text

    if mime.startswith("image/") or name.endswith((".png", ".jpg", ".jpeg", ".webp")):
        mime_safe = mime if mime.startswith("image/") else "image/jpeg"
        text = extract_text_from_image(file_bytes, mime_safe, groq_api_key)
        if text.startswith("⚠️"):
            return False, text
        if not text.strip():
            return False, "No clinical text could be read from the image."
        return True, text

    return False, "Unsupported file type. Upload PDF or image (PNG/JPG/WEBP), max 15 MB."
