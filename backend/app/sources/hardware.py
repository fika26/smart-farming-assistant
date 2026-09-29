"""Placeholders for the real-hardware sources.

They implement the same `SensorSource` contract, so switching `DATA_SOURCE`
is the only change required once the ESP32 node is on the network.
"""
from datetime import datetime

from app.sources.base import SensorSource


class IngestOnlySource(SensorSource):
    """DATA_SOURCE=http|mqtt. The ESP32 pushes packets to POST /api/ingest/readings
    (or an MQTT bridge calls the same repository.append); there is nothing to pull,
    so history starts empty and fills only with real telemetry. Previously these
    modes silently fell back to MockSource while the API reported
    `simulated: false` — i.e. mock numbers labelled as real."""
    name = "ingest"
    simulated = False

    def history(self, start: datetime, end: datetime) -> list[dict]:
        return []

    def latest(self) -> list[dict]:
        return []


class HttpSource(SensorSource):
    """Fed by POST /api/ingest/readings from the ESP32 uplink task."""
    name = "http"
    simulated = False

    def __init__(self, repository):
        self.repository = repository

    def history(self, start: datetime, end: datetime) -> list[dict]:
        return self.repository.readings_between(start, end)

    def latest(self) -> list[dict]:
        return self.repository.latest_readings()


class SerialSource(SensorSource):
    """USB dev-bench source: reads newline-delimited JSON frames from the node."""
    name = "serial"
    simulated = False

    def __init__(self, port: str = "/dev/ttyUSB0", baud: int = 115200):
        self.port, self.baud = port, baud

    def history(self, start: datetime, end: datetime) -> list[dict]:
        raise NotImplementedError("SerialSource is enabled in the hardware phase.")

    def latest(self) -> list[dict]:
        raise NotImplementedError("SerialSource is enabled in the hardware phase.")
