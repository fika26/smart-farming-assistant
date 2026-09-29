/**
 * Process-wide current language.
 *
 * Lives outside React context on purpose: `api.ts` must attach `?lang=` to every
 * request, and `useApi` must refetch when the language changes, but AppProviders
 * itself is built on `useApi` — so the language cannot live only inside the
 * provider it feeds. AppProviders writes here; everything else reads.
 */
import { useSyncExternalStore } from 'react';

import { DEFAULT_LANGUAGE, LANGUAGES } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/i18n';

export const LANGUAGE_STORAGE_KEY = 'sfa.language';

function initial(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as LanguageCode;
  } catch {
    /* storage blocked — fall through */
  }
  return DEFAULT_LANGUAGE;
}

let current: LanguageCode = initial();
const listeners = new Set<() => void>();

export function getLanguage(): LanguageCode {
  return current;
}

export function setLanguage(next: LanguageCode): void {
  if (next === current) return;
  current = next;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useLanguage(): LanguageCode {
  return useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
}
