import re
import requests

def build_whatsapp_message(kannada_instructions, followup_date):
    """Combine follow-up reminder + Kannada care instructions."""
    date_str = followup_date.strftime("%d/%m/%Y") if followup_date else ""
    reminder = (
        f"📅 Follow-up Reminder / ಮರುಭೇಟಿ ಜ್ಞಾಪನೆ\n"
        f"ದಯವಿಟ್ಟು {date_str} ರಂದು ಆಸ್ಪತ್ರೆಗೆ ಬನ್ನಿ.\n"
        f"Please come for follow-up on {date_str}."
    )
    return (
        f"{reminder}\n\n———\n\n"
        f"📋 Care Instructions / ಚಿಕಿತ್ಸಾ ಸೂಚನೆಗಳು\n"
        f"{kannada_instructions}"
    ).strip()

def normalize_phone(phone):
    return re.sub(r"\D", "", phone or "")

def send_whatsapp_cloud_api(phone, message, token, phone_number_id):
    """
    Sends immediately via WhatsApp Cloud API (no green-arrow click).
    Requires Meta WhatsApp Business Cloud API credentials.
    """
    to = normalize_phone(phone)
    if not to:
        return False, "Invalid patient WhatsApp number."
    if not token or not phone_number_id:
        return False, (
            "Auto-send needs Streamlit secrets WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID "
            "(Meta WhatsApp Cloud API). Free wa.me links cannot skip WhatsApp's green Send button."
        )

    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": message[:4096]},
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        data = resp.json() if resp.content else {}
        if resp.ok:
            return True, "Message sent on WhatsApp."
        err = data.get("error", {}).get("message") or resp.text or f"HTTP {resp.status_code}"
        return False, f"WhatsApp API error: {err}"
    except Exception as e:
        return False, f"WhatsApp send failed: {e}"
