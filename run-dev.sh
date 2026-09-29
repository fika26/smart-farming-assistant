#!/usr/bin/env bash
# Starts backend and frontend together (macOS / Linux). Ctrl+C stops both.
set -e
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
  echo "→ creating backend virtualenv"
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
[ -d frontend/node_modules ] || (cd frontend && npm install)

echo "→ backend  http://localhost:8000/docs"
(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT

echo "→ frontend http://localhost:3000"
cd frontend && npm run dev
