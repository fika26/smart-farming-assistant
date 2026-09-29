'use client';

import { Layers, MapPin, Radio, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import type { BasemapMode } from '@/components/FarmMap';
import { PageState } from '@/components/PageState';
import {
  Badge,
  Button,
  Chip,
  Disclaimer,
  InfoTip,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { COLORS } from '@/config/theme';
import { clockTime, cx, healthFill, num, riskFill, riskTone, signed, trendGlyph } from '@/lib/format';
import { sensorMeaning, sensorStatus, statusShortWord } from '@/lib/meaning';
import { useApi } from '@/lib/useApi';
import type { FieldSummary, MapPayload, SensorSummary } from '@/types/api';

// Leaflet reads `window` at import time, so it can only load in the browser.
const FarmMap = dynamic(() => import('@/components/FarmMap').then((mod) => mod.FarmMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center bg-sand-100 text-sm text-ink-muted sm:h-[480px]">
      Loading map…
    </div>
  ),
});

type LayerId = 'moisture' | 'temperature' | 'health' | 'risk';

interface Layer {
  id: LayerId;
  label: string;
  unit: string;
  explain: string;
  value: (field: FieldSummary, sensors: SensorSummary[]) => number | null;
  fill: (field: FieldSummary, sensors: SensorSummary[]) => string;
  scale: { label: string; color: string }[];
}

const RISK_ORDER: Record<string, number> = { low: 25, moderate: 50, high: 75, severe: 95 };

function sensorValue(sensors: SensorSummary[], fieldId: string, type: string): number | null {
  const match = sensors.find((sensor) => sensor.field_id === fieldId && sensor.sensor_type === type);
  return match?.value ?? null;
}

function band(value: number | null, stops: [number, string][], fallback: string): string {
  if (value === null) return fallback;
  for (const [limit, colour] of stops) {
    if (value <= limit) return colour;
  }
  return fallback;
}

const LAYERS: Layer[] = [
  {
    id: 'moisture',
    label: 'Soil moisture',
    unit: '%',
    explain:
      'Measured by the capacitive probe at 15 cm depth. Deeper green means more water available to the roots.',
    value: (field) => field.soil_moisture,
    fill: (field) =>
      band(
        field.soil_moisture,
        [
          [20, COLORS.critical],
          [24, COLORS.warning],
          [32, COLORS.leaf[500]],
        ],
        COLORS.leaf[700],
      ),
    scale: [
      { label: 'Below refill', color: COLORS.critical },
      { label: 'Below threshold', color: COLORS.warning },
      { label: 'Comfortable', color: COLORS.leaf[500] },
      { label: 'At capacity', color: COLORS.leaf[700] },
    ],
  },
  {
    id: 'temperature',
    label: 'Air temperature',
    unit: '°C',
    explain: 'Measured by the SHT31 at canopy level. Warmer fields carry more heat-stress risk.',
    value: (field, sensors) => sensorValue(sensors, field.id, 'sht31_temperature'),
    fill: (field, sensors) =>
      band(
        sensorValue(sensors, field.id, 'sht31_temperature'),
        [
          [18, COLORS.info],
          [30, COLORS.leaf[500]],
          [34, COLORS.warning],
        ],
        COLORS.critical,
      ),
    scale: [
      { label: 'Cool', color: COLORS.info },
      { label: 'Comfortable', color: COLORS.leaf[500] },
      { label: 'Warm', color: COLORS.warning },
      { label: 'Hot', color: COLORS.critical },
    ],
  },
  {
    id: 'health',
    label: 'Crop health',
    unit: '/100',
    explain:
      'A derived score, not a measurement — it combines moisture, heat, light and disease pressure.',
    value: (field) => field.health_score,
    fill: (field) => healthFill(field.health_score),
    scale: [
      { label: 'At risk', color: COLORS.critical },
      { label: 'Needs attention', color: COLORS.warning },
      { label: 'Stable', color: COLORS.leaf[500] },
      { label: 'Healthy', color: COLORS.leaf[700] },
    ],
  },
  {
    id: 'risk',
    label: 'Risk level',
    unit: '',
    explain: 'The highest of the five hazard scores for each field over the next seven days.',
    value: (field) => RISK_ORDER[field.risk_level] ?? null,
    fill: (field) => riskFill[field.risk_level],
    scale: [
      { label: 'Low', color: riskFill.low },
      { label: 'Moderate', color: riskFill.moderate },
      { label: 'High', color: riskFill.high },
      { label: 'Severe', color: riskFill.severe },
    ],
  },
];

export default function MapPage() {
  const { fieldId, setFieldId } = useApp();
  const { data, meta, loading, error, refresh } = useApi<MapPayload>('/map');
  const sensorsState = useApi<SensorSummary[]>('/sensors');
  const [layerId, setLayerId] = useState<LayerId>('moisture');
  const [hovered, setHovered] = useState<string | null>(null);
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');

  const sensors = useMemo(() => sensorsState.data ?? [], [sensorsState.data]);
  const layer = LAYERS.find((item) => item.id === layerId) ?? LAYERS[0];
  const selected = data?.fields.find((field) => field.id === fieldId) ?? null;
  const nodeSensors = openNode ? sensors.filter((sensor) => sensor.device_id === openNode) : [];
  const openDevice = data?.devices.find((device) => device.device_id === openNode) ?? null;

  return (
    <>
      <PageHeader
        title="Field Map"
        description="Tap a field to focus it, switch layers to see a different measurement, or tap a node to read its sensors."
        meta={
          <>
            {data ? <Chip>{data.farm.name}</Chip> : null}
            <Chip>
              Satellite map
              <InfoTip label="Satellite map">
                Field boundaries are drawn from the coordinates stored for each field over real
                satellite imagery. The boundary shape is accurate in relative position, but is not
                a surveyed property line.
              </InfoTip>
            </Chip>
            {meta ? <SourceTag source={meta.data_source} /> : null}
          </>
        }
        actions={
          selected ? (
            <Button variant="secondary" size="sm" onClick={() => setFieldId(null)}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear selection
            </Button>
          ) : null
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your farm map"
        loadingLabel="Placing your fields on the map…"
      >
        {data ? (
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <Panel className="overflow-hidden">
              <PanelHeader
                title="Farm layout"
                caption={layer.explain}
                action={
                  <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    Layer
                  </span>
                }
              />

              <div className="scroll-thin flex gap-2 overflow-x-auto border-b border-line px-5 py-3">
                {LAYERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLayerId(item.id)}
                    aria-pressed={item.id === layerId}
                    className={cx(
                      'press shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      item.id === layerId
                        ? 'border-leaf-700 bg-leaf-800 text-canvas'
                        : 'border-line bg-surface text-ink-soft hover:border-leaf-200 hover:bg-leaf-50',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <FarmMap
                center={[data.farm.latitude, data.farm.longitude]}
                mode={basemap}
                onModeChange={setBasemap}
                fields={data.fields.map((field) => {
                  const value = layer.value(field, sensors);
                  const isSelected = fieldId === field.id;
                  return {
                    field,
                    color: layer.fill(field, sensors),
                    valueLabel: `${num(value)}${layer.unit}`,
                    active: hovered === field.id || isSelected,
                    selected: isSelected,
                  };
                })}
                devices={data.devices.map((device) => ({
                  device,
                  color:
                    device.status === 'online'
                      ? COLORS.leaf[700]
                      : device.status === 'degraded'
                        ? COLORS.warning
                        : COLORS.critical,
                  active: openNode === device.device_id,
                }))}
                onSelectField={(id) => setFieldId(fieldId === id ? null : id)}
                onHoverField={setHovered}
                onSelectDevice={(id) => setOpenNode(openNode === id ? null : id)}
              />

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3 text-2xs text-ink-muted">
                <span className="font-medium text-ink-soft">{layer.label}</span>
                {layer.scale.map((step) => (
                  <span key={step.label} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: step.color, opacity: 0.7 }}
                    />
                    {step.label}
                  </span>
                ))}
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-leaf-700" />
                  Sensor node
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ember-500" />
                  Open alerts
                </span>
              </div>
            </Panel>

            <div className="space-y-5">
              {openDevice ? (
                <Panel className="animate-fade-up">
                  <PanelHeader
                    eyebrow="Sensor node"
                    title={openDevice.name}
                    caption={`${openDevice.device_id} · firmware ${openDevice.firmware} · last uplink ${openDevice.last_seen_human}`}
                    action={
                      <button
                        type="button"
                        onClick={() => setOpenNode(null)}
                        className="press rounded-md p-1 text-ink-faint hover:bg-raised hover:text-ink"
                        aria-label="Close node readings"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    }
                  />
                  <ul className="divide-y divide-line">
                    {nodeSensors.map((sensor) => {
                      const state = sensorStatus(sensor);
                      return (
                        <li key={sensor.sensor_id} className="px-5 py-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-medium text-ink">{sensor.label}</span>
                            <span className="num text-sm font-semibold text-ink">
                              {num(sensor.value, sensor.sensor_type === 'bh1750_light' ? 0 : 1)}{' '}
                              <span className="text-xs font-normal text-ink-muted">
                                {sensor.unit}
                              </span>
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-faint">
                            <span className="font-medium text-ink-muted">
                              {statusShortWord[state]}
                            </span>
                            <span className="num">
                              {trendGlyph[sensor.trend]} {signed(sensor.delta_24h)} in 24 h
                            </span>
                            <span className="num">{clockTime(sensor.last_update)}</span>
                            <SourceTag source="measured" className="scale-90" />
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                            {sensorMeaning(sensor)}
                          </p>
                        </li>
                      );
                    })}
                    {nodeSensors.length === 0 ? (
                      <li className="px-5 py-4 text-sm text-ink-muted">
                        Readings for this node are still loading.
                      </li>
                    ) : null}
                  </ul>
                  {nodeSensors.length ? (
                    <div className="border-t border-line px-5 py-3">
                      <Link
                        href={`/sensors?sensor=${nodeSensors[0].sensor_id}`}
                        className="text-xs font-medium text-leaf-700 hover:underline"
                      >
                        Open full sensor history
                      </Link>
                    </div>
                  ) : null}
                </Panel>
              ) : null}

              {selected ? (
                <Panel className="animate-fade-up">
                  <PanelHeader
                    eyebrow="Selected field"
                    title={selected.name}
                    caption={`${selected.crop} · ${selected.variety} · ${num(selected.area_ha)} ha · ${selected.growth_stage}`}
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">Crop health</span>
                      <span className="num font-medium text-ink">{selected.health_score}/100</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar
                        value={selected.health_score}
                        tone={healthFill(selected.health_score)}
                        label={`${selected.name} health score`}
                      />
                    </div>
                    <div className="mt-4 divide-y divide-line border-t border-line">
                      <StatRow label="Soil moisture" value={`${num(selected.soil_moisture)}%`} />
                      <StatRow label="Irrigation" value={selected.irrigation_state} />
                      <StatRow label="Top risk" value={selected.top_risk} />
                      <StatRow label="Open alerts" value={String(selected.active_alerts)} />
                      <StatRow label="Last reading" value={selected.last_reading_human ?? '—'} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/fields/${selected.id}`}>
                        <Button size="sm">Open field detail</Button>
                      </Link>
                      <Link href="/alerts">
                        <Button size="sm" variant="secondary">
                          See its alerts
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Panel>
              ) : null}

              <Panel>
                <PanelHeader
                  title="Fields"
                  caption="Tap to focus a field on the map, or open its full detail."
                />
                <ul className="divide-y divide-line">
                  {data.fields.map((field) => {
                    const value = layer.value(field, sensors);
                    const isSelected = fieldId === field.id;
                    return (
                      <li key={field.id}>
                        <button
                          type="button"
                          onClick={() => setFieldId(isSelected ? null : field.id)}
                          onMouseEnter={() => setHovered(field.id)}
                          onMouseLeave={() => setHovered(null)}
                          aria-pressed={isSelected}
                          className={cx(
                            'flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-raised',
                            isSelected && 'bg-leaf-50',
                          )}
                        >
                          <MapPin
                            className={cx(
                              'mt-0.5 h-4 w-4 shrink-0',
                              isSelected ? 'text-leaf-700' : 'text-ink-faint',
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">
                              {field.name}
                            </span>
                            <span className="num block truncate text-2xs text-ink-faint">
                              {field.crop} · {layer.label} {num(value)}
                              {layer.unit}
                            </span>
                          </span>
                          <span
                            className={cx(
                              'shrink-0 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase',
                              riskTone[field.risk_level],
                            )}
                          >
                            {field.risk_level}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              <Panel>
                <PanelHeader title="Nodes" caption="Tap a node on the map to read its sensors." />
                <ul className="divide-y divide-line">
                  {data.devices.map((device) => (
                    <li key={device.device_id}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenNode(openNode === device.device_id ? null : device.device_id)
                        }
                        aria-pressed={openNode === device.device_id}
                        className={cx(
                          'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-raised',
                          openNode === device.device_id && 'bg-leaf-50',
                        )}
                      >
                        <Radio className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {device.name}
                          </span>
                          <span className="block truncate text-2xs text-ink-faint">
                            {device.sensors.length} channels · {device.rssi} dBm ·{' '}
                            {device.last_seen_human}
                          </span>
                        </span>
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
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Disclaimer>
                Field boundaries are drawn from stored coordinates over real satellite imagery —
                accurate in relative position and shape, but not a surveyed property line. Node
                markers show where each device is installed, not a measured GPS fix.
              </Disclaimer>
            </div>
          </div>
        ) : null}
      </PageState>
    </>
  );
}
