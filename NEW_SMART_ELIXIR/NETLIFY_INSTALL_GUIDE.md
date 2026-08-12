# Netlify deploy + Chrome install (full guide)

Deploy Smart-Elixir once on Netlify. After that, every `git push` to `main` redeploys automatically, and users install the app directly from **Chrome** (no APK file needed).

---

## What you get after setup

| Feature | Works automatically |
| --- | --- |
| Permanent HTTPS URL | Yes (`https://your-site.netlify.app`) |
| Auto redeploy on git push | Yes |
| Ped Dose Calculator | Yes (offline after first load) |
| CrCl + renal drug lookup | Yes (offline after first load) |
| AI Summarizer | Yes (uses your `GROQ_API_KEY` on Netlify — users never see the key) |
| Install from Chrome | Yes (PWA — **Install app** / **Add to Home screen**) |

---

## Part 1 — One-time Netlify setup (about 10 minutes)

### Step 1: Get your Groq API key

1. Open https://console.groq.com/keys
2. Sign in or create a free account
3. Click **Create API Key**
4. Copy the key — it starts with `gsk_`
5. Keep it private (you will paste it only into Netlify, not into the app code)

### Step 2: Create a Netlify account

1. Open https://app.netlify.com/signup
2. Sign up with **GitHub** (easiest — connects your repo automatically)
3. Authorize Netlify to access GitHub when asked

### Step 3: Import your GitHub repo

1. On Netlify dashboard, click **Add new site** → **Import an existing project**
2. Choose **GitHub**
3. If asked, grant Netlify access to your repositories
4. Select repo: **`indrakumarh0012-bit/-elixir`**
5. Netlify shows build settings. The repo includes **`netlify.toml` at the root** — it sets `base = "web"` automatically.

   **Easiest:** leave build settings at defaults and click **Deploy site**.

   **Or** enter manually:

| Setting | Value |
| --- | --- |
| **Branch to deploy** | `main` |
| **Base directory** | `web` |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

> **Important:** The React app is in `web/`, not the repo root. The legacy `app.py` is Streamlit — ignore it for Netlify.
>
> If **Base directory** is empty, Netlify runs `npm` at the repo root and fails with “no package.json”.

6. Click **Deploy site** (do not add the API key yet — add it in the next step)

### Step 4: Add the Groq API key (makes Summarizer work)

1. While the first deploy runs (or after it finishes), go to **Site configuration** → **Environment variables**
2. Click **Add a variable** → **Add a single variable**
3. Set:
   - **Key:** `GROQ_API_KEY`
   - **Value:** your `gsk_…` key from Step 1
   - **Scopes:** leave all checked (Production, Deploy Previews, Branch deploys)
4. Click **Save**
5. Go to **Deploys** → click **Trigger deploy** → **Deploy site** (rebuilds with the key)

### Step 5: Confirm the site works

Your URL looks like: `https://random-name-12345.netlify.app`

Open it and test:

1. **Ped Dose** tab → enter age/weight → you get a dose
2. **CrCl** tab → enter values → you get CrCl + drug search works
3. **Summarizer** tab → upload a small text/PDF → summary appears (confirms `GROQ_API_KEY` works)

Optional API check: open `https://YOUR-SITE.netlify.app/api/groq` in the browser. You should see:

```json
{"configured":true,"service":"smart-elixir-groq-proxy"}
```

If `"configured": false`, the key is missing — repeat Step 4 and redeploy.

### Step 6: Rename your site (optional but recommended)

1. **Site configuration** → **Domain management** → **Options** on the `netlify.app` subdomain
2. Click **Edit** and choose a name, e.g. `smart-elixir` → URL becomes `https://smart-elixir.netlify.app`
3. Share this URL with users

### Step 7: Automatic deploys (already on)

Netlify watches `main`. When you push code to GitHub:

1. Netlify starts a new build automatically
2. Build runs `npm run build` in `web/`
3. New version goes live in 1–2 minutes

No manual upload needed after the first setup.

---

## Part 2 — Install from Chrome (share these steps with users)

### Android phone (Chrome) — recommended

1. Open **Chrome** on the phone (not Samsung Internet / Firefox for the easiest install)
2. Go to your Netlify URL, e.g. `https://smart-elixir.netlify.app`
3. Wait for the page to load fully (first visit may take a few seconds)
4. Install using **one** of these methods:

**Method A — Install banner (if shown)**  
- A blue bar at the top says **Install app** → tap it → **Install**

**Method B — Chrome menu**  
- Tap **⋮** (three dots, top right)  
- Tap **Install app** or **Add to Home screen**  
- Tap **Install** or **Add**

5. The **Smart-Elixir** icon appears on the home screen
6. Open from the icon — it runs full-screen like a native app (no browser bar)

**Offline:** Ped Dose and CrCl work without internet after the first load. Summarizer needs internet for AI.

### Android — if “Install app” is missing

- Use Chrome (not in-app browser from WhatsApp/Telegram) — copy the link and paste into Chrome
- Visit the site at least twice (Chrome sometimes waits before offering install)
- Check **Chrome → Settings → Site settings → your URL** — nothing should block the site
- Fallback: **⋮ → Add to Home screen** (shortcut; still opens in Chrome but works)

### iPhone / iPad (Safari)

1. Open the Netlify URL in **Safari**
2. Tap **Share** (square with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

### Windows / Mac (Chrome desktop)

1. Open the Netlify URL in Chrome
2. Look for the **install icon** in the address bar (monitor with down arrow), or
3. **⋮ menu → Cast, save, and share → Install Smart-Elixir**
4. Click **Install**

The app opens in its own window.

---

## Part 3 — Share with colleagues

Send them:

1. **Link:** `https://YOUR-SITE.netlify.app`
2. **One line:** “Open in Chrome → menu → **Install app** (or tap the blue **Install app** banner).”

They do **not** need:

- A Groq account or API key
- An APK file
- Cursor or any dev tools

---

## Part 4 — Troubleshooting

### Build failed: “Could not read package.json” / ENOENT

Netlify is building the **wrong folder** (repo root instead of `web/`).

1. Pull latest `main` (includes root `netlify.toml`), **or** fix UI manually:
2. **Site configuration** → **Build & deploy** → **Build settings** → **Edit**
3. Set **Base directory** to `web`
4. Set **Build command** to `npm run build`
5. Set **Publish directory** to `dist` (not `web/dist` when base is already `web`)
6. **Save** → **Deploys** → **Trigger deploy** → **Deploy site**

Confirm the deploy log shows `base: /opt/build/repo/web`, not `/opt/build/repo`.

### Other issues

| Problem | Fix |
| --- | --- |
| Summarizer says “AI not configured” | Add `GROQ_API_KEY` in Netlify env vars → **Trigger deploy** |
| `/api/groq` returns 404 | Base directory must be `web`; root `netlify.toml` must be on `main` |
| Build fails on Netlify | Check **Deploy log** — usually `npm ci` / Node version; repo uses Node 22 |
| Install button not shown | Use HTTPS URL (Netlify default), Chrome browser, visit site twice |
| Blank page after install | Hard refresh once; clear site data and revisit |
| Old version showing | Netlify **Deploys** → confirm latest deploy is **Published** |

---

## Part 5 — Custom domain (optional)

1. **Site configuration** → **Domain management** → **Add a domain**
2. Enter your domain (e.g. `smartelixir.com`)
3. Follow Netlify DNS instructions at your domain registrar
4. HTTPS certificate is automatic

---

## Quick reference

```
Repo:        indrakumarh0012-bit/-elixir
Branch:      main
Config:      netlify.toml (repo root, base = web)
Build:       npm run build  (runs inside web/)
Publish:     dist           (web/dist on disk)
Env var:     GROQ_API_KEY = gsk_...
```

Related: [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md) · [ANDROID_APK.md](./ANDROID_APK.md) (optional APK, not required for Chrome install)
