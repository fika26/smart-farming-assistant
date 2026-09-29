"""Turns alerts + context into a prioritised, farmer-facing action plan."""
from __future__ import annotations

import hashlib

from app.domain.enums import ActionPriority, DataSource, Severity
from app.i18n import group_in, t, term
from app.intelligence import derive
from app.schemas.agronomy import Action, Evidence, Insight

# rule_id -> action.<key> template (localised in app/i18n)
SHORT_TITLES = {
    "soil.moisture.critical": "action.moisture_critical",
    "soil.moisture.low": "action.moisture_low",
    "soil.moisture.saturated": "action.moisture_saturated",
    "climate.heat.severe": "action.heat_severe",
    "climate.heat.elevated": "action.heat_elevated",
    "climate.vpd.high": "action.vpd_high",
    "climate.cold.low": "action.cold",
    "disease.fungal.window": "action.fungal",
    "light.dli.low": "action.dli_low",
    "device.data.stale": "action.stale",
    "device.data.none": "action.no_data",
}

PRIORITY_BY_SEVERITY = {
    Severity.CRITICAL: ActionPriority.URGENT,
    Severity.HIGH: ActionPriority.HIGH,
    Severity.MEDIUM: ActionPriority.ROUTINE,
    Severity.INFO: ActionPriority.ROUTINE,
}

WINDOW_KEY_BY_PRIORITY = {
    ActionPriority.URGENT: "window.urgent",
    ActionPriority.HIGH: "window.high",
    ActionPriority.ROUTINE: "window.routine",
}

IMPACT_KEYS = {"irrigation", "climate", "crop_health", "device"}


def _aid(field_id: str, key: str) -> str:
    return "act-" + hashlib.sha1(f"{field_id}:{key}".encode()).hexdigest()[:10]


def build_actions(ctx, alerts: list) -> list[Action]:
    actions: list[Action] = []
    for alert in alerts:
        priority = PRIORITY_BY_SEVERITY[alert.severity]
        code = alert.category_code or ""
        impact = t(f"impact.{code}") if code in IMPACT_KEYS else t("impact.default")
        if alert.rule_id.startswith("soil.moisture") and alert.severity in (
                Severity.CRITICAL, Severity.HIGH):
            depth = derive.irrigation_depth_mm(ctx.soil_moisture, ctx.field["field_capacity_pct"])
            litres = int(depth * ctx.field["area_ha"] * 10_000)
            impact = t("impact.irrigation_depth", depth=depth, litres=group_in(litres))
        title_key = SHORT_TITLES.get(alert.rule_id) or (
            "action.sensor_fault" if alert.rule_id.startswith("device.sensor") else None)
        actions.append(Action(
            id=_aid(ctx.field_id, alert.rule_id), field_id=ctx.field_id, field_name=ctx.name,
            title=t(title_key, field=ctx.name) if title_key else alert.title,
            rationale=alert.why, detail=alert.action,
            priority=priority, due_window=t(WINDOW_KEY_BY_PRIORITY[priority]),
            estimated_impact=impact, category=alert.category, category_code=code,
            source_alert_id=alert.id,
        ))

    # standing agronomic actions that are not alert-driven
    if not any(a.category_code == "crop_health" for a in actions):
        actions.append(Action(
            id=_aid(ctx.field_id, "scout.routine"), field_id=ctx.field_id, field_name=ctx.name,
            title=t("action.scout_routine.title", field=ctx.name),
            rationale=t("action.scout_routine.rationale", crop=term(ctx.crop),
                        stage=term(ctx.stage, lower=True)),
            priority=ActionPriority.ROUTINE, due_window=t("window.routine"),
            estimated_impact=t("impact.scout"), category=t("category.crop_health"),
            category_code="crop_health"))
    return sort_actions(actions)


PRIORITY_ORDER = {ActionPriority.URGENT: 0, ActionPriority.HIGH: 1, ActionPriority.ROUTINE: 2}


def sort_actions(actions: list[Action]) -> list[Action]:
    return sorted(actions, key=lambda a: PRIORITY_ORDER[a.priority])


def _ev(key: str, value: str, source: DataSource = DataSource.MEASURED) -> Evidence:
    return Evidence(label=t(f"ev.{key}"), value=value, source=source, key=key)


def build_insights(ctx) -> list[Insight]:
    """Observed -> Interpretation -> Action. Rule-based, explicitly labelled."""
    from app.core.time import now

    f = ctx.field
    out: list[Insight] = []

    def add(key: str, category: str, low: bool, params: dict, severity: Severity,
            confidence: float, evidence: list[Evidence], variant=("low", "ok")):
        if variant:
            suffix = variant[0] if low else variant[1]
            interpretation_key = f"insight.{key}.{suffix}"
            if key == "moisture" and low and ctx.depletion >= 100:
                interpretation_key = "insight.moisture.below_refill"
            action_key = f"insight.{key}.action_{suffix}"
        else:
            interpretation_key = f"insight.{key}.interpretation"
            action_key = f"insight.{key}.action"
        out.append(Insight(
            id="ins-" + hashlib.sha1(f"{ctx.field_id}:{key}".encode()).hexdigest()[:10],
            field_id=ctx.field_id, field_name=ctx.name, title=t(f"insight.{key}.title"),
            category=t(f"category.{category}"), category_code=category,
            observed=t(f"insight.{key}.observed", **params),
            interpretation=t(interpretation_key, **params), action=t(action_key, **params),
            confidence=confidence, severity=severity, generated_at=now(),
            method="rule-based", evidence=evidence))

    dry = ctx.soil_moisture <= f["threshold_pct"]
    # Depletion above 100% means "past the refill point"; "114% of available
    # water used" reads as nonsense to a farmer, so that case gets its own text.
    add("moisture", "soil_irrigation", dry,
        {"moisture": ctx.soil_moisture, "threshold": f["threshold_pct"],
         "capacity": f["field_capacity_pct"], "delta": ctx.moisture_delta_24h,
         "trend": term(ctx.moisture_trend.value), "depletion": ctx.depletion},
        Severity.HIGH if dry else Severity.INFO, 0.9,
        [_ev("soil_moisture", f"{ctx.soil_moisture}%"),
         _ev("depletion", f"{ctx.depletion}%", DataSource.DERIVED)])

    high_vpd = ctx.vpd >= 1.6
    add("vpd", "climate", high_vpd,
        {"air_temp": ctx.air_temp, "humidity": ctx.humidity, "vpd": ctx.vpd, "et0": ctx.et0},
        Severity.MEDIUM if high_vpd else Severity.INFO, 0.85,
        [_ev("vpd", f"{ctx.vpd} kPa", DataSource.DERIVED),
         _ev("et0", f"{ctx.et0} mm/day", DataSource.DERIVED)], variant=("high", "ok"))

    dark = ctx.dli < 14
    add("light", "crop_health", dark,
        {"light": f"{int(ctx.light):,}", "dli": ctx.dli, "trend": term(ctx.light_trend.value)},
        Severity.MEDIUM if dark else Severity.INFO, 0.74,
        [_ev("dli", f"{ctx.dli} mol·m⁻²·d⁻¹", DataSource.DERIVED),
         _ev("light", f"{int(ctx.light):,} lux")])

    wet = ctx.wetness_risk >= 0.5
    add("disease", "crop_health", wet,
        {"humidity": ctx.humidity, "air_temp": ctx.air_temp, "dew_point": ctx.dew_point,
         "wetness": ctx.wetness_risk},
        Severity.HIGH if ctx.wetness_risk >= 0.6 else Severity.INFO, 0.76,
        [_ev("humidity", f"{ctx.humidity}%"),
         _ev("wetness", f"{ctx.wetness_risk}", DataSource.DERIVED)], variant=("high", "ok"))

    add("stage", "crop_health", False,
        {"crop": term(ctx.crop), "das": f["days_after_sowing"], "stage": term(ctx.stage, lower=True),
         "gdd": int(ctx.gdd_total), "variety": f["variety"]},
        Severity.INFO, 0.7,
        [_ev("gdd", f"{int(ctx.gdd_total)}", DataSource.DERIVED),
         _ev("stage", term(ctx.stage), DataSource.DERIVED)], variant=None)

    return out
