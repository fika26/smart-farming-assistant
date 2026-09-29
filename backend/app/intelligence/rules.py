"""Deterministic, explainable rule engine.

Every alert carries the readings that fired it (`evidence`) plus a plain-language
`what / why / action`, so the UI can always answer "why is this on my screen?".
No machine-learning claims are made here — this is threshold + agronomic-model logic.
"""
from __future__ import annotations

import hashlib

from app.core.time import humanize_since, now
from app.i18n import t, term
from app.domain.enums import AlertStatus, DataSource, Severity
from app.schemas.agronomy import Alert, Evidence

RULE_VERSION = "0.1.0"


def _alert_id(field_id: str, rule_id: str) -> str:
    return "alr-" + hashlib.sha1(f"{field_id}:{rule_id}".encode()).hexdigest()[:10]


def _mk(ctx, rule_id: str, key: str, category: str, severity: Severity,
        params: dict, evidence: list[Evidence],
        age_hours: float = 2.0, confidence: float = 0.9) -> Alert:
    """`key` selects the alert.<key>.{title,what,why,action} templates in
    app/i18n; `params` fills them, so the same rule renders in any language."""
    from datetime import timedelta
    opened = now() - timedelta(hours=age_hours)
    return Alert(
        id=_alert_id(ctx.field_id, rule_id), field_id=ctx.field_id, field_name=ctx.name,
        title=t(f"alert.{key}.title", **params), category=t(f"category.{category}"),
        category_code=category, severity=severity, status=AlertStatus.ACTIVE,
        opened_at=opened, opened_at_human=humanize_since(opened),
        what=t(f"alert.{key}.what", **params), why=t(f"alert.{key}.why", **params),
        action=t(f"alert.{key}.action", **params), evidence=evidence,
        rule_id=rule_id, rule_version=RULE_VERSION, confidence=confidence,
        message_key=f"alert.{key}", params={k: str(v) for k, v in params.items()},
    )


def _ev(key: str, value: str, source: DataSource = DataSource.MEASURED) -> Evidence:
    return Evidence(label=t(f"ev.{key}"), value=value, source=source, key=key)


def evaluate(ctx) -> list[Alert]:
    alerts: list[Alert] = []
    f = ctx.field
    threshold = f["threshold_pct"]
    refill = f["refill_point_pct"]
    capacity = f["field_capacity_pct"]
    base = {
        "field": ctx.name, "crop": term(ctx.crop), "crop_l": term(ctx.crop, lower=True),
        "stage": term(ctx.stage, lower=True), "soil": term(f["soil_type"], lower=True),
    }

    # --- No telemetry yet --------------------------------------------------------
    # Every value on the context defaults to 0.0; without this guard an empty
    # field (fresh hardware deployment) would raise "0% moisture — irrigate now".
    if not ctx.latest:
        return [_mk(ctx, "device.data.none", "no_data", "device", Severity.MEDIUM,
                    base, [], age_hours=0.0, confidence=1.0)]

    # --- Irrigation / soil water -------------------------------------------------
    if ctx.soil_moisture <= refill:
        alerts.append(_mk(
            ctx, "soil.moisture.critical", "moisture_critical", "irrigation", Severity.CRITICAL,
            {**base, "moisture": ctx.soil_moisture, "refill": refill, "et0": ctx.et0},
            [_ev("soil_moisture", f"{ctx.soil_moisture}%"),
             _ev("refill_point", f"{refill}%", DataSource.DERIVED),
             _ev("depletion", f"{ctx.depletion}%", DataSource.DERIVED),
             _ev("et0", f"{ctx.et0} mm/day", DataSource.DERIVED)],
            age_hours=3.5, confidence=0.94))
    elif ctx.soil_moisture <= threshold:
        days = max(1, int((ctx.soil_moisture - refill) / max(0.4, ctx.et0 * 0.5)))
        alerts.append(_mk(
            ctx, "soil.moisture.low", "moisture_low", "irrigation", Severity.HIGH,
            {**base, "moisture": ctx.soil_moisture, "threshold": threshold, "refill": refill,
             "delta": ctx.moisture_delta_24h, "trend": term(ctx.moisture_trend.value),
             "et0": ctx.et0, "days": days},
            [_ev("soil_moisture", f"{ctx.soil_moisture}%"),
             _ev("threshold", f"{threshold}%", DataSource.DERIVED),
             _ev("change_24h", f"{ctx.moisture_delta_24h}%", DataSource.DERIVED)],
            age_hours=6.0, confidence=0.9))
    elif ctx.soil_moisture > capacity * 1.04:
        alerts.append(_mk(
            ctx, "soil.moisture.saturated", "moisture_saturated", "irrigation", Severity.MEDIUM,
            {**base, "moisture": ctx.soil_moisture, "capacity": capacity},
            [_ev("soil_moisture", f"{ctx.soil_moisture}%"),
             _ev("field_capacity", f"{capacity}%", DataSource.DERIVED)],
            age_hours=9.0, confidence=0.86))

    # --- Heat stress -------------------------------------------------------------
    if ctx.t_max >= 38:
        alerts.append(_mk(
            ctx, "climate.heat.severe", "heat_severe", "climate", Severity.CRITICAL,
            {**base, "crop": base["crop_l"], "t_max": ctx.t_max, "heat_index": ctx.heat_index},
            [_ev("peak_temp", f"{ctx.t_max}°C"),
             _ev("heat_index", f"{ctx.heat_index}°C", DataSource.DERIVED),
             _ev("vpd", f"{ctx.vpd} kPa", DataSource.DERIVED)],
            age_hours=5.0, confidence=0.92))
    elif ctx.t_max >= 34:
        alerts.append(_mk(
            ctx, "climate.heat.elevated", "heat_elevated", "climate", Severity.MEDIUM,
            {**base, "t_max": ctx.t_max},
            [_ev("peak_temp", f"{ctx.t_max}°C"),
             _ev("et0", f"{ctx.et0} mm/day", DataSource.DERIVED)],
            age_hours=8.0, confidence=0.85))

    # --- Atmospheric moisture demand --------------------------------------------
    if ctx.vpd >= 2.2:
        alerts.append(_mk(
            ctx, "climate.vpd.high", "vpd_high", "climate", Severity.HIGH,
            {**base, "vpd": ctx.vpd, "air_temp": ctx.air_temp, "humidity": ctx.humidity},
            [_ev("vpd", f"{ctx.vpd} kPa", DataSource.DERIVED),
             _ev("air_temp", f"{ctx.air_temp}°C"),
             _ev("humidity", f"{ctx.humidity}%")],
            age_hours=4.0, confidence=0.88))

    # --- Disease pressure --------------------------------------------------------
    if ctx.wetness_risk >= 0.6 and 15 <= ctx.air_temp <= 28:
        alerts.append(_mk(
            ctx, "disease.fungal.window", "fungal", "crop_health", Severity.HIGH,
            {**base, "crop": base["crop_l"], "humidity": ctx.humidity, "air_temp": ctx.air_temp,
             "wetness": ctx.wetness_risk, "dew_point": ctx.dew_point},
            [_ev("humidity", f"{ctx.humidity}%"),
             _ev("air_temp", f"{ctx.air_temp}°C"),
             _ev("dew_point", f"{ctx.dew_point}°C", DataSource.DERIVED),
             _ev("wetness", f"{ctx.wetness_risk}", DataSource.DERIVED)],
            age_hours=7.0, confidence=0.79))

    # --- Light / photosynthesis --------------------------------------------------
    if ctx.dli and ctx.dli < 12:
        alerts.append(_mk(
            ctx, "light.dli.low", "dli_low", "crop_health", Severity.MEDIUM,
            {**base, "dli": ctx.dli},
            [_ev("dli", f"{ctx.dli} mol·m⁻²·d⁻¹", DataSource.DERIVED),
             _ev("light", f"{int(ctx.light):,} lux")],
            age_hours=14.0, confidence=0.72))

    # --- Cold / frost ------------------------------------------------------------
    if ctx.t_min <= 10:
        alerts.append(_mk(
            ctx, "climate.cold.low", "cold", "climate", Severity.MEDIUM,
            {**base, "crop": base["crop_l"], "t_min": ctx.t_min},
            [_ev("night_min", f"{ctx.t_min}°C"),
             _ev("soil_temp", f"{ctx.soil_temp}°C")],
            age_hours=11.0, confidence=0.8))

    # --- Sensor / device health --------------------------------------------------
    if ctx.stale_minutes > 90:
        minutes = int(ctx.stale_minutes)
        alerts.append(_mk(
            ctx, "device.data.stale", "stale", "device", Severity.HIGH,
            {**base, "minutes": minutes},
            [_ev("last_reading", t("unit.min_ago", n=minutes)),
             _ev("expected_interval", "30 min", DataSource.DERIVED)],
            age_hours=1.0, confidence=0.99))

    for warning in ctx.warnings:
        alerts.append(_mk(
            ctx, f"device.sensor.{warning[:12]}", "sensor_fault", "device", Severity.MEDIUM,
            {**base, "warning": warning},
            [_ev("sensor_status", warning)], age_hours=2.5, confidence=0.95))

    return alerts


SEVERITY_ORDER = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.INFO: 3}


def sort_alerts(alerts: list[Alert]) -> list[Alert]:
    return sorted(alerts, key=lambda a: (SEVERITY_ORDER[a.severity], a.opened_at), reverse=False)
