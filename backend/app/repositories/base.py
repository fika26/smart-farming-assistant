from abc import ABC, abstractmethod
from datetime import datetime


class ReadingRepository(ABC):
    """Storage boundary. MemoryRepository now, MongoReadingRepository later —
    services depend only on this interface."""

    @abstractmethod
    def readings_between(self, start: datetime, end: datetime,
                         field_id: str | None = None) -> list[dict]: ...

    @abstractmethod
    def latest_readings(self, field_id: str | None = None) -> list[dict]: ...

    @abstractmethod
    def append(self, readings: list[dict]) -> int: ...

    @abstractmethod
    def last_irrigation(self, field_id: str) -> datetime | None: ...
