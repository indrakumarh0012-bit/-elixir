#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

# React clinical suite (primary product)
cd web
npm ci

# Legacy Streamlit app dependencies (optional local dev)
cd ..
python3 -m pip install --user -r requirements.txt
