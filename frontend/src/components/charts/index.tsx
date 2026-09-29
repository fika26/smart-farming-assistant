'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CHART, COLORS, seriesColor } from '@/config/theme';
import { clockTime, cx, num, shortDate } from '@/lib/format';
import type { Series } from '@/types/api';

const AXIS = { stroke: CHART.axis, fontSize: 11 };
const GRID = CHART.grid;

export const PALETTE = CHART.series as readonly string[] as string[];

function tickFormatter(iso: string, span: 'day' | 'week') {
  return span === 'day' ? clockTime(iso) : shortDate(iso);
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  span,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  unit?: string;
  span: 'day' | 'week';
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
      <p className="mb-1 text-2xs uppercase tracking-wide text-ink-faint">
        {span === 'day' ? clockTime(label) : `${shortDate(label)} · ${clockTime(label)}`}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="num flex items-center gap-2 text-sm text-ink">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name ? <span className="text-ink-muted">{entry.name}</span> : null}
          <span className="font-medium">
            {num(entry.value ?? null, 1)}
            {unit ? ` ${unit}` : ''}
          </span>
        </p>
      ))}
    </div>
  );
}

export function TrendChart({
  series,
  height = 200,
  span = 'day',
  band,
  reference,
  color,
  showGrid = true,
}: {
  series: Series;
  height?: number;
  span?: 'day' | 'week';
  band?: { min: number; max: number; label?: string };
  reference?: { value: number; label: string; color?: string }[];
  color?: string;
  showGrid?: boolean;
}) {
  const stroke = color ?? seriesColor(series.key);
  const data = series.points.map((point) => ({ t: point.t, v: point.v }));
  const id = `grad-${series.key}`;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-faint"
        style={{ height }}
      >
        No readings in this window
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {showGrid ? <CartesianGrid stroke={GRID} vertical={false} /> : null}
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={{ stroke: COLORS.line }}
          tick={AXIS}
          minTickGap={36}
          tickFormatter={(value: string) => tickFormatter(value, span)}
        />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
        {band ? (
          <ReferenceArea
            y1={band.min}
            y2={band.max}
            fill={COLORS.leaf[500]}
            fillOpacity={0.06}
            stroke="none"
          />
        ) : null}
        {reference?.map((line) => (
          <ReferenceLine
            key={line.label}
            y={line.value}
            stroke={line.color ?? COLORS.critical}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: line.label,
              position: 'insideTopRight',
              fontSize: 10,
              fill: line.color ?? COLORS.critical,
            }}
          />
        ))}
        <Tooltip
          content={<ChartTooltip unit={series.unit} span={span} />}
          cursor={{ stroke: CHART.cursor, strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.8}
          fill={`url(#${id})`}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 2, stroke: '#fff' }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiTrendChart({
  seriesList,
  height = 240,
  span = 'week',
}: {
  seriesList: Series[];
  height?: number;
  span?: 'day' | 'week';
}) {
  const merged = new Map<string, Record<string, number | string | null>>();
  seriesList.forEach((series) => {
    series.points.forEach((point) => {
      const row = merged.get(point.t) ?? { t: point.t };
      row[series.key] = point.v;
      merged.set(point.t, row);
    });
  });
  const data = Array.from(merged.values()).sort((a, b) =>
    String(a.t).localeCompare(String(b.t)),
  );

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-faint"
        style={{ height }}
      >
        No readings in this window
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={{ stroke: COLORS.line }}
          tick={AXIS}
          minTickGap={40}
          tickFormatter={(value: string) => tickFormatter(value, span)}
        />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
        <Tooltip content={<ChartTooltip span={span} />} cursor={{ stroke: CHART.cursor }} />
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: COLORS.inkSoft }}
        />
        {seriesList.map((series, index) => (
          <Line
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={`${series.label} (${series.unit})`}
            stroke={seriesColor(series.key, index)}
            strokeWidth={1.7}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({
  points,
  color = CHART.moisture,
  height = 36,
}: {
  points: { t: string; v: number | null }[];
  color?: string;
  height?: number;
}) {
  if (!points.length) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.4}
          fill={`url(#spark-${color.slice(1)})`}
          dot={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({
  data,
  height = 220,
  unit,
  horizontal = false,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  unit?: string;
  horizontal?: boolean;
}) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 12, left: horizontal ? 8 : -18, bottom: 0 }}
      >
        <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} tick={AXIS} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={AXIS}
              width={120}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: COLORS.line }}
              tick={AXIS}
              interval={0}
            />
            <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
          </>
        )}
        <Tooltip
          cursor={{ fill: CHART.barCursor }}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${COLORS.line}`,
            fontSize: 12,
            boxShadow: '0 10px 34px -14px rgba(38,50,41,0.24)',
          }}
          formatter={(value: number) => [`${num(value, 1)}${unit ? ` ${unit}` : ''}`, '']}
        />
        <Bar dataKey="value" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={38}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color ?? CHART.series[index % CHART.series.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GaugeRing({
  value,
  color,
  size = 108,
  stroke = 9,
  label,
  caption,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={CHART.track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-display text-2xl leading-none text-ink">{label ?? Math.round(clamped)}</span>
        {caption ? <span className="mt-1 text-2xs uppercase tracking-wide text-ink-faint">{caption}</span> : null}
      </div>
    </div>
  );
}

export function LevelMeter({
  segments,
  className,
}: {
  segments: { value: number; color: string; label: string }[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  return (
    <div className={cx('flex h-2 w-full overflow-hidden rounded-full bg-line', className)}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          title={`${segment.label}: ${segment.value}`}
          style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
        />
      ))}
    </div>
  );
}
