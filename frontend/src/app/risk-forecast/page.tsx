'use client';

import { CalendarDays, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { CategoryBars, GaugeRing, MultiTrendChart } from '@/components/charts';
import { RiskRow } from '@/components/domain';
import {
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Segmented,
  SourceTag,
} from '@/components/ui';
import { cx, riskFill, riskTone } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { RiskForecast, RiskLevel, Series } from '@/types/api';

export default function RiskForecastPage() {
  const { fieldId, setFieldId, fields, t } = useApp();
  const activeId = fieldId ?? fields[0]?.id ?? null;
  const { data, meta, loading, error, refresh } = useApi<RiskForecast>('/risk-forecast', {
    field_id: activeId,
  });
  const [day, setDay] = useState(0);

  const forecastSeries: Series[] = (data?.risks ?? []).map((risk) => ({
    key: risk.hazard,
    label: risk.label,
    unit: 'score',
    source: 'predicted',
    points: risk.forecast.map((value, index) => ({
      t: new Date(Date.now() + index * 86400000).toISOString(),
      v: value,
    })),
  }));

  return (
    <>
      <PageHeader
        title={t('page.riskForecast.title')}
        description={t('page.riskForecast.description')}
        meta={
          <>
            {data ? <Chip>{data.field_name}</Chip> : null}
            {meta ? <SourceTag source={meta.data_source} /> : null}
          </>
        }
        actions={
          fields.length ? (
            <Segmented
              size="sm"
              value={activeId ?? fields[0].id}
              onChange={(value) => setFieldId(value)}
              options={fields.map((field) => ({ value: field.id, label: field.name }))}
            />
          ) : null
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load the risk forecast"
        loadingLabel="Working out the week ahead…"
      >
        {data ? (
          <div className="space-y-5">
            <Panel className="grid gap-6 p-5 lg:grid-cols-[auto_1fr] lg:items-center">
              <div className="flex items-center gap-4">
                <GaugeRing
                  value={data.overall_score}
                  color={riskFill[data.overall_level]}
                  size={112}
                  caption="/ 100"
                />
                <div>
                  <p className="eyebrow">Overall risk</p>
                  <p className="font-display text-xl capitalize text-ink">{data.overall_level}</p>
                  <span
                    className={cx(
                      'mt-2 inline-block rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide',
                      riskTone[data.overall_level],
                    )}
                  >
                    {data.horizon_days}-day horizon
                  </span>
                </div>
              </div>
              <div className="lg:border-l lg:border-line lg:pl-6">
                <p className="eyebrow mb-2">Hazard scores today</p>
                <CategoryBars
                  horizontal
                  height={190}
                  unit="/100"
                  data={data.risks.map((risk) => ({
                    label: risk.label.split(' ')[0],
                    value: risk.score,
                    color: riskFill[risk.level],
                  }))}
                />
              </div>
            </Panel>

            {/* Interactive seven-day timeline — select a day to see that day's picture */}
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="Seven-day timeline"
                title="Pick a day to see what to expect"
                caption="Scores are projected from today's readings and the simulated forecast. Selecting a day shows the hazards, drivers and actions for that day."
                action={
                  <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {data.horizon_days} days
                  </span>
                }
              />

              <div className="scroll-thin flex gap-2 overflow-x-auto border-b border-line px-5 py-4">
                {data.days.map((label, index) => {
                  const dayScores = data.risks.map((risk) => risk.forecast[index] ?? risk.score);
                  const peak = Math.max(...dayScores);
                  const level: RiskLevel =
                    peak >= 75 ? 'severe' : peak >= 55 ? 'high' : peak >= 32 ? 'moderate' : 'low';
                  const active = day === index;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setDay(index)}
                      aria-pressed={active}
                      className={cx(
                        'press w-[86px] shrink-0 rounded-xl border px-3 py-3 text-center transition-colors',
                        active
                          ? 'border-leaf-700 bg-leaf-800 text-canvas'
                          : 'border-line bg-surface hover:border-leaf-200 hover:bg-leaf-50',
                      )}
                    >
                      <span
                        className={cx(
                          'block text-2xs font-semibold uppercase tracking-wide',
                          active ? 'text-leaf-300' : 'text-ink-faint',
                        )}
                      >
                        {label}
                      </span>
                      <span
                        className={cx(
                          'num mt-1.5 block font-display text-lg leading-none',
                          active ? 'text-canvas' : 'text-ink',
                        )}
                      >
                        {peak}
                      </span>
                      <span
                        className="mx-auto mt-2 block h-1.5 w-8 rounded-full"
                        style={{ backgroundColor: riskFill[level] }}
                      />
                      <span
                        className={cx(
                          'mt-1.5 block text-2xs capitalize',
                          active ? 'text-leaf-100' : 'text-ink-muted',
                        )}
                      >
                        {level}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
                <div>
                  <p className="eyebrow mb-3">
                    Expected on {data.days[day]} · {data.field_name}
                  </p>
                  <ul className="space-y-3">
                    {[...data.risks]
                      .map((risk) => ({ risk, score: risk.forecast[day] ?? risk.score }))
                      .sort((a, b) => b.score - a.score)
                      .map(({ risk, score }) => {
                        const level: RiskLevel =
                          score >= 75 ? 'severe' : score >= 55 ? 'high' : score >= 32 ? 'moderate' : 'low';
                        return (
                          <li key={risk.hazard}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="text-ink-soft">{risk.label}</span>
                              <span className="num font-medium text-ink">
                                {score}
                                <span className="ml-1 text-2xs font-normal capitalize text-ink-faint">
                                  {level}
                                </span>
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <ProgressBar
                                value={score}
                                height={5}
                                tone={riskFill[level]}
                                label={`${risk.label} on ${data.days[day]}`}
                              />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </div>

                <div className="lg:border-l lg:border-line lg:pl-5">
                  {(() => {
                    const ranked = [...data.risks]
                      .map((risk) => ({ risk, score: risk.forecast[day] ?? risk.score }))
                      .sort((a, b) => b.score - a.score);
                    const top = ranked[0];
                    return (
                      <>
                        <p className="eyebrow mb-2">Biggest concern that day</p>
                        <p className="font-display text-[1.05rem] text-leaf-900">
                          {top.risk.label}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{top.risk.why}</p>
                        <p className="mt-3 rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2 text-sm text-leaf-800">
                          <span className="eyebrow mr-2 text-leaf-600">Do this</span>
                          {top.risk.action}
                        </p>
                        <p className="eyebrow mb-2 mt-4">What is driving it</p>
                        <div className="flex flex-wrap gap-2">
                          {top.risk.drivers.map((driver) => (
                            <Chip key={driver.label}>
                              <span className="text-ink-faint">{driver.label}</span>
                              <span className="num font-medium text-ink">{driver.value}</span>
                              <SourceTag source={driver.source} className="scale-90" />
                            </Chip>
                          ))}
                        </div>
                        <p className="mt-3 text-2xs text-ink-faint">
                          Affected field: {data.field_name} · confidence{' '}
                          {Math.round(top.risk.confidence * 100)}% · projected from today&apos;s
                          readings, not an external forecast service.
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
              <Panel className="overflow-hidden">
                <PanelHeader
                  title="Hazards, explained"
                  caption="Why each score is where it is, and the action that lowers it."
                />
                <div>
                  {data.risks.map((risk) => (
                    <RiskRow key={risk.hazard} risk={risk} />
                  ))}
                </div>
              </Panel>

              <div className="space-y-5">
                <Panel>
                  <PanelHeader
                    title="Seven-day projection"
                    caption="Projected hazard scores across the forecast window."
                    action={<SourceTag source="predicted" />}
                  />
                  <div className="p-4 pt-2">
                    <MultiTrendChart seriesList={forecastSeries} height={230} span="week" />
                  </div>
                </Panel>

                <Panel className="p-5">
                  <p className="eyebrow mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    Method
                  </p>
                  <p className="text-sm leading-relaxed text-ink-muted">{data.method}</p>
                  <div className="mt-4">
                    <Disclaimer>
                      Risk levels are indicative decision support, not a guarantee. Forecast inputs
                      are simulated in this prototype; live readings are measured.
                    </Disclaimer>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        ) : null}
      </PageState>
    </>
  );
}
