'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useApp } from '@/components/AppProviders';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { SidebarContent } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { cx } from '@/lib/format';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-leaf-800 focus:px-4 focus:py-2 focus:text-sm focus:text-canvas"
      >
        Skip to main content
      </a>
      {/* Desktop sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 ease-out lg:block',
          sidebarCollapsed ? 'w-[68px]' : 'w-[264px]',
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cx(
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={cx(
            'absolute inset-0 bg-ink/40 transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={cx(
            'absolute inset-y-0 left-0 w-[276px] shadow-pop transition-transform duration-250 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarContent
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
          />
        </div>
      </div>

      <div
        className={cx(
          'transition-[padding] duration-200 ease-out',
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[264px]',
        )}
      >
        <Topbar onOpenNav={() => setMobileOpen(true)} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-9 lg:pb-9"
        >
          {/* Keyed on the route so each page eases in rather than snapping. */}
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      <MobileTabBar onOpenMore={() => setMobileOpen(true)} />
    </div>
  );
}
