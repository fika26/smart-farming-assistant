from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.api.deps import envelope
from app.core.config import settings
from app.core.errors import DomainError
from app.core.time import now
from app.domain.catalog import FIELDS, field_by_id
from app.domain.enums import DataSource
from app.intelligence import assistant, brief, detection, llm
from app.schemas.agronomy import ChatRequest, ChatResponse, DetectionResult, Evidence
from app.services import farm_service

router = APIRouter()

MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@router.get("/ai-insights", tags=["AI Intelligence"],
            summary="Observed -> interpretation -> action (rule-based)")
def ai_insights(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_insights(field_id), DataSource.DERIVED,
                    note="Rule-based intelligence over live sensor data. Not a trained model.")


@router.get("/risk-forecast", tags=["AI Intelligence"], summary="Multi-hazard risk forecast")
def risk_forecast(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_risk(field_id), DataSource.PREDICTED,
                    note="Rule-based multi-hazard scoring, not a trained predictive model.")


@router.post("/disease-detection/analyze", tags=["AI Intelligence"],
             response_model=DetectionResult,
             summary="Analyze a crop image (mock analysis service)")
async def analyze(
    image: UploadFile = File(...),
    field_id: str = Form(default="field-a"),
    crop: str | None = Form(default=None),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415,
                            detail=f"Unsupported image type '{image.content_type}'. "
                                   f"Use JPEG, PNG or WebP.")
    payload = await image.read()
    if not payload:
        raise DomainError("The uploaded image is empty.", 400, "empty_image")
    if len(payload) > MAX_IMAGE_BYTES:
        raise DomainError("Image exceeds the 8 MB limit.", 413, "image_too_large")

    field = field_by_id(field_id) or FIELDS[0]
    return detection.analyze(payload, image.filename or "upload.jpg", field["id"],
                             crop or field["crop"])


@router.get("/disease-detection/history", tags=["AI Intelligence"],
            summary="Previously analyzed images")
def detection_history():
    return envelope([], DataSource.DERIVED,
                    note="Detection history is stored in MongoDB (deferred). Results are "
                         "returned live from the analyze endpoint in this prototype.")


@router.post("/ai-assistant/chat", tags=["AI Intelligence"], response_model=ChatResponse,
             summary="Farmer assistant grounded on live field data")
async def chat(payload: ChatRequest):
    if not payload.message.strip():
        raise DomainError("Message cannot be empty.", 400, "empty_message")
    ctx = farm_service.context_for(payload.field_id)
    alerts, actions = farm_service.alerts_and_actions(ctx)

    if settings.ai_configured:
        system_prompt = llm.build_system_prompt(ctx, alerts, actions, payload.language)
        history = [{"role": h.role, "content": h.content} for h in payload.history[-6:]]
        try:
            reply = await llm.ask(payload.message, history, system_prompt)
        except llm.LLMError as exc:
            raise DomainError(
                "SIYA couldn't reach the AI service just now. Please try again in a moment.",
                502, "ai_unavailable",
            ) from exc
        evidence = [
            Evidence(label="Soil moisture", value=f"{ctx.soil_moisture}%"),
            Evidence(label="Air temperature", value=f"{ctx.air_temp}°C"),
            Evidence(label="Humidity", value=f"{ctx.humidity}%"),
        ]
        return ChatResponse(reply=reply, intent="llm", grounded_on=evidence,
                            suggestions=assistant.SUGGESTIONS, is_mock=False, answered_at=now())

    # No AI_API_KEY configured — deterministic fallback so the app still runs.
    return assistant.answer(payload.message, ctx, alerts, actions)


@router.get("/advisory/brief", tags=["AI Intelligence"],
            summary="Today's advice for a field in the request language (LLM or rules)")
async def advisory_brief(field_id: str | None = Query(default=None)):
    ctx = farm_service.context_for(field_id)
    alerts, actions = farm_service.alerts_and_actions(ctx)
    data = await brief.build_brief(ctx, alerts, actions)
    return envelope(data, DataSource.DERIVED, text_engine=data["engine"])


@router.get("/ai-assistant/suggestions", tags=["AI Intelligence"], summary="Quick questions")
def suggestions():
    return envelope(assistant.SUGGESTIONS, DataSource.DERIVED)


@router.get("/analytics", tags=["Analytics"], summary="Trends, resource use and yield estimates")
def analytics(field_id: str | None = Query(default=None),
              range_days: int = Query(default=14, ge=1, le=21)):
    return envelope(farm_service.get_analytics(field_id, range_days), DataSource.DERIVED)
