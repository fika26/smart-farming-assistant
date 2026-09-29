# Smart Farming Assistant

> **Deploy for free:** [DEPLOY.md](DEPLOY.md) · Review of v5 and what changed: [docs/REVIEW.md](docs/REVIEW.md) · Adding languages: [docs/LOCALIZATION.md](docs/LOCALIZATION.md)

Agricultural intelligence and early-warning system.
`Sensors → ESP32 edge node → FastAPI → (MongoDB) → rules/AI → Next.js`

- `backend/` — FastAPI + Pydantic (all logic, all data)
- `frontend/` — Next.js 14 + React + TypeScript + Tailwind

## Prerequisites

- Python 3.10+
- Node.js 18+ (20 or 22 recommended)

## Run it (two terminals)

### Terminal 1 — backend (start this first)

macOS / Linux:

    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn app.main:app --reload --port 8000

Windows (PowerShell):

    cd backend
    python -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    copy .env.example .env
    uvicorn app.main:app --reload --port 8000

Check: http://localhost:8000/api/health  ·  API docs: http://localhost:8000/docs

### Terminal 2 — frontend

    cd frontend
    npm install
    npm run dev

Open: **http://localhost:3000** — you land on the sign-in page.

**Demo account (prototype only):** `demo@sunehrakhet.in` / `farming2026`
The sign-in page offers to fill these in for you. Or use **Create account** to register
your own. Accounts live in memory, so they reset when the backend restarts.

The frontend reads `NEXT_PUBLIC_API_BASE_URL` from `frontend/.env.local`.
Default is `http://localhost:8000/api`. If `.env.local` is missing:

    cd frontend
    cp .env.example .env.local        # Windows: copy .env.example .env.local

## Authentication

Sign-in is handled by FastAPI (`/api/auth/*`) with bcrypt-hashed passwords and a JWT
access token. The token is kept in browser localStorage and sent as
`Authorization: Bearer <token>` on every request; all farm-data endpoints reject
requests without it.

Before deploying anywhere real, set these in `backend/.env`:

    JWT_SECRET=<python -c "import secrets; print(secrets.token_urlsafe(48))">
    INGEST_API_KEY=<a second random string, for ESP32 nodes>
    EMAIL_PROVIDER=smtp        # needed before password-reset emails can be sent

With `JWT_SECRET` empty the backend generates a random key per process, so tokens
simply stop working after a restart — it never ships a known secret.

## AI Assistant provider

`AI_PROVIDER` in `backend/.env` picks the request shape in `app/intelligence/llm.py`:
`openai` (default), `gemini`, or `anthropic`. Set `AI_API_KEY`, and `AI_MODEL`/
`AI_BASE_URL` if you're not using the defaults in `.env.example`. Leave `AI_API_KEY`
empty to keep the built-in rule-based fallback (flagged `is_mock: true` in every
response) — the app runs fine without a key. The key never reaches the browser;
`/api/ai-assistant/chat` calls the provider server-side.

## Languages

All generated text (alerts, actions, insights, analytics) is rendered server-side in the
language sent as `?lang=` / `X-Lang` / `Accept-Language`; UI copy lives in
`frontend/src/locales/*.json`. English, Hindi and Telugu are complete. Check coverage with
`python scripts/i18n_coverage.py`. `GET /api/advisory/brief` returns today's advice, with
`engine: "llm"` only when an AI key is set **and** the reply passes the number check.

## Real sensor data (`/api/farm-log`)

`backend/data/master_smart_farm_dataset.csv` is a genuine recorded stream, but it
has no field or sensor identifier and its `Crop` column changes almost every row —
so it cannot honestly be split across North Block / Canal Side / South Plot. It is
exposed as its own **farm-wide** endpoint, `GET /api/farm-log`, separate from the
simulated per-field `/api/dashboard` and `/api/fields/*`. The response includes
`last_reading_days_ago` so the UI can show "no recent reading" rather than
pretending a six-month-old row is live. Point `FARM_LOG_CSV_PATH` at a different
file to change the source, or drop a fresh recording in `backend/data/` under the
same name and restart.

## Supabase-ready data layer

`app/repositories/supabase.py` is a deferred-integration stub — same pattern as
the existing `mongo.py` — implementing `ReadingRepository` against the
`sensor_telemetry` table described in the product brief. It raises
`NotImplementedError` until `asyncpg` or `postgrest-py` is added and its four
methods are filled in; nothing above the repository layer changes when that
happens. Set `REPOSITORY=supabase` and `SUPABASE_DB_URL` in `backend/.env` once
that's done. The file also notes the one real design decision it can't make for
you: `sensor_telemetry` has one row per (sector, timestamp), while the app's
`ReadingRepository` interface is one level finer (per field *and* sensor type)
— pick the real mapping once actual ESP32 payloads exist, rather than guessing
it now.

To work on the API without a token (local only): `AUTH_REQUIRED=false`.

## Troubleshooting

- **You keep landing back on the sign-in page** — the backend is not running, so the
  session cannot be verified. Start Terminal 1 first.
- **Every page shows "Cannot reach the FastAPI backend"** — the backend isn't running,
  or it's on a different port. Start Terminal 1 first and confirm
  http://localhost:8000/api/health returns `{"status":"ok",...}`.
- **Port already in use** — run the backend on another port
  (`uvicorn app.main:app --reload --port 8001`) and update
  `frontend/.env.local` to `http://localhost:8001/api`, then restart `npm run dev`.
- **`uvicorn: command not found`** — the virtualenv isn't activated, or use
  `python -m uvicorn app.main:app --reload --port 8000`.
- **npm install fails on an old Node** — check `node -v`; upgrade to Node 18+.
- Changing the demo scenario: edit `MOCK_SCENARIO` in `backend/.env`
  (`healthy_baseline`, `drought_onset`, `heat_wave`, `heavy_rain`,
  `fungal_disease_window`, `sensor_failure`) and restart the backend.

## Production build

    cd frontend && npm run build && npm start
