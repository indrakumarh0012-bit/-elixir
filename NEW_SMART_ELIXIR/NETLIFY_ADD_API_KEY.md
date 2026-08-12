# Where to add GROQ_API_KEY on Netlify (click-by-click)

You already deployed the site — you only need to add **one secret** and redeploy.

---

## Fastest way (direct link)

1. Open https://app.netlify.com
2. Click your **Smart-Elixir site name** (the card on the dashboard)
3. Copy the site name from the browser URL. It looks like:
   `https://app.netlify.com/projects/SITE-NAME-HERE/overview`
4. Open this link (replace `SITE-NAME-HERE`):

   **https://app.netlify.com/projects/SITE-NAME-HERE/configuration/env#environment-variables**

5. You should see **Environment variables** page with an **Add a variable** button.

---

## Step-by-step (if the link above doesn’t work)

### A. Open your site

1. Go to **https://app.netlify.com**
2. Log in
3. On the home dashboard, **click the site** (not “Add new site”)

### B. Open Environment variables

The menu name changed recently. Try **one** of these paths:

**Path 1 (new UI — most common)**  
Left sidebar → **Project configuration** → **Environment variables**

**Path 2**  
Left sidebar → **Site configuration** → **Environment variables**

**Path 3**  
Top tabs → **Site configuration** → left menu **Build & deploy** → **Environment variables**

**Path 4**  
Left sidebar → **Build & deploy** → **Environment variables**

You are in the right place when you see a page titled **“Environment variables”** and a button **“Add a variable”** or **“Add environment variable”**.

### C. Add the key

1. Click **Add a variable** → **Add a single variable**
2. Fill in:

| Field | Value |
| --- | --- |
| **Key** | `GROQ_API_KEY` |
| **Value** | Your Groq key from https://console.groq.com/keys (starts with `gsk_`) |
| **Scopes** | Leave all checked (Production, Deploy Previews, Branch deploys) |

3. Click **Create variable** or **Save**

> **Tip:** If you already see `GROQ_API_KEY` in the list, click it → **Edit** → paste the `gsk_…` value → Save. An empty variable does not work.

### D. Redeploy (required after adding the key)

1. Left sidebar → **Deploys**
2. Top right → **Trigger deploy** → **Deploy project** (or **Deploy site**)
3. Wait until status is **Published** (green)

### E. Confirm it worked

Open in your phone browser:

```
https://YOUR-SITE.netlify.app/api/groq
```

You must see:

```json
{"configured":true,"service":"smart-elixir-groq-proxy"}
```

If you see `"configured":false`, the key is missing or empty — repeat step C.

---

## Also check build settings (one time)

**Project configuration** → **Build & deploy** → **Continuous deployment** → **Build settings** → **Edit**

| Setting | Must be |
| --- | --- |
| Base directory | `web` |
| Build command | `npm run build` |
| Publish directory | `dist` |

Save → **Trigger deploy** again.

---

## I can’t find “Environment variables” at all

- Make sure you clicked **inside your site** (not the team overview)
- On mobile Netlify app: use **desktop browser** — env vars are easier on computer
- Search the left menu for **“env”** or **“variables”**

---

## Let the agent configure Netlify for you

If you add these **Cursor secrets** (same place you added `GROQ_API_KEY`), the agent can run Netlify CLI and set everything:

| Secret name | Where to get it |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → Personal access tokens → New token |
| `NETLIFY_SITE_ID` | Site → Project configuration → General → Site ID (or Site details) |

Then ask the agent: “configure Netlify with my Groq key”.
