/**
 * Access-token storage and expiry handling.
 *
 * The token is a short-lived JWT issued by FastAPI. It is kept in localStorage so the
 * session survives a refresh; nothing else about the user is persisted here, and the
 * password never reaches the browser's storage in any form.
 */
const TOKEN_KEY = 'sfa.auth.token';

type Listener = () => void;
const listeners = new Set<Listener>();

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Called by the API client whenever the backend answers 401. */
export function onUnauthorized(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
