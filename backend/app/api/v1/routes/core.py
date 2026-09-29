from fastapi import APIRouter, Query

from app.api.deps import envelope
from app.core.config import settings
from app.domain.enums import DataSource
from app.services import farm_service

router = APIRouter()


@router.get("/meta", tags=["System"], summary="Runtime configuration and provenance")
def meta():
    return envelope(farm_service.meta_info(), DataSource.DERIVED)


@router.get("/dashboard", tags=["Command Center"], summary="Full command-centre snapshot")
def dashboard(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_dashboard(field_id))


@router.get("/alerts", tags=["Command Center"], summary="Prioritised alerts with evidence")
def alerts(field_id: str | None = None, severity: str | None = None):
    return envelope(farm_service.get_alerts(field_id, severity), DataSource.DERIVED)


@router.get("/actions", tags=["Command Center"], summary="Priority action plan")
def actions(field_id: str | None = None):
    return envelope(farm_service.get_actions(field_id), DataSource.DERIVED)


@router.get("/notifications", tags=["System"], summary="Notification feed")
def notifications():
    return envelope(farm_service.get_notifications(), DataSource.DERIVED)


@router.get("/reports", tags=["Analytics"], summary="Generated report catalogue")
def reports():
    return envelope(farm_service.get_reports(), DataSource.DERIVED)


@router.get("/settings", tags=["System"], summary="Farm, threshold and system settings")
def app_settings():
    from app.domain.catalog import FARM, FIELDS
    return envelope({
        "farm": FARM,
        "fields": [{"id": f["id"], "name": f["name"], "crop": f["crop"],
                    "threshold_pct": f["threshold_pct"], "refill_point_pct": f["refill_point_pct"],
                    "field_capacity_pct": f["field_capacity_pct"], "soil_type": f["soil_type"],
                    "irrigation_type": f["irrigation_type"]} for f in FIELDS],
        "system": farm_service.meta_info(),
        "units": {"temperature": "°C", "moisture": "%", "light": "lux", "volume": "litres"},
        "notifications": {"sms": True, "in_app": True, "email": False,
                          "quiet_hours": "22:00 - 05:00",
                          "min_severity": "medium"},
    }, DataSource.DERIVED)
