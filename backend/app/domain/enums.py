from enum import Enum


class SensorType(str, Enum):
    """Only the sensors that physically exist on the edge node."""
    SOIL_MOISTURE = "soil_moisture"
    DS18B20_TEMPERATURE = "ds18b20_temperature"
    SHT31_TEMPERATURE = "sht31_temperature"
    SHT31_HUMIDITY = "sht31_humidity"
    BH1750_LIGHT = "bh1750_light"
    DS3231_TIMESTAMP = "ds3231_timestamp"


class ReadingStatus(str, Enum):
    OK = "ok"
    STALE = "stale"
    OUT_OF_RANGE = "out_of_range"
    SENSOR_ERROR = "sensor_error"


class DeviceStatus(str, Enum):
    ONLINE = "online"
    DEGRADED = "degraded"
    OFFLINE = "offline"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    INFO = "info"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class Trend(str, Enum):
    RISING = "rising"
    FALLING = "falling"
    STABLE = "stable"


class RiskLevel(str, Enum):
    SEVERE = "severe"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class DataSource(str, Enum):
    """Provenance — the UI must never present simulated data as measured."""
    MEASURED = "measured"
    DERIVED = "derived"
    PREDICTED = "predicted"
    SIMULATED = "simulated"
    EXTERNAL = "external"


class IrrigationState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    RECOMMENDED = "recommended"
    SCHEDULED = "scheduled"


class ActionPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    ROUTINE = "routine"
