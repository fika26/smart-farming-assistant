"""Today's advice for one field, in the farmer's language.

Pipeline (the same shape whether or not an LLM key is configured):

    live readings ─► FieldContext ─► rule engine (alerts + actions)
                                         │
                                         ├─► rules brief  (catalog templates, always available)
                                         └─► LLM brief    (only if AI_API_KEY is set)
                                                 │
                                                 └─► number guard ─► pass → engine="llm"
                                                                     fail → engine="rules"

The rule engine decides *what* to do; the LLM is only allowed to *say it*
more simply, in the requested language. The number guard rejects any LLM
reply that contains a figure not present in the facts it was given, which is
how you verify in production that the model is grounded on live telemetry
rather than inventing readings. Every response carries `engine` so the UI can
label where the words came from.
"""
from __future__ import annotations

import hashlib
import logging
import re
import time

from app.core.config import settings
from app.i18n import current_language, t
from app.intelligence import llm

log = logging.getLogger(__name__)

CACHE_TTL_S = 30 * 60
_cache: dict[str, tuple[float, dict]] = {}
_NUM = re.compile(r"\d+(?:[.,]\d+)?")


def _rules_brief(ctx, alerts: list, actions: list) -> str:
    if not alerts or not actions:
        return t("brief.none", field=ctx.name)
    alert, action = alerts[0], (next((a for a in actions if a.source_alert_id == alerts[0].id),
                                     actions[0]))
    return " ".join([t("brief.lead", title=action.title), alert.what,
                     t("brief.do", action=alert.action), t("brief.when", window=action.due_window)])


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "").rstrip("0").rstrip(".") or "0" for n in _NUM.findall(text)}


def grounded(reply: str, facts: str) -> bool:
    """True when every number in the reply also appears in the facts. Small
    integers (1-10) are allowed because they are used for counts/steps."""
    allowed = _numbers(facts)
    for n in _numbers(reply):
        if n in allowed:
            continue
        try:
            if float(n) <= 10 and float(n).is_integer():
                continue
        except ValueError:
            pass
        return False
    return True


def _state_key(ctx, alerts: list, lang: str) -> str:
    raw = f"{ctx.field_id}|{lang}|{ctx.soil_moisture}|{ctx.air_temp}|{ctx.humidity}|" + \
          ",".join(a.rule_id for a in alerts)
    return hashlib.sha1(raw.encode()).hexdigest()


async def build_brief(ctx, alerts: list, actions: list) -> dict:
    lang = current_language()
    rules_text = _rules_brief(ctx, alerts, actions)
    base = {"field_id": ctx.field_id, "field_name": ctx.name, "language": lang,
            "rules_text": rules_text, "alert_ids": [a.id for a in alerts[:3]]}

    if not settings.ai_configured:
        return {**base, "text": rules_text, "engine": "rules",
                "reason": "AI_API_KEY not set — showing rule-engine wording."}

    key = _state_key(ctx, alerts, lang)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL_S:
        return hit[1]

    facts = "\n".join(llm._fact_lines(ctx, alerts, actions))
    system = (
        "You rewrite farm advice for a smallholder farmer reading on a basic phone. "
        f"Write in {llm.LANGUAGE_NAMES.get(lang, 'English')} using everyday spoken words, "
        "not technical terms (no 'VPD', 'ET0', 'evapotranspiration', 'DLI'). "
        "At most 3 short sentences: what is happening, what to do, and by when. "
        "Use ONLY numbers that appear in the facts. Do not add advice the rule engine "
        "did not give.\n\nFacts:\n" + facts +
        "\n\nRule-engine advice to rewrite:\n" + _rules_brief(ctx, alerts, actions)
    )
    try:
        reply = await llm.ask("Write today's advice.", [], system)
    except llm.LLMError as exc:
        log.warning("brief: LLM failed (%s); using rules", exc)
        return {**base, "text": rules_text, "engine": "rules", "reason": "AI service unavailable."}

    if not grounded(reply, facts + " " + rules_text):
        log.warning("brief: LLM reply contained ungrounded numbers; using rules. reply=%r", reply)
        return {**base, "text": rules_text, "engine": "rules",
                "reason": "AI reply failed the number check — showing rule-engine wording."}

    out = {**base, "text": reply.strip(), "engine": "llm", "reason": None}
    _cache[key] = (time.time(), out)
    return out
