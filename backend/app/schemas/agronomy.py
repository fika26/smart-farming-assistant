from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.enums import (ActionPriority, AlertStatus, DataSource, IrrigationState,
                              RiskLevel, Severity, Trend)
from app.schemas.common import MetricSummary, Series


class Evidence(BaseModel):
    label: str
    value: str
    source: DataSource = DataSource.MEASURED
    # Stable, language-independent id of the reading (e.g. "soil_moisture"), so
    # clients can pick icons/colours without parsing a translated label.
    key: str | None = None


class Alert(BaseModel):
    id: str
    field_id: str
    field_name: str
    title: str
    category: str
    severity: Severity
    status: AlertStatus = AlertStatus.ACTIVE
    opened_at: datetime
    opened_at_human: str
    what: str
    why: str
    action: str
    evidence: list[Evidence] = Field(default_factory=list)
    rule_id: str
    rule_version: str = "0.1.0"
    confidence: float = 0.9
    # Localisation contract: `title/what/why/action` above are already rendered
    # in the request language; `message_key` + `params` let any other channel
    # (SMS, WhatsApp, voice) re-render the same alert in another language.
    category_code: str | None = None
    message_key: str | None = None
    params: dict[str, str] = Field(default_factory=dict)


class Action(BaseModel):
    id: str
    field_id: str
    field_name: str
    title: str
    rationale: str
    detail: str = ""
    priority: ActionPriority
    due_window: str
    estimated_impact: str
    category: str
    source_alert_id: str | None = None
    status: str = "pending"
    category_code: str | None = None


class FieldSummary(BaseModel):
    id: str
    name: str
    crop: str
    variety: str
    area_ha: float
    sown_on: datetime
    growth_stage: str
    days_after_sowing: int
    health_score: int
    health_label: str
    soil_moisture: float | None
    soil_moisture_status: str
    irrigation_state: IrrigationState
    risk_level: RiskLevel
    top_risk: str
    active_alerts: int
    last_reading_at: datetime | None
    last_reading_human: str | None
    soil_type: str
    irrigation_type: str
    latitude: float
    longitude: float
    boundary: list[list[float]] = Field(default_factory=list)
    # Display names in the request language; `crop`/`growth_stage` stay as
    # stable English identifiers for filtering and form values.
    crop_label: str | None = None
    growth_stage_label: str | None = None


class FieldDetail(BaseModel):
    field: FieldSummary
    metrics: list[MetricSummary]
    series: list[Series]
    sensors: list[dict]
    alerts: list[Alert]
    actions: list[Action]
    soil: "SoilStatus"
    weather: "WeatherSummary"
    crop_health: "CropHealth"


class SoilStatus(BaseModel):
    field_id: str
    field_name: str
    moisture_pct: float
    moisture_status: str
    threshold_pct: float
    refill_point_pct: float
    field_capacity_pct: float
    soil_temp_c: float
    depletion_pct: float
    et0_mm_day: float
    irrigation_state: IrrigationState
    recommendation: str
    recommended_depth_mm: float
    recommended_window: str
    water_saved_pct: float
    last_irrigation: datetime | None
    last_irrigation_human: str | None
    insight: str
    recent_readings: list[dict] = Field(default_factory=list)
    series: list[Series] = Field(default_factory=list)


class WeatherSummary(BaseModel):
    field_id: str
    location: str
    temperature_c: float
    feels_like_c: float
    humidity_pct: float
    light_lux: float
    vpd_kpa: float
    dew_point_c: float
    condition: str
    wind_note: str
    heat_risk: RiskLevel
    drought_risk: RiskLevel
    rain_risk: RiskLevel
    agricultural_implication: str
    recommended_action: str
    forecast: list[dict] = Field(default_factory=list)
    hourly: list[Series] = Field(default_factory=list)


class CropHealthIndicator(BaseModel):
    label: str
    value: str
    status: str
    source: DataSource = DataSource.DERIVED
    note: str | None = None


class CropHealth(BaseModel):
    field_id: str
    field_name: str
    crop: str
    growth_stage: str
    days_after_sowing: int
    gdd_accumulated: float
    health_score: int
    health_label: str
    trend: Trend
    observed_indicators: list[CropHealthIndicator] = Field(default_factory=list)
    risk_indicators: list[CropHealthIndicator] = Field(default_factory=list)
    recent_changes: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    series: list[Series] = Field(default_factory=list)
    disclaimer: str


class Insight(BaseModel):
    id: str
    field_id: str
    field_name: str
    title: str
    category: str
    observed: str
    interpretation: str
    action: str
    confidence: float
    severity: Severity
    generated_at: datetime
    method: str = "rule-based"
    evidence: list[Evidence] = Field(default_factory=list)
    category_code: str | None = None


class RiskItem(BaseModel):
    hazard: str
    label: str
    level: RiskLevel
    score: int
    trend: Trend
    horizon: str
    why: str
    drivers: list[Evidence] = Field(default_factory=list)
    action: str
    confidence: float
    forecast: list[int] = Field(default_factory=list)


class RiskForecast(BaseModel):
    field_id: str
    field_name: str
    overall_level: RiskLevel
    overall_score: int
    horizon_days: int
    days: list[str] = Field(default_factory=list)
    risks: list[RiskItem] = Field(default_factory=list)
    method: str


class DetectionRequestMeta(BaseModel):
    field_id: str | None = None
    crop: str | None = None
    notes: str | None = None


class DetectionResult(BaseModel):
    id: str
    field_id: str
    crop: str
    image_name: str
    image_size_bytes: int
    suspected_condition: str
    condition_type: str
    confidence: float
    severity: Severity
    affected_area_pct: float
    possible_cause: str
    recommended_action: str
    followups: list[str] = Field(default_factory=list)
    alternatives: list[dict] = Field(default_factory=list)
    analyzed_at: datetime
    model_name: str
    model_version: str
    is_mock: bool = True
    disclaimer: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    field_id: str | None = None
    history: list[ChatMessage] = Field(default_factory=list)
    # BCP-47-ish language code from the UI's language selector (e.g. "en", "te", "hi").
    # The assistant replies in this language when it is set.
    language: str | None = None


class ChatResponse(BaseModel):
    reply: str
    intent: str
    grounded_on: list[Evidence] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    is_mock: bool = True
    answered_at: datetime


class Notification(BaseModel):
    id: str
    title: str
    body: str
    channel: str
    severity: Severity
    created_at: datetime
    created_at_human: str
    read: bool = False


class DashboardSnapshot(BaseModel):
    farm_name: str
    location: str
    generated_at: datetime
    farm_health_score: int
    farm_health_label: str
    farm_status_line: str
    fields_total: int
    fields_needing_attention: int
    metrics: list[MetricSummary]
    alerts: list[Alert]
    actions: list[Action]
    insights: list[Insight]
    fields: list[FieldSummary]
    sensors: list[dict]
    soil: SoilStatus
    weather: WeatherSummary
    risk: RiskForecast
    series: list[Series]
    device_health: dict


class AnalyticsResponse(BaseModel):
    range_days: int
    series: list[Series]
    resource_usage: list[dict]
    yield_metrics: list[dict]
    crop_health_trend: list[Series]
    highlights: list[str]
    disclaimer: str
    # Current value + agronomic status per channel, so the simple farmer view
    # can colour-code without re-deriving thresholds in the browser.
    metrics: list[MetricSummary] = Field(default_factory=list)


class ReportItem(BaseModel):
    id: str
    title: str
    period: str
    type: str
    generated_at: datetime
    size_kb: int
    summary: str
    formats: list[str]


FieldDetail.model_rebuild()
