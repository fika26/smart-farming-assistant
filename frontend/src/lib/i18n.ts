/**
 * Translation architecture for the app.
 *
 * Two layers, one rule — no user-visible sentence is ever assembled in English
 * and translated afterwards:
 *
 * 1. **UI copy** (labels, buttons, headings) lives in `src/locales/<code>.json`,
 *    one flat key → string file per language. JSON rather than TS objects so the
 *    files can go straight into a translation platform (Crowdin, Tolgee,
 *    Weblate) and be checked by `scripts/i18n_coverage.py`.
 * 2. **Generated content** (alerts, advice, insights, analytics highlights) is
 *    rendered by the backend in the request language: `api.ts` sends `?lang=`
 *    on every call and `useApi` refetches when the language changes.
 *
 * Missing keys fall back to English key-by-key, never to the raw key, so a
 * partially translated language degrades gracefully. Tamil, Kannada, Marathi
 * and Bengali are registered (selector + AI replies) and fall back to English
 * until a reviewed catalog is added — drop `ta.json` etc. next to `hi.json`
 * and add it to `TRANSLATIONS` below.
 */

import enJson from '@/locales/en.json';
import hiJson from '@/locales/hi.json';
import teJson from '@/locales/te.json';

export type LanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'mr' | 'bn';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  /** Name in the language's own script, shown alongside the English name. */
  native: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

type Dict = Record<string, string>;
export type Params = Record<string, string | number>;

const en: Dict = enJson;

export const TRANSLATIONS: Partial<Record<LanguageCode, Dict>> = {
  en,
  hi: hiJson as Dict,
  te: teJson as Dict,
};

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function translate(language: LanguageCode, key: string, params?: Params): string {
  const template = TRANSLATIONS[language]?.[key] ?? en[key] ?? key;
  return interpolate(template, params);
}

/** Plural helper: looks up `<key>.one` for n === 1, `<key>.other` otherwise. */
export function translatePlural(
  language: LanguageCode,
  key: string,
  n: number,
  params?: Params,
): string {
  return translate(language, `${key}.${n === 1 ? 'one' : 'other'}`, { n, ...params });
}
