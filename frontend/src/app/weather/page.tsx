'use client';

import { CloudRain, Sun, Thermometer, Wind } from 'lucide-react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { CategoryBars, MultiTrendChart, TrendChart } from '@/components/charts';
import {
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  PanelHeader,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { COLORS } from '@/config/theme';
import { cx, num, riskTone } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { RiskLevel, WeatherSummary } from '@/types/api';

function RiskTile({
  label,
  level,
  icon,
  note,
}: {
  label: string;
  level: RiskLevel;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <span className={cx('rounded-md border p-1.5', riskTone[level])}>{icon}</span>
          {label}
        </span>
        <span className={cx('rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide', riskTone[level])}>
          {level}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{note}</p>
    </div>
  );
}

export default function WeatherPage() {
  const { fieldId, t } = useApp();
  const { data, meta, loading, error, refresh } = useApi<WeatherSummary>('/weather', {
    field_id: fieldId,
  });

  return (
    <>
      <PageHeader
        title={t('page.weather.title')}
        description={t('page.weather.description')}
        meta={
          <>
            {data ? <Chip>{data.location}</Chip> : null}
            {meta ? <SourceTag source={meta.data_source} /> : null}
          </>
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load the weather view"
        loadingLabel="Reading conditions in your field…"
      >
        {data ? (
          <div className="space-y-5">
            <Panel className="grid gap-6 p-6 lg:grid-cols-[auto_1fr] lg:items-center">
              <div>
                <p className="eyebrow">Now</p>
                <p className="num mt-1 font-display text-[2.5rem] leading-none text-leaf-900">
                  {num(data.temperature_c)}
                  <span className="ml-1 text-xl text-ink-muted">°C</span>
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {data.condition} · feels like {num(data.feels_like_c)}°C
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:border-l lg:border-line lg:pl-6">
                {[
                  { label: 'Humidity', value: `${num(data.humidity_pct)} %RH`, source: 'measured' as const },
                  { label: 'Light', value: `${num(data.light_lux, 0)} lux`, source: 'measured' as const },
                  { label: 'VPD', value: `${num(data.vpd_kpa, 2)} kPa`, source: 'derived' as const },
                  { label: 'Dew point', value: `${num(data.dew_point_c)} °C`, source: 'derived' as const },
                ].map((item) => (
                  <div key={item.label} className="panel-quiet px-3 py-3">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-2xs uppercase tracking-wide text-ink-faint">{item.label}</p>
                      <SourceTag source={item.source} className="scale-90" />
                    </div>
                    <p className="num mt-1 text-sm font-medium text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid gap-4 sm:grid-cols-3">
              <RiskTile
                label="Heat risk"
                level={data.heat_risk}
                icon={<Thermometer className="h-4 w-4" aria-hidden="true" />}
                note="Driven by peak temperature, heat index and vapour pressure deficit at canopy level."
              />
              <RiskTile
                label="Drought risk"
                level={data.drought_risk}
                icon={<Sun className="h-4 w-4" aria-hidden="true" />}
                note="Driven by soil-water depletion, reference evapotranspiration and forecast rain probability."
              />
              <RiskTile
                label="Rain / flood risk"
                level={data.rain_risk}
                icon={<CloudRain className="h-4 w-4" aria-hidden="true" />}
                note="Driven by forecast rain probability against current root-zone moisture and soil type."
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Panel>
                <PanelHeader
                  title="24-hour canopy conditions"
                  caption="Measured every 30 minutes. Light is charted separately because lux dwarfs the other scales."
                  action={<SourceTag source="measured" />}
                />
                <div className="p-4 pt-2">
                  <MultiTrendChart
                    seriesList={data.hourly.filter((series) => series.key !== 'light')}
                    height={220}
                    span="day"
                  />
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="eyebrow mb-1.5">Light intensity (BH1750, lux)</p>
                    {data.hourly
                      .filter((series) => series.key === 'light')
                      .map((series) => (
                        <TrendChart key={series.key} series={series} height={110} span="day" />
                      ))}
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Agricultural implication"
                  caption="What these conditions mean for the crop right now."
                />
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {data.agricultural_implication}
                  </p>
                  <p className="mt-4 rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2.5 text-sm text-leaf-800">
                    <span className="eyebrow mr-2 text-leaf-600">Recommended action</span>
                    {data.recommended_action}
                  </p>
                  <div className="mt-4 divide-y divide-line border-t border-line">
                    <StatRow label="Wind" value="Not measured" hint="no sensor" />
                    <StatRow label="Rainfall" value="Not measured" hint="no sensor" />
                    <StatRow label="Forecast source" value="Simulated" />
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-2xs leading-relaxed text-ink-faint">
                    <Wind className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {data.wind_note} Rain and wind figures are never invented from the sensors that
                    are fitted.
                  </p>
                </div>
              </Panel>
            </div>

            <Panel>
              <PanelHeader
                title="Seven-day outlook"
                caption="Clearly labelled simulated forecast — no external weather API is connected in this prototype."
                action={<SourceTag source="simulated" />}
              />
              <div className="scroll-thin flex gap-3 overflow-x-auto p-5">
                {data.forecast.map((day) => (
                  <div key={`${day.day}-${day.date}`} className="panel-quiet min-w-[120px] flex-1 p-3.5 text-center">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                      {day.day}
                    </p>
                    <p className="text-2xs text-ink-faint">{day.date}</p>
                    <p className="num mt-2 font-display text-[1.05rem] text-leaf-900">{num(day.t_max)}°</p>
                    <p className="num text-2xs text-ink-muted">min {num(day.t_min)}°</p>
                    <p className="mt-2 text-2xs text-ink-soft">{day.condition}</p>
                    <p className="num mt-1 text-2xs text-sky-700">
                      {day.rain_probability}% · {num(day.rain_mm)} mm
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line p-4">
                <p className="eyebrow mb-2">Rain probability across the window</p>
                <CategoryBars
                  data={data.forecast.map((day) => ({
                    label: day.day.length > 6 ? day.date : day.day,
                    value: day.rain_probability,
                    color: COLORS.info,
                  }))}
                  height={170}
                  unit="%"
                />
              </div>
              <div className="border-t border-line px-5 py-4">
                <Disclaimer>
                  Forecast temperatures, humidity and rain probability are simulated for the
                  prototype. Current temperature, humidity and light are measured by the edge node.
                </Disclaimer>
              </div>
            </Panel>
          </div>
        ) : null}
      </PageState>
    </>
  );
}
