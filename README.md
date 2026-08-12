# Smart-Elixir

## New app (use this)

React clinical suite in **`web/`**. Docs: **[`NEW_SMART_ELIXIR/README.md`](./NEW_SMART_ELIXIR/README.md)**

```powershell
cd web
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173/

Deploy the new UI with **Vercel/Netlify** (root directory `web`) — not Streamlit Cloud.

## Android APK (share with colleagues)

1. **GitHub Actions** → [Build Android APK](https://github.com/indrakumarh0012-bit/-elixir/actions/workflows/android-apk.yml) → open the latest run → download **Smart-Elixir-debug-apk**.
2. Or **Releases** → download `Smart-Elixir.apk` after running **Release Android APK** workflow.

Full guide: [`NEW_SMART_ELIXIR/ANDROID_APK.md`](./NEW_SMART_ELIXIR/ANDROID_APK.md)

## Old app

`app.py` = legacy Streamlit UI. Streamlit Cloud will keep showing this until you stop using it for the product.
