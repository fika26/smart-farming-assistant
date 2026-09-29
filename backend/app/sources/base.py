from abc import ABC, abstractmethod
from datetime import datetime


class SensorSource(ABC):
    """Boundary between the platform and the physical world.

    `MockSource` today; `HttpSource` / `SerialSource` / `MqttSource` once the ESP32
    node is deployed. Nothing above this interface changes when hardware arrives.
    """

    name: str = "base"
    simulated: bool = True

    @abstractmethod
    def history(self, start: datetime, end: datetime) -> list[dict]:
        """Canonical readings between two instants."""

    @abstractmethod
    def latest(self) -> list[dict]:
        """Most recent reading per sensor."""
