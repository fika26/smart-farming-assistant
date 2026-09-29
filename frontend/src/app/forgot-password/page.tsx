'use client';

import { ArrowLeft, Loader2, MailQuestion } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AuthFooterNote, AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { requestPasswordReset } from '@/lib/auth';
import type { ForgotPasswordResult } from '@/types/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setResult(await requestPasswordReset(email.trim()));
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.detail
          : 'We could not reach the Smart Farming Assistant service. Check that it is running and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      headline="Locked out? Your fields are still being watched."
      support="Monitoring keeps running while you get back into your account."
    >
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to sign in
      </Link>

      <div>
        <p className="eyebrow">Smart Farming Assistant</p>
        <h1 className="mt-2 font-display text-[1.6rem] leading-tight text-leaf-900">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Enter the email address on your account and we will start the reset.
        </p>
      </div>

      {result ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-lg border border-clay-300/60 bg-clay-100/50 px-4 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-clay-700">
              <MailQuestion className="h-4 w-4" aria-hidden="true" />
              {result.email_delivery_configured ? 'Reset requested' : 'No email was sent'}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{result.message}</p>
          </div>

          {result.prototype_reset_token ? (
            <div className="rounded-lg border border-line bg-sand-100 px-4 py-3.5">
              <p className="text-xs font-medium text-ink">Prototype reset token</p>
              <p className="mt-1.5 break-all font-mono text-2xs leading-relaxed text-ink-soft">
                {result.prototype_reset_token}
              </p>
              <p className="mt-2 text-2xs leading-relaxed text-ink-faint">
                In a configured deployment this token is embedded in an emailed link and never shown
                here. It is displayed now only because no mail provider is connected.
              </p>
            </div>
          ) : null}

          <Link href="/login" className="block">
            <Button variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          {formError ? <FormAlert message={formError} /> : null}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setError(null);
            }}
            error={error}
            placeholder="you@yourfarm.in"
            autoComplete="email"
            required
          />

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Requesting reset…
              </>
            ) : (
              'Send reset instructions'
            )}
          </Button>
        </form>
      )}

      <AuthFooterNote>
        We never say whether an email is registered, so this page looks the same either way.
      </AuthFooterNote>
    </AuthLayout>
  );
}
