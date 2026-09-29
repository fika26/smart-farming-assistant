'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, getData, getEnvelope } from '@/lib/api';
import { useLanguage } from '@/lib/language';
import type { Envelope, Meta } from '@/types/api';

export interface ApiState<T> {
  data: T | null;
  meta: Meta | null;
  loading: boolean;
  error: string | null;
  status: number | null;
  refresh: () => void;
}

type Params = Record<string, string | number | undefined | null>;

/**
 * Small fetch hook with loading / error / retry semantics.
 * Every page in the app reads backend data through this — there is no other data path.
 */
export function useApi<T>(path: string, params?: Params, enabled = true): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  // Language is part of the request identity: switching it refetches every
  // screen so server-generated text (alerts, advice, highlights) follows.
  const language = useLanguage();
  const key = JSON.stringify(params ?? {});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getEnvelope<T>(path, JSON.parse(key) as Params, controller.signal)
      .then((envelope: Envelope<T>) => {
        if (!mounted.current) return;
        setData(envelope.data);
        setMeta(envelope.meta);
        setStatus(200);
      })
      .catch((err: unknown) => {
        if (!mounted.current || (err as Error)?.name === 'AbortError') return;
        if (err instanceof ApiError) {
          setError(err.detail);
          setStatus(err.status);
        } else {
          setError(
            'Cannot reach the FastAPI backend. Start it with "uvicorn app.main:app --reload --port 8000".',
          );
          setStatus(null);
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => controller.abort();
  }, [path, key, enabled, nonce, language]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { data, meta, loading, error, status, refresh };
}

/** Non-enveloped variant, used for /health. */
export function useApiRaw<T>(path: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getData<T>(path, undefined, controller.signal)
      .then(setData)
      .catch(() => setError('unreachable'))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [path, nonce]);

  return {
    data,
    meta: null,
    loading,
    error,
    status: null,
    refresh: () => setNonce((n) => n + 1),
  };
}
