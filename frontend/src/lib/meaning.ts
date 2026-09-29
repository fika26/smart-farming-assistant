/**
 * Plain-language translation layer.
 *
 * The product's job is to turn a measurement into agricultural meaning, so no screen
 * ever asks a farmer to interpret a raw number. Everything here is wording only —
 * thresholds and statuses are decided by the backend rule engine.
 */
import { translate } from '@/lib/i18n';
import { getLanguage } from '@/lib/language';
import type { MetricStatus, MetricSummary, SensorSummary, Severity } from '@/types/api';

/**
 * A record whose values are looked up in the current language at read time,
 * so the existing `statusWord[status]` call sites stay unchanged while
 * following the language selector.
 */
function localized<K extends string>(prefix: string, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  keys.forEach((key) => {
    Object.defineProperty(out, key, {
      enumerable: true,
      get: () => translate(getLanguage(), `${prefix}.${key}`),
    });
  });
  return out;
}

const STATUSES = ['normal', 'watch', 'warning', 'critical'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'info'] as const;

/** One word the user can act on, never colour alone. */
export const statusWord: Record<MetricStatus, string> = localized('status', STATUSES);

export const statusShortWord: Record<MetricStatus, string> = localized('statusShort', STATUSES);

/** Severity answers "how soon must I do something?" in words, not just colour. */
export const severityUrgency: Record<Severity, string> = localized('urgency', SEVERITIES);

export const severityMeaning: Record<Severity, string> = localized('sevMeaning', SEVERITIES);

type Direction = 'low' | 'high' | 'ok';

const PHRASE_KEYS = new Set([
  'soil_moisture',
  'air_temperature',
  'soil_temperature',
  'humidity',
  'light',
  'vpd',
]);

function phrase(key: string, dir: Direction): string {
  const group = PHRASE_KEYS.has(key) ? key : 'fallback';
  return translate(getLanguage(), `phrase.${group}.${dir}`);
}

function direction(
  value: number | null,
  min: number | null,
  max: number | null,
  status: MetricStatus,
): Direction {
  if (status === 'normal') return 'ok';
  if (value === null) return 'ok';
  if (min !== null && value < min) return 'low';
  if (max !== null && value > max) return 'high';
  return 'ok';
}

/** What a dashboard metric actually means for the crop. */
export function metricMeaning(metric: MetricSummary): string {
  if (metric.key === 'light' && (metric.value ?? 0) < 400) {
    return translate(getLanguage(), 'phrase.night');
  }
  return phrase(metric.key, direction(metric.value, metric.optimal_min, metric.optimal_max, metric.status));
}

/** Sensor channels use the same wording, keyed off the sensor type. */
export const SENSOR_KEY: Record<string, string> = {
  soil_moisture: 'soil_moisture',
  ds18b20_temperature: 'soil_temperature',
  sht31_temperature: 'air_temperature',
  sht31_humidity: 'humidity',
  bh1750_light: 'light',
};

export function sensorStatus(sensor: SensorSummary): MetricStatus {
  if (sensor.status !== 'ok' || sensor.health === 'fault') return 'critical';
  if (sensor.value === null) return 'warning';
  const { optimal_min: min, optimal_max: max, value } = sensor;
  if (sensor.sensor_type === 'bh1750_light' && value < 400) return 'normal';
  if (min !== null && value < min) return value < min * 0.85 ? 'critical' : 'warning';
  if (max !== null && value > max) return value > max * 1.15 ? 'critical' : 'warning';
  if (min !== null && max !== null && (value < min * 1.08 || value > max * 0.92)) return 'watch';
  return 'normal';
}

export function sensorMeaning(sensor: SensorSummary): string {
  if (sensor.status !== 'ok') return translate(getLanguage(), 'phrase.notReporting');
  if (sensor.sensor_type === 'bh1750_light' && (sensor.value ?? 0) < 400) {
    return translate(getLanguage(), 'phrase.night');
  }
  const key = SENSOR_KEY[sensor.sensor_type] ?? '';
  return phrase(key, direction(sensor.value, sensor.optimal_min, sensor.optimal_max, sensorStatus(sensor)));
}

/** Irrigation state in words a farmer would use. */
export const irrigationMeaning: Record<string, string> = localized('irrigation', [
  'idle',
  'running',
  'recommended',
  'scheduled',
] as const);

/** Trend in plain words rather than an arrow alone. */
export function trendWord(trend: string, unitLabel = 'reading'): string {
  const key = trend === 'rising' || trend === 'falling' ? trend : 'stable';
  return translate(getLanguage(), `trend.${key}`, { label: unitLabel });
}
