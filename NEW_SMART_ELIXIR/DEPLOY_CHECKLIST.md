# Deploy checklist — NEW Smart-Elixir

## Do this (new app)

- [ ] Confirm local app works: `cd web` → `npm run dev` → http://127.0.0.1:5173/
- [ ] Deploy `web/` on **Vercel** or **Netlify** (Root Directory = `web`)
- [ ] Open the new cloud URL and test Summarizer upload + Ped Dose
- [ ] Bookmark the new URL for users (not Streamlit)

## Do not expect

- [ ] Streamlit Cloud to show the React Summarizer / Regimen / Books UI  
  → Streamlit only runs `app.py` (old Python)

## Optional cleanup

- [ ] Rename Streamlit app title to “Legacy notice” so nobody confuses it
- [ ] Add `NEW_APP_URL` in Streamlit secrets and show it on the banner
- [ ] Upgrade Groq to Developer tier if you hit 429 rate limits  
  → https://console.groq.com/settings/billing
