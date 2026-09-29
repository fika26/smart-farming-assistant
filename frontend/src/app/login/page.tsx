'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { AuthFooterNote, AuthLayout, AuthSwitch } from '@/components/auth/AuthLayout';
import { Checkbox, FormAlert, PasswordField, TextField } from '@/components/auth/fields';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { fetchDemoAccount } from '@/lib/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    fetchDemoAccount().then(setDemo);
  }, []);

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setBusy(true);
    try {
      await login(email.trim(), password, remember);
      // AuthProvider redirects to /dashboard once the session is set.
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setFormError(
          'The sign-in service could not be found. Check that the backend is running on port 8000 and that frontend/.env.local sets NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api',
        );
      } else if (err instanceof ApiError && err.status === 401) {
        setFormError('Email or password is incorrect. Please try again.');
      } else if (err instanceof ApiError) {
        setFormError(err.detail);
      } else {
        setFormError(
          'We could not reach the Smart Farming Assistant service. Check that it is running and try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <p className="eyebrow">Smart Farming Assistant</p>
        <h1 className="mt-2 font-display text-[1.6rem] leading-tight text-leaf-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Monitor your fields, understand your crops, and act before risks become problems.
        </p>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        {formError ? <FormAlert message={formError} /> : null}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email}
          placeholder="you@yourfarm.in"
          autoComplete="email"
          required
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
          placeholder="Your password"
          autoComplete="current-password"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>

        <Link href="/register" className="block">
          <Button type="button" variant="secondary" className="w-full">
            Create account
          </Button>
        </Link>
      </form>

      {demo ? (
        <div className="mt-6 rounded-lg border border-line bg-sand-100 px-3.5 py-3">
          <p className="text-xs font-medium text-ink">Reviewing this project?</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Sign in with{' '}
            <span className="font-mono text-2xs text-ink">{demo.email}</span> /{' '}
            <span className="font-mono text-2xs text-ink">{demo.password}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail(demo.email);
              setPassword(demo.password);
              setErrors({});
            }}
            className="mt-2 text-xs font-medium text-leaf-700 underline-offset-4 hover:underline"
          >
            Fill these in for me
          </button>
        </div>
      ) : null}

      <AuthSwitch question="New to the platform?" actionLabel="Create an account" href="/register" />

      <AuthFooterNote>
        Third-party sign-in is not offered because no OAuth provider is configured for this
        deployment. Passwords are stored only as bcrypt hashes.
      </AuthFooterNote>
    </AuthLayout>
  );
}
