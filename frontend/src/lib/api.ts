import { getLanguage } from '@/lib/language';
import { clearSession, getToken, onUnauthorized } from '@/lib/session';
import type { Envelope } from '@/types/api';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

/**
 * Resolve the API base URL defensively.
 *
 * An empty or whitespace-only NEXT_PUBLIC_API_BASE_URL used to survive as an empty
 * string, which made every request relative to the Next.js origin and surfaced as a
 * bare "Not Found" from the frontend router instead of a backend response. A base URL
 * missing the /api prefix produced the same symptom from FastAPI.
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = (raw && raw.length > 0 ? raw : DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  return /\/api$/.test(base) ? base : `${base}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

/* ------------------------------------------------------------ cold starts ---
 * Free hosting (Render free tier) puts the backend to sleep after ~15 idle
 * minutes and takes up to a minute to wake. During that window requests fail
 * at the network level or get 502/503/504. Instead of showing an error (or
 * logging the user out), retry with backoff for up to WAKE_BUDGET_MS and let
 * the UI show a "waking up" notice.
 */
const WAKE_BUDGET_MS = 90_000;
const WAKE_STATUSES = new Set([502, 503, 504]);
let waking = false;
const wakeListeners = new Set<(waking: boolean) => void>();

function setWaking(next: boolean) {
  if (waking === next) return;
  waking = next;
  wakeListeners.forEach((fn) => fn(next));
}

export function onWakeChange(fn: (waking: boolean) => void): () => void {
  wakeListeners.add(fn);
  return () => wakeListeners.delete(fn);
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export async function wakeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const started = Date.now();
  let delay = 2_000;
  for (;;) {
    try {
      const response = await fetch(url, init);
      if (!WAKE_STATUSES.has(response.status) || Date.now() - started > WAKE_BUDGET_MS) {
        setWaking(false);
        return response;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || Date.now() - started > WAKE_BUDGET_MS) {
        setWaking(false);
        throw err;
      }
    }
    setWaking(true);
    await sleep(delay, init.signal);
    delay = Math.min(delay + 2_000, 8_000);
  }
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function parseProblem(response: Response): Promise<never> {
  let detail = response.statusText || 'Request failed';
  try {
    const body = await response.json();
    detail = body?.detail ?? body?.title ?? detail;
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 404) {
    // A 404 on an API call is a configuration fault, never something the user did.
    detail =
      `The service did not recognise ${response.url}. Check that the backend is running ` +
      `on port 8000 and that NEXT_PUBLIC_API_BASE_URL ends with /api.`;
  }
  if (response.status === 401) {
    // The token is missing, expired or rejected — drop it and let the app redirect.
    clearSession();
    onUnauthorized();
  }
  throw new ApiError(detail, response.status, detail);
}

/**
 * Every request carries the access token when one is stored, and the UI
 * language so the backend renders alerts, advice and analytics text in it.
 */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  const headers = { ...extra, 'X-Lang': getLanguage() };
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

/** `lang` also goes in the query string so cached responses never mix languages. */
function withQuery(path: string, params?: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  search.set('lang', getLanguage());
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const qs = search.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

/** GET an enveloped resource and return `data` (meta is available via getEnvelope). */
export async function getData<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  signal?: AbortSignal,
): Promise<T> {
  const envelope = await getEnvelope<T>(path, params, signal);
  return envelope.data;
}

export async function getEnvelope<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  signal?: AbortSignal,
): Promise<Envelope<T>> {
  const response = await wakeFetch(withQuery(path, params), {
    signal,
    headers: authHeaders({ Accept: 'application/json' }),
    cache: 'no-store',
  });
  if (!response.ok) await parseProblem(response);
  return (await response.json()) as Envelope<T>;
}

/** GET a bare (non-enveloped) resource such as /health. */
export async function getRaw<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await wakeFetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: authHeaders({ Accept: 'application/json' }),
    cache: 'no-store',
  });
  if (!response.ok) await parseProblem(response);
  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await wakeFetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) await parseProblem(response);
  return (await response.json()) as T;
}

export async function postForm<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  const response = await wakeFetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
    signal,
  });
  if (!response.ok) await parseProblem(response);
  return (await response.json()) as T;
}
