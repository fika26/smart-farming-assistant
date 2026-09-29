'use client';

import type { ReactNode } from 'react';

import { ErrorState, LoadingPanel } from '@/components/ui';

/** Uniform loading / error / retry handling for every data-backed page. */
export function PageState({
  loading,
  error,
  onRetry,
  skeleton,
  errorTitle,
  loadingLabel,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  skeleton?: ReactNode;
  errorTitle?: string;
  loadingLabel?: string;
  children: ReactNode;
}) {
  if (error) return <ErrorState title={errorTitle} message={error} onRetry={onRetry} />;
  if (loading) {
    return (
      <>
        {skeleton ?? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <LoadingPanel rows={2} label={loadingLabel} />
            <LoadingPanel rows={2} label={loadingLabel} />
            <LoadingPanel rows={2} label={loadingLabel} />
          </div>
        )}
      </>
    );
  }
  return <>{children}</>;
}
