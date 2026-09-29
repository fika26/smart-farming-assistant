from functools import lru_cache

from app.core.config import settings
from app.repositories.memory import MemoryRepository
from app.sources.base import SensorSource
from app.sources.mock import MockSource


def build_source() -> SensorSource:
    if settings.data_source == "mock":
        return MockSource()
    if settings.data_source in ("http", "mqtt"):
        # Real telemetry arrives through POST /api/ingest/readings; never back-fill
        # with simulated values while the API reports simulated=false.
        from app.sources.hardware import IngestOnlySource
        return IngestOnlySource()
    if settings.data_source == "serial":
        from app.sources.hardware import SerialSource
        return SerialSource()
    raise ValueError(f"Unknown DATA_SOURCE '{settings.data_source}'")


@lru_cache
def get_repository() -> MemoryRepository:
    if settings.repository == "mongo":
        from app.repositories.mongo import MongoReadingRepository
        return MongoReadingRepository(settings.mongodb_uri, settings.mongodb_db)
    if settings.repository == "supabase":
        from app.repositories.supabase import SupabaseReadingRepository
        return SupabaseReadingRepository(settings.supabase_db_url)
    return MemoryRepository(build_source())


def reset_repository() -> None:
    get_repository.cache_clear()
