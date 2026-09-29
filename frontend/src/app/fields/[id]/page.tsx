'use client';

import { ArrowLeft, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { PageState } from '@/components/PageState';
import { TrendChart } from '@/components/charts';
import {
  ActionItem,
  AlertCard,
  EvidenceList,
  IndicatorRow,
  MetricTile,
  SensorCard,
} from '@/components/domain';
import { GaugeRing } from '@/components/charts';
import {
  Badge,
  Chip,
  Disclaimer,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Segmented,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { COLORS } from '@/config/theme';
import { cx, dateTime, healthFill, num, riskTone, shortDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { FieldDetail } from '@/types/api';

export default function FieldDetailPage() {
  const params = useParams<{ id: string }>();
  const fieldId = params?.id ?? '';
  const { data, meta, loading, error, refresh } = useApi<FieldDetail>(`/fields/${fieldId}`);
  const [seriesKey, setSeriesKey] = useState<string>('soil_moisture');

  return (
    <>
      <Link
        href="/fields"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All fields
      </Link>

      <PageState loading={loading} error={error} onRetry={refresh}>
        {data ? (
          <>
            <PageHeader
              title={data.field.name}
              description={`${data.field.crop} (${data.field.variety}) · ${num(data.field.area_ha)} ha · sown ${shortDate(data.field.sown_on)} · ${data.field.days_after_sowing} days after sowing`}
              meta={
                <>
                  <Chip>{data.field.growth_stage}</Chip>
                  <Chip>{data.field.soil_type}</Chip>
                  <Chip>{data.field.irrigation_type} irrigation</Chip>
                  <span
                    className={cx(
                      'rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide',
                      riskTone[data.field.risk_level],
                    )}
                  >
                    {data.field.risk_level} risk
                  </span>
                  {meta ? <SourceTag source={meta.data_source} /> : null}
                </>
              }
            />

            <div className="space-y-5">
              {/* Health band */}
              <Panel className="grid gap-6 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex items-center gap-4">
                  <GaugeRing
                    value={data.field.health_score}
                    color={healthFill(data.field.health_score)}
                    size={112}
                    caption="/ 100"
                  />
                  <div>
                    <p className="eyebrow">Field health</p>
                    <p className="font-display text-lg text-leaf-900">{data.field.health_label}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {data.crop_health.gdd_accumulated} GDD accumulated
                    </p>
                  </div>
                </div>

                <div className="min-w-0 lg:border-l lg:border-line lg:pl-6">
                  <p className="eyebrow">Top risk</p>
                  <p className="mt-1 font-display text-[1.05rem] text-leaf-900">{data.field.top_risk}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {data.weather.agricultural_implication}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip>
                      <span className="text-ink-faint">Alerts</span>
                      <span className="num font-medium text-ink">{data.alerts.length}</span>
                    </Chip>
                    <Chip>
                      <span className="text-ink-faint">Actions</span>
                      <span className="num font-medium text-ink">{data.actions.length}</span>
                    </Chip>
                    <Chip>
                      <span className="text-ink-faint">Last reading</span>
                      <span className="num">{data.field.last_reading_human ?? '—'}</span>
                    </Chip>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-line pt-4 lg:grid-cols-1 lg:gap-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <div>
                    <p className="eyebrow">Irrigation</p>
                    <p className="font-display text-lg capitalize text-leaf-900">
                      {data.field.irrigation_state}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Depletion</p>
                    <p className="num font-display text-[1.05rem] text-leaf-900">{num(data.soil.depletion_pct)}%</p>
                  </div>
                </div>
              </Panel>

              {/* Metrics */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {data.metrics.map((metric) => (
                  <MetricTile key={metric.key} metric={metric} />
                ))}
              </div>

              {/* Trends */}
              <Panel>
                <PanelHeader
                  title="Historical trends"
                  caption="Seven days of readings from this field's edge node."
                  action={
                    <Segmented
                      size="sm"
                      value={seriesKey}
                      onChange={setSeriesKey}
                      options={data.series.map((series) => ({
                        value: series.key,
                        label: series.label.split(' ')[0],
                      }))}
                    />
                  }
                />
                <div className="p-4 pt-2">
                  {data.series
                    .filter((series) => series.key === seriesKey)
                    .map((series) => (
                      <TrendChart
                        key={series.key}
                        series={series}
                        height={260}
                        span="week"
                        band={
                          series.key === 'soil_moisture'
                            ? { min: data.soil.threshold_pct, max: data.soil.field_capacity_pct }
                            : undefined
                        }
                        reference={
                          series.key === 'soil_moisture'
                            ? [{ value: data.soil.refill_point_pct, label: 'Refill point' }]
                            : undefined
                        }
                      />
                    ))}
                </div>
              </Panel>

              {/* Soil + weather */}
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel>
                  <PanelHeader eyebrow="Soil & irrigation" title="Water plan" />
                  <div className="p-5">
                    <ProgressBar
                      value={(data.soil.moisture_pct / data.soil.field_capacity_pct) * 100}
                      tone={data.soil.moisture_pct <= data.soil.threshold_pct ? COLORS.warning : COLORS.healthy}
                      label="Soil moisture against field capacity"
                    />
                    <div className="num mt-1.5 flex justify-between text-2xs text-ink-faint">
                      <span>Refill {data.soil.refill_point_pct}%</span>
                      <span>Now {num(data.soil.moisture_pct)}%</span>
                      <span>Capacity {data.soil.field_capacity_pct}%</span>
                    </div>
                    <div className="mt-4 divide-y divide-line border-t border-line">
                      <StatRow label="Soil temperature" value={`${num(data.soil.soil_temp_c)} °C`} />
                      <StatRow label="ET₀" value={`${num(data.soil.et0_mm_day, 2)} mm/day`} />
                      <StatRow label="Recommended depth" value={`${num(data.soil.recommended_depth_mm)} mm`} />
                      <StatRow label="Best window" value={data.soil.recommended_window} />
                      <StatRow label="Last irrigation" value={data.soil.last_irrigation_human ?? '—'} />
                    </div>
                    <p className="mt-4 rounded-lg border border-sky-300/50 bg-sky-100/60 px-3 py-2 text-xs leading-relaxed text-sky-700">
                      {data.soil.recommendation}
                    </p>
                  </div>
                </Panel>

                <Panel>
                  <PanelHeader
                    eyebrow="Weather & climate"
                    title={`${num(data.weather.temperature_c)}°C · ${data.weather.condition}`}
                    caption={data.weather.wind_note}
                  />
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Humidity', value: `${num(data.weather.humidity_pct)}%` },
                        { label: 'Feels like', value: `${num(data.weather.feels_like_c)}°C` },
                        { label: 'VPD', value: `${num(data.weather.vpd_kpa, 2)} kPa` },
                        { label: 'Light', value: `${num(data.weather.light_lux, 0)} lx` },
                      ].map((item) => (
                        <div key={item.label} className="panel-quiet px-3 py-2.5">
                          <p className="text-2xs uppercase tracking-wide text-ink-faint">{item.label}</p>
                          <p className="num mt-0.5 text-sm font-medium text-ink">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone={data.weather.heat_risk === 'low' ? 'leaf' : 'clay'}>
                        Heat {data.weather.heat_risk}
                      </Badge>
                      <Badge tone={data.weather.drought_risk === 'low' ? 'leaf' : 'ember'}>
                        Drought {data.weather.drought_risk}
                      </Badge>
                      <Badge tone={data.weather.rain_risk === 'low' ? 'leaf' : 'sky'}>
                        Rain {data.weather.rain_risk}
                      </Badge>
                    </div>
                    <p className="mt-4 rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2 text-xs text-leaf-800">
                      {data.weather.recommended_action}
                    </p>
                  </div>
                </Panel>
              </div>

              {/* Crop health */}
              <Panel>
                <PanelHeader
                  eyebrow="Crop health"
                  title={`${data.crop_health.health_label} · ${data.crop_health.growth_stage}`}
                  caption={`${data.crop_health.crop} at ${data.crop_health.days_after_sowing} days after sowing.`}
                  action={<SourceTag source="derived" />}
                />
                <div className="grid gap-6 p-5 lg:grid-cols-2">
                  <div>
                    <p className="eyebrow mb-1">Observed indicators</p>
                    {data.crop_health.observed_indicators.map((indicator) => (
                      <IndicatorRow key={indicator.label} indicator={indicator} />
                    ))}
                  </div>
                  <div>
                    <p className="eyebrow mb-1">Risk indicators</p>
                    {data.crop_health.risk_indicators.map((indicator) => (
                      <IndicatorRow key={indicator.label} indicator={indicator} />
                    ))}
                  </div>
                </div>
                <div className="border-t border-line px-5 py-4">
                  <Disclaimer>{data.crop_health.disclaimer}</Disclaimer>
                </div>
              </Panel>

              {/* Sensors */}
              <section>
                <h2 className="mb-3 font-display text-[1.05rem] text-leaf-900">Sensors on this field</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  {data.sensors.map((sensor) => (
                    <SensorCard key={sensor.sensor_id} sensor={sensor} />
                  ))}
                </div>
              </section>

              {/* Actions + alerts */}
              <div className="grid gap-5 xl:grid-cols-2">
                <Panel className="overflow-hidden">
                  <PanelHeader title="Recommended actions" caption="Generated from this field's open alerts." />
                  {data.actions.length === 0 ? (
                    <EmptyState
                      icon={<CircleCheck className="h-5 w-5 text-leaf-500" />}
                      title="Nothing to do"
                      message="This field is inside its working ranges."
                    />
                  ) : (
                    <ol className="divide-y divide-line">
                      {data.actions.map((action, index) => (
                        <ActionItem key={action.id} action={action} index={index} />
                      ))}
                    </ol>
                  )}
                </Panel>

                <div className="space-y-4">
                  <h2 className="font-display text-[1.05rem] text-leaf-900">Alerts</h2>
                  {data.alerts.length === 0 ? (
                    <Panel>
                      <EmptyState
                        icon={<CircleCheck className="h-5 w-5 text-leaf-500" />}
                        title="No active alerts"
                        message="No threshold has been crossed in the monitoring window."
                      />
                    </Panel>
                  ) : (
                    data.alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
                  )}
                </div>
              </div>

              <Panel className="p-5">
                <p className="eyebrow mb-3">Recent change log</p>
                <ul className="space-y-2">
                  {data.crop_health.recent_changes.map((change) => (
                    <li key={change} className="flex gap-2.5 text-sm text-ink-soft">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                      {change}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-line pt-3">
                  <EvidenceList
                    evidence={[
                      { label: 'Field id', value: data.field.id, source: 'derived' },
                      { label: 'Coordinates', value: `${data.field.latitude}, ${data.field.longitude}`, source: 'derived' },
                      { label: 'Last reading', value: dateTime(data.field.last_reading_at), source: 'measured' },
                      { label: 'Active alerts', value: String(data.field.active_alerts), source: 'derived' },
                    ]}
                  />
                </div>
              </Panel>
            </div>
          </>
        ) : null}
      </PageState>
    </>
  );
}
