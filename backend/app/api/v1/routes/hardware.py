from fastapi import APIRouter, Query

from app.api.deps import envelope
from app.domain.enums import DataSource
from app.services import farm_service

router = APIRouter()


@router.get("/sensors", tags=["Live Monitoring"], summary="All sensor channels")
def sensors(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_sensors(field_id))


@router.get("/sensors/{sensor_id}", tags=["Live Monitoring"], summary="Sensor detail and history")
def sensor_detail(sensor_id: str, hours: int = Query(default=72, ge=1, le=720)):
    return envelope(farm_service.get_sensor(sensor_id, hours))


@router.get("/devices", tags=["Live Monitoring"], summary="Edge node fleet health")
def devices():
    return envelope(farm_service.get_devices())
