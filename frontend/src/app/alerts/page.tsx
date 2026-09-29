'use client';

import { CircleCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { AlertCard } from '@/components/domain';
import { RecentActivity } from '@/components/domain/RecentActivity';
import { EmptyState, PageHeader, Panel, Segmented, SourceTag } from '@/components/ui';
import { cx, severityBar } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { Alert, DashboardSnapshot, Severity } from '@/types/api';

type Filter = 'all' | Severity;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'info', label: 'Info' },
];

export default function AlertsPage() {
  const { fieldId } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, meta, loading, error, refresh } = useApi<Alert[]>('/alerts', { field_id: fieldId });
  // "What changed" moved here from the dashboard — activity belongs with alerts.
  const snapshot = useApi<DashboardSnapshot>('/dashboard', { field_id: fieldId });

  const alerts = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => {
    const base: Record<Severity, number> = { critical: 0, high: 0, medium: 0, info: 0 };
    alerts.forEach((alert) => {
      base[alert.severity] += 1;
    });
    return base;
  }, [alerts]);

  const visible = filter === 'all' ? alerts : alerts.filter((alert) => alert.severity === filter);

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Everything the system thinks is wrong, most urgent first. Each one tells you what happened, why it matters and what to do about it."
        meta={meta ? <SourceTag source={meta.data_source} /> : null}
        actions={<Segmented options={FILTERS} value={filter} onChange={setFilter} size="sm" />}
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your alerts"
        loadingLabel="Checking your fields for problems…"
      >
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-3">
            {snapshot.data ? (
              <RecentActivity
                metrics={snapshot.data.metrics}
                alerts={snapshot.data.alerts}
                deviceHealth={snapshot.data.device_health}
                fieldName={snapshot.data.soil.field_name}
              />
            ) : null}
            <Panel className="p-4">
              <p className="eyebrow mb-3">By severity</p>
              <ul className="space-y-2">
                {(['critical', 'high', 'medium', 'info'] as Severity[]).map((severity) => (
                  <li key={severity}>
                    <button
                      onClick={() => setFilter(severity)}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-raised',
                        filter === severity && 'bg-raised',
                      )}
                    >
                      <span className={cx('h-2 w-2 rounded-full', severityBar[severity])} />
                      <span className="capitalize text-ink-soft">{severity}</span>
                      <span className="num ml-auto font-medium text-ink">{counts[severity]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel className="p-4">
              <p className="eyebrow mb-2.5">What the levels mean</p>
              <ul className="space-y-2">
                {(
                  [
                    ['critical', 'Act now', 'The crop is being harmed right now.'],
                    ['high', 'Act today', 'Damage is likely if left another day.'],
                    ['medium', 'Plan this week', 'Worth handling soon, not urgent.'],
                    ['info', 'For awareness', 'Nothing to do — just so you know.'],
                  ] as [Severity, string, string][]
                ).map(([level, urgency, meaning]) => (
                  <li key={level} className="flex gap-2.5">
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', severityBar[level])} />
                    <div>
                      <p className="text-xs font-medium capitalize text-ink">
                        {level} · {urgency}
                      </p>
                      <p className="text-2xs leading-relaxed text-ink-muted">{meaning}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="p-4">
              <p className="eyebrow mb-2">Where alerts come from</p>
              <p className="text-xs leading-relaxed text-ink-muted">
                Your sensors send a reading every 30 minutes. The system compares each reading
                against what this crop, soil and growth stage need, and raises an alert only when
                something is actually outside that range.
              </p>
            </Panel>
          </aside>

          <div className="space-y-4">
            {visible.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={<CircleCheck className="h-5 w-5 text-leaf-500" />}
                  title={filter === 'all' ? 'No active alerts' : `No ${filter} alerts`}
                  message="Nothing in your fields is outside its safe range right now. We are still checking every 30 minutes."
                />
              </Panel>
            ) : (
              visible.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </div>
        </div>
      </PageState>
    </>
  );
}
