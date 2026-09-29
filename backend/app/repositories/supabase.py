"""Supabase (Postgres) repository — architecture-ready, integration deferred.

Matches the schema in the product brief, so a later PR only needs to fill in
the four methods below; nothing above the repository layer (services, API
routes) needs to change, exactly like `mongo.py`.

    CREATE TABLE sensor_telemetry (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      crop_type VARCHAR(50) NOT NULL,
      sector_id VARCHAR(50) NOT NULL,
      soil_moisture NUMERIC(5,2) NOT NULL,
      temperature NUMERIC(5,2) NOT NULL,
      humidity NUMERIC(5,2) NOT NULL,
      nitrogen NUMERIC(6,2),
      phosphorus NUMERIC(6,2),
      potassium NUMERIC(6,2),
      irrigation_active BOOLEAN DEFAULT FALSE
    );

    -- Supports readings_between() and the dashboard's per-field latest-reading
    -- queries; Postgres/TimescaleDB can turn this into a hypertable later
    -- without changing the index below.
    CREATE INDEX idx_sensor_telemetry_sector_time
      ON sensor_telemetry (sector_id, timestamp DESC);

Field/sensor granularity
-------------------------
This repository's methods are keyed by `field_id`/`sensor_id`/`sensor_type`
(see `ReadingRepository`), one level finer than `sensor_telemetry`'s single
`sector_id` + `crop_type` row. When wiring this up for real, either:
  (a) add `device_id`/`sensor_type` columns to `sensor_telemetry`, or
  (b) map `sector_id` -> `field_id` and store one row per sensor type
      (soil_moisture, temperature, humidity, ...), which is what
      `_row_to_readings()` below assumes.
Pick whichever matches the actual ESP32 payload shape once hardware ships —
don't guess a mapping between real fields and rows.

Enable with REPOSITORY=supabase once `asyncpg` (direct Postgres access) or
`postgrest-py` (REST-over-Supabase) is added to requirements.txt; only the
factory in app/services/container.py needs to change, same as Mongo.
"""
from datetime import datetime

from app.repositories.base import ReadingRepository


class SupabaseReadingRepository(ReadingRepository):
    def __init__(self, db_url: str, table: str = "sensor_telemetry"):
        self.db_url = db_url
        self.table = table
        raise NotImplementedError(
            "Supabase integration is deferred. Run with REPOSITORY=memory until "
            "asyncpg/postgrest-py is added and the four methods below are implemented."
        )

    def readings_between(self, start: datetime, end: datetime,
                         field_id: str | None = None) -> list[dict]:  # pragma: no cover
        # SELECT * FROM sensor_telemetry
        # WHERE timestamp BETWEEN $1 AND $2 [AND sector_id = $3]
        # ORDER BY timestamp
        raise NotImplementedError

    def latest_readings(self, field_id: str | None = None) -> list[dict]:  # pragma: no cover
        # SELECT DISTINCT ON (sector_id) * FROM sensor_telemetry
        # [WHERE sector_id = $1] ORDER BY sector_id, timestamp DESC
        raise NotImplementedError

    def append(self, readings: list[dict]) -> int:  # pragma: no cover
        # INSERT INTO sensor_telemetry (...) VALUES (...) — batched, one
        # statement per ingest call, mirroring MemoryRepository.append().
        raise NotImplementedError

    def last_irrigation(self, field_id: str) -> datetime | None:  # pragma: no cover
        # SELECT MAX(timestamp) FROM sensor_telemetry
        # WHERE sector_id = $1 AND irrigation_active = TRUE
        raise NotImplementedError
