'use client';

import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { Sparkline } from '@/components/charts';
import { Button, LoadingPanel, Skeleton } from '@/components/ui';
import { COLORS } from '@/config/theme';
import { cx, num, severityBar, statusDot } from '@/lib/format';
import { severityUrgency, statusShortWord } from '@/lib/meaning';
import { useApi } from '@/lib/useApi';
import type { AdvisoryBrief, DashboardSnapshot } from '@/types/api';

const REFRESH_MS = 60_000;

export default function DashboardPage() {
  const { fieldId, t } = useApp();
  const { data, loading, error, refresh } = useApi<DashboardSnapshot>('/dashboard', {
    field_id: fieldId,
  });

  // The node reports every 30 minutes; a quiet poll keeps the screen honest.
  useEffect(() => {
    const poll = setInterval(() => refresh(), REFRESH_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  return (
    <PageState
      loading={loading}
      error={error}
      onRetry={refresh}
      errorTitle={t('dash.error')}
      loadingLabel={t('dash.loading')}
      skeleton={
        <div className="space-y-16">
          <div className="space-y-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-3/4 max-w-2xl" />
            <Skeleton className="h-24 w-56" />
          </div>
          <LoadingPanel rows={2} />
        </div>
      }
    >
      {data ? <Overview data={data} /> : null}
    </PageState>
  );
}

function Overview({ data }: { data: DashboardSnapshot }) {
  const lead = data.alerts[0] ?? null;
  const leadAction = lead
    ? (data.actions.find((action) => action.source_alert_id === lead.id) ?? data.actions[0] ?? null)
    : (data.actions[0] ?? null);

  return (
    <div className="mx-auto max-w-5xl">
      <Hero data={data} />
      <Snapshot data={data} />
      <Fields data={data} />
      <Elsewhere data={data} leadHandled={Boolean(lead && leadAction)} />
    </div>
  );
}

/* ------------------------------------------------------------------ hero ---- */

function Hero({ data }: { data: DashboardSnapshot }) {
  const { t } = useApp();
  const [why, setWhy] = useState(false);
  const alert = data.alerts[0] ?? null;
  const action =
    (alert && data.actions.find((item) => item.source_alert_id === alert.id)) ??
    data.actions[0] ??
    null;

  if (!alert || !action) {
    return (
      <section className="border-b border-line pb-16 pt-4">
        <p className="eyebrow text-leaf-600">{t('dash.clear.eyebrow')}</p>
        <h1 className="mt-5 max-w-3xl font-display text-[2rem] leading-[1.15] text-leaf-900 sm:text-[3rem]">
          {t('dash.clear.title')}
        </h1>
        <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-muted">
          {data.farm_status_line}
        </p>
      </section>
    );
  }

  // The headline number is the reading that fired the rule — never invented here.
  const primary = alert.evidence[0];
  const supporting = alert.evidence.slice(1, 3);

  return (
    <section className="border-b border-line pb-16 pt-4">
      <div className="flex items-center gap-2.5">
        <span className={cx('h-1.5 w-1.5 rounded-full', severityBar[alert.severity])} />
        <p className="eyebrow text-ink-soft">
          {alert.category} · {severityUrgency[alert.severity]}
        </p>
      </div>

      <h1 className="mt-5 max-w-3xl font-display text-[2rem] leading-[1.15] text-leaf-900 sm:text-[3.1rem] sm:leading-[1.08]">
        {action.title}
      </h1>
      <AdviceSource fieldId={alert.field_id} />

      <div className="mt-8 flex flex-col gap-8 sm:mt-10 sm:flex-row sm:items-start sm:gap-16">
        {primary ? (
          <div className="shrink-0">
            <p className="num font-display text-[3rem] leading-none text-leaf-900 sm:text-[4.2rem]">
              {primary.value}
            </p>
            <p className="mt-2 text-sm text-ink-muted">{primary.label.toLowerCase()}</p>
          </div>
        ) : null}

        <div className="max-w-xl">
          <p className="text-[1.05rem] leading-[1.7] text-ink-soft">{alert.what}</p>

          <p className="mt-7 eyebrow">{t('dash.recommended')}</p>
          <p className="mt-2 text-[1.05rem] leading-[1.7] text-ink">{alert.action}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={`/fields/${alert.field_id}`} className="w-full sm:w-auto">
              <Button className="min-h-[44px] w-full justify-center sm:w-auto">
                {t('dash.open', { field: alert.field_name })}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setWhy((value) => !value)}
              aria-expanded={why}
              className="press inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-leaf-700 transition-colors hover:text-leaf-900"
            >
              {why ? t('dash.hideWhy') : t('dash.why')}
              <ChevronDown
                className={cx('h-4 w-4 transition-transform duration-200', why && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          </div>

          <div
            className={cx(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
              why ? 'mt-7 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <p className="max-w-xl text-sm leading-[1.7] text-ink-muted">{alert.why}</p>
              {supporting.length ? (
                <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
                  {supporting.map((item) => (
                    <div key={item.label}>
                      <dt className="text-2xs uppercase tracking-wide text-ink-faint">
                        {item.label}
                      </dt>
                      <dd className="num mt-0.5 text-sm text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="mt-5 text-xs text-ink-faint">
                {t('dash.raised', {
                  when: alert.opened_at_human,
                  window: action.due_window.toLowerCase(),
                  confidence: Math.round(alert.confidence * 100),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- snapshot ---- */

function Snapshot({ data }: { data: DashboardSnapshot }) {
  const { t, tp } = useApp();
  const healthy = data.fields.filter((field) => field.health_score >= 70).length;
  const today = data.weather.forecast[0];
  const moisture = data.series.find((series) => series.key === 'soil_moisture');

  const items = [
    {
      label: t('dash.snap.cropHealth'),
      value: String(data.farm_health_score),
      caption: data.farm_health_label,
      href: '/crop-health',
    },
    {
      label: t('dash.snap.fieldsHealthy'),
      value: `${healthy} / ${data.fields_total}`,
      caption: tp('dash.snap.openAlerts', data.alerts.length),
      href: '/alerts',
    },
    {
      label: t('dash.snap.weather'),
      value: `${num(data.weather.temperature_c, 0)}°`,
      caption: today ? t('dash.snap.rainToday', { n: today.rain_probability }) : data.weather.condition,
      href: '/weather',
    },
    {
      label: t('dash.snap.soilMoisture'),
      value: `${num(data.soil.moisture_pct)}%`,
      caption: data.soil.field_name,
      href: '/soil-irrigation',
      spark: moisture?.points.slice(-24),
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-x-5 gap-y-8 border-b border-line py-10 sm:gap-x-12 sm:gap-y-10 sm:py-14 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.label} href={item.href} className="group block">
          <p className="eyebrow">{item.label}</p>
          <p className="num mt-3 font-display text-[1.8rem] leading-none sm:text-[2.1rem] text-leaf-900 transition-colors group-hover:text-leaf-700">
            {item.value}
          </p>
          <p className="mt-2 text-sm text-ink-muted">{item.caption}</p>
          {item.spark?.length ? (
            <div className="mt-3 -mx-1 max-w-[8rem] opacity-70 transition-opacity group-hover:opacity-100">
              <Sparkline points={item.spark} height={26} color={COLORS.leaf[500]} />
            </div>
          ) : null}
        </Link>
      ))}
    </section>
  );
}

/* ---------------------------------------------------------------- fields ---- */

function Fields({ data }: { data: DashboardSnapshot }) {
  const { t } = useApp();
  return (
    <section className="border-b border-line py-10 sm:py-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[1.35rem] text-leaf-900">{t('dash.yourFields')}</h2>
        <Link
          href="/fields"
          className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-leaf-700 hover:underline"
        >
          {t('dash.allFields')}
        </Link>
      </div>

      <ul className="mt-7">
        {data.fields.map((field) => (
          <li key={field.id}>
            <Link
              href={`/fields/${field.id}`}
              className="group -mx-3 flex items-baseline gap-4 rounded-lg px-3 py-5 transition-colors hover:bg-raised sm:gap-8"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1.05rem] text-ink transition-colors group-hover:text-leaf-800">
                  {field.name}
                </span>
                <span className="mt-1 block truncate text-sm text-ink-faint">
                  {field.crop_label ?? field.crop} · {(field.growth_stage_label ?? field.growth_stage).toLowerCase()}
                </span>
                {/* On phones the status column is hidden, so the word goes under the name. */}
                <span className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted sm:hidden">
                  <span
                    className={cx('h-2 w-2 shrink-0 rounded-full', statusDot[field.soil_moisture_status])}
                  />
                  {statusShortWord[field.soil_moisture_status]}
                </span>
              </span>

              <span className="num w-20 shrink-0 text-right text-[1.05rem] text-ink sm:w-24">
                {num(field.soil_moisture)}%
              </span>

              <span className="hidden w-36 shrink-0 items-center gap-2 text-sm text-ink-muted sm:flex">
                <span
                  className={cx(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    statusDot[field.soil_moisture_status],
                  )}
                />
                {statusShortWord[field.soil_moisture_status]}
              </span>

              <ArrowUpRight
                className="hidden h-4 w-4 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                aria-hidden="true"
              />
            </Link>
            <span className="block h-px bg-line/70" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- elsewhere ---- */

function Elsewhere({ data, leadHandled }: { data: DashboardSnapshot; leadHandled: boolean }) {
  const { t, tp } = useApp();
  const remaining = leadHandled ? data.alerts.length - 1 : data.alerts.length;
  const insight = data.insights.find((item) => item.severity !== 'info') ?? data.insights[0];

  return (
    <section className="py-10 sm:py-14">
      {insight ? (
        <div className="max-w-2xl">
          <p className="eyebrow">{t('dash.also')}</p>
          <p className="mt-3 text-[1.05rem] leading-[1.7] text-ink-soft">
            {insight.interpretation}
          </p>
          <Link
            href="/ai-assistant"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
          >
            {t('dash.allInsights')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="mt-12 grid grid-cols-1 gap-y-1 border-t border-line pt-6 text-sm sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-4 sm:pt-8 [&>a]:flex [&>a]:min-h-[44px] [&>a]:items-center">
        {remaining > 0 ? (
          <Link href="/alerts" className="text-ink-muted transition-colors hover:text-leaf-700">
            {tp('dash.otherAlerts', remaining)}
          </Link>
        ) : null}
        <Link href="/sensors" className="text-ink-muted transition-colors hover:text-leaf-700">
          {t('dash.nodes', { online: data.device_health.online, total: data.device_health.total })}
        </Link>
        <Link href="/risk-forecast" className="text-ink-muted transition-colors hover:text-leaf-700">
          {t('dash.risk7', { level: t(`risk.${data.risk.overall_level}`) })}
        </Link>
        <Link href="/analytics" className="text-ink-muted transition-colors hover:text-leaf-700">
          {t('dash.trends')}
        </Link>
        <Link
          href="/settings"
          className="text-ink-faint transition-colors hover:text-leaf-700 sm:ml-auto"
        >
          {t('dash.how')}
        </Link>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- advice source ---- */

/**
 * Tells the farmer (and whoever is testing the pipeline) where today's words
 * came from. When an LLM is configured and its reply passes the backend's
 * number check, its plainer rewrite is shown; otherwise the rule-engine text
 * above stands on its own and is labelled as such.
 */
function AdviceSource({ fieldId }: { fieldId: string }) {
  const { t } = useApp();
  const { data } = useApi<AdvisoryBrief>('/advisory/brief', { field_id: fieldId });
  if (!data) return null;
  const llm = data.engine === 'llm';
  return (
    <div className="mt-4 max-w-2xl">
      {llm ? (
        <p className="rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-3 text-[1.02rem] leading-relaxed text-leaf-900">
          {data.text}
        </p>
      ) : null}
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-faint" title={data.reason ?? undefined}>
        <span className={cx('h-1.5 w-1.5 rounded-full', llm ? 'bg-sky-500' : 'bg-leaf-400')} />
        {t(llm ? 'advice.engine.llm' : 'advice.engine.rules')}
      </p>
    </div>
  );
}
