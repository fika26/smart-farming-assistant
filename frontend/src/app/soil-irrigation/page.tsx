'use client';

import { Droplets } from 'lucide-react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { TrendChart } from '@/components/charts';
import {
  Badge,
  Chip,
  Hint,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { COLORS } from '@/config/theme';
import { clockTime, cx, num, statusDot } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { SoilStatus } from '@/types/api';

export default function SoilIrrigationPage() {
  const { fieldId, fields, t } = useApp();
  const { data, meta, loading, error, refresh } = useApi<SoilStatus>('/soil', { field_id: fieldId });
  const field = fields.find((item) => item.id === data?.field_id);

  return (
    <>
      <PageHeader
        title={t('page.soilIrrigation.title')}
        description={t('page.soilIrrigation.description')}
        meta={
          <>
            {data ? <Chip>{data.field_name}</Chip> : null}
            {field ? <Chip>{field.soil_type} · {field.irrigation_type}</Chip> : null}
            {meta ? <SourceTag source={meta.data_source} /> : null}
          </>
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your soil and irrigation data"
        loadingLabel="Reading soil moisture from your field…"
      >
        {data ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
              <Panel className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow">Current soil moisture</p>
                    <p className="num mt-1 font-display text-[2.25rem] leading-none text-leaf-900">
                      {num(data.moisture_pct)}
                      <span className="ml-1 text-lg text-ink-muted">%</span>
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm capitalize text-ink-muted">
                      <span className={cx('h-1.5 w-1.5 rounded-full', statusDot[data.moisture_status])} />
                      {data.moisture_status} · irrigation {data.irrigation_state}
                    </p>
                  </div>
                  <Droplets className="h-10 w-10 text-leaf-200" aria-hidden="true" />
                </div>

                <div className="mt-6">
                  <ProgressBar
                    value={(data.moisture_pct / data.field_capacity_pct) * 100}
                    tone={data.moisture_pct <= data.threshold_pct ? COLORS.warning : COLORS.healthy}
                    height={8}
                    label="Soil moisture against field capacity"
                  />
                  <div className="num mt-2 flex justify-between text-2xs text-ink-faint">
                    <span>Refill point {data.refill_point_pct}%</span>
                    <span>Preferred threshold {data.threshold_pct}%</span>
                    <span>Field capacity {data.field_capacity_pct}%</span>
                  </div>
                </div>

                <div className="mt-5">
                  <Hint>
                    Think of the bar above as a water tank. Below the refill point the crop can no
                    longer pull water out of the soil.
                  </Hint>
                </div>
                <p className="mt-3 rounded-lg border border-sky-300/50 bg-sky-100/60 px-3 py-2.5 text-sm leading-relaxed text-sky-700">
                  <span className="eyebrow mr-2 text-sky-700">Prototype insight</span>
                  {data.insight}
                </p>
              </Panel>

              <Panel className="p-5">
                <p className="eyebrow">Irrigation recommendation</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{data.recommendation}</p>
                <div className="mt-4 divide-y divide-line border-t border-line">
                  <StatRow label="Recommended depth" value={`${num(data.recommended_depth_mm)} mm`} hint="derived" />
                  <StatRow label="Best window" value={data.recommended_window} />
                  <StatRow label="Depletion of available water" value={`${num(data.depletion_pct)}%`} hint="derived" />
                  <StatRow label="Reference ET₀" value={`${num(data.et0_mm_day, 2)} mm/day`} hint="derived" />
                  <StatRow label="Soil temperature" value={`${num(data.soil_temp_c)} °C`} hint="measured" />
                  <StatRow label="Last irrigation" value={data.last_irrigation_human ?? '—'} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge tone="leaf">Water saved ≈ {num(data.water_saved_pct)}%</Badge>
                  <span className="text-2xs text-ink-faint">
                    versus a fixed calendar schedule — prototype estimate
                  </span>
                </div>
              </Panel>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Panel>
                <PanelHeader
                  title="Moisture trend"
                  caption="72 hours. Shaded band is the preferred range; the dashed line is the refill point."
                  action={<SourceTag source="measured" />}
                />
                <div className="p-4 pt-2">
                  {data.series
                    .filter((series) => series.key === 'soil_moisture')
                    .map((series) => (
                      <TrendChart
                        key={series.key}
                        series={series}
                        height={240}
                        span="week"
                        band={{ min: data.threshold_pct, max: data.field_capacity_pct }}
                        reference={[{ value: data.refill_point_pct, label: 'Refill point' }]}
                      />
                    ))}
                </div>
                <div className="border-t border-line p-4">
                  {data.series
                    .filter((series) => series.key === 'soil_temperature')
                    .map((series) => (
                      <div key={series.key}>
                        <p className="eyebrow mb-2">Soil temperature (DS18B20, 15 cm)</p>
                        <TrendChart series={series} height={140} span="week" />
                      </div>
                    ))}
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <PanelHeader
                  title="Recent readings"
                  caption="Calibrated value with the raw capacitive ADC count preserved."
                />
                <div className="scroll-thin max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-raised">
                      <tr className="border-b border-line text-left">
                        {['Time', 'Moisture', 'Raw ADC', 'Status'].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_readings.map((row) => (
                        <tr key={row.timestamp} className="border-b border-line last:border-0">
                          <td className="num px-4 py-2.5 text-ink-muted">{clockTime(row.timestamp)}</td>
                          <td className="num px-4 py-2.5 font-medium text-ink">
                            {num(row.value)} {row.unit}
                          </td>
                          <td className="num px-4 py-2.5 text-ink-muted">{row.raw_value ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cx(
                                'rounded border px-1.5 py-0.5 text-2xs font-medium uppercase',
                                row.status === 'ok'
                                  ? 'border-leaf-200 bg-leaf-50 text-leaf-700'
                                  : 'border-ember-300/60 bg-ember-100 text-ember-700',
                              )}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <Panel className="p-5">
              <p className="eyebrow mb-2">Measured vs derived</p>
              <p className="text-sm leading-relaxed text-ink-muted">
                Soil moisture and soil temperature are <strong className="text-ink">measured</strong>{' '}
                by the capacitive probe and DS18B20 on the edge node. Depletion, ET₀, recommended
                depth, best window and water saving are{' '}
                <strong className="text-ink">derived</strong> — they are computed from those
                readings plus soil and crop parameters, not sensed directly. Every number in this
                product carries its provenance tag for exactly this reason.
              </p>
            </Panel>
          </div>
        ) : null}
      </PageState>
    </>
  );
}
