from fastapi import APIRouter, Query

from app.api.deps import envelope
from app.domain.enums import DataSource
from app.services import farm_service

router = APIRouter()


@router.get("/fields", tags=["Field Intelligence"], summary="All fields with live status")
def list_fields():
    return envelope(farm_service.get_fields())


@router.get("/fields/{field_id}", tags=["Field Intelligence"], summary="Full field detail")
def field_detail(field_id: str):
    return envelope(farm_service.get_field_detail(field_id))


@router.get("/soil", tags=["Field Intelligence"], summary="Soil and irrigation status")
def soil(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_soil(field_id))


@router.get("/crop-health", tags=["Field Intelligence"], summary="Rule-based crop health")
def crop_health(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_crop_health(field_id), DataSource.DERIVED)


@router.get("/weather", tags=["Field Intelligence"], summary="Weather, climate and implications")
def weather(field_id: str | None = Query(default=None)):
    return envelope(farm_service.get_weather(field_id), DataSource.SIMULATED,
                    note="Forecast values are simulated. Live readings come from the SHT31 "
                         "and BH1750 on the edge node.")


@router.get("/map", tags=["Live Monitoring"], summary="Field boundaries, nodes and alert pins")
def field_map():
    return envelope(farm_service.get_map())
