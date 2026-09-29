"""Pure-ASGI middleware that pins the request language for the i18n module.

Precedence: `?lang=` (cache-friendly, easy to test in /docs) → `X-Lang` header →
first `Accept-Language` tag → English. Pure ASGI rather than BaseHTTPMiddleware
so the ContextVar is guaranteed to be visible inside sync endpoints (FastAPI
runs those in a worker thread that copies the current context)."""
from __future__ import annotations

from urllib.parse import parse_qs

from app.i18n import normalise, reset_language, set_language


def _pick(scope) -> str:
    qs = parse_qs(scope.get("query_string", b"").decode("latin-1"))
    if qs.get("lang"):
        return normalise(qs["lang"][0])
    headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
    if headers.get("x-lang"):
        return normalise(headers["x-lang"])
    accept = headers.get("accept-language", "")
    return normalise(accept.split(",")[0].split(";")[0]) if accept else normalise(None)


class LanguageMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        lang = _pick(scope)
        token = set_language(lang)

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"content-language", lang.encode()))
                headers.append((b"vary", b"Accept-Language, X-Lang"))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        finally:
            reset_language(token)
