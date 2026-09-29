"""MongoDB repository — architecture-ready, integration deferred.

Planned collections
-------------------
readings          time-series (timeField=timestamp, metaField={device_id,sensor_id,sensor_type})
derived_metrics   time-series (same shape, keeps computed values out of `readings`)
fields            standard      { _id, farm_id, name, geometry(GeoJSON), soil_type, ... }
devices           standard      { _id, field_id, status, firmware, last_seen, sensors[] }
alerts            standard      indexes: {field_id, status, severity}
detections        standard      + GridFS bucket for uploaded crop images
recommendations   standard

Indexes
-------
readings: {device_id: 1, seq: 1} unique   -> idempotent ingest
readings: {field_id: 1, timestamp: -1}
alerts:   {field_id: 1, status: 1, severity: 1}

Enable with REPOSITORY=mongo once `motor` is added to requirements.txt; only the
factory in app/services/container.py needs to change.
"""
from datetime import datetime

from app.repositories.base import ReadingRepository


class MongoReadingRepository(ReadingRepository):
    def __init__(self, uri: str, db_name: str):
        self.uri = uri
        self.db_name = db_name
        raise NotImplementedError(
            "MongoDB integration is deferred. Run with REPOSITORY=memory.")

    def readings_between(self, start: datetime, end: datetime,
                         field_id: str | None = None) -> list[dict]:  # pragma: no cover
        raise NotImplementedError

    def latest_readings(self, field_id: str | None = None) -> list[dict]:  # pragma: no cover
        raise NotImplementedError

    def append(self, readings: list[dict]) -> int:  # pragma: no cover
        raise NotImplementedError

    def last_irrigation(self, field_id: str) -> datetime | None:  # pragma: no cover
        raise NotImplementedError
