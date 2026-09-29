'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { translate, translatePlural } from '@/lib/i18n';
import type { LanguageCode, Params } from '@/lib/i18n';
import { setLanguage as setGlobalLanguage, useLanguage } from '@/lib/language';
import { useApi } from '@/lib/useApi';
import type { Alert, FieldSummary, NotificationItem, SystemMeta } from '@/types/api';

interface AppContextValue {
  fields: FieldSummary[];
  fieldId: string | null;
  activeField: FieldSummary | null;
  setFieldId: (id: string | null) => void;
  alerts: Alert[];
  notifications: NotificationItem[];
  system: SystemMeta | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, params?: Params) => string;
  /** Plural-aware: `tp('dash.otherAlerts', 3)` → `<key>.one` / `<key>.other`. */
  tp: (key: string, n: number, params?: Params) => string;
}

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = 'sfa.sidebar.collapsed';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const language = useLanguage();

  const fieldsState = useApi<FieldSummary[]>('/fields');
  const alertsState = useApi<Alert[]>('/alerts');
  const notificationsState = useApi<NotificationItem[]>('/notifications');
  const systemState = useApi<SystemMeta>('/meta');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSidebarCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => setGlobalLanguage(next), []);

  const t = useCallback(
    (key: string, params?: Params) => translate(language, key, params),
    [language],
  );
  const tp = useCallback(
    (key: string, n: number, params?: Params) => translatePlural(language, key, n, params),
    [language],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
      return next;
    });
  }, []);

  const refreshFields = fieldsState.refresh;
  const refreshAlerts = alertsState.refresh;
  const refreshNotifications = notificationsState.refresh;
  const refreshSystem = systemState.refresh;

  const refresh = useCallback(() => {
    refreshFields();
    refreshAlerts();
    refreshNotifications();
    refreshSystem();
  }, [refreshFields, refreshAlerts, refreshNotifications, refreshSystem]);

  const fields = useMemo(() => fieldsState.data ?? [], [fieldsState.data]);
  const activeField = useMemo(
    () => fields.find((field) => field.id === fieldId) ?? null,
    [fields, fieldId],
  );

  const value: AppContextValue = {
    fields,
    fieldId,
    activeField,
    setFieldId,
    alerts: alertsState.data ?? [],
    notifications: notificationsState.data ?? [],
    system: systemState.data ?? null,
    loading: fieldsState.loading,
    error: fieldsState.error,
    refresh,
    sidebarCollapsed,
    toggleSidebar,
    language,
    setLanguage,
    t,
    tp,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProviders');
  return context;
}
