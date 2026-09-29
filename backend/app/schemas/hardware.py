from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.enums import DeviceStatus, ReadingStatus, SensorType, Trend


class SensorReading(BaseModel):
    """Canonical reading. This contract is identical for mock and real hardware."""
    sensor_id: str
    field_id: str
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime
    status: ReadingStatus = ReadingStatus.OK
    raw_value: float | None = Field(default=None, description="Uncalibrated ADC/lux value")
    raw_unit: str | None = None
    device_id: str | None = None


class SensorSummary(BaseModel):
    sensor_id: str
    field_id: str
    field_name: str
    device_id: str
    sensor_type: SensorType
    label: str
    hardware: str
    placement: str
    value: float | None
    unit: str
    status: ReadingStatus
    health: str                      # healthy | degraded | fault
    health_score: float
    trend: Trend
    delta_24h: float | None = None
    last_update: datetime | None = None
    last_update_human: str | None = None
    optimal_min: float | None = None
    optimal_max: float | None = None
    battery_mv: int | None = None
    rssi: int | None = None


class DeviceInfo(BaseModel):
    device_id: str
    name: str
    field_id: str
    field_name: str
    status: DeviceStatus
    firmware: str
    battery_mv: int
    battery_pct: int
    rssi: int
    last_seen: datetime
    last_seen_human: str
    uptime_hours: float
    buffered_packets: int
    packets_24h: int
    expected_packets_24h: int
    sensors: list[str]
    latitude: float
    longitude: float


class IngestSample(BaseModel):
    sensor_id: str
    sensor_type: SensorType
    value: float
    unit: str
    status: ReadingStatus = ReadingStatus.OK


class IngestPacket(BaseModel):
    """Uplink envelope posted by the ESP32 node (DS3231-stamped, LittleFS-buffered)."""
    device_id: str
    field_id: str
    seq: int
    timestamp: datetime
    fw_version: str = "0.1.0"
    battery_mv: int | None = None
    rssi: int | None = None
    buffered: bool = False
    samples: list[IngestSample]


class IngestResult(BaseModel):
    accepted: int
    duplicates: int
    device_id: str
    server_time: datetime
