# Smart-Elixir Android APK

Share Smart-Elixir as an installable Android app (`.apk`).

## What you get

| Feature | In APK |
| --- | --- |
| Ped Dose Calculator | Works offline |
| Creatinine Clearance + renal drug lookup | Works offline |
| Summarizer (AI) | Needs your hosted backend URL at build time |

## Option A — Download APK from GitHub (recommended)

### Quick download (latest build)

1. Open **[Actions → Build Android APK](https://github.com/indrakumarh0012-bit/-elixir/actions/workflows/android-apk.yml)**.
2. Click the latest green run → scroll to **Artifacts** → download **Smart-Elixir-debug-apk**.
3. Unzip and share `app-debug.apk` (rename to `Smart-Elixir.apk` if you like).

### Permanent release link

1. Open **Actions → Release Android APK → Run workflow** (tag e.g. `v0.1.0`).
2. When done, open **Releases** on GitHub — the APK is attached to that release.

### Enable AI Summarizer in the APK

1. Deploy `web/` to **Vercel** or **Netlify** (see `PRODUCTION_DEPLOY.md`).
2. In GitHub → repo **Settings → Secrets → Actions**, add:
   - `VITE_API_BASE_URL` = your live HTTPS URL (e.g. `https://smart-elixir.vercel.app`)
3. Re-run **Build Android APK** or **Release Android APK**.

### Install on Android

Share the `.apk` file (WhatsApp, Drive, email). On the phone:

1. Open the file → if blocked, go to **Settings → Security → Install unknown apps** and allow your file manager or browser.
2. Tap **Install** → open **Smart-Elixir** from the home screen.

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
