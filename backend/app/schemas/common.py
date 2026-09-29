from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

from app.domain.enums import DataSource, Trend

T = TypeVar("T")


class Meta(BaseModel):
    generated_at: datetime
    data_source: DataSource = DataSource.SIMULATED
    simulated: bool = True
    engine_version: str = "rules-0.1.0"
    note: str | None = None
    # Language every generated sentence in `data` was rendered in.
    language: str = "en"
    # Who wrote the prose in `data`: "rules" (deterministic templates) or "llm".
    # Alerts/actions/insights are always "rules" — only the assistant and the
    # /advisory/brief endpoint can be "llm".
    text_engine: str = "rules"


class Envelope(BaseModel, Generic[T]):
    data: T
    meta: Meta


class TrendPoint(BaseModel):
    t: datetime
    v: float | None = None


class Series(BaseModel):
    key: str
    label: str
    unit: str
    source: DataSource = DataSource.MEASURED
    points: list[TrendPoint] = Field(default_factory=list)


class MetricSummary(BaseModel):
    key: str
    label: str
    value: float | None
    unit: str
    status: str = "normal"          # normal | watch | warning | critical
    trend: Trend = Trend.STABLE
    delta_24h: float | None = None
    optimal_min: float | None = None
    optimal_max: float | None = None
    source: DataSource = DataSource.MEASURED
    updated_at: datetime | None = None
    caption: str | None = None
