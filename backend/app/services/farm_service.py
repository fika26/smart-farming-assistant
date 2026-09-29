"""Assembles every API response from FieldContext + the intelligence layer."""
from __future__ import annotations

import hashlib
from datetime import timedelta

from app.core.config import settings
from app.core.errors import NotFoundError
from app.core.time import humanize_since, now
from app.domain.catalog import (DEVICES, FARM, FIELDS, MEASURED_TYPES, OPTIMAL_RANGES,
                                SENSOR_SPECS, device_for_field, field_by_id, sensor_id,
                                sown_on)
from app.domain.enums import (AlertStatus, DataSource, DeviceStatus, IrrigationState,
                              ReadingStatus, RiskLevel, SensorType, Severity, Trend)
from app.i18n import t, term
from app.intelligence import advisory, derive, forecast, rules
from app.mock.generators import make_hourly_forecast, scenario_config
from app.schemas.agronomy import (Action, Alert, AnalyticsResponse, CropHealth,
                                  CropHealthIndicator, DashboardSnapshot, FieldDetail,
                                  FieldSummary, Insight, Notification, ReportItem,
                                  RiskForecast, SoilStatus, WeatherSummary)
from app.schemas.common import MetricSummary, Series, TrendPoint
from app.schemas.hardware import DeviceInfo, SensorSummary
from app.services.container import get_repository
from app.services.context import build_context

SERIES_LABELS = {
    SensorType.SOIL_MOISTURE: ("soil_moisture", "Soil moisture", "%"),
    SensorType.DS18B20_TEMPERATURE: ("soil_temperature", "Soil temperature", "°C"),
    SensorType.SHT31_TEMPERATURE: ("air_temperature", "Air temperature", "°C"),
    SensorType.SHT31_HUMIDITY: ("humidity", "Humidity", "%RH"),
    SensorType.BH1750_LIGHT: ("light", "Light intensity", "lux"),
}


# --------------------------------------------------------------------------- helpers
def _repo():
    repo = get_repository()
    repo.refresh_if_stale()
    return repo


def _contexts() -> list:
    repo = _repo()
    return [build_context(repo, f) for f in FIELDS]


def _context(field_id: str):
    field = field_by_id(field_id)
    if not field:
        raise NotFoundError("Field", field_id)
    return build_context(_repo(), field)


def _series_for(ctx, stype: SensorType, hours: int, bucket: int = 60) -> Series:
    key, _label, unit = SERIES_LABELS[stype]
    label = t(f"series.{key}")
    rows = _repo().series_for(ctx.field_id, stype, hours=hours, bucket_minutes=bucket)
    return Series(key=key, label=label, unit=unit, source=DataSource.MEASURED,
                  points=[TrendPoint(t=r["timestamp"], v=round(r["value"], 2)) for r in rows])


def _status_for(value: float | None, low: float, high: float) -> str:
    if value is None:
        return "critical"
    if value < low * 0.85 or value > high * 1.15:
        return "critical"
    if value < low or value > high:
        return "warning"
    if value < low * 1.08 or value > high * 0.92:
        return "watch"
    return "normal"


def _health_score(ctx) -> int:
    f = ctx.field
    score = 100.0
    if ctx.soil_moisture < f["refill_point_pct"]:
        score -= 30
    elif ctx.soil_moisture < f["threshold_pct"]:
        score -= 16
    elif ctx.soil_moisture > f["field_capacity_pct"] * 1.04:
        score -= 12
    score -= max(0, ctx.t_max - 33) * 2.6
    score -= max(0, ctx.vpd - 1.5) * 8
    score -= ctx.wetness_risk * 14
    score -= max(0, 15 - ctx.dli) * 1.1
    score -= len(ctx.warnings) * 6
    if ctx.stale_minutes > 90:
        score -= 8
    return int(max(18, min(100, round(score))))


def _health_label(score: int) -> str:
    if score >= 85:
        return t("health.healthy")
    if score >= 70:
        return t("health.stable")
    if score >= 55:
        return t("health.attention")
    return t("health.at_risk")


def _irrigation_state(ctx) -> IrrigationState:
    f = ctx.field
    if ctx.last_irrigation and (now() - ctx.last_irrigation) < timedelta(hours=2):
        return IrrigationState.RUNNING
    if ctx.soil_moisture <= f["threshold_pct"]:
        return IrrigationState.RECOMMENDED
    if ctx.soil_moisture <= f["threshold_pct"] * 1.12:
        return IrrigationState.SCHEDULED
    return IrrigationState.IDLE


def _field_alerts(ctx) -> list[Alert]:
    return rules.sort_alerts(rules.evaluate(ctx))


def _weather_for(ctx) -> WeatherSummary:
    days = make_hourly_forecast(ctx.air_temp, ctx.humidity, settings.mock_scenario)
    risk = forecast.build_risk(ctx, days)
    by_hazard = {r.hazard: r for r in risk.risks}
    implication = t("weather.impl.default", et0=ctx.et0, moisture=ctx.soil_moisture,
                    field=ctx.name)
    if ctx.t_max >= 34:
        implication = t("weather.impl.heat", t_max=ctx.t_max, vpd=ctx.vpd,
                        crop=term(ctx.crop, lower=True), stage=term(ctx.stage, lower=True))
    elif ctx.wetness_risk >= 0.6:
        implication = t("weather.impl.wet", humidity=ctx.humidity, air_temp=ctx.air_temp)
    action = (t("weather.action.heat") if ctx.t_max >= 34
              else t("weather.action.wet") if ctx.wetness_risk >= 0.6
              else t("weather.action.ok"))

    hourly = [_series_for(ctx, SensorType.SHT31_TEMPERATURE, 24, 60),
              _series_for(ctx, SensorType.SHT31_HUMIDITY, 24, 60),
              _series_for(ctx, SensorType.BH1750_LIGHT, 24, 60)]

    condition = t("weather.cond.clear" if ctx.light > 45000 else
                  "weather.cond.partly" if ctx.light > 12000 else
                  "weather.cond.overcast" if ctx.light > 400 else "weather.cond.night")
    return WeatherSummary(
        field_id=ctx.field_id, location=FARM["location"],
        temperature_c=ctx.air_temp, feels_like_c=ctx.heat_index, humidity_pct=ctx.humidity,
        light_lux=ctx.light, vpd_kpa=ctx.vpd, dew_point_c=ctx.dew_point, condition=condition,
        wind_note=t("weather.wind"),
        heat_risk=by_hazard["heat"].level, drought_risk=by_hazard["drought"].level,
        rain_risk=by_hazard["flood"].level,
        agricultural_implication=implication, recommended_action=action,
        forecast=days, hourly=hourly)


def _soil_for(ctx) -> SoilStatus:
    f = ctx.field
    state = _irrigation_state(ctx)
    depth = derive.irrigation_depth_mm(ctx.soil_moisture, f["field_capacity_pct"])
    if ctx.soil_moisture <= f["refill_point_pct"]:
        recommendation = t("soil.rec.critical", depth=depth, refill=f["refill_point_pct"])
        insight = t("soil.insight.low")
    elif ctx.soil_moisture <= f["threshold_pct"]:
        recommendation = t("soil.rec.low", depth=depth)
        insight = t("soil.insight.low")
    elif ctx.soil_moisture > f["field_capacity_pct"] * 1.04:
        recommendation = t("soil.rec.saturated")
        insight = t("soil.insight.saturated")
    else:
        recommendation = t("soil.rec.ok")
        insight = t("soil.insight.ok")

    rows = _repo().series_for(ctx.field_id, SensorType.SOIL_MOISTURE, hours=12)
    recent = [{"timestamp": r["timestamp"], "value": round(r["value"], 1),
               "raw_value": r.get("raw_value"), "unit": r["unit"], "status": r["status"]}
              for r in rows[-8:][::-1]]

    baseline_water = 100.0
    saved = max(0.0, min(38.0, (100 - ctx.depletion) * 0.24 + (8 if f["irrigation_type"] == "Drip" else 0)))

    return SoilStatus(
        field_id=ctx.field_id, field_name=ctx.name, moisture_pct=ctx.soil_moisture,
        moisture_status=_status_for(ctx.soil_moisture, f["threshold_pct"], f["field_capacity_pct"]),
        threshold_pct=f["threshold_pct"], refill_point_pct=f["refill_point_pct"],
        field_capacity_pct=f["field_capacity_pct"], soil_temp_c=ctx.soil_temp,
        depletion_pct=ctx.depletion, et0_mm_day=ctx.et0, irrigation_state=state,
        recommendation=recommendation, recommended_depth_mm=depth,
        recommended_window=t("soil.window"),
        water_saved_pct=round(saved, 1), last_irrigation=ctx.last_irrigation,
        last_irrigation_human=humanize_since(ctx.last_irrigation) if ctx.last_irrigation else None,
        insight=insight, recent_readings=recent,
        series=[_series_for(ctx, SensorType.SOIL_MOISTURE, 72, 60),
                _series_for(ctx, SensorType.DS18B20_TEMPERATURE, 72, 60)])


def _crop_health_for(ctx) -> CropHealth:
    f = ctx.field
    score = _health_score(ctx)
    observed = [
        CropHealthIndicator(label="Root-zone moisture", value=f"{ctx.soil_moisture}%",
                            status=_status_for(ctx.soil_moisture, f["threshold_pct"],
                                               f["field_capacity_pct"]),
                            source=DataSource.MEASURED,
                            note="Capacitive probe at 15 cm depth"),
        CropHealthIndicator(label="Canopy temperature proxy", value=f"{ctx.air_temp}°C",
                            status=_status_for(ctx.air_temp, 18, 33), source=DataSource.MEASURED,
                            note="SHT31 at canopy level"),
        CropHealthIndicator(label="Daily light integral", value=f"{ctx.dli} mol·m⁻²·d⁻¹",
                            status="normal" if ctx.dli >= 15 else "warning",
                            source=DataSource.DERIVED, note="Integrated from BH1750 lux"),
        CropHealthIndicator(label="Growing degree days", value=f"{int(ctx.gdd_total)} GDD",
                            status="normal", source=DataSource.DERIVED,
                            note=f"Base {f['base_temp_c']}°C since sowing"),
    ]
    risk = [
        CropHealthIndicator(label="Fungal infection pressure", value=f"{ctx.wetness_risk}",
                            status="critical" if ctx.wetness_risk >= 0.7 else
                                   "warning" if ctx.wetness_risk >= 0.5 else "normal",
                            source=DataSource.DERIVED,
                            note="RH-hours proxy — no leaf-wetness sensor fitted"),
        CropHealthIndicator(label="Heat stress index", value=f"{ctx.heat_index}°C",
                            status="critical" if ctx.heat_index >= 38 else
                                   "warning" if ctx.heat_index >= 34 else "normal",
                            source=DataSource.DERIVED),
        CropHealthIndicator(label="Water deficit", value=f"{ctx.depletion}%",
                            status="critical" if ctx.depletion >= 95 else
                                   "warning" if ctx.depletion >= 70 else "normal",
                            source=DataSource.DERIVED),
    ]
    changes = [
        f"Soil moisture moved {ctx.moisture_delta_24h:+.1f}% in the last 24 hours "
        f"({ctx.moisture_trend.value}).",
        f"Air temperature moved {ctx.temp_delta_24h:+.1f}°C ({ctx.temp_trend.value}).",
        f"Humidity moved {ctx.humidity_delta_24h:+.1f}% ({ctx.humidity_trend.value}).",
    ]
    recs = [a.action for a in _field_alerts(ctx)[:3]] or [
        "Continue the current irrigation and scouting schedule.",
        "Log a field observation to strengthen the advisory baseline."]

    return CropHealth(
        field_id=ctx.field_id, field_name=ctx.name, crop=ctx.crop, growth_stage=ctx.stage,
        days_after_sowing=f["days_after_sowing"], gdd_accumulated=ctx.gdd_total,
        health_score=score, health_label=_health_label(score),
        trend=Trend.FALLING if ctx.moisture_trend == Trend.FALLING else Trend.STABLE,
        observed_indicators=observed, risk_indicators=risk, recent_changes=changes,
        recommendations=recs,
        series=[_series_for(ctx, SensorType.SOIL_MOISTURE, 168, 240),
                _series_for(ctx, SensorType.SHT31_TEMPERATURE, 168, 240),
                _series_for(ctx, SensorType.SHT31_HUMIDITY, 168, 240)],
        disclaimer=("Prototype insight. Crop health is scored by a transparent rule model over "
                    "sensor-derived agronomic indicators. No validated crop-health machine-"
                    "learning model is in use."))


def _field_summary(ctx) -> FieldSummary:
    f = ctx.field
    score = _health_score(ctx)
    alerts = _field_alerts(ctx)
    days = make_hourly_forecast(ctx.air_temp, ctx.humidity, settings.mock_scenario)
    risk = forecast.build_risk(ctx, days)
    return FieldSummary(
        id=f["id"], name=f["name"], crop=f["crop"], variety=f["variety"], area_ha=f["area_ha"],
        sown_on=sown_on(f["days_after_sowing"]), growth_stage=ctx.stage,
        days_after_sowing=f["days_after_sowing"], health_score=score,
        health_label=_health_label(score), soil_moisture=ctx.soil_moisture,
        soil_moisture_status=_status_for(ctx.soil_moisture, f["threshold_pct"],
                                         f["field_capacity_pct"]),
        irrigation_state=_irrigation_state(ctx), risk_level=risk.overall_level,
        top_risk=risk.risks[0].label, active_alerts=len(alerts),
        last_reading_at=ctx.last_reading_at,
        last_reading_human=humanize_since(ctx.last_reading_at) if ctx.last_reading_at else None,
        soil_type=f["soil_type"], irrigation_type=f["irrigation_type"],
        latitude=f["latitude"], longitude=f["longitude"], boundary=f["boundary"],
        crop_label=term(f["crop"]), growth_stage_label=term(ctx.stage))


def _sensor_summaries(ctx) -> list[SensorSummary]:
    device = device_for_field(ctx.field_id)
    out: list[SensorSummary] = []
    for stype in MEASURED_TYPES:
        spec = SENSOR_SPECS[stype]
        row = ctx.latest.get(stype)
        rows = ctx.rows.get(stype, [])
        values = [r["value"] for r in rows]
        lo, hi = OPTIMAL_RANGES[stype]
        if stype == SensorType.BH1750_LIGHT and row and row["value"] < 400:
            lo = 0.0
        delta = round(values[-1] - values[0], 2) if len(values) > 2 else None
        status = ReadingStatus(row["status"]) if row else ReadingStatus.STALE
        healthy = status == ReadingStatus.OK and ctx.stale_minutes < 90
        health_score = 100.0 if healthy else 62.0
        if device["status"] == "degraded":
            health_score -= 18
        if device["rssi"] < -80:
            health_score -= 8
        out.append(SensorSummary(
            sensor_id=sensor_id(ctx.field_id, stype), field_id=ctx.field_id, field_name=ctx.name,
            device_id=device["device_id"], sensor_type=stype, label=spec["label"],
            hardware=spec["hardware"], placement=spec["placement"],
            value=round(row["value"], 2) if row else None, unit=spec["unit"], status=status,
            health="healthy" if health_score >= 85 else "degraded" if health_score >= 60 else "fault",
            health_score=round(max(0, min(100, health_score)), 0),
            trend=derive.trend_of(values), delta_24h=delta,
            last_update=row["timestamp"] if row else None,
            last_update_human=humanize_since(row["timestamp"]) if row else None,
            optimal_min=lo, optimal_max=hi,
            battery_mv=device["battery_mv"], rssi=device["rssi"]))
    return out


def _metrics_for(ctx) -> list[MetricSummary]:
    f = ctx.field
    lo_m, hi_m = f["threshold_pct"], f["field_capacity_pct"]
    return [
        MetricSummary(key="soil_moisture", label=t("series.soil_moisture"), value=ctx.soil_moisture,
                      unit="%", status=_status_for(ctx.soil_moisture, lo_m, hi_m),
                      trend=ctx.moisture_trend, delta_24h=ctx.moisture_delta_24h,
                      optimal_min=lo_m, optimal_max=hi_m, source=DataSource.MEASURED,
                      updated_at=ctx.last_reading_at,
                      caption=f"Refill point {f['refill_point_pct']}%"),
        MetricSummary(key="air_temperature", label=t("series.air_temperature"), value=ctx.air_temp,
                      unit="°C", status=_status_for(ctx.air_temp, 18, 33), trend=ctx.temp_trend,
                      delta_24h=ctx.temp_delta_24h, optimal_min=18, optimal_max=33,
                      source=DataSource.MEASURED, updated_at=ctx.last_reading_at,
                      caption=f"Today {ctx.t_min}°C - {ctx.t_max}°C"),
        MetricSummary(key="humidity", label=t("series.humidity"), value=ctx.humidity, unit="%RH",
                      status=_status_for(ctx.humidity, 45, 75), trend=ctx.humidity_trend,
                      delta_24h=ctx.humidity_delta_24h, optimal_min=45, optimal_max=75,
                      source=DataSource.MEASURED, updated_at=ctx.last_reading_at,
                      caption=f"Dew point {ctx.dew_point}°C"),
        MetricSummary(key="light", label=t("series.light"), value=ctx.light, unit="lux",
                      status="normal" if ctx.light < 400 else _status_for(ctx.light, 8000, 60000),
                      trend=ctx.light_trend, optimal_min=8000, optimal_max=60000,
                      source=DataSource.MEASURED, updated_at=ctx.last_reading_at,
                      caption=("Night — DLI " if ctx.light < 400 else "DLI ")
                              + f"{ctx.dli} mol·m⁻²·d⁻¹"),
        MetricSummary(key="soil_temperature", label=t("series.soil_temperature"), value=ctx.soil_temp,
                      unit="°C", status=_status_for(ctx.soil_temp, 18, 30), trend=Trend.STABLE,
                      optimal_min=18, optimal_max=30, source=DataSource.MEASURED,
                      updated_at=ctx.last_reading_at, caption="DS18B20 at 15 cm"),
        MetricSummary(key="vpd", label=t("ev.vpd"), value=ctx.vpd, unit="kPa",
                      status=_status_for(ctx.vpd, 0.4, 1.6), trend=Trend.STABLE,
                      optimal_min=0.4, optimal_max=1.6, source=DataSource.DERIVED,
                      updated_at=ctx.last_reading_at, caption=f"ET₀ {ctx.et0} mm/day"),
    ]


# --------------------------------------------------------------------------- public API
def meta_info() -> dict:
    cfg = scenario_config(settings.mock_scenario)
    return {"app": settings.app_name, "version": settings.version, "environment": settings.app_env,
            "data_source": settings.data_source, "simulated": settings.is_simulated,
            "scenario": settings.mock_scenario, "scenario_label": cfg["label"],
            "repository": settings.repository, "farm": FARM,
            "rule_version": rules.RULE_VERSION, "derive_version": derive.VERSION}


def get_dashboard(field_id: str | None = None) -> DashboardSnapshot:
    contexts = _contexts()
    primary = next((c for c in contexts if c.field_id == field_id), None) or contexts[0]

    all_alerts: list[Alert] = []
    all_actions: list[Action] = []
    summaries: list[FieldSummary] = []
    for ctx in contexts:
        alerts = _field_alerts(ctx)
        all_alerts.extend(alerts)
        all_actions.extend(advisory.build_actions(ctx, alerts))
        summaries.append(_field_summary(ctx))

    all_alerts = rules.sort_alerts(all_alerts)
    all_actions = advisory.sort_actions(all_actions)

    scores = [s.health_score for s in summaries]
    farm_score = int(round(sum(scores) / len(scores)))
    needing = sum(1 for s in summaries if s.health_score < 75 or s.active_alerts > 0)

    critical = sum(1 for a in all_alerts if a.severity == Severity.CRITICAL)
    if critical:
        status_line = t("status.critical", count=critical, field=all_alerts[0].field_name)
    elif all_alerts:
        status_line = t("status.open", count=len(all_alerts), fields=needing,
                        title=all_alerts[0].title.lower())
    else:
        status_line = t("status.clear")

    sensors = []
    for ctx in contexts:
        sensors.extend([s.model_dump() for s in _sensor_summaries(ctx)])

    days = make_hourly_forecast(primary.air_temp, primary.humidity, settings.mock_scenario)
    device_health = _device_health_summary()

    return DashboardSnapshot(
        farm_name=FARM["name"], location=FARM["location"], generated_at=now(),
        farm_health_score=farm_score, farm_health_label=_health_label(farm_score),
        farm_status_line=status_line, fields_total=len(summaries),
        fields_needing_attention=needing, metrics=_metrics_for(primary),
        alerts=all_alerts[:8], actions=all_actions[:6],
        insights=advisory.build_insights(primary)[:4], fields=summaries, sensors=sensors,
        soil=_soil_for(primary), weather=_weather_for(primary),
        risk=forecast.build_risk(primary, days),
        series=[_series_for(primary, SensorType.SOIL_MOISTURE, 48, 60),
                _series_for(primary, SensorType.SHT31_TEMPERATURE, 48, 60),
                _series_for(primary, SensorType.SHT31_HUMIDITY, 48, 60),
                _series_for(primary, SensorType.BH1750_LIGHT, 48, 60)],
        device_health=device_health)


def get_alerts(field_id: str | None = None, severity: str | None = None) -> list[Alert]:
    out: list[Alert] = []
    for ctx in _contexts():
        if field_id and ctx.field_id != field_id:
            continue
        out.extend(_field_alerts(ctx))
    if severity:
        out = [a for a in out if a.severity.value == severity]
    return rules.sort_alerts(out)


def get_actions(field_id: str | None = None) -> list[Action]:
    out: list[Action] = []
    for ctx in _contexts():
        if field_id and ctx.field_id != field_id:
            continue
        out.extend(advisory.build_actions(ctx, _field_alerts(ctx)))
    return advisory.sort_actions(out)


def get_fields() -> list[FieldSummary]:
    return [_field_summary(ctx) for ctx in _contexts()]


def get_field_detail(field_id: str) -> FieldDetail:
    ctx = _context(field_id)
    alerts = _field_alerts(ctx)
    return FieldDetail(
        field=_field_summary(ctx), metrics=_metrics_for(ctx),
        series=[_series_for(ctx, SensorType.SOIL_MOISTURE, 168, 180),
                _series_for(ctx, SensorType.SHT31_TEMPERATURE, 168, 180),
                _series_for(ctx, SensorType.SHT31_HUMIDITY, 168, 180),
                _series_for(ctx, SensorType.BH1750_LIGHT, 168, 180)],
        sensors=[s.model_dump() for s in _sensor_summaries(ctx)],
        alerts=alerts, actions=advisory.build_actions(ctx, alerts),
        soil=_soil_for(ctx), weather=_weather_for(ctx), crop_health=_crop_health_for(ctx))


def get_sensors(field_id: str | None = None) -> list[SensorSummary]:
    out: list[SensorSummary] = []
    for ctx in _contexts():
        if field_id and ctx.field_id != field_id:
            continue
        out.extend(_sensor_summaries(ctx))
    return out


def get_sensor(sensor_id_value: str, hours: int = 72) -> dict:
    for ctx in _contexts():
        for summary in _sensor_summaries(ctx):
            if summary.sensor_id == sensor_id_value:
                stype = summary.sensor_type
                key, label, unit = SERIES_LABELS[stype]
                rows = _repo().series_for(ctx.field_id, stype, hours=hours, bucket_minutes=60)
                raw = [r for r in _repo().series_for(ctx.field_id, stype, hours=12)][-12:][::-1]
                return {
                    "sensor": summary.model_dump(),
                    "series": Series(key=key, label=label, unit=unit,
                                     points=[TrendPoint(t=r["timestamp"], v=round(r["value"], 2))
                                             for r in rows]).model_dump(),
                    "recent_readings": [
                        {"timestamp": r["timestamp"], "value": round(r["value"], 2),
                         "raw_value": r.get("raw_value"), "raw_unit": r.get("raw_unit"),
                         "unit": r["unit"], "status": r["status"]} for r in raw],
                }
    raise NotFoundError("Sensor", sensor_id_value)


def _device_health_summary() -> dict:
    devices = get_devices()
    return {
        "total": len(devices),
        "online": sum(1 for d in devices if d.status == DeviceStatus.ONLINE),
        "degraded": sum(1 for d in devices if d.status == DeviceStatus.DEGRADED),
        "offline": sum(1 for d in devices if d.status == DeviceStatus.OFFLINE),
        "buffered_packets": sum(d.buffered_packets for d in devices),
        "uplink_rate": round(
            sum(d.packets_24h for d in devices) /
            max(1, sum(d.expected_packets_24h for d in devices)) * 100, 1),
    }


def get_devices() -> list[DeviceInfo]:
    out: list[DeviceInfo] = []
    for ctx in _contexts():
        d = device_for_field(ctx.field_id)
        expected = int(24 * 60 / settings.sample_interval_minutes)
        degraded = d["status"] == "degraded"
        packets = expected - (7 if degraded else 1)
        battery_pct = int(max(0, min(100, (d["battery_mv"] - 3200) / (4200 - 3200) * 100)))
        last_seen = ctx.last_reading_at or now()
        out.append(DeviceInfo(
            device_id=d["device_id"], name=d["name"], field_id=ctx.field_id, field_name=ctx.name,
            status=DeviceStatus(d["status"]), firmware=d["firmware"],
            battery_mv=d["battery_mv"], battery_pct=battery_pct, rssi=d["rssi"],
            last_seen=last_seen, last_seen_human=humanize_since(last_seen),
            uptime_hours=round(settings.history_days * 24 * (0.94 if degraded else 0.995), 1),
            buffered_packets=6 if degraded else 0, packets_24h=packets,
            expected_packets_24h=expected,
            sensors=[sensor_id(ctx.field_id, s) for s in MEASURED_TYPES],
            latitude=ctx.field["latitude"], longitude=ctx.field["longitude"]))
    return out


def get_soil(field_id: str | None = None) -> SoilStatus:
    ctx = _context(field_id) if field_id else _contexts()[0]
    return _soil_for(ctx)


def get_weather(field_id: str | None = None) -> WeatherSummary:
    ctx = _context(field_id) if field_id else _contexts()[0]
    return _weather_for(ctx)


def get_crop_health(field_id: str | None = None) -> CropHealth:
    ctx = _context(field_id) if field_id else _contexts()[0]
    return _crop_health_for(ctx)


def get_insights(field_id: str | None = None) -> list[Insight]:
    if field_id:
        return advisory.build_insights(_context(field_id))
    out: list[Insight] = []
    for ctx in _contexts():
        out.extend(advisory.build_insights(ctx))
    order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.INFO: 3}
    return sorted(out, key=lambda i: order[i.severity])


def get_risk(field_id: str | None = None) -> RiskForecast:
    ctx = _context(field_id) if field_id else _contexts()[0]
    days = make_hourly_forecast(ctx.air_temp, ctx.humidity, settings.mock_scenario)
    return forecast.build_risk(ctx, days)


def get_analytics(field_id: str | None = None, range_days: int = 14) -> AnalyticsResponse:
    ctx = _context(field_id) if field_id else _contexts()[0]
    hours = min(range_days, settings.history_days) * 24
    series = [_series_for(ctx, s, hours, 360) for s in MEASURED_TYPES]

    water_baseline = round(ctx.field["area_ha"] * 42_000 / 1000, 1)
    water_used = round(water_baseline * (1 - _soil_for(ctx).water_saved_pct / 100), 1)
    change = round((water_used / water_baseline - 1) * 100, 1)
    resource_usage = [
        {"key": "water", "label": t("an.water.label"), "value": water_used, "unit": "kL",
         "baseline": water_baseline, "change_pct": change, "note": t("an.water.note")},
        {"key": "events", "label": t("an.events.label"), "value": max(1, int(range_days / 2.4)),
         "unit": t("an.unit.cycles"), "baseline": max(1, int(range_days / 1.8)),
         "change_pct": -24.0, "note": t("an.events.note")},
        {"key": "energy", "label": t("an.energy.label"), "value": round(water_used * 0.34, 1),
         "unit": "kWh", "baseline": round(water_baseline * 0.34, 1), "change_pct": change,
         "note": t("an.energy.note")},
        {"key": "cost", "label": t("an.cost.label"), "value": round(water_used * 18 + 2400, 0),
         "unit": "₹", "baseline": round(water_baseline * 18 + 2400, 0), "change_pct": change,
         "note": t("an.cost.note")},
    ]
    score = _health_score(ctx)
    yield_metrics = [
        {"key": "yield", "label": t("an.yield.label"),
         "value": round(ctx.field["area_ha"] * 22 * score / 100, 1),
         "unit": "t", "note": t("an.yield.note")},
        {"key": "yield_vs", "label": t("an.yield_vs.label"), "value": round(score / 100 * 112 - 6, 1),
         "unit": "%", "note": t("an.yield_vs.note")},
        {"key": "productivity", "label": t("an.productivity.label"),
         "value": round(ctx.field["area_ha"] * 22 * score / 100 / max(1, water_used), 2),
         "unit": "t/kL", "note": t("an.productivity.note")},
        {"key": "stress", "label": t("an.stress.label"),
         "value": sum(1 for _ in range(range_days) if score < 75),
         "unit": t("an.unit.days"), "note": t("an.stress.note")},
    ]
    highlights = [
        t("an.hl.moisture", threshold=ctx.field["threshold_pct"],
          trend=term(ctx.moisture_trend.value)),
        t("an.hl.heat", t_max=ctx.t_max, heat_index=ctx.heat_index),
        t("an.hl.light", dli=ctx.dli),
        t("an.hl.water", saved=_soil_for(ctx).water_saved_pct),
    ]
    return AnalyticsResponse(
        range_days=range_days, series=series, resource_usage=resource_usage,
        yield_metrics=yield_metrics,
        crop_health_trend=[_series_for(ctx, SensorType.SOIL_MOISTURE, hours, 720),
                           _series_for(ctx, SensorType.SHT31_HUMIDITY, hours, 720)],
        highlights=highlights,
        disclaimer=t("an.disclaimer"),
        metrics=[m for m in _metrics_for(ctx) if m.key != "vpd"])


def get_reports() -> list[ReportItem]:
    base = now()
    specs = [
        ("Weekly field intelligence summary", "Last 7 days", "Summary",
         "Alerts, irrigation events and sensor uptime across all three fields."),
        ("Irrigation and water-use record", "Season to date", "Resource",
         "Threshold-triggered irrigation cycles with estimated volumes per field."),
        ("Sensor uptime and data quality", "Last 30 days", "Device",
         "Uplink rate, buffered packets and per-channel fault counts."),
        ("Crop health and stress log", "Season to date", "Agronomy",
         "Health score history with the stress events that drove each change."),
        ("Risk and early-warning digest", "Last 14 days", "Risk",
         "Multi-hazard risk scores with the drivers behind each elevation."),
    ]
    out = []
    for i, (title, period, rtype, summary) in enumerate(specs):
        out.append(ReportItem(
            id="rep-" + hashlib.sha1(title.encode()).hexdigest()[:8], title=title, period=period,
            type=rtype, generated_at=base - timedelta(days=i, hours=3),
            size_kb=180 + i * 47, summary=summary, formats=["PDF", "CSV"]))
    return out


def get_notifications() -> list[Notification]:
    out: list[Notification] = []
    for alert in get_alerts()[:6]:
        out.append(Notification(
            id="ntf-" + alert.id[4:], title=alert.title,
            body=f"{alert.field_name}: {alert.what}",
            channel="In-app" if alert.severity != Severity.CRITICAL else "SMS + In-app",
            severity=alert.severity, created_at=alert.opened_at,
            created_at_human=alert.opened_at_human,
            read=alert.severity in (Severity.MEDIUM, Severity.INFO)))
    devices = get_devices()
    for d in devices:
        if d.status != DeviceStatus.ONLINE:
            out.append(Notification(
                id=f"ntf-dev-{d.device_id}", title=f"{d.name} is {d.status.value}",
                body=f"{d.buffered_packets} reading(s) buffered on the node; "
                     f"signal {d.rssi} dBm, battery {d.battery_pct}%.",
                channel="In-app", severity=Severity.MEDIUM, created_at=d.last_seen,
                created_at_human=d.last_seen_human, read=False))
    return out


def get_map() -> dict:
    fields = get_fields()
    devices = get_devices()
    return {
        "farm": FARM,
        "fields": [f.model_dump() for f in fields],
        "devices": [d.model_dump() for d in devices],
        "alerts": [a.model_dump() for a in get_alerts()],
        "bounds": {
            "min_lat": min(f.latitude for f in fields) - 0.004,
            "max_lat": max(f.latitude for f in fields) + 0.004,
            "min_lng": min(f.longitude for f in fields) - 0.004,
            "max_lng": max(f.longitude for f in fields) + 0.004,
        },
    }


def context_for(field_id: str | None):
    return _context(field_id) if field_id else _contexts()[0]


def alerts_and_actions(ctx):
    alerts = _field_alerts(ctx)
    return alerts, advisory.build_actions(ctx, alerts)
