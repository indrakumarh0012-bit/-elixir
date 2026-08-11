# NEW Smart-Elixir (React app) — use THIS

Streamlit Cloud shows the **old Python app** (`app.py`).  
The **new product** is the React app in the sibling folder:

```
elixir/
├── app.py                 ← OLD Streamlit UI (do not use for the new product)
├── NEW_SMART_ELIXIR/      ← YOU ARE HERE (docs + deploy guide)
└── web/                   ← NEW APP (Summarizer · Ped Dose · CrCl · Regimen · Books)
```

## Open the new app on your PC

```powershell
cd C:\Users\Admin\elixir\web
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Then open: **http://127.0.0.1:5173/**

## What’s in the new app

| Tab | What it does |
|-----|----------------|
| **Summarizer → Past History** | Upload PDF/image → performa (Hospital ID, drugs with MOA, patho click, critique) |
| **Saved** | Local archive of past performas |
| **Regimen** | Drug safety / interactions (Amoxyclav, iron, Tonoferon, etc.) |
| **Books** | Latest-edition topic summaries (real content, not “refer book”) |
| **Ped Dose** | Pediatric calculator |
| **Creatinine Clearance** | Cockcroft–Gault |

Save Groq key once in the app (or `web/.env` from `.env.example`).

## Why Streamlit still shows the old app

[share.streamlit.io](https://share.streamlit.io) only runs **Python Streamlit** (`app.py`).  
It **cannot** host the Vite/React `web/` app. So connecting the same GitHub repo to Streamlit always reopens the **old** UI.

## Deploy the NEW app (pick one)

### Option A — Vercel (recommended for React)

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import GitHub repo: `indrakumarh0012-bit/-elixir`
3. Set:
   - **Root Directory:** `web`
   - **Framework:** Vite
   - **Build:** `npm run build`
   - **Output:** `dist`
4. Add env: `VITE_GROQ_API_KEY` = your `gsk_…` key (optional if users paste once in UI)
5. Deploy → you get a URL like `https://….vercel.app`

### Option B — Netlify

1. [https://app.netlify.com/start](https://app.netlify.com/start)
2. Connect same GitHub repo
3. Base directory: `web`
4. Build: `npm run build` · Publish: `dist`
5. Deploy

### Option C — Keep Streamlit only as a notice page

Leave Streamlit Cloud on `app.py` (it now shows a banner: “Use the new React app”).  
Put the real product URL from Vercel/Netlify in that banner later.

## GitHub

Repo (already pushed): https://github.com/indrakumarh0012-bit/-elixir  

New code path: `web/src/…`  
This folder: `NEW_SMART_ELIXIR/` (documentation only)

## After you deploy

1. Open the **Vercel/Netlify** URL (new app), not Streamlit.
2. Hard-refresh if an old cache shows.
3. Optional: in Streamlit Cloud → Settings → put your new URL in the banner text (edit `app.py` `NEW_APP_URL`).
