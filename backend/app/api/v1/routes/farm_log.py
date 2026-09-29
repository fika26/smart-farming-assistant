"""Real sensor recording (master_smart_farm_dataset.csv), farm-wide.

Deliberately a separate endpoint from `/dashboard` and `/fields/*`: those stay
on the labelled simulation until real per-field hardware is deployed, and
this endpoint surfaces the one real stream honestly instead of stitching it
onto North Block / Canal Side / South Plot, which the data does not support.
"""
from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.deps import envelope
from app.core.time import now
from app.domain.enums import DataSource
from app.sources import csv_log

router = APIRouter()


@router.get("/farm-log", tags=["Farm Log"],
            summary="Real recorded sensor history (farm-wide, not per-field)")
def farm_log():
    summary = csv_log.load_summary()
    if not summary.available:
        return envelope(
            {"available": False, "message": "No recorded sensor file found."},
            DataSource.MEASURED,
            note="Place master_smart_farm_dataset.csv in backend/data/, or set "
                 "FARM_LOG_CSV_PATH, to enable this.",
        )

    last_ts = summary.last_timestamp
    age_days = None
    if last_ts is not None:
        reference = last_ts if last_ts.tzinfo else last_ts.replace(tzinfo=timezone.utc)
        age_days = (now().astimezone(timezone.utc) - reference).days

    return envelope(
        {
            "available": True,
            "row_count": summary.row_count,
            "first_reading_at": summary.first_timestamp.isoformat() if summary.first_timestamp else None,
            "last_reading_at": summary.last_timestamp.isoformat() if summary.last_timestamp else None,
            "last_reading_days_ago": age_days,
            "latest": summary.latest,
            "averages": summary.means,
        },
        DataSource.MEASURED,
        note="Farm-wide recorded readings. Not linked to a specific field — "
             "the source file has no field or sensor identifier.",
    )
