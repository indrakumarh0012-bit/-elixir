# Smart-Elixir Android APK

Share Smart-Elixir as an installable Android app (`.apk`).

## What you get

| Feature | In APK |
| --- | --- |
| Ped Dose Calculator | Works offline |
| Creatinine Clearance + renal drug lookup | Works offline |
| Summarizer (AI) | Needs your hosted backend URL at build time |

## Option A — Download APK from GitHub (recommended)

1. Deploy `web/` to **Vercel** or **Netlify** first (see `PRODUCTION_DEPLOY.md`).
2. In GitHub → repo **Settings → Secrets → Actions**, add:
   - `VITE_API_BASE_URL` = your live HTTPS URL (e.g. `https://smart-elixir.vercel.app`)
3. Open **Actions** → **Build Android APK** → **Run workflow**.
4. When finished, download **Smart-Elixir-debug-apk** from the run artifacts.
5. Share `app-debug.apk` — users enable **Install unknown apps** and open the file.

## Option B — Build APK on your PC

```bash
cd web
npm ci
# Point AI calls to your hosted backend:
export VITE_API_BASE_URL=https://YOUR-VERCEL-URL.vercel.app
npm run build:android
cd android
./gradlew assembleDebug
```

APK path:

```
web/android/app/build/outputs/apk/debug/app-debug.apk
```

## Option C — Install without APK (PWA)

On Android Chrome, open your hosted HTTPS URL → **Menu → Install app** or **Add to Home screen**.

## Play Store (later)

For Google Play you need a signed **release** AAB:

```bash
cd web/android
./gradlew bundleRelease
```

Use Android Studio or Play Console signing. Debug APK is for sharing with colleagues and testers.

## App ID

- Package: `com.smartelixir.clinical`
- Name: **Smart-Elixir**
