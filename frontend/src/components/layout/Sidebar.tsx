'use client';

import { ChevronLeft, Leaf, PanelLeftOpen, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useApp } from '@/components/AppProviders';
import { NAV_SECTIONS } from '@/config/nav';
import type { NavItem } from '@/config/nav';
import { cx } from '@/lib/format';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  collapsed,
  badge,
  onNavigate,
  label,
}: {
  item: NavItem;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
  label: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <li className="relative">
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? `${label} — ${item.description}` : item.description}
        className={cx(
          'group/link relative flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors duration-150',
          collapsed ? 'justify-center px-2' : 'pl-4 pr-3',
          active
            ? 'bg-leaf-800 font-medium text-canvas'
            : 'text-leaf-100/75 hover:bg-leaf-800/55 hover:text-canvas',
        )}
      >
        <span
          className={cx(
            'absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-leaf-300 transition-opacity duration-150',
            active ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden="true"
        />
        <Icon
          className={cx('h-[17px] w-[17px] shrink-0', active ? 'text-leaf-300' : 'text-leaf-300/55')}
          aria-hidden="true"
        />
        {!collapsed ? <span className="truncate">{label}</span> : null}
        {badge && badge > 0 ? (
          <span
            className={cx(
              'num rounded-full px-1.5 py-0.5 text-2xs font-bold leading-none',
              collapsed
                ? 'absolute -right-0.5 -top-0.5 bg-ember-500 text-canvas'
                : 'ml-auto bg-ember-500 text-canvas',
            )}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>

      {collapsed ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 opacity-0 shadow-pop transition-opacity duration-150 group-hover/link:opacity-100 lg:block"
        >
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="mt-0.5 max-w-[15rem] whitespace-normal text-xs text-ink-muted">
            {item.description}
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function SidebarContent({
  collapsed,
  onNavigate,
  onClose,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const { alerts, notifications, system, toggleSidebar, t } = useApp();
  const unread = notifications.filter((item) => !item.read).length;
  const badgeFor = (item: NavItem) => {
    if (item.badge === 'alerts') return alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
    if (item.badge === 'notifications') return unread;
    return undefined;
  };

  return (
    <div className="flex h-full flex-col bg-leaf-900 text-canvas">
      {/* Product identity */}
      <div
        className={cx(
          'flex items-center gap-3 border-b border-leaf-800 px-5 py-5',
          collapsed && 'justify-center px-2',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-leaf-300/15 ring-1 ring-leaf-300/30">
          <Leaf className="h-[18px] w-[18px] text-leaf-300" aria-hidden="true" />
        </span>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1rem] leading-tight text-canvas">
              {t('app.name')}
            </p>
            <p className="truncate text-2xs uppercase tracking-[0.12em] text-leaf-300">
              {t('app.tagline')}
            </p>
          </div>
        ) : null}
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-leaf-300 hover:bg-leaf-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="mb-5 last:mb-0">
            {collapsed ? (
              <div className="mx-auto my-2.5 h-px w-6 bg-leaf-300/20" aria-hidden="true" />
            ) : (
              <p className="px-4 pb-2 text-2xs font-semibold uppercase tracking-[0.14em] text-leaf-300/70">
                {t(section.labelKey)}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  badge={badgeFor(item)}
                  onNavigate={onNavigate}
                  label={t(item.labelKey)}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* System status */}
      <div className={cx('border-t border-leaf-800 px-5 py-4', collapsed && 'px-2')}>
        <div className={cx('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-leaf-300" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-300" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-canvas">{t('sidebar.online')}</p>
              <p className="truncate text-2xs text-leaf-300/75">
                {system
                  ? system.simulated
                    ? t('sidebar.demo', { scenario: system.scenario_label })
                    : t('sidebar.live', { source: system.data_source })
                  : t('sidebar.connecting')}
              </p>
            </div>
          ) : null}
        </div>

        <button
          onClick={toggleSidebar}
          className={cx(
            'mt-3.5 hidden w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-2xs font-medium text-leaf-300/80 transition-colors hover:bg-leaf-800 hover:text-canvas lg:flex',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Collapse
            </>
          )}
        </button>
      </div>
    </div>
  );
}
