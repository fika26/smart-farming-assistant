'use client';

import {
  ArrowRight,
  BatteryMedium,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Droplet,
  Gauge,
  Info,
  Signal,
  Sprout,
  Sun,
  Thermometer,
  TriangleAlert,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { GaugeRing, Sparkline } from '@/components/charts';
import { COLORS, seriesColor } from '@/config/theme';
import { Badge, Chip, InfoTip, ProgressBar, SourceTag } from '@/components/ui';
import {
  irrigationMeaning,
  metricMeaning,
  sensorMeaning,
  sensorStatus,
  severityMeaning,
  severityUrgency,
  statusShortWord,
  statusWord,
  trendWord,
} from '@/lib/meaning';
import {
  cx,
  healthFill,
  healthTone,
  num,
  riskFill,
  riskTone,
  severityBar,
  statusFill,
  severityTone,
  signed,
  statusDot,
  statusTone,
  trendGlyph,
} from '@/lib/format';
import type {
  Action,
  Alert,
  CropHealthIndicator,
  Evidence,
  FieldSummary,
  Insight,
  MetricSummary,
  RiskItem,
  SensorSummary,
  TrendPoint,
} from '@/types/api';

/** Plain explanations for the measurements a farmer may not have met before. */
const METRIC_HELP: Record<string, string> = {
  vpd:
    'Vapour pressure deficit — how hard the air is pulling water out of the leaves. Above about 1.6 kPa the crop loses water faster than the roots replace it.',
  light:
    'Light reaching the canopy, measured in lux by the BH1750. The caption shows the daily total (DLI), which is what drives growth.',
  soil_temperature:
    'Temperature in the root zone at 15 cm, from the DS18B20. It lags air temperature by about four hours.',
};

const METRIC_ICONS: Record<string, ReactNode> = {
  soil_moisture: <Droplet className="h-4 w-4" aria-hidden="true" />,
  air_temperature: <Thermometer className="h-4 w-4" aria-hidden="true" />,
  soil_temperature: <Waves className="h-4 w-4" aria-hidden="true" />,
  humidity: <Droplet className="h-4 w-4" aria-hidden="true" />,
  light: <Sun className="h-4 w-4" aria-hidden="true" />,
  vpd: <Gauge className="h-4 w-4" aria-hidden="true" />,
};

export function MetricTile({
  metric,
  spark,
}: {
  metric: MetricSummary;
  spark?: TrendPoint[];
}) {
  const tone = statusTone[metric.status];
  return (
    <div className="panel interactive flex flex-col justify-between p-4 hover:border-line-strong hover:shadow-raise">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-ink-muted">
          <span className={cx('rounded-md border p-1.5', tone)}>
            {METRIC_ICONS[metric.key] ?? <Gauge className="h-4 w-4" aria-hidden="true" />}
          </span>
          <span className="text-sm font-medium text-ink-soft">{metric.label}</span>
          {METRIC_HELP[metric.key] ? (
            <InfoTip label={metric.label}>{METRIC_HELP[metric.key]}</InfoTip>
          ) : null}
        </div>
        <SourceTag source={metric.source} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="num font-display text-[1.5rem] leading-none text-ink">
          {num(metric.value, metric.key === 'light' ? 0 : 1)}
        </span>
        <span className="mb-0.5 text-sm text-ink-muted">{metric.unit}</span>
        {metric.delta_24h !== null ? (
          <span
            className={cx(
              'num mb-0.5 ml-auto text-xs font-medium',
              metric.delta_24h > 0 ? 'text-leaf-600' : metric.delta_24h < 0 ? 'text-clay-700' : 'text-ink-faint',
            )}
            title={`${trendWord(metric.trend, metric.label)} — ${signed(metric.delta_24h)} ${metric.unit} in 24 hours`}
          >
            {trendGlyph[metric.trend]} {signed(metric.delta_24h)}
          </span>
        ) : null}
      </div>

      {/* Status in words, then what it means for the crop. Never colour alone. */}
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', statusDot[metric.status])} />
        <span
          className={
            metric.status === 'normal'
              ? 'text-leaf-700'
              : metric.status === 'watch'
                ? 'text-sky-700'
                : metric.status === 'warning'
                  ? 'text-clay-700'
                  : 'text-ember-700'
          }
        >
          {statusShortWord[metric.status]}
        </span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{metricMeaning(metric)}</p>

      {spark?.length ? (
        <div className="mt-2 -mx-1">
          <Sparkline points={spark} color={seriesColor(metric.key)} height={30} />
        </div>
      ) : null}

      {metric.optimal_min !== null && metric.optimal_max !== null && metric.value !== null ? (
        <div className="mt-3">
          <ProgressBar
            value={
              ((metric.value - metric.optimal_min) / (metric.optimal_max - metric.optimal_min)) * 100
            }
            tone={statusFill[metric.status]}
            height={4}
            label={`${metric.label} against its optimal band`}
          />
          <div className="mt-1.5 flex items-center justify-between text-2xs text-ink-faint">
            <span className="num">
              Optimal {num(metric.optimal_min, 0)}–{num(metric.optimal_max, 0)} {metric.unit}
            </span>
            {metric.caption ? <span>{metric.caption}</span> : null}
          </div>
        </div>
      ) : metric.caption ? (
        <p className="mt-3 text-2xs text-ink-faint">{metric.caption}</p>
      ) : null}
    </div>
  );
}

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (!evidence.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {evidence.map((item) => (
        <div key={`${item.label}-${item.value}`} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-ink-faint">
            {item.label}
            <SourceTag source={item.source} className="scale-90" />
          </dt>
          <dd className="num mt-0.5 truncate text-sm font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AlertCard({
  alert,
  compact,
  defaultOpen,
}: {
  alert: Alert;
  compact?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? !compact);

  return (
    <article className="panel interactive overflow-hidden hover:border-line-strong hover:shadow-raise">
      <div className="flex">
        <div className={cx('w-1 shrink-0', severityBar[alert.severity])} aria-hidden="true" />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em]',
                severityTone[alert.severity],
              )}
              title={severityMeaning[alert.severity]}
            >
              {alert.severity === 'critical' ? (
                <CircleAlert className="h-3 w-3" aria-hidden="true" />
              ) : alert.severity === 'info' ? (
                <Info className="h-3 w-3" aria-hidden="true" />
              ) : (
                <TriangleAlert className="h-3 w-3" aria-hidden="true" />
              )}
              {alert.severity} · {severityUrgency[alert.severity]}
            </span>
            <Badge tone="neutral">{alert.category}</Badge>
            <Link
              href={`/fields/${alert.field_id}`}
              className="text-xs font-medium text-leaf-700 underline-offset-2 hover:underline"
            >
              {alert.field_name}
            </Link>
            <span className="ml-auto flex items-center gap-1 text-2xs text-ink-faint">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {alert.opened_at_human}
            </span>
          </div>

          <h3 className="mt-2.5 font-display text-[0.98rem] leading-snug text-leaf-900">
            {alert.title}
          </h3>

          <div className="mt-3 space-y-2.5 text-sm leading-relaxed">
            <p className="text-ink-soft">
              <span className="eyebrow mr-2 text-ink-faint">Observed</span>
              {alert.what}
            </p>

            {/* The reasoning chain opens on click, so a busy screen stays scannable. */}
            <div
              className={cx(
                'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="pb-2.5 text-ink-soft">
                  <span className="eyebrow mr-2 text-ink-faint">Why it matters</span>
                  {alert.why}
                </p>
              </div>
            </div>

            <p className="rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2 text-leaf-800">
              <span className="eyebrow mr-2 text-leaf-600">Do this</span>
              {alert.action}
            </p>
          </div>

          <div
            className={cx(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
              open ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <div className="border-t border-line pt-3">
                <p className="eyebrow mb-2">Evidence behind this alert</p>
                <EvidenceList evidence={alert.evidence} />
                <p className="mt-3 text-2xs text-ink-faint">
                  Rule {alert.rule_id} · v{alert.rule_version} · confidence{' '}
                  {Math.round(alert.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="press mt-3 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-leaf-700 transition-colors hover:text-leaf-900"
          >
            {open ? 'Hide the reasoning' : 'Why am I seeing this?'}
            <ChevronDown
              className={cx('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ActionItem({
  action,
  index,
  done,
  onToggle,
}: {
  action: Action;
  index: number;
  done?: boolean;
  onToggle?: (id: string) => void;
}) {
  const tone =
    action.priority === 'urgent'
      ? 'border-ember-300/60 bg-ember-100/50 text-ember-700'
      : action.priority === 'high'
        ? 'border-clay-300/60 bg-clay-100/50 text-clay-700'
        : 'border-line bg-raised text-ink-muted';

  return (
    <li
      className={cx(
        'group flex gap-3 border-b border-line px-5 py-4 transition-colors last:border-0',
        done ? 'bg-leaf-50/50' : 'hover:bg-raised/70',
      )}
    >
      {onToggle ? (
        <button
          type="button"
          onClick={() => onToggle(action.id)}
          aria-pressed={done}
          aria-label={done ? `Mark "${action.title}" as not done` : `Mark "${action.title}" as done`}
          className={cx(
            'press mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
            done ? 'border-leaf-500 bg-leaf-500 text-canvas' : tone,
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="num">{index + 1}</span>}
        </button>
      ) : (
        <span
          className={cx(
            'num mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold',
            tone,
          )}
        >
          {index + 1}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4
            className={cx(
              'font-medium leading-snug transition-colors',
              done ? 'text-ink-muted line-through' : 'text-ink',
            )}
          >
            {action.title}
          </h4>
          <span
            className={cx(
              'rounded border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide',
              tone,
            )}
          >
            {action.priority}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{action.rationale}</p>
        {action.detail ? (
          <p className="mt-1.5 text-xs leading-relaxed text-leaf-800">{action.detail}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-faint">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {action.due_window}
          </span>
          <span>{action.estimated_impact}</span>
          <Link
            href={`/fields/${action.field_id}`}
            className="text-leaf-700 underline-offset-2 hover:underline"
          >
            {action.field_name}
          </Link>
        </div>
      </div>
    </li>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={insight.severity === 'info' ? 'leaf' : insight.severity === 'high' ? 'clay' : 'sun'}>
          {insight.category}
        </Badge>
        <span className="text-xs text-ink-muted">{insight.field_name}</span>
        <span className="ml-auto text-2xs text-ink-faint">
          {insight.method} · {Math.round(insight.confidence * 100)}% confidence
        </span>
      </div>
      <h3 className="mt-3 font-display text-[0.98rem] text-leaf-900">{insight.title}</h3>

      <ol className="mt-3 space-y-0">
        {[
          { label: 'Observed', body: insight.observed, tone: 'text-ink' },
          { label: 'Interpretation', body: insight.interpretation, tone: 'text-ink-soft' },
          { label: 'Action', body: insight.action, tone: 'text-leaf-800' },
        ].map((step, index, array) => (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  'mt-1 h-2 w-2 shrink-0 rounded-full',
                  index === 2 ? 'bg-leaf-500' : 'bg-line-strong',
                )}
              />
              {index < array.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{step.label}</p>
              <p className={cx('mt-0.5 text-sm leading-relaxed', step.tone)}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {insight.evidence.length ? (
        <div className="mt-1 border-t border-line pt-3">
          <EvidenceList evidence={insight.evidence} />
        </div>
      ) : null}
    </article>
  );
}

export function FieldCard({ field }: { field: FieldSummary }) {
  return (
    <Link
      href={`/fields/${field.id}`}
      className="panel press group block p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raise"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-leaf-500" aria-hidden="true" />
            <h3 className="font-display text-lg leading-tight text-ink">{field.name}</h3>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {field.crop} · {field.variety} · {num(field.area_ha, 1)} ha
          </p>
        </div>
        <GaugeRing
          value={field.health_score}
          color={healthFill(field.health_score)}
          size={68}
          stroke={6}
          caption="health"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
        <FieldStat
          label="Soil moisture"
          value={`${num(field.soil_moisture)}% · ${statusShortWord[field.soil_moisture_status]}`}
          status={field.soil_moisture_status}
        />
        <FieldStat label="Stage" value={field.growth_stage} />
        <FieldStat label="Irrigation" value={irrigationMeaning[field.irrigation_state] ?? field.irrigation_state} />
        <FieldStat
          label="Alerts"
          value={field.active_alerts === 0 ? 'None open' : `${field.active_alerts} open`}
          status={field.active_alerts > 0 ? 'warning' : 'normal'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={cx('rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide', riskTone[field.risk_level])}>
          {field.risk_level} risk
        </span>
        <span className="truncate text-xs text-ink-muted">{field.top_risk}</span>
        <span className="ml-auto flex items-center gap-1 text-2xs text-ink-faint">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Updated {field.last_reading_human ?? 'never'}
        </span>
      </div>

      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-leaf-600">
        Open field detail
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function FieldStat({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: MetricSummary['status'];
}) {
  return (
    <div className="min-w-0">
      <p className="text-2xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium capitalize text-ink">
        {status ? <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', statusDot[status])} /> : null}
        <span className="num truncate">{value}</span>
      </p>
    </div>
  );
}

export function SensorCard({
  sensor,
  spark,
  onSelect,
  selected,
}: {
  sensor: SensorSummary;
  spark?: TrendPoint[];
  onSelect?: (sensorId: string) => void;
  selected?: boolean;
}) {
  const healthy = sensor.health === 'healthy';
  const state = sensorStatus(sensor);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{sensor.label}</p>
          <p className="mt-0.5 truncate text-2xs text-ink-faint">{sensor.hardware}</p>
        </div>
        <span
          className={cx(
            'mt-1 h-2 w-2 shrink-0 rounded-full',
            healthy ? 'animate-pulse-dot bg-leaf-500' : sensor.health === 'degraded' ? 'bg-clay-500' : 'bg-ember-500',
          )}
          title={`Sensor health: ${sensor.health}`}
        />
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="num font-display text-2xl leading-none text-ink">
          {num(sensor.value, sensor.sensor_type === 'bh1750_light' ? 0 : 1)}
        </span>
        <span className="mb-0.5 text-xs text-ink-muted">{sensor.unit}</span>
        <span className="num mb-0.5 ml-auto text-2xs text-ink-faint">
          {trendGlyph[sensor.trend]} {signed(sensor.delta_24h)}
        </span>
      </div>

      {spark?.length ? (
        <div className="mt-1 -mx-1">
          <Sparkline points={spark} height={28} color={healthy ? COLORS.healthy : COLORS.warning} />
        </div>
      ) : null}

      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', statusDot[state])} />
        <span
          className={
            state === 'normal'
              ? 'text-leaf-700'
              : state === 'watch'
                ? 'text-sky-700'
                : state === 'warning'
                  ? 'text-clay-700'
                  : 'text-ember-700'
          }
        >
          {statusShortWord[state]}
        </span>
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {sensorMeaning(sensor)}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-2xs text-ink-faint">
        <span className="truncate">{sensor.field_name}</span>
        <span>Updated {sensor.last_update_human ?? '—'}</span>
      </div>
    </>
  );

  const shell =
    'panel press interactive block w-full p-4 text-left hover:border-line-strong hover:shadow-raise';

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(sensor.sensor_id)}
        aria-pressed={selected}
        className={cx(shell, selected && 'ring-2 ring-leaf-400')}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href={`/sensors?sensor=${sensor.sensor_id}`} className={shell}>
      {body}
    </Link>
  );
}

export function RiskRow({ risk }: { risk: RiskItem }) {
  return (
    <article className="border-b border-line px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-ink">{risk.label}</h3>
        <span className={cx('rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide', riskTone[risk.level])}>
          {risk.level}
        </span>
        <span className="num ml-auto text-sm font-semibold text-ink">{risk.score}</span>
        <span className="text-2xs text-ink-faint">/100</span>
      </div>

      <div className="mt-2.5">
        <ProgressBar
          value={risk.score}
          tone={riskFill[risk.level]}
          height={5}
          label={`${risk.label} risk score`}
        />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        <span className="eyebrow mr-2 text-ink-faint">Why</span>
        {risk.why}
      </p>
      <p className="mt-2 rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2 text-sm text-leaf-800">
        <span className="eyebrow mr-2 text-leaf-600">Do</span>
        {risk.action}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {risk.drivers.map((driver) => (
          <Chip key={driver.label}>
            <span className="text-ink-faint">{driver.label}</span>
            <span className="num font-medium text-ink">{driver.value}</span>
            <SourceTag source={driver.source} className="scale-90" />
          </Chip>
        ))}
        <span className="ml-auto text-2xs text-ink-faint">
          {risk.horizon} · {Math.round(risk.confidence * 100)}% confidence
        </span>
      </div>
    </article>
  );
}

export function IndicatorRow({ indicator }: { indicator: CropHealthIndicator }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className={cx('h-1.5 w-1.5 rounded-full', statusDot[indicator.status])} />
          {indicator.label}
        </p>
        {indicator.note ? <p className="mt-0.5 text-2xs text-ink-faint">{indicator.note}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="num text-sm font-medium text-ink">{indicator.value}</span>
        <SourceTag source={indicator.source} />
      </div>
    </div>
  );
}

export function DeviceStat({
  icon,
  label,
  value,
}: {
  icon: 'battery' | 'signal' | 'alert';
  label: string;
  value: string;
}) {
  const Icon = icon === 'battery' ? BatteryMedium : icon === 'signal' ? Signal : CircleAlert;
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-ink-faint">{label}</span>
      <span className="num font-medium text-ink-soft">{value}</span>
    </span>
  );
}

export function HealthScore({
  score,
  label,
  size = 120,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <GaugeRing value={score} color={healthFill(score)} size={size} caption="/ 100" />
      <div>
        <p className="eyebrow">Farm health</p>
        <p className={cx('font-display text-xl', healthTone(score))}>{label}</p>
      </div>
    </div>
  );
}
