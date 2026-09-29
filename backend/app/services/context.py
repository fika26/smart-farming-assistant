"""FieldContext — one normalized, derived view of a field, built once and shared by
every rule, insight, forecast and API response."""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from datetime import timedelta

from app.core.time import humanize_since, now
from app.domain.catalog import growth_stage, sown_on
from app.domain.enums import SensorType, Trend
from app.intelligence import derive


@dataclass
class FieldContext:
    field: dict
    latest: dict
    rows: dict
    soil_moisture: float = 0.0
    soil_temp: float = 0.0
    air_temp: float = 0.0
    humidity: float = 0.0
    light: float = 0.0
    vpd: float = 0.0
    dew_point: float = 0.0
    heat_index: float = 0.0
    dli: float = 0.0
    et0: float = 0.0
    gdd_today: float = 0.0
    gdd_total: float = 0.0
    depletion: float = 0.0
    wetness_risk: float = 0.0
    t_min: float = 0.0
    t_max: float = 0.0
    moisture_trend: Trend = Trend.STABLE
    temp_trend: Trend = Trend.STABLE
    humidity_trend: Trend = Trend.STABLE
    light_trend: Trend = Trend.STABLE
    moisture_delta_24h: float = 0.0
    temp_delta_24h: float = 0.0
    humidity_delta_24h: float = 0.0
    last_reading_at: object = None
    last_irrigation: object = None
    stale_minutes: float = 0.0
    warnings: list[str] = dc_field(default_factory=list)

    @property
    def field_id(self) -> str:
        return self.field["id"]

    @property
    def name(self) -> str:
        return self.field["name"]

    @property
    def crop(self) -> str:
        return self.field["crop"]

    @property
    def stage(self) -> str:
        return growth_stage(self.crop, self.field["days_after_sowing"])

    @property
    def sown_at(self):
        return sown_on(self.field["days_after_sowing"])


def _val(latest: dict, stype: SensorType, default: float = 0.0) -> float:
    row = latest.get(stype)
    return float(row["value"]) if row else default


def _delta(rows: list[dict], hours: int = 24) -> float:
    if len(rows) < 2:
        return 0.0
    end = rows[-1]["timestamp"]
    past = [r for r in rows if r["timestamp"] <= end - timedelta(hours=hours)]
    ref = past[-1]["value"] if past else rows[0]["value"]
    return round(rows[-1]["value"] - ref, 2)


def build_context(repo, field: dict, hours: int = 72) -> FieldContext:
    latest = repo.latest_by_type(field["id"])
    rows: dict[SensorType, list[dict]] = {}
    for stype in (SensorType.SOIL_MOISTURE, SensorType.DS18B20_TEMPERATURE,
                  SensorType.SHT31_TEMPERATURE, SensorType.SHT31_HUMIDITY,
                  SensorType.BH1750_LIGHT):
        rows[stype] = repo.series_for(field["id"], stype, hours=hours)

    ctx = FieldContext(field=field, latest=latest, rows=rows)
    ctx.soil_moisture = round(_val(latest, SensorType.SOIL_MOISTURE), 1)
    ctx.soil_temp = round(_val(latest, SensorType.DS18B20_TEMPERATURE), 1)
    ctx.air_temp = round(_val(latest, SensorType.SHT31_TEMPERATURE), 1)
    ctx.humidity = round(_val(latest, SensorType.SHT31_HUMIDITY), 1)
    ctx.light = round(_val(latest, SensorType.BH1750_LIGHT), 0)

    ctx.vpd = derive.vpd_kpa(ctx.air_temp, ctx.humidity)
    ctx.dew_point = derive.dew_point_c(ctx.air_temp, ctx.humidity)
    ctx.heat_index = derive.heat_index_c(ctx.air_temp, ctx.humidity)
    ctx.wetness_risk = derive.leaf_wetness_risk(ctx.humidity, ctx.air_temp)

    t_min, t_max, _ = derive.daily_min_max(rows[SensorType.SHT31_TEMPERATURE])
    ctx.t_min, ctx.t_max = round(t_min, 1), round(t_max, 1)
    ctx.et0 = derive.et0_hargreaves((t_min + t_max) / 2, t_max, t_min)
    ctx.gdd_today = derive.gdd(t_max, t_min, field.get("base_temp_c", 10.0))
    ctx.gdd_total = round(ctx.gdd_today * field["days_after_sowing"] * 0.96, 0)

    lux_today = [r["value"] for r in rows[SensorType.BH1750_LIGHT]
                 if r["timestamp"] >= now() - timedelta(hours=24)]
    ctx.dli = derive.dli_mol_m2_day(lux_today, 30)

    ctx.depletion = derive.depletion_pct(
        ctx.soil_moisture, field["field_capacity_pct"], field["refill_point_pct"])

    ctx.moisture_trend = derive.trend_of([r["value"] for r in rows[SensorType.SOIL_MOISTURE]])
    ctx.temp_trend = derive.trend_of([r["value"] for r in rows[SensorType.SHT31_TEMPERATURE]])
    ctx.humidity_trend = derive.trend_of([r["value"] for r in rows[SensorType.SHT31_HUMIDITY]])
    ctx.light_trend = derive.trend_of([r["value"] for r in rows[SensorType.BH1750_LIGHT]])

    ctx.moisture_delta_24h = _delta(rows[SensorType.SOIL_MOISTURE])
    ctx.temp_delta_24h = _delta(rows[SensorType.SHT31_TEMPERATURE])
    ctx.humidity_delta_24h = _delta(rows[SensorType.SHT31_HUMIDITY])

    if latest:
        ctx.last_reading_at = max(r["timestamp"] for r in latest.values())
        ctx.stale_minutes = round((now() - ctx.last_reading_at).total_seconds() / 60, 1)
    ctx.last_irrigation = repo.last_irrigation(field["id"])

    for stype, row in latest.items():
        if row["status"] != "ok":
            ctx.warnings.append(f"{stype.value} reported {row['status']}")
    return ctx


def last_seen_human(ctx: FieldContext) -> str | None:
    return humanize_since(ctx.last_reading_at) if ctx.last_reading_at else None
