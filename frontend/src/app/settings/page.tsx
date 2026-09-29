'use client';

import { Cpu, Database, Globe, LogOut, Sliders, UserRound } from 'lucide-react';

import { useApp } from '@/components/AppProviders';
import { useAuth } from '@/components/AuthProvider';
import { PageState } from '@/components/PageState';
import { SystemStory } from '@/components/SystemStory';
import {
  Badge,
  Button,
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  PanelHeader,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { API_BASE_URL } from '@/lib/api';
import { initials, num, cx } from '@/lib/format';
import { LANGUAGES } from '@/lib/i18n';
import { useApi } from '@/lib/useApi';
import type { SettingsPayload } from '@/types/api';

export default function SettingsPage() {
  const { data, meta, loading, error, refresh } = useApi<SettingsPayload>('/settings');
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useApp();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your farm details, the moisture levels each field is judged against, how you get notified, and what the app is connected to."
        meta={meta ? <SourceTag source={meta.data_source} /> : null}
      />

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your settings"
        loadingLabel="Loading your farm settings…"
      >
        {data ? (
          <div className="space-y-5">
            <Panel>
              <PanelHeader
                title="Your account"
                caption="The details you signed in with."
                action={<UserRound className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
              />
              <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-800 font-display text-base text-canvas">
                  {user ? initials(user.full_name) : '—'}
                </span>
                <div className="min-w-0">
                  <div className="divide-y divide-line">
                    <StatRow label="Name" value={user?.full_name ?? '—'} />
                    <StatRow label="Email" value={user?.email ?? '—'} />
                    <StatRow label="Farm" value={user?.farm_name ?? '—'} />
                    <StatRow label="Location" value={user?.location ?? 'Not set'} />
                    <StatRow label="Role" value={user?.role ?? 'operator'} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => void logout()}>
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign out
                    </Button>
                    <span className="text-2xs text-ink-faint">
                      Editing your profile writes to the users collection in the MongoDB phase.
                    </span>
                  </div>
                </div>
              </div>
            </Panel>

            <SystemStory />

            <Panel>
              <PanelHeader
                title={t('settings.language')}
                caption={t('settings.languageHelp')}
                action={<Globe className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
              />
              <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => setLanguage(option.code)}
                    aria-pressed={language === option.code}
                    className={cx(
                      'press flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                      language === option.code
                        ? 'border-leaf-300 bg-leaf-50 text-leaf-800'
                        : 'border-line bg-raised text-ink-soft hover:border-leaf-200 hover:bg-leaf-50/60',
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-ink-faint">{option.native}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-line px-5 py-3">
                <p className="text-2xs text-ink-faint">
                  English and Hindi are fully translated. The other languages are selectable and
                  SIYA the AI Assistant will already reply in them — the rest of the interface
                  falls back to English until a reviewed translation is added.
                </p>
              </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelHeader title="Farm" caption="Identity and location used across every screen." />
                <div className="divide-y divide-line px-5 py-2">
                  <StatRow label="Farm name" value={data.farm.name} />
                  <StatRow label="Location" value={data.farm.location} />
                  <StatRow label="Coordinates" value={`${data.farm.latitude}, ${data.farm.longitude}`} />
                  <StatRow label="Time zone" value={data.farm.timezone} />
                  <StatRow label="Farm id" value={data.farm.id} />
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Notifications"
                  caption="Which events reach the farmer, and how."
                />
                <div className="divide-y divide-line px-5 py-2">
                  <StatRow label="In-app" value={data.notifications.in_app ? 'Enabled' : 'Disabled'} />
                  <StatRow label="SMS" value={data.notifications.sms ? 'Enabled' : 'Disabled'} />
                  <StatRow label="Email" value={data.notifications.email ? 'Enabled' : 'Disabled'} />
                  <StatRow label="Quiet hours" value={data.notifications.quiet_hours} />
                  <StatRow label="Minimum severity" value={data.notifications.min_severity} />
                </div>
              </Panel>
            </div>

            <Panel className="overflow-hidden">
              <PanelHeader
                title="Field thresholds"
                caption="The agronomic constants the rule engine compares live readings against."
                action={<Sliders className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
              />
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-raised text-left">
                      {['Field', 'Crop', 'Soil', 'Irrigation', 'Refill point', 'Threshold', 'Field capacity'].map(
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
                    {data.fields.map((field) => (
                      <tr key={field.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{field.name}</td>
                        <td className="px-4 py-3 text-ink-soft">{field.crop}</td>
                        <td className="px-4 py-3 text-ink-soft">{field.soil_type}</td>
                        <td className="px-4 py-3 text-ink-soft">{field.irrigation_type}</td>
                        <td className="num px-4 py-3 text-ink-soft">{num(field.refill_point_pct)}%</td>
                        <td className="num px-4 py-3 text-ink-soft">{num(field.threshold_pct)}%</td>
                        <td className="num px-4 py-3 text-ink-soft">{num(field.field_capacity_pct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line px-5 py-3">
                <p className="text-2xs text-ink-faint">
                  Thresholds are served by the API and are currently read-only. Editing them writes
                  to the fields collection in the MongoDB phase.
                </p>
              </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelHeader
                  title="System"
                  caption="What this frontend is connected to right now."
                  action={<Cpu className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
                />
                <div className="divide-y divide-line px-5 py-2">
                  <StatRow label="API base URL" value={API_BASE_URL} />
                  <StatRow label="Service" value={`${data.system.app} v${data.system.version}`} />
                  <StatRow label="Environment" value={data.system.environment} />
                  <StatRow label="Data source" value={data.system.data_source} />
                  <StatRow label="Scenario" value={data.system.scenario_label} />
                  <StatRow label="Repository" value={data.system.repository} />
                  <StatRow label="Rule engine" value={data.system.rule_version} />
                  <StatRow label="Authentication" value="JWT bearer token" />
                  <StatRow label="Derived metrics" value={data.system.derive_version} />
                </div>
                <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                  <Badge tone={data.system.simulated ? 'clay' : 'leaf'}>
                    {data.system.simulated ? 'Simulated sensor data' : 'Live hardware'}
                  </Badge>
                  <Chip>
                    <span className="text-ink-faint">Units</span>
                    {Object.values(data.units).join(' · ')}
                  </Chip>
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Storage"
                  caption="Where readings live today, and where they are going."
                  action={<Database className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
                />
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Readings are currently held in an in-process time-series cache behind the
                    <span className="font-mono text-xs"> ReadingRepository </span>
                    interface. The MongoDB implementation is written against the same interface: a
                    time-series <span className="font-mono text-xs">readings</span> collection keyed
                    on <span className="font-mono text-xs">{'{device_id, sensor_id, sensor_type}'}</span>,
                    a unique <span className="font-mono text-xs">{'{device_id, seq}'}</span> index for
                    idempotent ingest, plus fields, devices, alerts and detections collections and a
                    GridFS bucket for uploaded crop images.
                  </p>
                  <div className="mt-4 divide-y divide-line">
                    <StatRow label="Active repository" value={data.system.repository} />
                    <StatRow label="Mongo integration" value="Deferred" />
                    <StatRow label="Switch" value="REPOSITORY=mongo" />
                  </div>
                  <div className="mt-4">
                    <Disclaimer>
                      Switching storage does not change a single API response shape — services depend
                      on the repository interface, never on the driver.
                    </Disclaimer>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        ) : null}
      </PageState>
    </>
  );
}
