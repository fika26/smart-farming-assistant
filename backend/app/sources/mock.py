from datetime import datetime

from app.core.config import settings
from app.domain.catalog import FIELDS
from app.mock.generators import generate_field_readings, scenario_config
from app.sources.base import SensorSource


class MockSource(SensorSource):
    name = "mock"
    simulated = True

    def __init__(self, scenario: str | None = None, seed: int | None = None):
        self.scenario = scenario or settings.mock_scenario
        self.seed = seed if seed is not None else settings.mock_seed

    @property
    def scenario_label(self) -> str:
        return scenario_config(self.scenario)["label"]

    def history(self, start: datetime, end: datetime) -> list[dict]:
        out: list[dict] = []
        for field in FIELDS:
            out.extend(generate_field_readings(
                field, start, end, settings.sample_interval_minutes, self.seed, self.scenario))
        return out

    def latest(self) -> list[dict]:
        raise NotImplementedError("Latest is resolved by the repository cache.")
