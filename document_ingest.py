import base64
import re
from io import BytesIO

from openai import OpenAI, AuthenticationError, APIError

MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB
ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


def strip_model_thinking(text: str) -> str:
    """Remove <think> / analysis process so only clinical extract remains."""
    if not text:
        return ""
    t = re.sub(r"<think\b[^>]*>[\s\S]*?(?:</think>|$)", "", text, flags=re.I)
    t = re.sub(r"</?think\b[^>]*>", "", t, flags=re.I)
    t = re.sub(r"<thinking\b[^>]*>[\s\S]*?(?:</thinking>|$)", "", t, flags=re.I)
    t = re.sub(r"</?thinking\b[^>]*>", "", t, flags=re.I)
    lines = []
    for line in t.splitlines():
        low = line.strip().lower()
        if re.match(
            r"^(the user wants me to|i need to extract|let me (look|analyze|examine)|looking (closely|at the)|wait,?\s+looking)",
            low,
        ):
            continue
        lines.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def validate_upload(file):
    if file is None:
        return False, "No file uploaded."
    size = getattr(file, "size", None)
    if size is None:
        data = file.getvalue()
        size = len(data)
    if size > MAX_UPLOAD_BYTES:
        return False, f"File exceeds 100 MB limit ({size / (1024 * 1024):.1f} MB)."
    return True, ""

def extract_text_from_pdf(file_bytes):
    try:
        from pypdf import PdfReader
    except ImportError:
        return None  # signal missing dependency
    reader = PdfReader(BytesIO(file_bytes))
    chunks = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            chunks.append(f"--- PDF page {i} ---\n{text.strip()}")
    if not chunks:
        return ""
    return "\n\n".join(chunks)

def _compress_image_for_vision(file_bytes, max_edge=768, quality=62):
    """Downscale WhatsApp photos so Groq vision stays under TPM 8000."""
    try:
        from PIL import Image
    except ImportError:
        return file_bytes, "image/jpeg"
    img = Image.open(BytesIO(file_bytes))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    w, h = img.size
    longest = max(w, h)
    if longest > max_edge:
        scale = max_edge / float(longest)
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    out = BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue(), "image/jpeg"


def extract_text_from_image(file_bytes, mime, groq_api_key):
    """Use Groq vision to read clinical text from an image."""
    if not groq_api_key:
        return "⚠️ Please enter your Groq API Key to read image uploads."
    client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=groq_api_key)
    prompt = (
        "Clinical OCR only. OUTPUT EXTRACTED CLINICAL TEXT — nothing else. "
        "NO <think>, NO thinking, NO analysis process, NO commentary. "
        "Hospital ID, name, age, sex, drugs with doses, labs, dates, advice. "
        "Uncertain: [?]. Illegible: [illegible]. English digits. Plain text. Do not invent drugs."
    )
    attempts = [(768, 62), (512, 55), (384, 48)]
    last_err = "No vision model available."
    for max_edge, quality in attempts:
        try:
            compressed, out_mime = _compress_image_for_vision(file_bytes, max_edge, quality)
            b64 = base64.b64encode(compressed).decode("utf-8")
            data_url = f"data:{out_mime};base64,{b64}"
            response = client.chat.completions.create(
                model="qwen/qwen3.6-27b",
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
                max_tokens=1200,
            )
            return strip_model_thinking(response.choices[0].message.content or "")
        except AuthenticationError:
            return "⚠️ Invalid Groq API key — cannot read image."
        except APIError as e:
            msg = e.message or str(e)
            last_err = f"⚠️ Groq vision API error: {msg}"
            low = msg.lower()
            if "too large" in low or "tpm" in low or "413" in low or "rate_limit" in low:
                continue
            if "does not exist" in low or "404" in low:
                continue
            return last_err
        except Exception as e:
            last_err = f"⚠️ Image read failed: {e}"
            continue
    return last_err

def ingest_uploaded_file(uploaded_file, groq_api_key=""):
    ok, err = validate_upload(uploaded_file)
    if not ok:
        return False, err

    file_bytes = uploaded_file.getvalue()
    name = (uploaded_file.name or "").lower()
    mime = uploaded_file.type or ""

    if mime == "application/pdf" or name.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
        if text is None:
            return False, (
                "PDF support package `pypdf` is not installed on the server. "
                "Reboot the Streamlit app after requirements.txt update, or paste notes as text."
            )
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

    return False, "Unsupported file type. Upload PDF or image (PNG/JPG/WEBP), max 100 MB."
