"""Real LLM backend for the AI Assistant.

Replaces free-form intent matching with an actual language model call, while
keeping the same non-negotiable rule the mock responder always followed: the
assistant may never state a farm number it was not given. That rule is now
enforced by construction — every fact the model is allowed to use is written
into the system prompt from the live ``FieldContext``/alerts/actions, and the
model is explicitly told to say "I don't have that data yet" rather than
invent anything else.

No API key hardcoded here — ``settings.ai_api_key`` comes from the
``AI_API_KEY`` environment variable. If it is empty, callers should use the
rule-based fallback in ``app.intelligence.assistant`` instead; this module is
only reached when a key is configured.
"""
from __future__ import annotations

import httpx

from app.core.config import settings

LANGUAGE_NAMES = {
    "en": "English",
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "kn": "Kannada",
    "mr": "Marathi",
    "bn": "Bengali",
}

MAX_TOKENS = 700
REQUEST_TIMEOUT = 20.0


class LLMError(Exception):
    """Raised whenever the upstream model call fails or is misconfigured."""


def _fact_lines(ctx, alerts: list, actions: list) -> list[str]:
    """Every line here is a real, currently-true value — nothing invented."""
    f = ctx.field
    lines = [
        f"Field: {ctx.name} — crop {ctx.crop}, growth stage {ctx.stage}, "
        f"{f['days_after_sowing']} days after sowing.",
        f"Soil moisture: {ctx.soil_moisture}% (trend {ctx.moisture_trend.value}); "
        f"refill point {f['refill_point_pct']}%, preferred threshold {f['threshold_pct']}%, "
        f"soil type {f['soil_type']}.",
        f"Air temperature: {ctx.air_temp}°C (today's range {ctx.t_min}–{ctx.t_max}°C), "
        f"heat index {ctx.heat_index}°C.",
        f"Humidity: {ctx.humidity}% (trend {ctx.humidity_trend.value}), "
        f"dew point {ctx.dew_point}°C, VPD {ctx.vpd} kPa.",
        f"Light: {int(ctx.light):,} lux, daily light integral {ctx.dli} mol·m⁻²·day⁻¹.",
        f"Reference evapotranspiration (ET₀): {ctx.et0} mm/day. "
        f"Root-zone depletion: {ctx.depletion}%.",
        f"Leaf-wetness / disease-favouring proxy: {ctx.wetness_risk} "
        f"(higher means more favourable to foliar fungal disease).",
        f"Last sensor uplink: {int(ctx.stale_minutes)} minutes ago.",
    ]
    if ctx.warnings:
        lines.append("Sensor warnings: " + "; ".join(ctx.warnings) + ".")
    if alerts:
        top = alerts[0]
        lines.append(
            f"Open alert: '{top.title}' ({top.severity.value}) — {top.what} {top.why}"
        )
        if len(alerts) > 1:
            lines.append(f"{len(alerts) - 1} other open alert(s) not detailed here.")
    else:
        lines.append("No open alerts for this field right now.")
    if actions:
        lines.append(
            f"Suggested next action on record: {actions[0].title} "
            f"({actions[0].due_window})."
        )
    return lines


def build_system_prompt(ctx, alerts: list, actions: list, language: str | None) -> str:
    lang_name = LANGUAGE_NAMES.get((language or "en").lower(), "English")
    facts = "\n".join(f"- {line}" for line in _fact_lines(ctx, alerts, actions))
    return (
        "You are SIYA, a smart farming assistant embedded in a farm-monitoring app. "
        "You help a farmer understand their field and make practical decisions.\n\n"
        "Ground rules:\n"
        "1. The only real, current facts you have about this farm are listed below. "
        "Never state a specific number (a percentage, a temperature, a reading) for "
        "this farm that is not in that list — if the farmer asks about something not "
        "listed, say plainly that the data is not available yet instead of guessing.\n"
        "2. You can freely use general agronomy knowledge (fertilizer types, disease "
        "biology, irrigation practice, crop care) to explain and advise — that is not "
        "the same as inventing this farm's data.\n"
        "3. If the farmer asks something unrelated to farming, answer it briefly and "
        "helpfully, then note that you are primarily built for farm assistance.\n"
        "4. Keep answers short and practical — a farmer reading this on a phone. "
        "Plain language over jargon.\n"
        f"5. Reply in {lang_name}, regardless of the language the app UI happens to be "
        "showing elsewhere, unless the farmer's message is clearly in a different "
        "language — then match the farmer.\n\n"
        f"Current data for {ctx.name}:\n{facts}"
    )


async def _ask_openai(message: str, history: list[dict], system_prompt: str) -> str:
    """OpenAI Chat Completions. Also used for any OpenAI-compatible endpoint
    (e.g. an OpenAI-compatible Gemini proxy) if AI_BASE_URL is overridden."""
    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        role = "assistant" if h.get("role") == "assistant" else "user"
        messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": message})

    payload = {"model": settings.ai_model, "max_tokens": MAX_TOKENS, "messages": messages}
    headers = {
        "Authorization": f"Bearer {settings.ai_api_key}",
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(settings.ai_base_url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise LLMError("The AI service timed out.") from exc
    except httpx.HTTPError as exc:
        raise LLMError("Could not reach the AI service.") from exc

    if response.status_code != 200:
        raise LLMError(f"AI service returned {response.status_code}.")

    body = response.json()
    choices = body.get("choices") or []
    reply = (choices[0].get("message", {}).get("content", "") if choices else "").strip()
    if not reply:
        raise LLMError("AI service returned an empty response.")
    return reply


async def _ask_gemini(message: str, history: list[dict], system_prompt: str) -> str:
    """Google Gemini `generateContent`. AI_BASE_URL should point at
    .../models/<model>:generateContent — the API key is sent as a query param
    per Gemini's REST contract, never embedded in client code."""
    contents = []
    for h in history:
        role = "model" if h.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": MAX_TOKENS},
    }
    if "2.5-flash" in settings.ai_model:
        # 2.5 Flash "thinks" by default and those tokens count against
        # maxOutputTokens, which can leave an empty reply. Short farm answers
        # don't need it.
        payload["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}
    url = settings.ai_base_url
    separator = "&" if "?" in url else "?"
    url = f"{url}{separator}key={settings.ai_api_key}"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload, headers={"content-type": "application/json"})
    except httpx.TimeoutException as exc:
        raise LLMError("The AI service timed out.") from exc
    except httpx.HTTPError as exc:
        raise LLMError("Could not reach the AI service.") from exc

    if response.status_code != 200:
        raise LLMError(f"AI service returned {response.status_code}.")

    body = response.json()
    candidates = body.get("candidates") or []
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    reply = "".join(p.get("text", "") for p in parts).strip()
    if not reply:
        raise LLMError("AI service returned an empty response.")
    return reply


async def _ask_anthropic(message: str, history: list[dict], system_prompt: str) -> str:
    payload = {
        "model": settings.ai_model,
        "max_tokens": MAX_TOKENS,
        "system": system_prompt,
        "messages": [*history, {"role": "user", "content": message}],
    }
    headers = {
        "x-api-key": settings.ai_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(settings.ai_base_url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise LLMError("The AI service timed out.") from exc
    except httpx.HTTPError as exc:
        raise LLMError("Could not reach the AI service.") from exc

    if response.status_code != 200:
        raise LLMError(f"AI service returned {response.status_code}.")

    body = response.json()
    text_parts = [
        block.get("text", "") for block in body.get("content", []) if block.get("type") == "text"
    ]
    reply = "".join(text_parts).strip()
    if not reply:
        raise LLMError("AI service returned an empty response.")
    return reply


_PROVIDERS = {"openai": _ask_openai, "gemini": _ask_gemini, "anthropic": _ask_anthropic}


async def ask(message: str, history: list[dict], system_prompt: str) -> str:
    """Call the configured LLM. Raises LLMError on any failure — callers must
    surface a real error to the user rather than fabricate a reply.

    Provider is chosen by AI_PROVIDER (openai | gemini | anthropic), each with
    its own request/response shape but the same contract with callers: a
    plain string back, or LLMError."""
    if not settings.ai_configured:
        raise LLMError("AI_API_KEY is not configured.")
    handler = _PROVIDERS.get(settings.ai_provider, _ask_openai)
    return await handler(message, history, system_prompt)
