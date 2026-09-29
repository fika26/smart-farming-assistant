'use client';

import { Bell, ChevronDown, Globe, LogOut, Menu, RefreshCcw, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { useAuth } from '@/components/AuthProvider';
import { findNavItem } from '@/config/nav';
import { cx, initials, severityBar, severityTone } from '@/lib/format';
import { LANGUAGES } from '@/lib/i18n';

function FieldSelector() {
  const { fields, fieldId, setFieldId, activeField, t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ink"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" aria-hidden="true" />
        <span className="max-w-[10rem] truncate font-medium">
          {activeField ? activeField.name : t('topbar.allFields')}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 z-50 mt-2 w-64 animate-fade-up rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <button
            role="option"
            aria-selected={fieldId === null}
            onClick={() => {
              setFieldId(null);
              setOpen(false);
            }}
            className={cx(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-raised',
              fieldId === null && 'bg-leaf-50 text-leaf-800',
            )}
          >
            <span className="font-medium">{t('topbar.allFields')}</span>
            <span className="text-2xs text-ink-faint">farm-wide</span>
          </button>
          <div className="my-1 h-px bg-line" />
          {fields.map((field) => (
            <button
              key={field.id}
              role="option"
              aria-selected={fieldId === field.id}
              onClick={() => {
                setFieldId(field.id);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-raised',
                fieldId === field.id && 'bg-leaf-50 text-leaf-800',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{field.name}</span>
                <span className="block truncate text-2xs text-ink-faint">
                  {field.crop} · {field.growth_stage}
                </span>
              </span>
              <span className="num shrink-0 text-xs text-ink-muted">{field.health_score}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LanguageSelector() {
  const { language, setLanguage } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        aria-label="Choose language"
      >
        <Globe className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-52 animate-fade-up rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              role="option"
              aria-selected={language === item.code}
              onClick={() => {
                setLanguage(item.code);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-raised',
                language === item.code && 'bg-leaf-50 text-leaf-800',
              )}
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-ink-faint">{item.native}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotificationsMenu() {
  const { notifications, t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg border border-line bg-surface p-2 text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        aria-label={`Notifications, ${unread} unread`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 ? (
          <span className="num absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-500 px-1 text-2xs font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 animate-fade-up overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-ink">{t('topbar.notifications')}</p>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-leaf-600 hover:underline"
            >
              {t('topbar.viewAll')}
            </Link>
          </div>
          <ul className="scroll-thin max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-ink-muted">{t('topbar.nothingNew')}</li>
            ) : (
              notifications.slice(0, 6).map((item) => (
                <li key={item.id} className="border-b border-line px-4 py-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        'rounded border px-1.5 py-0.5 text-2xs font-semibold uppercase',
                        severityTone[item.severity],
                      )}
                    >
                      {item.severity}
                    </span>
                    <span className="ml-auto text-2xs text-ink-faint">{item.created_at_human}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.body}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}


function AccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-raised"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-leaf-800 text-2xs font-semibold text-canvas">
          {initials(user.full_name)}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block max-w-[9rem] truncate text-xs font-medium text-ink">
            {user.full_name}
          </span>
          <span className="block max-w-[9rem] truncate text-2xs text-ink-faint">
            {user.farm_name}
          </span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-ink-faint lg:block" aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 animate-fade-up overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user.full_name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <p className="mt-1.5 truncate text-2xs text-ink-faint">
              {user.farm_name}
              {user.location ? ` · ${user.location}` : ''}
            </p>
          </div>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <SettingsIcon className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            {t('topbar.profileSettings')}
          </Link>
          <button
            role="menuitem"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await logout();
            }}
            className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ember-700 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            {signingOut ? 'Signing out…' : t('topbar.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();
  const { system, refresh, alerts, t, tp } = useApp();
  const { user } = useAuth();
  const needsAttention = alerts.filter(
    (alert) => alert.severity === 'critical' || alert.severity === 'high',
  ).length;
  const topSeverity = alerts.some((alert) => alert.severity === 'critical') ? 'critical' : 'high';
  const item = findNavItem(pathname);
  const title = pathname.startsWith('/fields/')
    ? t('topbar.fieldDetail')
    : (item ? t(item.labelKey) : 'Overview');

  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-10">
        <button
          onClick={onOpenNav}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft lg:hidden"
          aria-label={t('topbar.openNav')}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="hidden text-2xs uppercase tracking-[0.12em] text-ink-faint sm:block">
            {user?.farm_name ?? system?.farm.name ?? 'Farm'} ·{' '}
            {user?.location ?? system?.farm.location ?? '—'}
          </p>
          <div className="flex items-center gap-2.5">
            <h2 className="truncate text-sm font-medium leading-tight text-ink-soft">{title}</h2>
            {needsAttention > 0 ? (
              <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
                <span className={cx('h-1.5 w-1.5 rounded-full', severityBar[topSeverity])} />
                {tp('topbar.issues', needsAttention)}
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
                {t('topbar.allClear')}
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {system?.simulated ? (
            // Visible at every width: a farmer on a phone must know these are not real readings.
            <span
              className="whitespace-nowrap rounded-full border border-clay-300/60 bg-clay-100 px-2 py-0.5 text-2xs font-medium text-clay-700"
              title={t('topbar.demoTitle', { scenario: system.scenario_label })}
            >
              {t('topbar.demoData')}
            </span>
          ) : null}
          <div className="hidden sm:block">
            <FieldSelector />
          </div>
          <LanguageSelector />
          <button
            onClick={refresh}
            className="hidden rounded-lg p-2.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink sm:block"
            aria-label={t('topbar.refresh')}
            title={t('topbar.refresh')}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <NotificationsMenu />
          <AccountMenu />
        </div>
      </div>

      <div className="border-t border-line px-4 py-1.5 sm:hidden">
        <FieldSelector />
      </div>
    </header>
  );
}
