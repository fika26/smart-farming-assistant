'use client';

import { Bot, LayoutDashboard, Menu, Sprout, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useApp } from '@/components/AppProviders';
import { cx } from '@/lib/format';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const { alerts, t } = useApp();
  const pathname = usePathname();
  const urgent = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  const tabs = [
    { href: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { href: '/fields', label: t('nav.fields'), icon: Sprout },
    { href: '/alerts', label: t('nav.alerts'), icon: TriangleAlert, badge: urgent },
    { href: '/ai-assistant', label: t('nav.ai-assistant'), icon: Bot },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-leaf-800 bg-leaf-900 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch justify-between px-1">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-2xs font-medium transition-colors',
                  active ? 'text-leaf-300' : 'text-leaf-100/70',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {badge && badge > 0 ? (
                    <span className="num absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-ember-500 px-0.5 text-[9px] font-bold leading-none text-canvas">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMore}
            className="flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 py-1.5 text-2xs font-medium text-leaf-100/70 transition-colors"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{t('nav.more')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
