"""Physically plausible sensor simulation.

Signals are generated from simple agro-meteorological models (diurnal solar cycle,
lagged soil temperature, dew-point-bounded humidity, ET-driven moisture depletion)
rather than random noise, so the rule engine reacts the way it would to real hardware.
Deterministic for a given seed -> reproducible demos.
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta

from app.core.time import IST
from app.domain.catalog import SENSOR_SPECS, sensor_id
from app.domain.enums import ReadingStatus, SensorType

SCENARIOS = {
    "healthy_baseline": {"temp_offset": 0.0, "moisture_bias": 1.0, "rh_offset": 0, "cloud": 0.25,
                         "label": "Healthy baseline"},
    "drought_onset": {"temp_offset": 1.1, "moisture_bias": 0.72, "rh_offset": -10, "cloud": 0.08,
                      "label": "Drought onset"},
    "heat_wave": {"temp_offset": 6.5, "moisture_bias": 0.8, "rh_offset": -18, "cloud": 0.05,
                  "label": "Heat wave"},
    "heavy_rain": {"temp_offset": -3.0, "moisture_bias": 1.35, "rh_offset": 22, "cloud": 0.85,
                   "label": "Heavy rain / waterlogging"},
    "fungal_disease_window": {"temp_offset": -1.0, "moisture_bias": 1.1, "rh_offset": 20,
                              "cloud": 0.6, "label": "Fungal disease window"},
    "sensor_failure": {"temp_offset": 0.0, "moisture_bias": 0.95, "rh_offset": 0, "cloud": 0.3,
                       "label": "Sensor fault injection", "faults": True},
}

PROFILE_BIAS = {"drying": 0.78, "wet": 1.28, "healthy": 1.0}
MAX_LUX = 92000.0


def scenario_config(name: str) -> dict:
    return SCENARIOS.get(name, SCENARIOS["healthy_baseline"])


def _solar_factor(dt: datetime) -> float:
    """0 at night, peaks slightly after solar noon."""
    hour = dt.hour + dt.minute / 60
    sunrise, sunset = 6.1, 18.4
    if hour <= sunrise or hour >= sunset:
        return 0.0
    return max(0.0, math.sin(math.pi * (hour - sunrise) / (sunset - sunrise))) ** 1.15


def _seasonal_base(dt: datetime) -> float:
    """Telangana annual temperature swing, minimum in January."""
    doy = dt.timetuple().tm_yday
    return 26.5 + 5.0 * math.sin(2 * math.pi * (doy - 100) / 365)


def _dew_point(temp_c: float, rh: float) -> float:
    rh = max(1.0, min(100.0, rh))
    a, b = 17.62, 243.12
    gamma = math.log(rh / 100.0) + (a * temp_c) / (b + temp_c)
    return (b * gamma) / (a - gamma)


def _rh_from_dewpoint(temp_c: float, dew_c: float) -> float:
    a, b = 17.62, 243.12
    num = math.exp((a * dew_c) / (b + dew_c))
    den = math.exp((a * temp_c) / (b + temp_c))
    return max(8.0, min(99.0, 100.0 * num / den))


def _moisture_to_adc(pct: float) -> int:
    """Inverse of the capacitive probe calibration curve (dry=3200, wet=1450 counts)."""
    dry, wet = 3200, 1450
    frac = max(0.0, min(1.0, pct / 45.0))
    return int(round(dry - frac * (dry - wet)))


def generate_field_readings(
    field: dict,
    start: datetime,
    end: datetime,
    interval_minutes: int,
    seed: int,
    scenario: str,
) -> list[dict]:
    cfg = scenario_config(scenario)
    rng = random.Random(f"{seed}:{field['id']}:{scenario}")
    profile = PROFILE_BIAS.get(field.get("profile", "healthy"), 1.0)

    fc = field["field_capacity_pct"]
    moisture = fc * 0.92 * profile
    moisture = min(moisture, fc * 1.02)

    # per-day cloudiness gives multi-day weather texture
    cloud_by_day: dict[int, float] = {}
    readings: list[dict] = []
    cursor = start
    step = timedelta(minutes=interval_minutes)
    hours_per_step = interval_minutes / 60.0
    last_irrigation: datetime | None = None

    while cursor <= end:
        doy = cursor.timetuple().tm_yday
        if doy not in cloud_by_day:
            cloud_by_day[doy] = max(0.0, min(0.95, rng.gauss(cfg["cloud"], 0.16)))
        cloud = cloud_by_day[doy]

        solar = _solar_factor(cursor)
        lux = MAX_LUX * solar * (1 - 0.85 * cloud)
        lux = max(0.0, lux + rng.gauss(0, 380) * solar)

        base = _seasonal_base(cursor) + cfg["temp_offset"]
        swing = 7.4 * (1 - 0.45 * cloud)
        hour = cursor.hour + cursor.minute / 60
        air_temp = base + swing * math.sin(2 * math.pi * (hour - 9.5) / 24) + rng.gauss(0, 0.28)

        # humidity is derived from a slowly-varying dew point -> never contradicts temp
        dew = base - 9.5 + 5.5 * cloud + cfg["rh_offset"] * 0.22 + rng.gauss(0, 0.4)
        rh = _rh_from_dewpoint(air_temp, min(dew, air_temp - 0.4))

        # soil temperature: air temperature lagged ~4 h and damped by depth
        lag_hour = hour - 4.0
        soil_temp = (base - 1.2) + swing * 0.42 * math.sin(2 * math.pi * (lag_hour - 9.5) / 24)
        soil_temp += rng.gauss(0, 0.12)

        # ET-driven depletion (Hargreaves-flavoured): radiation + VPD
        svp = 0.6108 * math.exp(17.27 * air_temp / (air_temp + 237.3))
        avp = svp * rh / 100.0
        vpd = max(0.0, svp - avp)
        et_mm = (0.0023 * (lux / MAX_LUX) * (air_temp + 17.8) * 0.42 + 0.35 * vpd) * hours_per_step
        moisture -= et_mm * 0.55 / max(0.6, cfg["moisture_bias"])

        # irrigation / rainfall recharge
        refill = field["refill_point_pct"]
        drying = field.get("profile") == "drying"
        trigger = refill * (0.88 if drying else 0.98)
        if moisture < trigger:
            top_up = rng.uniform(2.4, 4.2) if drying else rng.uniform(6.0, 9.5)
            moisture = min(fc, moisture + top_up)
            last_irrigation = cursor
        if cloud > 0.72 and rng.random() < 0.05:
            moisture = min(fc * 1.08, moisture + rng.uniform(2.5, 6.0))
        moisture = max(refill * 0.7, min(fc * 1.12, moisture + rng.gauss(0, 0.06)))

        faults = cfg.get("faults", False)
        base_status = ReadingStatus.OK

        def add(stype: SensorType, value: float, raw: float | None = None,
                status: ReadingStatus = base_status) -> None:
            spec = SENSOR_SPECS[stype]
            readings.append({
                "sensor_id": sensor_id(field["id"], stype),
                "field_id": field["id"],
                "device_id": None,
                "sensor_type": stype,
                "value": round(value, 2),
                "unit": spec["unit"],
                "raw_value": raw,
                "raw_unit": spec["raw_unit"],
                "timestamp": cursor,
                "status": status,
            })

        moisture_status = base_status
        if faults and rng.random() < 0.03:
            moisture_status = ReadingStatus.SENSOR_ERROR

        add(SensorType.SOIL_MOISTURE, moisture, float(_moisture_to_adc(moisture)), moisture_status)
        add(SensorType.DS18B20_TEMPERATURE, soil_temp, round(soil_temp, 2))
        add(SensorType.SHT31_TEMPERATURE, air_temp, round(air_temp, 2))
        add(SensorType.SHT31_HUMIDITY, rh, round(rh, 2))
        add(SensorType.BH1750_LIGHT, lux, round(lux, 1))
        cursor += step

    if last_irrigation is None:
        last_irrigation = end - timedelta(hours=52)
    for r in readings:
        r["_last_irrigation"] = last_irrigation
    return readings


def make_hourly_forecast(base_temp: float, rh: float, scenario: str, days: int = 7) -> list[dict]:
    cfg = scenario_config(scenario)
    rng = random.Random(f"forecast:{scenario}:{days}")
    out = []
    day_names = ["Today", "Tomorrow"]
    now_dt = datetime.now(tz=IST)
    for i in range(days):
        label = day_names[i] if i < len(day_names) else (now_dt + timedelta(days=i)).strftime("%a")
        tmax = base_temp + 3.6 + rng.gauss(cfg["temp_offset"] * 0.4, 1.1)
        tmin = base_temp - 6.4 + rng.gauss(cfg["temp_offset"] * 0.3, 0.9)
        rain_prob = max(0, min(95, int(rng.gauss(cfg["cloud"] * 90, 14))))
        out.append({
            "day": label,
            "date": (now_dt + timedelta(days=i)).strftime("%d %b"),
            "t_max": round(tmax, 1),
            "t_min": round(tmin, 1),
            "humidity": round(max(15, min(96, rh + rng.gauss(0, 6))), 0),
            "rain_probability": rain_prob,
            "rain_mm": round(rain_prob / 100 * rng.uniform(0, 16), 1),
            "condition": ("Heavy rain" if rain_prob > 70 else
                          "Scattered showers" if rain_prob > 45 else
                          "Partly cloudy" if rain_prob > 22 else "Clear sky"),
        })
    return out
