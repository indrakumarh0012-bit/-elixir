# Production deploy (sell-ready)

## Recommended for Chrome install: Netlify

**Full step-by-step guide:** [`NETLIFY_INSTALL_GUIDE.md`](./NETLIFY_INSTALL_GUIDE.md)

Quick settings:

| Setting | Value |
| --- | --- |
| Base directory | `web` |
| Build command | `npm run build` |
| Publish directory | `web/dist` |
| Environment variable | `GROQ_API_KEY` = your `gsk_…` key |

1. https://app.netlify.com/start → import `indrakumarh0012-bit/-elixir`
2. Set build settings above → deploy
3. Add `GROQ_API_KEY` → trigger redeploy
4. Users open your HTTPS URL in Chrome → **Install app**

## Alternative: Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new) and import `indrakumarh0012-bit/-elixir`
2. Set **Root Directory** to `web`
3. Add environment variable (server-side, **not** `VITE_`):
   - `GROQ_API_KEY` = your `gsk_…` key from https://console.groq.com/keys
4. Deploy → you get a permanent HTTPS URL like `https://smart-elixir.vercel.app`
5. Optional: add a custom domain in Vercel → Settings → Domains

## Security model (production)

- **Groq API key stays on the server** via `/api/groq` proxy — buyers never see or paste a key
- Ped Dose and CrCl calculators run fully in the browser (no API key needed)
- HTTPS, security headers, PWA install support, and mobile-safe layout are included

## After deploy — test checklist

- [ ] Open the HTTPS URL on phone and desktop
- [ ] Ped Dose Calculator returns dose values
- [ ] Creatinine Clearance returns CrCl
- [ ] Summarizer upload works (confirms server Groq key)
- [ ] `https://YOUR-SITE/api/groq` shows `"configured": true`
- [ ] Android Chrome → **Install app** banner or menu → installs to home screen

## Do not use for production

- Cursor VM dev URLs (`*.cursorvm.com`) — development only, not permanent
- Streamlit Cloud — hosts the legacy Python app only
- zerodeploy URLs that show HTTP 451 — suspended hosting
