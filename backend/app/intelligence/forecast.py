"""Multi-hazard agricultural risk scoring (rule-based, not a trained model)."""
from __future__ import annotations

from datetime import timedelta

from app.core.time import now
from app.domain.enums import DataSource, RiskLevel, Trend
from app.i18n import t, term
from app.schemas.agronomy import Evidence, RiskForecast, RiskItem

METHOD = ("Rule-based multi-hazard scoring over live sensor readings, derived agronomic "
          "metrics and simulated forecast data. Not a trained predictive model.")


def _level(score: int) -> RiskLevel:
    if score >= 75:
        return RiskLevel.SEVERE
    if score >= 55:
        return RiskLevel.HIGH
    if score >= 32:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def _clamp(v: float) -> int:
    return int(max(0, min(100, round(v))))


def _decay(score: int, days: int, drift: float) -> list[int]:
    return [_clamp(score + drift * i) for i in range(days)]


def build_risk(ctx, forecast_days: list[dict], horizon: int = 7) -> RiskForecast:
    f = ctx.field
    days = [d["day"] if i < 2 else d["date"] for i, d in enumerate(forecast_days[:horizon])]
    rain_avg = sum(d["rain_probability"] for d in forecast_days[:horizon]) / max(1, horizon)
    t_max_avg = sum(d["t_max"] for d in forecast_days[:horizon]) / max(1, horizon)

    risks: list[RiskItem] = []

    # Drought / soil water
    drought = _clamp(ctx.depletion * 0.7 + max(0, ctx.et0 - 3) * 9 + max(0, 40 - rain_avg) * 0.35)
    risks.append(RiskItem(
        hazard="drought", label=t("risk.drought.label"), level=_level(drought),
        score=drought,
        trend=Trend.RISING if ctx.moisture_trend == Trend.FALLING else Trend.STABLE,
        horizon=t("risk.horizon", n=horizon),
        why=t("risk.drought.why", depletion=ctx.depletion, et0=ctx.et0, rain=int(rain_avg)),
        drivers=[Evidence(key="soil_moisture", label=t("ev.soil_moisture"), value=f"{ctx.soil_moisture}%"),
                 Evidence(key="depletion", label=t("ev.depletion"), value=f"{ctx.depletion}%", source=DataSource.DERIVED),
                 Evidence(key="rain_probability", label=t("ev.rain_probability"), value=f"{int(rain_avg)}%",
                          source=DataSource.SIMULATED)],
        action=t("risk.drought.action"),
        confidence=0.82, forecast=_decay(drought, horizon, 1.6)))

    # Heat stress
    heat = _clamp((max(0, t_max_avg - 30)) * 8 + max(0, ctx.vpd - 1.2) * 18 +
                  max(0, ctx.heat_index - 32) * 3)
    risks.append(RiskItem(
        hazard="heat", label=t("risk.heat.label"), level=_level(heat), score=heat,
        trend=Trend.RISING if ctx.temp_trend == Trend.RISING else Trend.STABLE,
        horizon=t("risk.horizon", n=horizon),
        why=t("risk.heat.why", t_max=round(t_max_avg, 1), stage=term(ctx.stage, lower=True),
              vpd=ctx.vpd),
        drivers=[Evidence(key="peak_temp", label=t("ev.peak_temp"), value=f"{ctx.t_max}°C"),
                 Evidence(key="heat_index", label=t("ev.heat_index"), value=f"{ctx.heat_index}°C",
                          source=DataSource.DERIVED),
                 Evidence(key="vpd", label=t("ev.vpd"), value=f"{ctx.vpd} kPa", source=DataSource.DERIVED)],
        action=t("risk.heat.action"),
        confidence=0.8, forecast=_decay(heat, horizon, -0.8)))

    # Flood / heavy rain
    flood = _clamp(rain_avg * 0.55 +
                   max(0, ctx.soil_moisture - f["field_capacity_pct"]) * 6 +
                   (12 if f["irrigation_type"] == "Flood" else 0))
    risks.append(RiskItem(
        hazard="flood", label=t("risk.flood.label"), level=_level(flood), score=flood,
        trend=Trend.RISING if rain_avg > 45 else Trend.STABLE, horizon=t("risk.horizon", n=horizon),
        why=t("risk.flood.why", rain=int(rain_avg), moisture=ctx.soil_moisture,
              capacity=f["field_capacity_pct"]),
        drivers=[Evidence(key="rain_probability", label=t("ev.rain_probability"), value=f"{int(rain_avg)}%",
                          source=DataSource.SIMULATED),
                 Evidence(key="soil_moisture", label=t("ev.soil_moisture"), value=f"{ctx.soil_moisture}%"),
                 Evidence(key="soil_type", label=t("ev.soil_type"), value=term(f["soil_type"]), source=DataSource.DERIVED)],
        action=t("risk.flood.action"),
        confidence=0.7, forecast=_decay(flood, horizon, 0.9)))

    # Disease pressure
    disease = _clamp(ctx.wetness_risk * 62 + max(0, ctx.humidity - 70) * 1.1 +
                     (14 if 18 <= ctx.air_temp <= 27 else 0))
    risks.append(RiskItem(
        hazard="disease", label=t("risk.disease.label"), level=_level(disease), score=disease,
        trend=Trend.RISING if ctx.humidity_trend == Trend.RISING else Trend.STABLE,
        horizon=t("risk.horizon", n=horizon),
        why=t("risk.disease.why", humidity=ctx.humidity, air_temp=ctx.air_temp,
              wetness=ctx.wetness_risk, dew_point=ctx.dew_point),
        drivers=[Evidence(key="humidity", label=t("ev.humidity"), value=f"{ctx.humidity}%"),
                 Evidence(key="dew_point", label=t("ev.dew_point"), value=f"{ctx.dew_point}°C",
                          source=DataSource.DERIVED),
                 Evidence(key="wetness", label=t("ev.wetness"), value=f"{ctx.wetness_risk}",
                          source=DataSource.DERIVED)],
        action=t("risk.disease.action"),
        confidence=0.72, forecast=_decay(disease, horizon, 0.4)))

    # Irrigation system risk
    irrigation = _clamp(max(0, f["threshold_pct"] - ctx.soil_moisture) * 6 +
                        (30 if ctx.stale_minutes > 90 else 0) + len(ctx.warnings) * 14)
    risks.append(RiskItem(
        hazard="irrigation", label=t("risk.irrigation.label"),
        level=_level(irrigation), score=irrigation, trend=Trend.STABLE,
        horizon=t("risk.horizon", n=horizon),
        why=t("risk.irrigation.why", gap=round(f["threshold_pct"] - ctx.soil_moisture, 1),
              minutes=int(ctx.stale_minutes)),
        drivers=[Evidence(key="data_freshness", label=t("ev.data_freshness"), value=f"{int(ctx.stale_minutes)} min"),
                 Evidence(key="sensor_faults", label=t("ev.sensor_faults"), value=str(len(ctx.warnings)))],
        action=t("risk.irrigation.action"),
        confidence=0.86, forecast=_decay(irrigation, horizon, -1.2)))

    overall = _clamp(max(r.score for r in risks) * 0.62 +
                     sum(r.score for r in risks) / len(risks) * 0.38)
    return RiskForecast(
        field_id=ctx.field_id, field_name=ctx.name, overall_level=_level(overall),
        overall_score=overall, horizon_days=horizon, days=days,
        risks=sorted(risks, key=lambda r: r.score, reverse=True), method=METHOD)


def next_days(count: int = 7) -> list[str]:
    base = now()
    return [(base + timedelta(days=i)).strftime("%a") for i in range(count)]
