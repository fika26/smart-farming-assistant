'use client';

import { ArrowDownRight, ArrowUpRight, Minus, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { Panel, PanelHeader } from '@/components/ui';
import { cx, num, signed } from '@/lib/format';
import { trendWord } from '@/lib/meaning';
import type { Alert, DeviceHealth, MetricSummary } from '@/types/api';

interface ChangeRow {
  id: string;
  label: string;
  detail: string;
  direction: 'up' | 'down' | 'flat' | 'alert';
  href?: string;
}

/**
 * "What changed?" — built from the 24-hour deltas and newest alerts already in the
 * dashboard payload, so it never needs a second request.
 */
export function RecentActivity({
  metrics,
  alerts,
  deviceHealth,
  fieldName,
}: {
  metrics: MetricSummary[];
  alerts: Alert[];
  deviceHealth: DeviceHealth;
  fieldName: string;
}) {
  const moved = metrics
    .filter((metric) => metric.delta_24h !== null && Math.abs(metric.delta_24h) > 0.2)
    .sort((a, b) => Math.abs(b.delta_24h ?? 0) - Math.abs(a.delta_24h ?? 0))
    .slice(0, 3)
    .map<ChangeRow>((metric) => ({
      id: metric.key,
      label: metric.label,
      detail: `${signed(metric.delta_24h)} ${metric.unit} in 24 h — ${trendWord(metric.trend, 'now')}`,
      direction: (metric.delta_24h ?? 0) > 0 ? 'up' : 'down',
    }));

  const newest = [...alerts]
    .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
    .slice(0, 2)
    .map<ChangeRow>((alert) => ({
      id: alert.id,
      label: `${alert.title} · ${alert.field_name}`,
      detail: `Raised ${alert.opened_at_human} — ${alert.severity}`,
      direction: 'alert',
      href: `/fields/${alert.field_id}`,
    }));

  const rows: ChangeRow[] = [...newest, ...moved];

  if (deviceHealth.buffered_packets > 0) {
    rows.push({
      id: 'buffered',
      label: `${deviceHealth.buffered_packets} readings buffered on a node`,
      detail: 'They will backfill automatically when the link returns',
      direction: 'flat',
      href: '/sensors',
    });
  }

  return (
    <Panel>
      <PanelHeader
        eyebrow="Since yesterday"
        title="What changed"
        caption={`The movements and new issues worth knowing about in ${fieldName}.`}
      />
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">
          Nothing moved meaningfully in the last 24 hours.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => {
            const Icon =
              row.direction === 'alert'
                ? TriangleAlert
                : row.direction === 'up'
                  ? ArrowUpRight
                  : row.direction === 'down'
                    ? ArrowDownRight
                    : Minus;
            const body = (
              <>
                <span
                  className={cx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
                    row.direction === 'alert'
                      ? 'border-clay-300/60 bg-clay-100/60 text-clay-700'
                      : 'border-line bg-raised text-ink-muted',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{row.label}</span>
                  <span className="block text-xs leading-relaxed text-ink-muted">{row.detail}</span>
                </span>
              </>
            );
            return (
              <li key={row.id}>
                {row.href ? (
                  <Link
                    href={row.href}
                    className="flex gap-3 px-5 py-3 transition-colors hover:bg-raised"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-5 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function formatCount(value: number): string {
  return num(value, 0);
}
