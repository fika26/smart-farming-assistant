"""Reads the real `master_smart_farm_dataset.csv` recording.

This is genuine sensor history, but it is a single, un-labelled stream — no
column ties a row to North Block / Canal Side / South Plot, and the `Crop`
column changes almost every row with near-identical stats per crop, so it
reads as one node's stream with a randomly-stamped crop label rather than
three distinct fields. Per the product decision (see README note below),
this module is therefore exposed as one farm-wide "Farm Node" reading, never
split across the three simulated fields — splitting it would be inventing a
per-field number the data does not actually support.

No pandas dependency: the backend only lists fastapi/pydantic/httpx/etc., so
this uses the stdlib `csv` module and stays memory-light via a single pass.
"""
from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache

DEFAULT_CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "master_smart_farm_dataset.csv",
)


@dataclass
class FarmLogSummary:
    available: bool
    row_count: int
    first_timestamp: datetime | None
    last_timestamp: datetime | None
    latest: dict | None       # last row, raw-ish but rounded
    means: dict | None        # dataset-wide averages, rounded


def _csv_path() -> str:
    return os.environ.get("FARM_LOG_CSV_PATH", DEFAULT_CSV_PATH)


def _parse_row(row: dict) -> dict | None:
    try:
        return {
            "timestamp": datetime.strptime(row["Timestamp"], "%Y-%m-%d %H:%M:%S"),
            "soil_moisture": float(row["Soil_Moisture"]),
            "temperature": float(row["Temperature"]),
            "humidity": float(row["Humidity"]),
            "nitrogen": float(row["Nitrogen"]),
            "phosphorus": float(row["Phosphorus"]),
            "potassium": float(row["Potassium"]),
            "irrigation_active": row["irrigation_status"].strip() == "1",
            "crop_label": row.get("Crop", "").strip() or None,
        }
    except (KeyError, ValueError):
        return None


@lru_cache
def load_summary() -> FarmLogSummary:
    """Single pass over the CSV: keeps only the running sums and the last row,
    never the whole file, so this is cheap however large the recording is."""
    path = _csv_path()
    if not os.path.exists(path):
        return FarmLogSummary(False, 0, None, None, None, None)

    count = 0
    sums = {"soil_moisture": 0.0, "temperature": 0.0, "humidity": 0.0,
            "nitrogen": 0.0, "phosphorus": 0.0, "potassium": 0.0}
    first_ts: datetime | None = None
    last_ts: datetime | None = None
    last_row: dict | None = None

    with open(path, newline="", encoding="utf-8") as fh:
        for raw in csv.DictReader(fh):
            parsed = _parse_row(raw)
            if parsed is None:
                continue
            count += 1
            for key in sums:
                sums[key] += parsed[key]
            ts = parsed["timestamp"]
            if first_ts is None or ts < first_ts:
                first_ts = ts
            if last_ts is None or ts >= last_ts:
                last_ts = ts
                last_row = parsed

    if count == 0 or last_row is None:
        return FarmLogSummary(False, 0, None, None, None, None)

    means = {key: round(total / count, 1) for key, total in sums.items()}
    latest = {
        "timestamp": last_row["timestamp"].isoformat(),
        "soil_moisture": round(last_row["soil_moisture"], 1),
        "temperature": round(last_row["temperature"], 1),
        "humidity": round(last_row["humidity"], 0),
        "nitrogen": round(last_row["nitrogen"], 0),
        "phosphorus": round(last_row["phosphorus"], 0),
        "potassium": round(last_row["potassium"], 0),
        "irrigation_active": last_row["irrigation_active"],
    }
    return FarmLogSummary(True, count, first_ts, last_ts, latest, means)


def reset_cache() -> None:
    load_summary.cache_clear()
