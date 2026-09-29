'use client';

import Link from 'next/link';
import { useState } from 'react';

import { PageState } from '@/components/PageState';
import { FieldCard } from '@/components/domain';
import { PageHeader, Panel, Segmented, SourceTag } from '@/components/ui';
import { cx, num, riskTone, statusDot } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { FieldSummary } from '@/types/api';

export default function FieldsPage() {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const { data, meta, loading, error, refresh } = useApi<FieldSummary[]>('/fields');
  const fields = data ?? [];

  return (
    <>
      <PageHeader
        title="Fields"
        description="How each of your fields is doing right now. Tap a field to see its readings, alerts and recommended actions."
        meta={meta ? <SourceTag source={meta.data_source} /> : null}
        actions={
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'cards', label: 'Cards' },
              { value: 'table', label: 'Table' },
            ]}
          />
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your fields"
        loadingLabel="Loading your fields…"
      >
        {view === 'cards' ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {fields.map((field) => (
              <FieldCard key={field.id} field={field} />
            ))}
          </div>
        ) : (
          <Panel className="overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-raised text-left">
                    {['Field', 'Crop', 'Area', 'Health', 'Soil moisture', 'Irrigation', 'Risk', 'Alerts', 'Last update'].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-2xs font-semibold uppercase tracking-wide text-ink-faint"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.id} className="border-b border-line last:border-0 hover:bg-raised">
                      <td className="px-4 py-3">
                        <Link href={`/fields/${field.id}`} className="font-medium text-leaf-700 hover:underline">
                          {field.name}
                        </Link>
                        <p className="text-2xs text-ink-faint">{field.soil_type} · {field.irrigation_type}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {field.crop}
                        <p className="text-2xs text-ink-faint">{field.growth_stage}</p>
                      </td>
                      <td className="num px-4 py-3 text-ink-soft">{num(field.area_ha)} ha</td>
                      <td className="num px-4 py-3 font-medium text-ink">
                        {field.health_score}
                        <span className="ml-1.5 text-2xs font-normal text-ink-faint">{field.health_label}</span>
                      </td>
                      <td className="num px-4 py-3">
                        <span className={cx('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', statusDot[field.soil_moisture_status])} />
                        {num(field.soil_moisture)}%
                      </td>
                      <td className="px-4 py-3 capitalize text-ink-soft">{field.irrigation_state}</td>
                      <td className="px-4 py-3">
                        <span className={cx('rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase', riskTone[field.risk_level])}>
                          {field.risk_level}
                        </span>
                      </td>
                      <td className="num px-4 py-3 text-ink-soft">{field.active_alerts}</td>
                      <td className="px-4 py-3 text-2xs text-ink-faint">{field.last_reading_human ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </PageState>
    </>
  );
}
