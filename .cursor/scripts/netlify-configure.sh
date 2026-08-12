#!/usr/bin/env bash
# Configure Netlify env vars and trigger deploy (run in Cloud Agent with secrets set).
set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-}"
AUTH_TOKEN="${NETLIFY_AUTH_TOKEN:-}"
GROQ_KEY="${GROQ_API_KEY:-}"

if [[ -z "$AUTH_TOKEN" || -z "$SITE_ID" ]]; then
  echo "Missing NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID."
  echo "See NEW_SMART_ELIXIR/NETLIFY_ADD_API_KEY.md"
  exit 1
fi

if [[ -z "$GROQ_KEY" ]]; then
  echo "Missing GROQ_API_KEY secret."
  exit 1
fi

export NETLIFY_AUTH_TOKEN="$AUTH_TOKEN"

echo "Setting GROQ_API_KEY on Netlify site $SITE_ID..."
npx --yes netlify-cli@17.38.1 env:set GROQ_API_KEY "$GROQ_KEY" --site "$SITE_ID" --context production --force

echo "Triggering production deploy..."
npx --yes netlify-cli@17.38.1 api createSiteBuild --data "{\"site_id\":\"$SITE_ID\"}"

echo "Done. After deploy finishes, test: https://YOUR-SITE.netlify.app/api/groq"
