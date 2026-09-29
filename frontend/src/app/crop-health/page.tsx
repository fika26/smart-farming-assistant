'use client';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { GaugeRing, MultiTrendChart } from '@/components/charts';
import { IndicatorRow } from '@/components/domain';
import {
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { healthFill, num, trendGlyph } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { CropHealth } from '@/types/api';

export default function CropHealthPage() {
  const { fieldId, setFieldId, fields, t } = useApp();
  const activeId = fieldId ?? fields[0]?.id ?? null;
  const { data, meta, loading, error, refresh } = useApi<CropHealth>('/crop-health', {
    field_id: activeId,
  });

  return (
    <>
      <PageHeader
        title={t('page.cropHealth.title')}
        description={t('page.cropHealth.description')}
        meta={meta ? <SourceTag source={meta.data_source} /> : null}
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
        errorTitle="We couldn't load crop health"
        loadingLabel="Scoring your crop from the latest readings…"
      >
        {data ? (
          <div className="space-y-5">
            <Panel className="grid gap-6 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="flex items-center gap-4">
                <GaugeRing value={data.health_score} color={healthFill(data.health_score)} size={112} caption="/ 100" />
                <div>
                  <p className="eyebrow">Crop health status</p>
                  <p className="font-display text-lg text-leaf-900">{data.health_label}</p>
                  <p className="mt-1 text-xs capitalize text-ink-muted">
                    {trendGlyph[data.trend]} {data.trend} over 72 h
                  </p>
                </div>
              </div>

              <div className="min-w-0 lg:border-l lg:border-line lg:pl-6">
                <p className="eyebrow">Crop & stage</p>
                <p className="mt-1 font-display text-[1.05rem] text-leaf-900">
                  {data.crop} · {data.growth_stage}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip>
                    <span className="text-ink-faint">Field</span>
                    <span className="font-medium text-ink">{data.field_name}</span>
                  </Chip>
                  <Chip>
                    <span className="text-ink-faint">Days after sowing</span>
                    <span className="num font-medium text-ink">{data.days_after_sowing}</span>
                  </Chip>
                  <Chip>
                    <span className="text-ink-faint">GDD</span>
                    <span className="num font-medium text-ink">{num(data.gdd_accumulated, 0)}</span>
                  </Chip>
                </div>
              </div>

              <div className="border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <p className="eyebrow mb-1">Recent changes</p>
                <ul className="space-y-1.5">
                  {data.recent_changes.map((change) => (
                    <li key={change} className="max-w-xs text-xs leading-relaxed text-ink-muted">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelHeader title="Observed indicators" caption="What the hardware and derived metrics show." />
                <div className="px-5 py-2">
                  {data.observed_indicators.map((indicator) => (
                    <IndicatorRow key={indicator.label} indicator={indicator} />
                  ))}
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Risk indicators" caption="Conditions that could degrade crop condition." />
                <div className="px-5 py-2">
                  {data.risk_indicators.map((indicator) => (
                    <IndicatorRow key={indicator.label} indicator={indicator} />
                  ))}
                </div>
              </Panel>
            </div>

            <Panel>
              <PanelHeader
                title="Seven-day condition trends"
                caption="Moisture, temperature and humidity — the inputs behind the health score."
                action={<SourceTag source="measured" />}
              />
              <div className="p-4 pt-2">
                <MultiTrendChart seriesList={data.series} height={250} span="week" />
              </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <Panel>
                <PanelHeader title="Recommendations" caption="Derived from the active rules on this field." />
                <ol className="divide-y divide-line">
                  {data.recommendations.map((recommendation, index) => (
                    <li key={recommendation} className="flex gap-3 px-5 py-3.5">
                      <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-leaf-200 bg-leaf-50 text-2xs font-semibold text-leaf-700">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-ink-soft">{recommendation}</p>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel className="p-5">
                <p className="eyebrow mb-3">Scoring inputs</p>
                <div className="divide-y divide-line">
                  <StatRow label="Health score" value={`${data.health_score}/100`} />
                  <StatRow label="Growth stage" value={data.growth_stage} />
                  <StatRow label="Accumulated GDD" value={num(data.gdd_accumulated, 0)} hint="derived" />
                  <StatRow label="Trend" value={data.trend} />
                </div>
                <div className="mt-4">
                  <Disclaimer>{data.disclaimer}</Disclaimer>
                </div>
              </Panel>
            </div>
          </div>
        ) : null}
      </PageState>
    </>
  );
}
