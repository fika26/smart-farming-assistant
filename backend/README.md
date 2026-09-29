# Smart Farming Assistant — Backend (FastAPI)

    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn app.main:app --reload --port 8000

Docs: http://localhost:8000/docs

Data source is selected by `DATA_SOURCE` (`mock` today, `http|serial|mqtt` when the
ESP32 node is connected). The API contract does not change between them.

## AI Assistant (real LLM)

Set `AI_API_KEY` (and optionally `AI_MODEL`) in `backend/.env` to enable real, free-form answers
from `/api/ai-assistant/chat`. The key stays on the backend and is never sent to the browser.
Without a key the chat falls back to the built-in rule-based responder and every reply is flagged
`is_mock: true` (the UI shows an "Offline mode" badge). If the model call fails, the API returns
a 502 and the UI shows an error — it never substitutes a fake answer.
