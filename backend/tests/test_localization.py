"""Localisation, advice provenance and data-source wiring."""
import re

import pytest
from fastapi.testclient import TestClient

from app.i18n import en, hi, te, placeholders
from app.main import app

client = TestClient(app)
DEVANAGARI = re.compile(r"[ऀ-ॿ]")
TELUGU = re.compile(r"[ఀ-౿]")
FIELD_NAMES = ("North Block", "Canal Side", "South Plot")


def _english_words(text: str) -> list[str]:
    for name in FIELD_NAMES:
        text = text.replace(name, "")
    # units / sensor abbreviations are allowed to stay Latin
    return [w for w in re.findall(r"[A-Za-z]{4,}", text) if w not in {"Wi", "lux"}]


@pytest.mark.parametrize("catalog", [hi.MESSAGES, te.MESSAGES])
def test_catalogs_complete_and_placeholders_match(catalog):
    assert set(catalog) == set(en.MESSAGES)
    for key, template in en.MESSAGES.items():
        assert placeholders(catalog[key]) == placeholders(template), key


@pytest.mark.parametrize("lang,script", [("hi", DEVANAGARI), ("te", TELUGU)])
def test_dashboard_generated_text_is_translated(lang, script):
    data = client.get(f"/api/dashboard?lang={lang}").json()["data"]
    texts = [data["farm_status_line"]]
    for alert in data["alerts"]:
        texts += [alert["title"], alert["what"], alert["why"], alert["action"], alert["category"]]
    for action in data["actions"]:
        texts += [action["title"], action["due_window"], action["estimated_impact"]]
    for text in texts:
        assert script.search(text), text
        assert not _english_words(text), (text, _english_words(text))


def test_language_from_accept_language_header():
    r = client.get("/api/alerts", headers={"Accept-Language": "te-IN,te;q=0.9,en;q=0.5"})
    assert r.headers["content-language"] == "te"
    assert r.json()["meta"]["language"] == "te"
    assert TELUGU.search(r.json()["data"][0]["title"])


def test_unknown_language_falls_back_to_english():
    r = client.get("/api/alerts?lang=xx").json()
    assert r["meta"]["language"] == "en"


def test_alert_carries_message_key_for_other_channels():
    alert = client.get("/api/alerts?lang=hi").json()["data"][0]
    assert alert["message_key"].startswith("alert.")
    assert alert["category_code"] in {"irrigation", "climate", "crop_health", "device"}


def test_analytics_highlights_and_metrics_localised():
    data = client.get("/api/analytics?lang=hi").json()["data"]
    assert all(DEVANAGARI.search(h) for h in data["highlights"])
    assert {m["key"] for m in data["metrics"]} >= {"soil_moisture", "humidity"}
    assert {r["key"] for r in data["resource_usage"]} == {"water", "events", "energy", "cost"}


# ---- advice provenance ------------------------------------------------------
def test_brief_without_key_is_labelled_rules():
    r = client.get("/api/advisory/brief?lang=hi").json()
    assert r["data"]["engine"] == "rules" and r["meta"]["text_engine"] == "rules"
    assert DEVANAGARI.search(r["data"]["text"])


def test_number_guard():
    from app.intelligence.brief import grounded
    facts = "Soil moisture: 19.1% refill 20.0% ET0 6.11"
    assert grounded("Moisture is 19.1%, below 20%. Water within 6 hours.", facts)
    assert not grounded("Moisture is 12.5%.", facts)


@pytest.mark.parametrize("reply,engine", [
    ("मिट्टी सूखी है, अभी पानी दें।", "llm"),
    ("नमी 3.7% है, 900 लीटर पानी दें।", "rules"),  # invented numbers → rejected
])
def test_llm_brief_is_checked(monkeypatch, reply, engine):
    from app.core.config import settings
    from app.intelligence import brief, llm

    brief._cache.clear()
    monkeypatch.setattr(settings, "ai_api_key", "test-key")

    async def fake_ask(message, history, system):
        assert "Hindi" in system and "Facts:" in system
        return reply

    monkeypatch.setattr(llm, "ask", fake_ask)
    data = client.get("/api/advisory/brief?lang=hi").json()["data"]
    assert data["engine"] == engine


# ---- data-source wiring -----------------------------------------------------
def test_ingest_only_source_never_serves_mock_values():
    from app.repositories.memory import MemoryRepository
    from app.services.context import build_context
    from app.domain.catalog import FIELDS
    from app.intelligence import rules
    from app.sources.hardware import IngestOnlySource
    from app.core.time import now

    repo = MemoryRepository(IngestOnlySource())
    ctx = build_context(repo, FIELDS[0])
    alerts = rules.evaluate(ctx)
    assert [a.rule_id for a in alerts] == ["device.data.none"]  # no fake "0% moisture" alarm

    repo.append([{"sensor_id": "s1", "field_id": FIELDS[0]["id"], "device_id": "n1",
                  "sensor_type": "soil_moisture", "value": 18.0, "unit": "%",
                  "raw_value": None, "raw_unit": None, "timestamp": now(), "status": "ok"}])
    repo.seed()  # periodic re-seed must keep ingested telemetry
    ctx = build_context(repo, FIELDS[0])
    assert ctx.soil_moisture == 18.0
    assert "soil.moisture.critical" in {a.rule_id for a in rules.evaluate(ctx)}
