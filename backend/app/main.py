from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.i18n.middleware import LanguageMiddleware

DESCRIPTION = """
Backend for the **Smart Farming Assistant** — an agricultural intelligence and
early-warning system for Indian farms.

Flow: `Sensors → ESP32 edge node → FastAPI → (MongoDB) → AI / rules / analytics → Next.js`

Sensor values are currently produced by the mock source (`DATA_SOURCE=mock`). The
response contract is identical for real hardware, so switching `DATA_SOURCE` to
`http` and posting to `/api/ingest/readings` requires no frontend change.
"""

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=DESCRIPTION,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex="|".join(
        filter(None, [r"http://(localhost|127\.0\.0\.1)(:\d+)?", settings.cors_origin_regex])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LanguageMiddleware)
register_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health", tags=["System"], summary="Liveness probe")
def health():
    """Public so the frontend can tell "backend is down" from "you are signed out"."""
    return {"status": "ok", "service": settings.app_name, "version": settings.version,
            "data_source": settings.data_source, "simulated": settings.is_simulated,
            "auth_required": settings.auth_required}


@app.get("/", tags=["System"], include_in_schema=False)
def root():
    return {"service": settings.app_name, "version": settings.version, "docs": "/docs",
            "api_prefix": settings.api_prefix}
