# Smart-Elixir — setup & deploy guide

## What’s included
- Clinical summarizer (Nelson / Williams / Harrison / Bailey & Love + S. Das)
- PDF/image upload up to 15 MB for summarizer
- Pediatric dosing safety (Harriet Lane–aligned)
- Cockcroft–Gault CrCl (sex, units, IBW/AjBW)
- Kannada discharge + audio (numbers stay in English)
- WhatsApp message = follow-up reminder + Kannada instructions
- Optional WhatsApp Cloud API for true auto-send

## GitHub repo
https://github.com/indrakumarh0012-bit/-elixir

---

## A) Run locally (Windows)

1. Install Python 3.12+ from https://www.python.org/downloads/ (tick “Add to PATH”).
2. Open PowerShell in the project folder:
   ```powershell
   cd C:\Users\Admin\elixir
   ```
3. Install packages:
   ```powershell
   py -m pip install -r requirements.txt
   ```
   If `py` fails, use the full path:
   ```powershell
   & "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m pip install -r requirements.txt
   ```
4. Get a free Groq key: https://console.groq.com/keys
5. Start the app:
   ```powershell
   py -m streamlit run app.py
   ```
6. Open http://localhost:8501  
7. Paste Groq key in the sidebar.

---

## B) Deploy / update Streamlit Cloud (recommended)

1. Open https://share.streamlit.io and sign in with GitHub.
2. **New app** (first time) or open existing app:
   - Repository: `indrakumarh0012-bit/-elixir`
   - Branch: `main`
   - Main file: `app.py`
3. **Settings → Secrets** → paste:
   ```toml
   GROQ_API_KEY = "gsk_your_key_here"

   # Optional — only for one-click WhatsApp send (no green arrow):
   # WHATSAPP_TOKEN = "your_meta_token"
   # WHATSAPP_PHONE_NUMBER_ID = "your_phone_number_id"
   ```
4. Click **Save**. App redeploys automatically when GitHub `main` updates.
5. To force refresh: app menu → **Reboot app**.

### After every new GitHub push
Streamlit Cloud usually redeploys alone. If UI looks old:
1. Confirm latest commit is on https://github.com/indrakumarh0012-bit/-elixir
2. Reboot the Streamlit app
3. Hard-refresh browser (Ctrl+F5)

---

## C) How to use each feature

### 1) Summarizer
1. Choose specialty lens (or Auto).
2. Paste notes and/or upload PDF/image (≤15 MB).
3. Click **Generate Executive Brief**.
4. Brief includes dose, route (PO/IV), frequency, duration, monitoring.

### 2) Safety Guard
- Pediatrics: verify dose vs Harriet Lane ranges.
- Adults: Cockcroft–Gault CrCl with sex + mg/dL or µmol/L + optional height for AjBW.

### 3) Kannada Dispatch
1. Enter English care plan.
2. Generate Kannada + audio (numbers remain English).
3. WhatsApp preview includes **reminder + instructions**.
4. **Send on WhatsApp now**:
   - With Cloud API secrets → message sends directly.
   - Without secrets → opens pre-filled chat (WhatsApp still needs one Send tap).

---

## D) WhatsApp direct send (optional)

`wa.me` links **cannot** skip the green Send button. For true auto-send:

1. Create a Meta WhatsApp Cloud API app: https://developers.facebook.com/
2. Get **Access Token** and **Phone number ID**.
3. Add them to Streamlit secrets as `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.
4. Patient number must include country code (e.g. `9198xxxxxxxx`).

---

## E) Push future code changes to GitHub

From PowerShell in `C:\Users\Admin\elixir`:

```powershell
git add .
git commit -m "Describe your change"
git push origin main
```

Then reboot Streamlit Cloud if needed.
