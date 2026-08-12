#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

# React clinical suite (primary product)
cd web
npm ci

# Wire owner Groq key for local Cloud Agent dev (never committed)
if [ -n "${GROQ_API_KEY:-}" ]; then
  printf 'VITE_GROQ_API_KEY=%s\n' "$GROQ_API_KEY" > .env.local
fi

# Legacy Streamlit app dependencies (optional local dev)
cd ..
python3 -m pip install --user -r requirements.txt
