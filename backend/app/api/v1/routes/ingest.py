from fastapi import APIRouter, Depends

from app.api.deps import device_or_user, envelope
from app.core.time import now
from app.domain.enums import DataSource
from app.schemas.hardware import IngestPacket, IngestResult
from app.services.container import get_repository

router = APIRouter(dependencies=[Depends(device_or_user)])


@router.post("/ingest/readings", tags=["Ingest"], response_model=IngestResult,
             summary="ESP32 uplink endpoint (idempotent by device_id + seq)")
def ingest(packet: IngestPacket):
    """Real-hardware entry point.

    The ESP32 batches DS3231-stamped samples to LittleFS and POSTs them here when the
    link is available; `seq` makes replays of buffered packets idempotent.
    """
    repo = get_repository()
    fresh = repo.register_packet(packet.device_id, packet.seq)
    if not fresh:
        return IngestResult(accepted=0, duplicates=len(packet.samples),
                            device_id=packet.device_id, server_time=now())
    rows = [{
        "sensor_id": s.sensor_id, "field_id": packet.field_id, "device_id": packet.device_id,
        "sensor_type": s.sensor_type, "value": s.value, "unit": s.unit,
        "raw_value": None, "raw_unit": None,
        "timestamp": packet.timestamp, "status": s.status,
    } for s in packet.samples]
    accepted = repo.append(rows)
    return IngestResult(accepted=accepted, duplicates=0, device_id=packet.device_id,
                        server_time=now())


@router.get("/ingest/time", tags=["Ingest"], summary="RTC synchronisation endpoint")
def ingest_time():
    return envelope({"server_time": now(), "epoch": int(now().timestamp()),
                     "timezone": "Asia/Kolkata"}, DataSource.DERIVED)
