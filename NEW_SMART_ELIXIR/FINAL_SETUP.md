# Final setup — make everything work (one time)

Do these **3 steps once**. After that, Summarizer, Books, image upload, Ped Dose, and CrCl all work.

---

## Step 1 — Deploy on Netlify (5 min)

1. https://app.netlify.com/start → import **`indrakumarh0012-bit/-elixir`**
2. Build settings (or leave defaults — `netlify.toml` in the repo sets these):
   - Base directory: **`web`**
   - Build command: **`npm run build`**
   - Publish: **`dist`**
3. Deploy once (may fail AI until step 2 — that's OK)

## Step 2 — Add Groq key (2 min)

1. Get free key: https://console.groq.com/keys (`gsk_…`)
2. Netlify → **Site configuration** → **Environment variables**
3. Add **`GROQ_API_KEY`** = your `gsk_…` key
4. **Deploys** → **Trigger deploy** → **Deploy site**
5. Test: open `https://YOUR-SITE.netlify.app/api/groq`  
   Must show: `{"configured":true,...}`

## Step 3 — Install from Chrome (1 min)

1. Open your Netlify URL in **Chrome** on your phone
2. Tap **Install app** (blue banner) or **⋮ → Install app**
3. Done — icon on home screen

---

## What works after this

| Feature | Works? |
| --- | --- |
| Summarizer (text + images) | Yes |
| Books topic summaries | Yes |
| Ped Dose Calculator | Yes (offline) |
| CrCl + renal drugs | Yes (offline) |
| Auto-updates on git push | Yes |

**You never paste an API key in the app.** Netlify holds it securely.

---

## If you use the APK file (optional)

The APK needs your Netlify URL once:

1. Open the installed **Smart-Elixir** app
2. Yellow banner → enter `https://YOUR-SITE.netlify.app` → **Save & connect**
3. All AI features work

Or rebuild APK with GitHub secret `VITE_API_BASE_URL` = your Netlify URL.

---

## Still broken?

| Error | Fix |
| --- | --- |
| “AI not configured” on website | Step 2 — `GROQ_API_KEY` + redeploy |
| “Enter Netlify URL” in APK | Step 3 for APK above |
| Build failed “no package.json” | Base directory must be **`web`** |
| Image upload fails | Same as AI — needs Step 2 |

Full detail: [NETLIFY_INSTALL_GUIDE.md](./NETLIFY_INSTALL_GUIDE.md)
