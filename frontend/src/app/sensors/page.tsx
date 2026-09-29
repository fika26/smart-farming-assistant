'use client';

import { Clock, Cpu, Radio } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { TrendChart } from '@/components/charts';
import { DeviceStat, SensorCard } from '@/components/domain';
import {
  Badge,
  Chip,
  InfoTip,
  LoadingPanel,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Segmented,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { COLORS } from '@/config/theme';
import { clockTime, num, signed, trendGlyph } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { DeviceInfo, SensorDetail, SensorSummary } from '@/types/api';

interface ServerTime {
  server_time: string;
  epoch: number;
  timezone: string;
}

const HARDWARE_NOTE =
  'Only the five channels physically present on the node are represented: capacitive soil moisture, DS18B20 soil temperature, SHT31 air temperature and humidity, BH1750 light, and the DS3231 real-time clock that stamps every sample.';

function SensorsInner() {
  const { fieldId, t } = useApp();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<'24' | '168'>('24');

  const sensorsState = useApi<SensorSummary[]>('/sensors', { field_id: fieldId });
  const devicesState = useApi<DeviceInfo[]>('/devices');
  const clockState = useApi<ServerTime>('/ingest/time');

  const sensors = sensorsState.data ?? [];
  const activeId = selected ?? params.get('sensor') ?? sensors[0]?.sensor_id ?? null;
  const detailState = useApi<SensorDetail>(
    `/sensors/${activeId ?? 'none'}`,
    { hours: Number(range) },
    Boolean(activeId),
  );

  useEffect(() => {
    const fromQuery = params.get('sensor');
    if (fromQuery) setSelected(fromQuery);
  }, [params]);

  return (
    <>
      <PageHeader
        title={t('page.sensors.title')}
        description={HARDWARE_NOTE}
        meta={
          <>
            <Chip>
              <Radio className="h-3 w-3 text-leaf-500" aria-hidden="true" />
              {sensors.length} channels
            </Chip>
            {sensorsState.meta ? <SourceTag source={sensorsState.meta.data_source} /> : null}
          </>
        }
      />

      <PageState
        loading={sensorsState.loading}
        error={sensorsState.error}
        onRetry={sensorsState.refresh}
        errorTitle="We couldn't load your sensor readings"
        loadingLabel="Reading the sensors in your fields…"
      >
        <div className="space-y-5">
          <section>
            <div className="mb-3">
              <h2 className="font-display text-[1.05rem] text-leaf-900">
                What your sensors are reading
              </h2>
              <p className="text-xs text-ink-muted">
                Tap any reading to see its history and whether the sensor itself is healthy.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {sensors.map((sensor) => (
                <SensorCard
                  key={sensor.sensor_id}
                  sensor={sensor}
                  selected={activeId === sensor.sensor_id}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <Panel>
              <PanelHeader
                title={detailState.data ? `${detailState.data.sensor.label} · ${detailState.data.sensor.field_name}` : 'Sensor history'}
                caption={
                  detailState.data
                    ? `${detailState.data.sensor.hardware} · ${detailState.data.sensor.placement}`
                    : 'Readings over the selected window'
                }
                action={
                  <div className="flex items-center gap-2">
                    <Segmented
                      size="sm"
                      value={range}
                      onChange={setRange}
                      options={[
                        { value: '24', label: '24 hours' },
                        { value: '168', label: '7 days' },
                      ]}
                    />
                    <SourceTag source="measured" />
                  </div>
                }
              />
              {detailState.loading ? (
                <div className="p-5">
                  <LoadingPanel rows={2} />
                </div>
              ) : detailState.data ? (
                <>
                  <div className="p-4 pt-2">
                    <TrendChart
                      series={detailState.data.series}
                      height={230}
                      span={range === '24' ? 'day' : 'week'}
                      band={
                        detailState.data.sensor.optimal_min !== null &&
                        detailState.data.sensor.optimal_max !== null
                          ? {
                              min: detailState.data.sensor.optimal_min,
                              max: detailState.data.sensor.optimal_max,
                            }
                          : undefined
                      }
                    />
                  </div>
                  <div className="scroll-thin max-h-64 overflow-y-auto border-t border-line">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-raised">
                        <tr className="border-b border-line text-left">
                          {['Time', 'Value', 'Raw', 'Status'].map((heading) => (
                            <th key={heading} className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailState.data.recent_readings.map((row) => (
                          <tr key={row.timestamp} className="border-b border-line last:border-0">
                            <td className="num px-4 py-2 text-ink-muted">{clockTime(row.timestamp)}</td>
                            <td className="num px-4 py-2 font-medium text-ink">
                              {num(row.value)} {row.unit}
                            </td>
                            <td className="num px-4 py-2 text-ink-muted">
                              {row.raw_value ?? '—'} {row.raw_unit ?? ''}
                            </td>
                            <td className="px-4 py-2 text-2xs uppercase text-ink-muted">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </Panel>

            <div className="space-y-5">
              {detailState.data ? (
                <Panel className="p-5">
                  <p className="eyebrow mb-3 flex items-center gap-1.5">
                    Channel health
                    <InfoTip label="Channel health">
                      A derived score, not a reading: it combines the reported sensor status, how
                      fresh the last uplink is, and the node&apos;s signal and battery.
                    </InfoTip>
                  </p>
                  <ProgressBar
                    value={detailState.data.sensor.health_score}
                    tone={detailState.data.sensor.health === 'healthy' ? COLORS.healthy : COLORS.warning}
                    label="Sensor health score"
                  />
                  <div className="mt-4 divide-y divide-line border-t border-line">
                    <StatRow
                      label="Current reading"
                      value={`${num(detailState.data.sensor.value)} ${detailState.data.sensor.unit}`}
                      hint="measured"
                    />
                    <StatRow
                      label="24 h change"
                      value={`${trendGlyph[detailState.data.sensor.trend]} ${signed(detailState.data.sensor.delta_24h)}`}
                    />
                    <StatRow label="Status" value={detailState.data.sensor.status} />
                    <StatRow label="Health" value={detailState.data.sensor.health} hint="derived" />
                    <StatRow label="Last update" value={detailState.data.sensor.last_update_human ?? '—'} />
                    <StatRow label="Device" value={detailState.data.sensor.device_id} />
                    <StatRow label="Placement" value={detailState.data.sensor.placement} />
                  </div>
                </Panel>
              ) : null}

              <Panel>
                <PanelHeader
                  title="DS3231 real-time clock"
                  caption="Every sample is stamped on the node before it leaves the field, so buffered readings keep their true time."
                  action={<Clock className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
                />
                <div className="divide-y divide-line px-5 py-2">
                  <StatRow label="Hardware" value="DS3231 (I²C, TCXO)" />
                  <StatRow
                    label="Server time"
                    value={clockState.data ? clockTime(clockState.data.server_time) : '—'}
                    hint={clockState.data?.timezone}
                  />
                  <StatRow
                    label="Last node stamp"
                    value={
                      detailState.data?.sensor.last_update
                        ? clockTime(detailState.data.sensor.last_update)
                        : '—'
                    }
                  />
                  <StatRow label="Sample interval" value="30 min" />
                  <StatRow label="Sync endpoint" value="GET /api/ingest/time" />
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Edge nodes"
                  caption="Fleet health for the ESP32 nodes that publish these channels."
                  action={<Cpu className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
                />
                <ul className="divide-y divide-line">
                  {(devicesState.data ?? []).map((device) => (
                    <li key={device.device_id} className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink">{device.name}</p>
                        <Badge
                          tone={
                            device.status === 'online'
                              ? 'leaf'
                              : device.status === 'degraded'
                                ? 'clay'
                                : 'ember'
                          }
                        >
                          {device.status}
                        </Badge>
                        <span className="num ml-auto text-2xs text-ink-faint">{device.last_seen_human}</span>
                      </div>
                      <p className="mt-1 text-2xs text-ink-faint">
                        {device.device_id} · firmware {device.firmware} · {device.field_name}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <DeviceStat icon="battery" label="Battery" value={`${device.battery_pct}% (${device.battery_mv} mV)`} />
                        <DeviceStat icon="signal" label="RSSI" value={`${device.rssi} dBm`} />
                        <DeviceStat icon="alert" label="Buffered" value={String(device.buffered_packets)} />
                      </div>
                      <div className="mt-2.5">
                        <ProgressBar
                          value={(device.packets_24h / device.expected_packets_24h) * 100}
                          height={4}
                          tone={device.status === 'online' ? COLORS.healthy : COLORS.warning}
                          label={`${device.name} uplink rate`}
                        />
                        <p className="num mt-1 text-2xs text-ink-faint">
                          {device.packets_24h}/{device.expected_packets_24h} uplinks in 24 h
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </section>

          <Panel className="p-5">
            <p className="eyebrow mb-2">Hardware scope</p>
            <p className="text-sm leading-relaxed text-ink-muted">
              {HARDWARE_NOTE} Wind speed, rainfall, soil NPK and leaf wetness are deliberately absent
              — the product never displays a value the fitted hardware cannot produce. Where a
              related quantity is needed (leaf wetness, evapotranspiration), it is computed as a
              clearly tagged derived metric.
            </p>
          </Panel>
        </div>
      </PageState>
    </>
  );
}

export default function SensorsPage() {
  return (
    <Suspense fallback={<LoadingPanel rows={3} title="Sensors" />}>
      <SensorsInner />
    </Suspense>
  );
}
