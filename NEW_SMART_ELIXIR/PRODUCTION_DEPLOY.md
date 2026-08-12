# Production deploy (sell-ready)

## Recommended: Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new) and import `indrakumarh0012-bit/-elixir`
2. Set **Root Directory** to `web`
3. Add environment variable (server-side, **not** `VITE_`):
   - `GROQ_API_KEY` = your `gsk_…` key from https://console.groq.com/keys
4. Deploy → you get a permanent HTTPS URL like `https://smart-elixir.vercel.app`
5. Optional: add a custom domain in Vercel → Settings → Domains

## Alternative: Netlify

1. [https://app.netlify.com/start](https://app.netlify.com/start) → connect the repo
2. Base directory: `web`
3. Build: `npm run build` · Publish: `dist`
4. Add `GROQ_API_KEY` in Site settings → Environment variables
5. Deploy

## Security model (production)

- **Groq API key stays on the server** via `/api/groq` proxy — buyers never see or paste a key
- Ped Dose and CrCl calculators run fully in the browser (no API key needed)
- HTTPS, security headers, PWA install support, and mobile-safe layout are included

## After deploy — test checklist

- [ ] Open the HTTPS URL on phone and desktop
- [ ] Ped Dose Calculator returns dose values
- [ ] Creatinine Clearance returns CrCl
- [ ] Summarizer upload works (confirms server Groq key)
- [ ] Android Chrome → Menu → **Install app** (or Add to Home screen)

## Do not use for production

- Cursor VM dev URLs (`*.cursorvm.com`) — development only, not permanent
- Streamlit Cloud — hosts the legacy Python app only
- zerodeploy URLs that show HTTP 451 — suspended hosting
