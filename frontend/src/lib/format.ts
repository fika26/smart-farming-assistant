import { COLORS } from '@/config/theme';
import type { MetricStatus, RiskLevel, Severity, TrendDir } from '@/types/api';

export function num(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 10000) return Math.round(value).toLocaleString('en-IN');
  return value.toFixed(digits).replace(/\.0$/, '');
}

export function signed(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  const formatted = num(Math.abs(value), digits);
  if (value === 0) return `0`;
  return `${value > 0 ? '+' : '−'}${formatted}`;
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return `${shortDate(iso)} · ${clockTime(iso)}`;
}

export const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
};

export const severityTone: Record<Severity, string> = {
  critical: 'text-ember-700 bg-ember-100 border-ember-300/60',
  high: 'text-clay-700 bg-clay-100 border-clay-300/60',
  medium: 'text-sun-700 bg-sun-100 border-sun-300/60',
  info: 'text-sky-700 bg-sky-100 border-sky-300/60',
};

export const severityBar: Record<Severity, string> = {
  critical: 'bg-ember-500',
  high: 'bg-clay-500',
  medium: 'bg-sun-500',
  info: 'bg-sky-500',
};

export const statusTone: Record<MetricStatus, string> = {
  normal: 'text-leaf-700 bg-leaf-50 border-leaf-200',
  watch: 'text-sky-700 bg-sky-100 border-sky-300/60',
  warning: 'text-clay-700 bg-clay-100 border-clay-300/60',
  critical: 'text-ember-700 bg-ember-100 border-ember-300/60',
};

export const statusDot: Record<MetricStatus, string> = {
  normal: 'bg-leaf-500',
  watch: 'bg-sky-500',
  warning: 'bg-clay-500',
  critical: 'bg-ember-500',
};

export const riskTone: Record<RiskLevel, string> = {
  severe: 'text-ember-700 bg-ember-100 border-ember-300/60',
  high: 'text-clay-700 bg-clay-100 border-clay-300/60',
  moderate: 'text-sun-700 bg-sun-100 border-sun-300/60',
  low: 'text-leaf-700 bg-leaf-50 border-leaf-200',
};

export const riskFill: Record<RiskLevel, string> = {
  severe: COLORS.critical,
  high: COLORS.warning,
  moderate: COLORS.caution,
  low: COLORS.healthy,
};

export function healthTone(score: number): string {
  if (score >= 85) return 'text-leaf-700';
  if (score >= 70) return 'text-sky-700';
  if (score >= 55) return 'text-clay-700';
  return 'text-ember-700';
}

export function healthFill(score: number): string {
  if (score >= 85) return COLORS.leaf[700];
  if (score >= 70) return COLORS.leaf[500];
  if (score >= 55) return COLORS.warning;
  return COLORS.critical;
}

export const trendGlyph: Record<TrendDir, string> = {
  rising: '↑',
  falling: '↓',
  stable: '→',
};

export function sourceLabel(source: string): string {
  switch (source) {
    case 'measured':
      return 'Measured';
    case 'derived':
      return 'Derived';
    case 'predicted':
      return 'Predicted';
    case 'simulated':
      return 'Simulated';
    case 'external':
      return 'External';
    default:
      return source;
  }
}

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const statusFill: Record<MetricStatus, string> = {
  normal: COLORS.healthy,
  watch: COLORS.info,
  warning: COLORS.warning,
  critical: COLORS.critical,
};
