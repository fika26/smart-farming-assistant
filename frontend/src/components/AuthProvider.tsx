'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchCurrentUser, signIn, signOut, signUp } from '@/lib/auth';
import { getToken, subscribeUnauthorized } from '@/lib/session';
import type { AuthResponse, RegisterPayload, User } from '@/types/auth';

export const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

interface AuthContextValue {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string, remember: boolean) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  const router = useRouter();
  const pathname = usePathname();

  // Restore the session on first paint, then whenever the token is rejected.
  useEffect(() => {
    const controller = new AbortController();
    if (!getToken()) {
      setStatus('anonymous');
      return () => controller.abort();
    }
    fetchCurrentUser(controller.signal)
      .then((current) => {
        setUser(current);
        setStatus('authenticated');
      })
      .catch(() => {
        setUser(null);
        setStatus('anonymous');
      });
    return () => controller.abort();
  }, []);

  // A 401 from any request drops the session rather than leaving a dead UI.
  useEffect(
    () =>
      subscribeUnauthorized(() => {
        setUser(null);
        setStatus('anonymous');
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const response = await signIn(email, password, remember);
    setUser(response.user);
    setStatus('authenticated');
    return response;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await signUp(payload);
    setUser(response.user);
    setStatus('authenticated');
    return response;
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  // Redirect rules, written so neither direction can loop: an anonymous user is only
  // ever pushed to /login (which is an auth route), and an authenticated user is only
  // ever pushed off an auth route.
  useEffect(() => {
    if (status === 'loading') return;
    const onAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
    if (status === 'anonymous' && !onAuthRoute) {
      router.replace('/login');
    } else if (status === 'authenticated' && onAuthRoute) {
      router.replace('/dashboard');
    }
  }, [status, pathname, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
