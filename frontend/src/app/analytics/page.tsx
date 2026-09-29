'use client';

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CloudDrizzle,
  Droplets,
  IndianRupee,
  Repeat,
  Sprout,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { CategoryBars, MultiTrendChart, Sparkline, TrendChart } from '@/components/charts';
import {
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  SourceTag,
} from '@/components/ui';
import { COLORS } from '@/config/theme';
import { cx, num, signed, statusDot, statusFill, statusTone } from '@/lib/format';
import { metricMeaning, statusWord } from '@/lib/meaning';
import { useApi } from '@/lib/useApi';
import type { AnalyticsResponse, MetricSummary, Series } from '@/types/api';

type View = 'simple' | 'detailed';
const VIEW_KEY = 'sfa.analytics.view';

export default function AnalyticsPage() {
  const { fieldId, fields, t } = useApp();
  const [range, setRange] = useState<'7' | '14' | '21'>('14');
  // Farmers land on the simple view; managers can switch and it is remembered.
  const [view, setView] = useState<View>('simple');
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_KEY);
      if (stored === 'simple' || stored === 'detailed') setView(stored);
    } catch {
      /* storage blocked */
    }
  }, []);
  const changeView = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const { data, meta, loading, error, refresh } = useApi<AnalyticsResponse>('/analytics', {
    field_id: fieldId,
    range_days: Number(range),
  });
  const field = fields.find((item) => item.id === fieldId) ?? fields[0] ?? null;

  return (
    <>
      <PageHeader
        title={t('page.analytics.title')}
        description={t('page.analytics.description')}
        meta={
          <>
            {field ? (
              <Chip>
                {field.name} · {field.crop_label ?? field.crop}
              </Chip>
            ) : null}
            {meta ? <SourceTag source={meta.data_source} /> : null}
          </>
        }
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div aria-label={t('an.view.label')} className="flex-1 sm:flex-none">
              <Segmented
                value={view}
                onChange={changeView}
                options={[
                  { value: 'simple', label: t('common.simple') },
                  { value: 'detailed', label: t('common.detailed') },
                ]}
              />
            </div>
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              options={(['7', '14', '21'] as const).map((n) => ({
                value: n,
                label: t('common.days', { n }),
              }))}
            />
          </div>
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle={t('an.error')}
        loadingLabel={t('an.loading')}
      >
        {data ? (
          view === 'simple' ? (
            <SimpleView data={data} crop={field?.crop_label ?? field?.crop ?? ''} />
          ) : (
            <DetailedView data={data} />
          )
        ) : null}
      </PageState>
    </>
  );
}

/* ------------------------------------------------------------ simple view ---- */

const CHANNEL_ICON: Record<string, LucideIcon> = {
  soil_moisture: Droplets,
  soil_temperature: Sprout,
  air_temperature: Thermometer,
  humidity: CloudDrizzle,
  light: Sun,
};

/** Rising / falling / steady over the chosen window: first-day vs last-day mean. */
function direction(series?: Series): 'up' | 'down' | 'flat' {
  const values = (series?.points ?? []).map((p) => p.v).filter((v): v is number => v !== null);
  if (values.length < 4) return 'flat';
  const k = Math.max(1, Math.floor(values.length / 4));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const first = avg(values.slice(0, k));
  const last = avg(values.slice(-k));
  const scale = Math.max(Math.abs(first), 1);
  const change = (last - first) / scale;
  if (change > 0.06) return 'up';
  if (change < -0.06) return 'down';
  return 'flat';
}

const DIR_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight } as const;

function SimpleView({ data, crop }: { data: AnalyticsResponse; crop: string }) {
  const { t } = useApp();
  const metrics = data.metrics ?? [];
  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader title={t('an.simple.title')} caption={t('an.simple.caption', { crop })} />
        <ul className="grid gap-3 p-4 pt-1 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <ChannelCard
              key={metric.key}
              metric={metric}
              series={data.series.find((s) => s.key === metric.key)}
              days={data.range_days}
            />
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title={t('an.simple.resources')} />
        <ul className="divide-y divide-line">
          {data.resource_usage.map((item) => (
            <ResourceRow key={item.key ?? item.label} item={item} />
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title={t('an.highlights.title')} caption={t('an.highlights.caption')} />
        <ul className="divide-y divide-line">
          {data.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3 px-5 py-3.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
              <p className="text-[0.95rem] leading-relaxed text-ink-soft">{highlight}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-3 border-t border-line px-5 py-4">
          <Disclaimer>{data.disclaimer}</Disclaimer>
          <p className="text-xs text-ink-faint">{t('an.simple.detailHint')}</p>
        </div>
      </Panel>
    </div>
  );
}

function ChannelCard({
  metric,
  series,
  days,
}: {
  metric: MetricSummary;
  series?: Series;
  days: number;
}) {
  const { t } = useApp();
  const Icon = CHANNEL_ICON[metric.key] ?? Sprout;
  // Light swings from 0 at night to tens of thousands at noon, so a window
  // trend of the raw lux says nothing useful to a farmer.
  const dir = metric.key === 'light' ? 'flat' : direction(series);
  const DirIcon = DIR_ICON[dir];
  const unit = metric.unit === '%RH' ? '%' : metric.unit;
  const digits = metric.key === 'light' ? 0 : 1;

  return (
    <li
      className={cx('rounded-xl border p-4', statusTone[metric.status])}
      aria-label={t('an.status.aria', { label: metric.label, status: statusWord[metric.status] })}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface/80">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-medium text-ink">
            {t(`an.metric.${metric.key}`)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
            <span className={cx('h-2.5 w-2.5 rounded-full', statusDot[metric.status])} />
            {statusWord[metric.status]}
          </p>
        </div>
        <p className="num shrink-0 text-right font-display text-2xl leading-none text-ink">
          {num(metric.value, digits)}
          <span className="ml-0.5 text-sm text-ink-muted">{unit}</span>
        </p>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{metricMeaning(metric)}</p>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-current/10 pt-3">
        <div className="text-xs text-ink-muted">
          <p className="flex items-center gap-1 font-medium text-ink-soft">
            <DirIcon className="h-4 w-4" aria-hidden="true" />
            {t(`an.dir.${dir}`)} · {t('an.simple.over', { n: days })}
          </p>
          {metric.optimal_min !== null && metric.optimal_max !== null && metric.key !== 'light' ? (
            <p className="mt-0.5">
              {t('an.simple.range', {
                min: num(metric.optimal_min, 0),
                max: num(metric.optimal_max, 0),
                unit,
              })}
            </p>
          ) : null}
        </div>
        {series?.points.length ? (
          <div className="w-24 shrink-0 opacity-80">
            <Sparkline points={series.points} height={30} color={statusFill[metric.status]} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

const RESOURCE_ICON: Record<string, LucideIcon> = {
  water: Droplets,
  events: Repeat,
  energy: Zap,
  cost: IndianRupee,
};

/** Indian digit grouping: 72,100 → "72,100"; 819000 → "8,19,000". */
function inr(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function ResourceRow({ item }: { item: AnalyticsResponse['resource_usage'][number] }) {
  const { t } = useApp();
  const key = item.key ?? 'water';
  const Icon = RESOURCE_ICON[key] ?? Droplets;
  // Farmers count water in litres and electricity in "units", not kL / kWh.
  const value =
    key === 'water'
      ? `${inr(item.value * 1000)} ${t('unit.litres')}`
      : key === 'energy'
        ? `${num(item.value, 0)} ${t('unit.kwh')}`
        : key === 'cost'
          ? `₹${inr(item.value)}`
          : `${item.value}`;
  const pct = Math.abs(Math.round(item.change_pct));
  const better = item.change_pct < 0;
  const verdict =
    pct === 0
      ? t('an.simple.sameAsUsual')
      : better
        ? t('an.simple.lessThanUsual', { pct })
        : t('an.simple.moreThanUsual', { pct });

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf-50 text-leaf-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-muted">{t(`an.res.${key}`)}</p>
        <p className="num text-lg font-medium text-ink">{value}</p>
      </div>
      <p
        className={cx(
          'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
          pct === 0
            ? 'bg-raised text-ink-muted'
            : better
              ? 'bg-leaf-50 text-leaf-700'
              : 'bg-clay-100 text-clay-700',
        )}
      >
        {verdict}
      </p>
    </li>
  );
}

/* ---------------------------------------------------------- detailed view ---- */

function DetailedView({ data }: { data: AnalyticsResponse }) {
  const { t } = useApp();
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.resource_usage.map((item) => (
          <Panel key={item.label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink-soft">{item.label}</p>
              <SourceTag source="derived" />
            </div>
            <p className="num mt-2 font-display text-2xl leading-none text-ink">
              {num(item.value)}
              <span className="ml-1 text-sm text-ink-muted">{item.unit}</span>
            </p>
            <p
              className={cx(
                'num mt-1.5 text-xs font-medium',
                item.change_pct < 0 ? 'text-leaf-600' : 'text-clay-700',
              )}
            >
              {t('an.vsBaseline', {
                change: signed(item.change_pct),
                baseline: num(item.baseline),
                unit: item.unit,
              })}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">{item.note}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader
          title={t('an.trends.title', { n: data.range_days })}
          caption={t('an.trends.caption')}
          action={<SourceTag source="measured" />}
        />
        <div className="p-2 pt-2 sm:p-4">
          <MultiTrendChart
            seriesList={data.series.filter((series) => series.key !== 'light')}
            height={250}
            span="week"
          />
          <div className="mt-3 border-t border-line pt-3">
            <p className="eyebrow mb-1.5">{t('an.trends.light')}</p>
            {data.series
              .filter((series) => series.key === 'light')
              .map((series) => (
                <TrendChart key={series.key} series={series} height={120} span="week" />
              ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t('an.yield.title')} caption={t('an.yield.caption')} />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {data.yield_metrics.map((metric) => (
              <div key={metric.label} className="panel-quiet p-4">
                <p className="text-xs font-medium text-ink-soft">{metric.label}</p>
                <p className="num mt-1.5 font-display text-lg text-leaf-900">
                  {num(metric.value, 2)}
                  <span className="ml-1 text-xs text-ink-muted">{metric.unit}</span>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{metric.note}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4">
            <CategoryBars
              horizontal
              height={150}
              data={data.resource_usage.slice(0, 3).map((item) => ({
                label: item.label,
                value: Math.abs(item.change_pct),
                color: item.change_pct < 0 ? COLORS.healthy : COLORS.warning,
              }))}
              unit={t('an.vsBaselineUnit')}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t('an.condition.title')} caption={t('an.condition.caption')} />
          <div className="space-y-4 p-4 pt-2">
            {data.crop_health_trend.map((series, index) => (
              <div key={series.key}>
                <p className="eyebrow mb-1.5">
                  {series.label} ({series.unit})
                </p>
                <TrendChart
                  series={series}
                  height={120}
                  span="week"
                  color={index === 0 ? COLORS.leaf[700] : COLORS.leaf[500]}
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={t('an.highlights.title')} caption={t('an.highlights.caption')} />
        <ul className="divide-y divide-line">
          {data.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3 px-5 py-3.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
              <p className="text-sm leading-relaxed text-ink-soft">{highlight}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-5 py-4">
          <Disclaimer>{data.disclaimer}</Disclaimer>
        </div>
      </Panel>
    </div>
  );
}
