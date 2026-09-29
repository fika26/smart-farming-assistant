"""Static farm configuration. Replaced by MongoDB documents in phase 12."""
from datetime import timedelta

from app.core.time import now
from app.domain.enums import SensorType

FARM = {
    "id": "farm-001",
    "name": "Sunehra Khet Farm",
    "location": "Medak District, Telangana",
    "latitude": 17.6295,
    "longitude": 78.2747,
    "timezone": "Asia/Kolkata",
}

FIELDS = [
    {
        "id": "field-a", "name": "North Block", "crop": "Tomato", "variety": "Arka Rakshak",
        "area_ha": 1.8, "days_after_sowing": 62, "soil_type": "Sandy loam",
        "irrigation_type": "Drip", "latitude": 17.6312, "longitude": 78.2731,
        "field_capacity_pct": 32.0, "refill_point_pct": 20.0, "threshold_pct": 24.0,
        "profile": "drying", "base_temp_c": 10.0,
        "boundary": [[17.6325, 78.2718], [17.6327, 78.2748], [17.6300, 78.2751], [17.6297, 78.2721]],
    },
    {
        "id": "field-b", "name": "Canal Side", "crop": "Paddy", "variety": "BPT 5204",
        "area_ha": 2.4, "days_after_sowing": 48, "soil_type": "Clay loam",
        "irrigation_type": "Flood", "latitude": 17.6281, "longitude": 78.2769,
        "field_capacity_pct": 42.0, "refill_point_pct": 28.0, "threshold_pct": 32.0,
        "profile": "wet", "base_temp_c": 10.0,
        "boundary": [[17.6295, 78.2757], [17.6298, 78.2786], [17.6268, 78.2789], [17.6265, 78.2759]],
    },
    {
        "id": "field-c", "name": "South Plot", "crop": "Chilli", "variety": "Byadgi",
        "area_ha": 1.1, "days_after_sowing": 34, "soil_type": "Red loam",
        "irrigation_type": "Sprinkler", "latitude": 17.6259, "longitude": 78.2736,
        "field_capacity_pct": 30.0, "refill_point_pct": 18.0, "threshold_pct": 22.0,
        "profile": "healthy", "base_temp_c": 12.0,
        "boundary": [[17.6272, 78.2724], [17.6274, 78.2752], [17.6247, 78.2755], [17.6244, 78.2727]],
    },
]

GROWTH_STAGES = {
    "Tomato": [(0, "Germination"), (15, "Vegetative"), (40, "Flowering"), (60, "Fruit set"), (85, "Ripening")],
    "Paddy": [(0, "Nursery"), (20, "Tillering"), (45, "Panicle initiation"), (70, "Flowering"), (95, "Grain filling")],
    "Chilli": [(0, "Germination"), (18, "Vegetative"), (45, "Flowering"), (70, "Fruit development")],
}

SENSOR_SPECS = {
    SensorType.SOIL_MOISTURE: {
        "label": "Soil Moisture", "hardware": "Capacitive Soil Moisture v2.0",
        "unit": "%", "raw_unit": "adc", "placement": "Root zone, 15 cm depth",
    },
    SensorType.DS18B20_TEMPERATURE: {
        "label": "Soil Temperature", "hardware": "DS18B20 (waterproof, 1-Wire)",
        "unit": "°C", "raw_unit": "°C", "placement": "Root zone, 15 cm depth",
    },
    SensorType.SHT31_TEMPERATURE: {
        "label": "Air Temperature", "hardware": "SHT31-D (I²C)",
        "unit": "°C", "raw_unit": "°C", "placement": "Canopy level, radiation shield",
    },
    SensorType.SHT31_HUMIDITY: {
        "label": "Relative Humidity", "hardware": "SHT31-D (I²C)",
        "unit": "%RH", "raw_unit": "%RH", "placement": "Canopy level, radiation shield",
    },
    SensorType.BH1750_LIGHT: {
        "label": "Light Intensity", "hardware": "BH1750 (I²C)",
        "unit": "lux", "raw_unit": "lux", "placement": "Above canopy, horizontal",
    },
    SensorType.DS3231_TIMESTAMP: {
        "label": "RTC Clock", "hardware": "DS3231 (I²C, TCXO)",
        "unit": "s", "raw_unit": "epoch", "placement": "Enclosure board",
    },
}

MEASURED_TYPES = [
    SensorType.SOIL_MOISTURE,
    SensorType.DS18B20_TEMPERATURE,
    SensorType.SHT31_TEMPERATURE,
    SensorType.SHT31_HUMIDITY,
    SensorType.BH1750_LIGHT,
]

DEVICES = [
    {"device_id": "esp32-node-01", "name": "North Block Node", "field_id": "field-a",
     "firmware": "0.4.2", "status": "online", "battery_mv": 3960, "rssi": -61},
    {"device_id": "esp32-node-02", "name": "Canal Side Node", "field_id": "field-b",
     "firmware": "0.4.2", "status": "online", "battery_mv": 3820, "rssi": -74},
    {"device_id": "esp32-node-03", "name": "South Plot Node", "field_id": "field-c",
     "firmware": "0.4.1", "status": "degraded", "battery_mv": 3610, "rssi": -86},
]

OPTIMAL_RANGES = {
    SensorType.SOIL_MOISTURE: (22.0, 34.0),
    SensorType.DS18B20_TEMPERATURE: (18.0, 30.0),
    SensorType.SHT31_TEMPERATURE: (18.0, 33.0),
    SensorType.SHT31_HUMIDITY: (45.0, 75.0),
    SensorType.BH1750_LIGHT: (8000.0, 60000.0),
}


def field_by_id(field_id: str) -> dict | None:
    return next((f for f in FIELDS if f["id"] == field_id), None)


def device_for_field(field_id: str) -> dict:
    return next(d for d in DEVICES if d["field_id"] == field_id)


def sensor_id(field_id: str, sensor_type: SensorType) -> str:
    return f"{field_id}-{sensor_type.value}"


def growth_stage(crop: str, das: int) -> str:
    stages = GROWTH_STAGES.get(crop, [(0, "Vegetative")])
    label = stages[0][1]
    for start, name in stages:
        if das >= start:
            label = name
    return label


def sown_on(das: int):
    return now() - timedelta(days=das)
