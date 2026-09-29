'use client';

import { usePathname } from 'next/navigation';

import { AppProviders } from '@/components/AppProviders';
import { AUTH_ROUTES, useAuth } from '@/components/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';

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

  if (onAuthRoute) return <>{children}</>;

  if (status === 'loading') return <BootScreen message="Checking your session…" />;
  if (status === 'anonymous') return <BootScreen message="Taking you to sign in…" />;

  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
