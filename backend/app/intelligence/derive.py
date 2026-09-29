"""Derived agronomic metrics. Everything here is computed, never measured —
responses tag these with DataSource.DERIVED."""
from __future__ import annotations

import math
from datetime import timedelta

from app.domain.enums import Trend

VERSION = "derive-0.1.0"


def saturation_vp(temp_c: float) -> float:
    return 0.6108 * math.exp(17.27 * temp_c / (temp_c + 237.3))


def vpd_kpa(temp_c: float, rh_pct: float) -> float:
    svp = saturation_vp(temp_c)
    return round(max(0.0, svp - svp * (rh_pct / 100.0)), 2)


def dew_point_c(temp_c: float, rh_pct: float) -> float:
    rh = max(1.0, min(100.0, rh_pct))
    a, b = 17.62, 243.12
    gamma = math.log(rh / 100.0) + (a * temp_c) / (b + temp_c)
    return round((b * gamma) / (a - gamma), 1)


def heat_index_c(temp_c: float, rh_pct: float) -> float:
    if temp_c < 27:
        return round(temp_c, 1)
    t = temp_c * 9 / 5 + 32
    hi = (-42.379 + 2.04901523 * t + 10.14333127 * rh_pct - 0.22475541 * t * rh_pct
          - 6.83783e-3 * t * t - 5.481717e-2 * rh_pct * rh_pct
          + 1.22874e-3 * t * t * rh_pct + 8.5282e-4 * t * rh_pct * rh_pct
          - 1.99e-6 * t * t * rh_pct * rh_pct)
    return round((hi - 32) * 5 / 9, 1)


def lux_to_ppfd(lux: float) -> float:
    """Sunlight conversion factor ~0.0185 µmol·m⁻²·s⁻¹ per lux."""
    return round(lux * 0.0185, 1)


def dli_mol_m2_day(lux_points: list[float], interval_minutes: int) -> float:
    """Daily Light Integral from integrated BH1750 readings."""
    if not lux_points:
        return 0.0
    seconds = interval_minutes * 60
    total = sum(lux_to_ppfd(v) * seconds for v in lux_points) / 1_000_000
    return round(total, 1)


def et0_hargreaves(t_mean: float, t_max: float, t_min: float, ra: float = 36.0) -> float:
    """Reference evapotranspiration (mm/day). Ra approximated for ~17°N."""
    spread = max(0.5, t_max - t_min)
    return round(max(0.0, 0.0023 * ra * (t_mean + 17.8) * math.sqrt(spread)) * 0.408, 2)


def gdd(t_max: float, t_min: float, base: float = 10.0) -> float:
    return round(max(0.0, (t_max + t_min) / 2 - base), 1)


def depletion_pct(moisture: float, field_capacity: float, refill_point: float) -> float:
    span = max(0.1, field_capacity - refill_point)
    return round(max(0.0, min(140.0, (field_capacity - moisture) / span * 100)), 1)


def irrigation_depth_mm(moisture: float, field_capacity: float, root_depth_mm: float = 300.0,
                        efficiency: float = 0.85) -> float:
    deficit = max(0.0, field_capacity - moisture) / 100.0
    return round(deficit * root_depth_mm / efficiency, 1)


def leaf_wetness_risk(rh_pct: float, temp_c: float) -> float:
    """0-1 fungal infection pressure proxy (RH-hours model, no leaf-wetness sensor)."""
    if rh_pct < 80:
        return round(max(0.0, (rh_pct - 60) / 100), 2)
    temp_factor = 1.0 if 15 <= temp_c <= 27 else 0.55
    return round(min(1.0, ((rh_pct - 80) / 20 * 0.7 + 0.3) * temp_factor), 2)


def trend_of(values: list[float], tolerance: float = 0.02) -> Trend:
    if len(values) < 4:
        return Trend.STABLE
    head = sum(values[: max(2, len(values) // 4)]) / max(2, len(values) // 4)
    tail = sum(values[-max(2, len(values) // 4):]) / max(2, len(values) // 4)
    if head == 0:
        return Trend.STABLE
    change = (tail - head) / abs(head)
    if change > tolerance:
        return Trend.RISING
    if change < -tolerance:
        return Trend.FALLING
    return Trend.STABLE


def daily_min_max(rows: list[dict], hours: int = 24) -> tuple[float, float, float]:
    if not rows:
        return 0.0, 0.0, 0.0
    end = max(r["timestamp"] for r in rows)
    window = [r["value"] for r in rows if r["timestamp"] >= end - timedelta(hours=hours)]
    if not window:
        window = [rows[-1]["value"]]
    return min(window), max(window), sum(window) / len(window)
