"""Rule-grounded farmer assistant.

No LLM is called. Intent is matched with keywords and every answer is composed from
live FieldContext values, so the assistant can never state a number the sensors did
not produce. Responses are flagged `is_mock=True`.
"""
from __future__ import annotations

from app.core.time import now
from app.domain.enums import DataSource
from app.schemas.agronomy import ChatResponse, Evidence

SUGGESTIONS = [
    "Should I irrigate?",
    "Why is my soil moisture low?",
    "Is today's temperature risky?",
    "What needs my attention?",
    "What do my sensors indicate?",
]

INTENTS = {
    "irrigation": ["irrigate", "water", "watering", "moisture", "irrigation", "dry", "pani"],
    "temperature": ["temperature", "hot", "heat", "cold", "warm", "risky", "climate"],
    "attention": ["attention", "wrong", "problem", "urgent", "priority", "today", "status"],
    "sensors": ["sensor", "device", "node", "reading", "hardware", "battery", "signal"],
    "disease": ["disease", "pest", "fungus", "blight", "insect", "spray", "infection"],
    "humidity": ["humidity", "humid", "moist air", "dew"],
    "light": ["light", "sun", "sunlight", "lux", "shade"],
    "yield": ["yield", "harvest", "production", "output"],
}


def _detect_intent(message: str) -> str:
    text = message.lower()
    best, score = "attention", 0
    for intent, words in INTENTS.items():
        hits = sum(1 for w in words if w in text)
        if hits > score:
            best, score = intent, hits
    return best


def answer(message: str, ctx, alerts: list, actions: list) -> ChatResponse:
    intent = _detect_intent(message)
    f = ctx.field
    ev = [Evidence(label="Soil moisture", value=f"{ctx.soil_moisture}%"),
          Evidence(label="Air temperature", value=f"{ctx.air_temp}°C"),
          Evidence(label="Humidity", value=f"{ctx.humidity}%"),
          Evidence(label="Light", value=f"{int(ctx.light):,} lux")]

    if intent == "irrigation":
        if ctx.soil_moisture <= f["refill_point_pct"]:
            reply = (f"Yes — irrigate {ctx.name} soon. Soil moisture is {ctx.soil_moisture}%, "
                     f"below the {f['refill_point_pct']}% refill point for "
                     f"{f['soil_type'].lower()}. Reference evapotranspiration is {ctx.et0} mm/day, "
                     f"so the deficit grows each day you wait. Irrigate early morning and recheck "
                     f"moisture two hours after the cycle ends.")
        elif ctx.soil_moisture <= f["threshold_pct"]:
            reply = (f"Probably within the next day. Moisture is {ctx.soil_moisture}%, just under "
                     f"the {f['threshold_pct']}% preferred threshold, and the trend is "
                     f"{ctx.moisture_trend.value}. Schedule the next cycle rather than irrigating "
                     f"immediately.")
        else:
            reply = (f"Not right now. Moisture is {ctx.soil_moisture}%, comfortably above the "
                     f"{f['threshold_pct']}% threshold with {ctx.depletion}% of available water "
                     f"used. Recheck after the next hot afternoon.")
        ev.append(Evidence(label="ET₀", value=f"{ctx.et0} mm/day", source=DataSource.DERIVED))

    elif intent == "temperature":
        risky = ctx.t_max >= 34
        reply = (f"Today's peak in {ctx.name} was {ctx.t_max}°C with a low of {ctx.t_min}°C. "
                 f"The derived heat index is {ctx.heat_index}°C and VPD is {ctx.vpd} kPa. "
                 + ("That is in the stress band for this crop — shift irrigation to pre-dawn and "
                    "avoid spraying between 11:00 and 16:00."
                    if risky else
                    "That is within a workable range for this crop, so no heat-specific action "
                    "is needed today."))
        ev.append(Evidence(label="Heat index", value=f"{ctx.heat_index}°C",
                           source=DataSource.DERIVED))

    elif intent == "sensors":
        parts = [f"{ctx.name} node readings: soil moisture {ctx.soil_moisture}%, soil temperature "
                 f"{ctx.soil_temp}°C, air temperature {ctx.air_temp}°C, humidity {ctx.humidity}%, "
                 f"light {int(ctx.light):,} lux."]
        parts.append(f"Last uplink was {int(ctx.stale_minutes)} minutes ago.")
        parts.append("All five channels are reporting normally."
                     if not ctx.warnings else
                     "Attention: " + "; ".join(ctx.warnings) + ".")
        reply = " ".join(parts)
        ev.append(Evidence(label="Soil temperature", value=f"{ctx.soil_temp}°C"))

    elif intent == "disease":
        reply = (f"Humidity is {ctx.humidity}% at {ctx.air_temp}°C, giving a leaf-wetness proxy "
                 f"of {ctx.wetness_risk} (dew point {ctx.dew_point}°C). "
                 + ("That falls inside the window that favours foliar fungal infection — scout "
                    "lower leaves today and plan a protectant spray before the next humid night."
                    if ctx.wetness_risk >= 0.5 else
                    "That is outside the main infection window, so routine weekly scouting is "
                    "enough.")
                 + " For a photo-based check, use Disease & Pest Detection — note that it "
                   "currently runs a prototype mock analysis, not a trained model.")
        ev.append(Evidence(label="Wetness proxy", value=f"{ctx.wetness_risk}",
                           source=DataSource.DERIVED))

    elif intent == "humidity":
        reply = (f"Relative humidity in {ctx.name} is {ctx.humidity}% ({ctx.humidity_trend.value}, "
                 f"{ctx.humidity_delta_24h:+.1f}% over 24 h), with a dew point of "
                 f"{ctx.dew_point}°C and VPD of {ctx.vpd} kPa.")

    elif intent == "light":
        reply = (f"The BH1750 is reading {int(ctx.light):,} lux right now and the last 24 hours "
                 f"accumulated a daily light integral of {ctx.dli} mol·m⁻²·day⁻¹ "
                 f"({ctx.light_trend.value} trend).")
        ev.append(Evidence(label="DLI", value=f"{ctx.dli} mol·m⁻²·d⁻¹", source=DataSource.DERIVED))

    elif intent == "yield":
        reply = (f"{ctx.crop} in {ctx.name} is {f['days_after_sowing']} days after sowing at the "
                 f"{ctx.stage.lower()} stage with roughly {int(ctx.gdd_total)} growing degree days "
                 f"accumulated. Yield figures in Analytics are prototype estimates derived from "
                 f"stage and stress history, not validated field measurements.")

    else:  # attention
        if alerts:
            top = alerts[0]
            reply = (f"{len(alerts)} open issue(s) in {ctx.name}. The most important is "
                     f"'{top.title}' ({top.severity.value}). {top.what} {top.why} "
                     f"Recommended: {top.action}")
        else:
            reply = (f"Nothing critical in {ctx.name} right now. Moisture is "
                     f"{ctx.soil_moisture}%, air temperature {ctx.air_temp}°C and humidity "
                     f"{ctx.humidity}% — all inside their working ranges.")
        if actions:
            reply += f" Next action: {actions[0].title} ({actions[0].due_window.lower()})."

    return ChatResponse(reply=reply, intent=intent, grounded_on=ev,
                        suggestions=SUGGESTIONS, is_mock=True, answered_at=now())
