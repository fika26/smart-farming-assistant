'use client';

import { BellOff, MessageSquare, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { PageState } from '@/components/PageState';
import {
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { cx, dateTime, severityTone } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { NotificationItem, Severity } from '@/types/api';

type Filter = 'all' | 'unread' | Severity;

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, meta, loading, error, refresh } = useApi<NotificationItem[]>('/notifications');
  const notifications = data ?? [];

  const visible = notifications.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !item.read;
    return item.severity === filter;
  });

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Everything the system has sent you. Urgent problems also go out by SMS so they reach you away from the screen."
        meta={meta ? <SourceTag source={meta.data_source} /> : null}
        actions={
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All ${notifications.length}` },
              { value: 'unread', label: `Unread ${unread}` },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
            ]}
          />
        }
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your notifications"
        loadingLabel="Fetching your recent notifications…"
      >
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Panel className="overflow-hidden">
            <PanelHeader title="Recent" caption="Newest first." />
            {visible.length === 0 ? (
              <EmptyState
                icon={<BellOff className="h-5 w-5" />}
                title="Nothing here"
                message="No notification matches this filter right now."
              />
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((item) => (
                  <li
                    key={item.id}
                    className={cx('px-5 py-4', !item.read && 'bg-leaf-50/40')}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cx(
                          'rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide',
                          severityTone[item.severity],
                        )}
                      >
                        {item.severity}
                      </span>
                      <span className="flex items-center gap-1.5 text-2xs text-ink-muted">
                        {item.channel.includes('SMS') ? (
                          <Smartphone className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <MessageSquare className="h-3 w-3" aria-hidden="true" />
                        )}
                        {item.channel}
                      </span>
                      {!item.read ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" aria-label="unread" />
                      ) : null}
                      <span className="num ml-auto text-2xs text-ink-faint">
                        {item.created_at_human} · {dateTime(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="space-y-5">
            <Panel className="p-5">
              <p className="eyebrow mb-3">Delivery rules</p>
              <div className="divide-y divide-line">
                <StatRow label="In-app" value="Enabled" />
                <StatRow label="SMS" value="Critical only" />
                <StatRow label="Email" value="Disabled" />
                <StatRow label="Quiet hours" value="22:00 – 05:00" />
                <StatRow label="Minimum severity" value="Medium" />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                Channels are configured per farm in Settings. During quiet hours only critical
                alerts break through, so a routine scouting reminder never wakes anyone at 2 a.m.
              </p>
            </Panel>

            <Panel className="p-5">
              <p className="eyebrow mb-2">Why an alert becomes a notification</p>
              <p className="text-sm leading-relaxed text-ink-muted">
                Alerts are generated continuously by the rule engine. A notification is only emitted
                when an alert crosses the configured minimum severity, is new rather than ongoing,
                and falls outside quiet hours. Device events (a node going degraded or offline) are
                always emitted, because a silent node makes every other alert unreliable.
              </p>
            </Panel>
          </div>
        </div>
      </PageState>
    </>
  );
}
