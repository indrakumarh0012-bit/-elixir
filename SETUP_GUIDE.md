# Smart-Elixir — setup & deploy guide

## What’s included
- Clinical summarizer (Nelson / Williams / Harrison / Bailey & Love + S. Das)
- PDF/image upload up to 100 MB for summarizer / past-record analysis
- Pediatric dosing safety (Harriet Lane–aligned)
- Cockcroft–Gault CrCl (sex, units, IBW/AjBW)
- Kannada discharge + audio (numbers stay in English)
- WhatsApp message = follow-up reminder + Kannada instructions
- Optional WhatsApp Cloud API for true auto-send

## GitHub repo
https://github.com/indrakumarh0012-bit/-elixir

---

## Tab order
1. **Summarizer**
2. **Ped Dose Calculator** (detailed)
3. **Creatinine Clearance** (end)

---

## Sell-ready: set API key ONCE (customers never type it)

Your Groq key must live in **server secrets**, not in the UI.

### Streamlit Cloud (product you sell / share)
1. Deploy from GitHub (`app.py`).
2. App → **Settings → Secrets** → paste once:
   ```toml
   GROQ_API_KEY = "gsk_your_real_key"
   ```
3. **Save** → **Reboot app**.
4. Sidebar shows “AI ready” — buyers/users never see or enter a key.

### Local owner machine
```powershell
cd C:\Users\Admin\elixir
copy .streamlit\secrets.toml.example .streamlit\secrets.toml
notepad .streamlit\secrets.toml
```
Put your key in `GROQ_API_KEY`, save, restart Streamlit.  
`secrets.toml` is gitignored — never commit it.

### Rules for a paid/shared app
- One owner key in Cloud Secrets (or rotate your own key later).
- Do **not** put the key in GitHub, README, or client React code.
- Free Groq keys: https://console.groq.com/keys

---

## Save API key once (no paste every time)

### Local
1. Get a free Groq key: https://console.groq.com/keys  
2. Create folder `.streamlit` in the project root (if missing).  
3. Copy the example and edit:
   ```powershell
   cd C:\Users\Admin\elixir
   copy .streamlit\secrets.toml.example .streamlit\secrets.toml
   notepad .streamlit\secrets.toml
   ```
4. Put your key once:
   ```toml
   GROQ_API_KEY = "gsk_your_key_here"
   ```
5. Restart Streamlit. Sidebar shows “AI ready” — you do **not** paste each visit.  
6. Keep `secrets.toml` **out of Git** (already ignored). Never commit the real key.

### Streamlit Cloud (hosted)
1. Open your app on https://share.streamlit.io  
2. **⋮ menu / Settings → Secrets**  
3. Paste once and Save:
   ```toml
   GROQ_API_KEY = "gsk_your_key_here"
   ```
4. Reboot the app. Every visitor/session uses that saved secret — no sidebar paste needed.

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
4. Save Groq key in `.streamlit/secrets.toml` (see above).
5. Start the app:
   ```powershell
   py -m streamlit run app.py
   ```
6. Open http://localhost:8501

---

## B) Deploy / update Streamlit Cloud (recommended)

1. Open https://share.streamlit.io and sign in with GitHub.
2. **New app** (first time) or open existing app:
   - Repository: `indrakumarh0012-bit/-elixir`
   - Branch: `main`
   - Main file: `app.py`
3. **Settings → Secrets** → paste **once**:
   ```toml
   GROQ_API_KEY = "gsk_your_key_here"
   ```
4. Click **Save**. App redeploys automatically when GitHub `main` updates.
5. To force refresh: app menu → **Reboot app**.

You will **not** need to enter the API key in the UI after this.

### After every new GitHub push
Streamlit Cloud usually redeploys alone. If UI looks old:
1. Confirm latest commit is on https://github.com/indrakumarh0012-bit/-elixir
2. Reboot the Streamlit app
3. Hard-refresh browser (Ctrl+F5)

---

## C) How to use each feature

### 1) Summarizer
1. Choose specialty lens (or Auto).
2. Paste notes and/or upload PDF/image (≤100 MB).
3. Click **Generate Executive Brief**.
4. Brief includes dose, route (PO/IV), frequency, duration, monitoring.

### 2) Ped Dose Calculator
- Category → medicine → route → editable mg/kg → doses/day.
- Shows exact mg, daily total, how-to-take, contraindications.

### 3) Creatinine Clearance (end)
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
