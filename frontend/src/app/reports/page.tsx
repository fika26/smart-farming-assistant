'use client';

import { Download, FileText } from 'lucide-react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { Badge, Button, Disclaimer, PageHeader, Panel, PanelHeader, SourceTag } from '@/components/ui';
import { dateTime } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { ReportItem } from '@/types/api';

export default function ReportsPage() {
  const { t } = useApp();
  const { data, meta, loading, error, refresh } = useApi<ReportItem[]>('/reports');
  const reports = data ?? [];

  return (
    <>
      <PageHeader
        title={t('page.reports.title')}
        description={t('page.reports.description')}
        meta={meta ? <SourceTag source={meta.data_source} /> : null}
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your reports"
        loadingLabel="Looking up your season records…"
      >
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Panel className="overflow-hidden">
            <PanelHeader title="Generated reports" caption="Available for the current season." />
            <ul className="divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-ink-faint">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{report.title}</p>
                      <Badge tone="neutral">{report.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{report.summary}</p>
                    <p className="num mt-1.5 text-2xs text-ink-faint">
                      {report.period} · generated {dateTime(report.generated_at)} · {report.size_kb} KB ·
                      export not yet available
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {report.formats.map((format) => (
                      <Button
                        key={format}
                        variant="secondary"
                        size="sm"
                        disabled
                        title="Export writers ship with the MongoDB phase — no file is generated in this prototype."
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {format}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-5">
            <Panel className="p-5">
              <p className="eyebrow mb-3">What goes into a report</p>
              <ul className="space-y-3">
                {[
                  ['Sensor history', 'Every calibrated reading with its raw value and status flag.'],
                  ['Alerts and rules', 'Which rule fired, when, on what evidence, and at what confidence.'],
                  ['Irrigation record', 'Threshold-triggered cycles with estimated depth and volume.'],
                  ['Device uptime', 'Uplink rate, buffered packets and per-channel faults.'],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
                    <div>
                      <p className="text-sm font-medium text-ink">{title}</p>
                      <p className="text-xs leading-relaxed text-ink-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Disclaimer>
              Report generation is catalogued by the API but the PDF and CSV writers are part of the
              MongoDB phase — the buttons above are placeholders in this prototype, and no
              downloadable artefact is produced yet.
            </Disclaimer>
          </div>
        </div>
      </PageState>
    </>
  );
}
