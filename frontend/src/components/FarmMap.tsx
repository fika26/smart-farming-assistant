'use client';

import 'leaflet/dist/leaflet.css';

import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';

import type { DeviceInfo, FieldSummary } from '@/types/api';

/**
 * Free, key-less Esri tiles — chosen so the map works out of the box with no
 * API key/billing setup (Mapbox/Google would both need one). "Hybrid" layers
 * the reference (roads/labels) tiles on top of the same imagery.
 */
const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS user community';

export type BasemapMode = 'satellite' | 'hybrid';

export interface FarmMapField {
  field: FieldSummary;
  color: string;
  valueLabel: string;
  active: boolean;
  selected: boolean;
}

export interface FarmMapDevice {
  device: DeviceInfo;
  color: string;
  active: boolean;
}

/** Refits the view whenever the set of field boundaries changes (e.g. first load). */
function FitOnData({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions as LatLngBoundsExpression, { padding: [28, 28], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length]);
  return null;
}

export function FarmMap({
  center,
  fields,
  devices,
  onSelectField,
  onHoverField,
  onSelectDevice,
  mode,
  onModeChange,
}: {
  center: [number, number];
  fields: FarmMapField[];
  devices: FarmMapDevice[];
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
  onSelectDevice: (id: string) => void;
  mode: BasemapMode;
  onModeChange: (mode: BasemapMode) => void;
}) {
  const allPoints = useMemo<LatLngExpression[]>(
    () => fields.flatMap((f) => f.field.boundary as LatLngExpression[]),
    [fields],
  );

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-b-none sm:h-[480px]">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
        attributionControl={true}
      >
        <TileLayer url={SATELLITE_URL} attribution={ATTRIBUTION} />
        {mode === 'hybrid' ? <TileLayer url={LABELS_URL} attribution={ATTRIBUTION} /> : null}
        <FitOnData positions={allPoints} />

        {fields.map(({ field, color, valueLabel, active, selected }) => (
          <Polygon
            key={field.id}
            positions={field.boundary as LatLngExpression[]}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: active ? 0.38 : 0.2,
              weight: selected ? 3 : active ? 2.2 : 1.4,
            }}
            eventHandlers={{
              click: () => onSelectField(field.id),
              mouseover: () => onHoverField(field.id),
              mouseout: () => onHoverField(null),
            }}
          >
            <Tooltip direction="center" permanent className="!border-none !bg-transparent !shadow-none">
              <div className="text-center leading-tight">
                <div className="text-xs font-semibold text-white drop-shadow">{field.name}</div>
                <div className="text-[10px] text-white/90 drop-shadow">
                  {field.crop} · {valueLabel}
                </div>
              </div>
            </Tooltip>
          </Polygon>
        ))}

        {devices.map(({ device, color, active }) => (
          <CircleMarker
            key={device.device_id}
            center={[device.latitude, device.longitude]}
            radius={active ? 9 : 6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectDevice(device.device_id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {device.device_id} · {device.status}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Floating basemap toggle — section 11 of the brief: compact, mobile-friendly */}
      <div className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded-lg border border-white/40 bg-black/45 backdrop-blur">
        {(['satellite', 'hybrid'] as BasemapMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onModeChange(option)}
            aria-pressed={mode === option}
            className={
              'press px-3 py-1.5 text-xs font-medium capitalize transition-colors ' +
              (mode === option ? 'bg-white text-ink' : 'text-white hover:bg-white/15')
            }
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
