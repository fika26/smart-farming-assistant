import { API_BASE_URL, ApiError, postJson } from '@/lib/api';
import { clearSession, setToken } from '@/lib/session';
import type { AuthResponse, ForgotPasswordResult, RegisterPayload, User } from '@/types/auth';

export async function signIn(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthResponse> {
  const response = await postJson<AuthResponse>('/auth/login', { email, password, remember });
  setToken(response.access_token);
  return response;
}

export async function signUp(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await postJson<AuthResponse>('/auth/register', payload);
  setToken(response.access_token);
  return response;
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  return postJson<ForgotPasswordResult>('/auth/forgot-password', { email });
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  const { getToken } = await import('@/lib/session');
  const token = getToken();
  if (!token) throw new ApiError('Not signed in', 401, 'Not signed in');
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal,
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new ApiError('Session expired', response.status, 'Session expired');
  }
  return (await response.json()) as User;
}

export async function signOut(): Promise<void> {
  try {
    await postJson('/auth/logout', {});
  } catch {
    // Signing out must always succeed locally, even if the backend is unreachable.
  } finally {
    clearSession();
  }
}

/** Demo credentials, exposed by the backend only while the mock data source is active. */
export async function fetchDemoAccount(): Promise<{ email: string; password: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/demo-account`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data?.available ? { email: body.data.email, password: body.data.password } : null;
  } catch {
    return null;
  }
}
