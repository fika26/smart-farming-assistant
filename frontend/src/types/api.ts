/**
 * API contract types.
 *
 * These mirror the FastAPI Pydantic schemas one-to-one. In the hardware phase they are
 * regenerated from the live OpenAPI document:
 *   npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.generated.ts
 * Nothing in the UI reads sensor data by any other route.
 */

export type DataSourceTag = 'measured' | 'derived' | 'predicted' | 'simulated' | 'external';
export type Severity = 'critical' | 'high' | 'medium' | 'info';
export type RiskLevel = 'severe' | 'high' | 'moderate' | 'low';
export type TrendDir = 'rising' | 'falling' | 'stable';
export type MetricStatus = 'normal' | 'watch' | 'warning' | 'critical';
export type IrrigationState = 'idle' | 'running' | 'recommended' | 'scheduled';
export type ActionPriority = 'urgent' | 'high' | 'routine';
export type SensorType =
  | 'soil_moisture'
  | 'ds18b20_temperature'
  | 'sht31_temperature'
  | 'sht31_humidity'
  | 'bh1750_light'
  | 'ds3231_timestamp';

export interface Meta {
  generated_at: string;
  data_source: DataSourceTag;
  simulated: boolean;
  engine_version: string;
  note?: string | null;
  /** Language the server rendered generated text in. */
  language?: string;
  /** Who wrote the prose: deterministic templates or an LLM. */
  text_engine?: 'rules' | 'llm';
}

export interface Envelope<T> {
  data: T;
  meta: Meta;
}

export interface TrendPoint {
  t: string;
  v: number | null;
}

export interface Series {
  key: string;
  label: string;
  unit: string;
  source: DataSourceTag;
  points: TrendPoint[];
}

export interface MetricSummary {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  status: MetricStatus;
  trend: TrendDir;
  delta_24h: number | null;
  optimal_min: number | null;
  optimal_max: number | null;
  source: DataSourceTag;
  updated_at: string | null;
  caption: string | null;
}

export interface Evidence {
  label: string;
  value: string;
  source: DataSourceTag;
  /** Language-independent id, e.g. "soil_moisture". */
  key?: string | null;
}

export interface Alert {
  id: string;
  field_id: string;
  field_name: string;
  title: string;
  category: string;
  severity: Severity;
  status: string;
  opened_at: string;
  opened_at_human: string;
  what: string;
  why: string;
  action: string;
  evidence: Evidence[];
  rule_id: string;
  rule_version: string;
  confidence: number;
  category_code?: string | null;
  message_key?: string | null;
  params?: Record<string, string>;
}

export interface Action {
  id: string;
  field_id: string;
  field_name: string;
  title: string;
  rationale: string;
  detail: string;
  priority: ActionPriority;
  due_window: string;
  estimated_impact: string;
  category: string;
  source_alert_id: string | null;
  status: string;
}

export interface FieldSummary {
  id: string;
  name: string;
  crop: string;
  /** Crop / stage in the request language (use for display). */
  crop_label?: string | null;
  growth_stage_label?: string | null;
  variety: string;
  area_ha: number;
  sown_on: string;
  growth_stage: string;
  days_after_sowing: number;
  health_score: number;
  health_label: string;
  soil_moisture: number | null;
  soil_moisture_status: MetricStatus;
  irrigation_state: IrrigationState;
  risk_level: RiskLevel;
  top_risk: string;
  active_alerts: number;
  last_reading_at: string | null;
  last_reading_human: string | null;
  soil_type: string;
  irrigation_type: string;
  latitude: number;
  longitude: number;
  boundary: number[][];
}

export interface SoilReadingRow {
  timestamp: string;
  value: number;
  raw_value: number | null;
  unit: string;
  status: string;
}

export interface SoilStatus {
  field_id: string;
  field_name: string;
  moisture_pct: number;
  moisture_status: MetricStatus;
  threshold_pct: number;
  refill_point_pct: number;
  field_capacity_pct: number;
  soil_temp_c: number;
  depletion_pct: number;
  et0_mm_day: number;
  irrigation_state: IrrigationState;
  recommendation: string;
  recommended_depth_mm: number;
  recommended_window: string;
  water_saved_pct: number;
  last_irrigation: string | null;
  last_irrigation_human: string | null;
  insight: string;
  recent_readings: SoilReadingRow[];
  series: Series[];
}

export interface ForecastDay {
  day: string;
  date: string;
  t_max: number;
  t_min: number;
  humidity: number;
  rain_probability: number;
  rain_mm: number;
  condition: string;
}

export interface WeatherSummary {
  field_id: string;
  location: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  light_lux: number;
  vpd_kpa: number;
  dew_point_c: number;
  condition: string;
  wind_note: string;
  heat_risk: RiskLevel;
  drought_risk: RiskLevel;
  rain_risk: RiskLevel;
  agricultural_implication: string;
  recommended_action: string;
  forecast: ForecastDay[];
  hourly: Series[];
}

export interface CropHealthIndicator {
  label: string;
  value: string;
  status: MetricStatus;
  source: DataSourceTag;
  note?: string | null;
}

export interface CropHealth {
  field_id: string;
  field_name: string;
  crop: string;
  growth_stage: string;
  days_after_sowing: number;
  gdd_accumulated: number;
  health_score: number;
  health_label: string;
  trend: TrendDir;
  observed_indicators: CropHealthIndicator[];
  risk_indicators: CropHealthIndicator[];
  recent_changes: string[];
  recommendations: string[];
  series: Series[];
  disclaimer: string;
}

export interface Insight {
  id: string;
  field_id: string;
  field_name: string;
  title: string;
  category: string;
  observed: string;
  interpretation: string;
  action: string;
  confidence: number;
  severity: Severity;
  generated_at: string;
  method: string;
  evidence: Evidence[];
}

export interface RiskItem {
  hazard: string;
  label: string;
  level: RiskLevel;
  score: number;
  trend: TrendDir;
  horizon: string;
  why: string;
  drivers: Evidence[];
  action: string;
  confidence: number;
  forecast: number[];
}

export interface RiskForecast {
  field_id: string;
  field_name: string;
  overall_level: RiskLevel;
  overall_score: number;
  horizon_days: number;
  days: string[];
  risks: RiskItem[];
  method: string;
}

export interface SensorSummary {
  sensor_id: string;
  field_id: string;
  field_name: string;
  device_id: string;
  sensor_type: SensorType;
  label: string;
  hardware: string;
  placement: string;
  value: number | null;
  unit: string;
  status: string;
  health: string;
  health_score: number;
  trend: TrendDir;
  delta_24h: number | null;
  last_update: string | null;
  last_update_human: string | null;
  optimal_min: number | null;
  optimal_max: number | null;
  battery_mv: number | null;
  rssi: number | null;
}

export interface SensorDetail {
  sensor: SensorSummary;
  series: Series;
  recent_readings: {
    timestamp: string;
    value: number;
    raw_value: number | null;
    raw_unit: string | null;
    unit: string;
    status: string;
  }[];
}

export interface DeviceInfo {
  device_id: string;
  name: string;
  field_id: string;
  field_name: string;
  status: string;
  firmware: string;
  battery_mv: number;
  battery_pct: number;
  rssi: number;
  last_seen: string;
  last_seen_human: string;
  uptime_hours: number;
  buffered_packets: number;
  packets_24h: number;
  expected_packets_24h: number;
  sensors: string[];
  latitude: number;
  longitude: number;
}

export interface DeviceHealth {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  buffered_packets: number;
  uplink_rate: number;
}

export interface DashboardSnapshot {
  farm_name: string;
  location: string;
  generated_at: string;
  farm_health_score: number;
  farm_health_label: string;
  farm_status_line: string;
  fields_total: number;
  fields_needing_attention: number;
  metrics: MetricSummary[];
  alerts: Alert[];
  actions: Action[];
  insights: Insight[];
  fields: FieldSummary[];
  sensors: SensorSummary[];
  soil: SoilStatus;
  weather: WeatherSummary;
  risk: RiskForecast;
  series: Series[];
  device_health: DeviceHealth;
}

export interface FieldDetail {
  field: FieldSummary;
  metrics: MetricSummary[];
  series: Series[];
  sensors: SensorSummary[];
  alerts: Alert[];
  actions: Action[];
  soil: SoilStatus;
  weather: WeatherSummary;
  crop_health: CropHealth;
}

export interface DetectionResult {
  id: string;
  field_id: string;
  crop: string;
  image_name: string;
  image_size_bytes: number;
  suspected_condition: string;
  condition_type: string;
  confidence: number;
  severity: Severity;
  affected_area_pct: number;
  possible_cause: string;
  recommended_action: string;
  followups: string[];
  alternatives: { condition: string; type: string; confidence: number }[];
  analyzed_at: string;
  model_name: string;
  model_version: string;
  is_mock: boolean;
  disclaimer: string;
}

export interface ChatResponse {
  reply: string;
  intent: string;
  grounded_on: Evidence[];
  suggestions: string[];
  is_mock: boolean;
  answered_at: string;
}

export interface AnalyticsResponse {
  range_days: number;
  series: Series[];
  resource_usage: {
    key?: 'water' | 'events' | 'energy' | 'cost';
    label: string;
    value: number;
    unit: string;
    baseline: number;
    change_pct: number;
    note: string;
  }[];
  yield_metrics: { key?: string; label: string; value: number; unit: string; note: string }[];
  crop_health_trend: Series[];
  highlights: string[];
  disclaimer: string;
  /** Current value + status per measured channel (drives the simple view). */
  metrics?: MetricSummary[];
}

export interface ReportItem {
  id: string;
  title: string;
  period: string;
  type: string;
  generated_at: string;
  size_kb: number;
  summary: string;
  formats: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  channel: string;
  severity: Severity;
  created_at: string;
  created_at_human: string;
  read: boolean;
}

export interface FarmMeta {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface SystemMeta {
  app: string;
  version: string;
  environment: string;
  data_source: string;
  simulated: boolean;
  scenario: string;
  scenario_label: string;
  repository: string;
  farm: FarmMeta;
  rule_version: string;
  derive_version: string;
}

export interface SettingsPayload {
  farm: FarmMeta;
  fields: {
    id: string;
    name: string;
    crop: string;
    threshold_pct: number;
    refill_point_pct: number;
    field_capacity_pct: number;
    soil_type: string;
    irrigation_type: string;
  }[];
  system: SystemMeta;
  units: Record<string, string>;
  notifications: {
    sms: boolean;
    in_app: boolean;
    email: boolean;
    quiet_hours: string;
    min_severity: string;
  };
}

export interface MapPayload {
  farm: FarmMeta;
  fields: FieldSummary[];
  devices: DeviceInfo[];
  alerts: Alert[];
  bounds: { min_lat: number; max_lat: number; min_lng: number; max_lng: number };
}

export interface AdvisoryBrief {
  field_id: string;
  field_name: string;
  language: string;
  text: string;
  rules_text: string;
  engine: 'rules' | 'llm';
  reason: string | null;
  alert_ids: string[];
}
