'use client';

import { AlertCircle, Inbox, Info, RefreshCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { COLORS } from '@/config/theme';
import { cx } from '@/lib/format';
import { translate } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';
import type { DataSourceTag } from '@/types/api';

export function Panel({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return <Tag className={cx('panel', className)}>{children}</Tag>;
}

export function PanelHeader({
  title,
  caption,
  action,
  eyebrow,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h2 className="font-display text-[1.05rem] leading-tight text-leaf-900">{title}</h2>
        {caption ? <p className="mt-1 text-sm text-ink-muted">{caption}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'leaf' | 'clay' | 'ember' | 'sky' | 'sun';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-sand-100 text-ink-soft border-line',
    leaf: 'bg-leaf-50 text-leaf-700 border-leaf-200',
    clay: 'bg-clay-100 text-clay-700 border-clay-300/60',
    ember: 'bg-ember-100 text-ember-700 border-ember-300/60',
    sky: 'bg-sky-100 text-sky-700 border-sky-300/60',
    sun: 'bg-sun-100 text-sun-700 border-sun-300/60',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-2.5 py-1 text-xs text-ink-soft',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Provenance tag — the UI never shows a simulated number without saying so. */
export function SourceTag({ source, className }: { source: DataSourceTag; className?: string }) {
  const lang = useLanguage();
  const tones: Record<DataSourceTag, string> = {
    measured: 'text-leaf-700 border-leaf-200 bg-leaf-50',
    derived: 'text-sky-700 border-sky-300/60 bg-sky-100',
    predicted: 'text-sun-700 border-sun-300/60 bg-sun-100',
    simulated: 'text-clay-700 border-clay-300/60 bg-clay-100',
    external: 'text-ink-soft border-line bg-canvas',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-2xs font-medium tracking-wide',
        tones[source],
        className,
      )}
      title={translate(lang, 'src.provenance', { source: translate(lang, `src.${source}`) })}
    >
      {translate(lang, `src.${source}`)}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-leaf-800 text-canvas hover:bg-leaf-900 border-leaf-800 disabled:bg-leaf-400 disabled:border-leaf-400',
    secondary:
      'bg-surface text-leaf-800 hover:bg-leaf-50 border-leaf-200 hover:border-leaf-300',
    ghost: 'bg-transparent text-ink-muted hover:bg-raised hover:text-ink border-transparent',
    danger: 'bg-ember-500 text-canvas hover:bg-ember-700 border-ember-500',
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'press inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx('relative overflow-hidden rounded-md bg-line/60', className)}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function LoadingPanel({
  rows = 3,
  title,
  label = 'Loading the latest field data…',
}: {
  rows?: number;
  title?: string;
  label?: string;
}) {
  return (
    <div className="panel p-5" role="status" aria-busy="true" aria-live="polite">
      {title ? <p className="eyebrow mb-3">{title}</p> : null}
      <Skeleton className="h-5 w-2/5" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-faint">{label}</p>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  compact,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const lang = useLanguage();
  const offline = /cannot reach|failed to fetch|networkerror/i.test(message);
  const guidance = translate(lang, offline ? 'err.offline' : 'err.generic');
  title = title ?? translate(lang, 'err.title');

  return (
    <div
      className={cx(
        'panel flex flex-col items-start gap-3 border-clay-300/60 bg-clay-100/40',
        compact ? 'p-4' : 'p-6',
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-clay-700" aria-hidden="true" />
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">{guidance}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onRetry ? (
          <Button variant="primary" size="sm" onClick={onRetry}>
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {translate(lang, 'common.retry')}
          </Button>
        ) : null}
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer select-none rounded focus-visible:ring-2 focus-visible:ring-leaf-500">
            Technical details
          </summary>
          <p className="mt-1.5 max-w-xl font-mono text-2xs leading-relaxed text-ink-faint">
            {message}
          </p>
        </details>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-raised text-ink-faint">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <p className="font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = COLORS.healthy,
  height = 6,
  track = 'bg-line',
  label,
}: {
  value: number;
  tone?: string;
  height?: number;
  track?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx('w-full overflow-hidden rounded-full', track)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'progress'}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: tone }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5"
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'rounded-md font-medium transition-colors duration-150',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-surface text-ink shadow-card'
                : 'text-ink-muted hover:text-ink-soft',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="num text-right text-sm font-medium text-ink">
        {value}
        {hint ? <span className="ml-1.5 text-xs font-normal text-ink-faint">{hint}</span> : null}
      </span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[1.4rem] leading-tight text-leaf-900 lg:text-[1.6rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-clay-300/50 bg-clay-100/50 px-3 py-2 text-xs leading-relaxed text-clay-700">
      {children}
    </p>
  );
}

/** Small contextual explainer — used instead of a tutorial. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf-600" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Click/tap-activated explainer. Not hover-only, so it works on touch and with a
 * keyboard; closes on Escape or an outside click.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`What does "${label}" mean?`}
        className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink-soft"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 animate-fade-up rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-ink-soft shadow-pop"
        >
          <span className="mb-0.5 block text-2xs font-semibold uppercase tracking-wide text-ink-faint">
            {label}
          </span>
          {children}
        </span>
      ) : null}
    </span>
  );
}

/** A value that animates to its new number when live data refreshes. */
export function LiveValue({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  const [flash, setFlash] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span className={cx('transition-colors duration-700', flash && 'text-leaf-600', className)}>
      {value}
    </span>
  );
}
