'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppProviders } from '@/components/AppProviders';
import { AUTH_ROUTES, useAuth } from '@/components/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { onWakeChange } from '@/lib/api';
import { translate } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';

/** Shown while the free-tier backend is waking from sleep. */
function WakeBanner() {
  const [waking, setWaking] = useState(false);
  const lang = useLanguage();
  useEffect(() => onWakeChange(setWaking), []);
  if (!waking) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-sun-100 px-4 py-2 text-center text-sm text-ink"
    >
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-sun-300 border-t-ink" />
      {translate(lang, 'wake.banner')}
    </div>
  );
}

function BootScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-leaf-200 border-t-leaf-700" />
        <p className="text-sm text-ink-muted">{message}</p>
      </div>
    </div>
  );
}

/**
 * Decides which frame the current route gets.
 * Auth routes render bare; everything else renders the application shell and only
 * after the session has been confirmed, so protected data never flashes on screen.
 */
export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const onAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  let body: React.ReactNode;
  if (onAuthRoute) body = children;
  else if (status === 'loading') body = <BootScreen message="Checking your session…" />;
  else if (status === 'anonymous') body = <BootScreen message="Taking you to sign in…" />;
  else
    body = (
      <AppProviders>
        <AppShell>{children}</AppShell>
      </AppProviders>
    );

  return (
    <>
      <WakeBanner />
      {body}
    </>
  );
}
