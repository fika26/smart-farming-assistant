from collections import defaultdict
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.time import now
from app.repositories.base import ReadingRepository
from app.sources.base import SensorSource


class MemoryRepository(ReadingRepository):
    """In-process time-series cache. Seeded once from the configured SensorSource
    and topped up with any ingested hardware packets."""

    def __init__(self, source: SensorSource):
        self.source = source
        self._readings: list[dict] = []
        # Real packets posted to /ingest. Kept separately so the periodic re-seed
        # (which regenerates the source window) never discards them.
        self._ingested: list[dict] = []
        self._last_irrigation: dict[str, datetime] = {}
        self._seen_seq: set[tuple[str, int]] = set()
        self._seeded_at: datetime | None = None
        self.seed()

    def seed(self) -> None:
        end = now()
        start = end - timedelta(days=settings.history_days)
        data = self.source.history(start, end)
        self._ingested = [r for r in self._ingested if r["timestamp"] >= start]
        data = data + list(self._ingested)
        for r in data:
            fid = r["field_id"]
            if "_last_irrigation" in r:
                self._last_irrigation[fid] = r.pop("_last_irrigation")
        self._readings = sorted(data, key=lambda r: r["timestamp"])
        self._seeded_at = end

    def refresh_if_stale(self, max_age_minutes: int = 15) -> None:
        if self._seeded_at is None or (now() - self._seeded_at) > timedelta(minutes=max_age_minutes):
            self.seed()

    def readings_between(self, start: datetime, end: datetime,
                         field_id: str | None = None) -> list[dict]:
        return [r for r in self._readings
                if start <= r["timestamp"] <= end
                and (field_id is None or r["field_id"] == field_id)]

    def latest_readings(self, field_id: str | None = None) -> list[dict]:
        latest: dict[str, dict] = {}
        for r in self._readings:
            if field_id and r["field_id"] != field_id:
                continue
            key = r["sensor_id"]
            if key not in latest or r["timestamp"] > latest[key]["timestamp"]:
                latest[key] = r
        return list(latest.values())

    def latest_by_type(self, field_id: str) -> dict:
        return {r["sensor_type"]: r for r in self.latest_readings(field_id)}

    def series_for(self, field_id: str, sensor_type, hours: int = 24,
                   bucket_minutes: int | None = None) -> list[dict]:
        end = now()
        start = end - timedelta(hours=hours)
        rows = [r for r in self.readings_between(start, end, field_id)
                if r["sensor_type"] == sensor_type]
        if not bucket_minutes:
            return rows
        buckets: dict[datetime, list[float]] = defaultdict(list)
        for r in rows:
            ts = r["timestamp"]
            offset = int((ts - start).total_seconds() // 60) // bucket_minutes
            anchor = (start + timedelta(minutes=offset * bucket_minutes)).replace(
                second=0, microsecond=0)
            buckets[anchor].append(r["value"])
        return [{"timestamp": k, "value": sum(v) / len(v)} for k, v in sorted(buckets.items())]

    def append(self, readings: list[dict]) -> int:
        self._ingested.extend(readings)
        self._readings.extend(readings)
        self._readings.sort(key=lambda r: r["timestamp"])
        return len(readings)

    def register_packet(self, device_id: str, seq: int) -> bool:
        key = (device_id, seq)
        if key in self._seen_seq:
            return False
        self._seen_seq.add(key)
        return True

    def last_irrigation(self, field_id: str) -> datetime | None:
        return self._last_irrigation.get(field_id)
