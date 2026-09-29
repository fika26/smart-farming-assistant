'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { AuthFooterNote, AuthLayout, AuthSwitch } from '@/components/auth/AuthLayout';
import { FormAlert, PasswordField, TextField } from '@/components/auth/fields';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

type Errors = Partial<
  Record<'fullName' | 'email' | 'password' | 'confirm' | 'farmName', string>
>;

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate() {
    const next: Errors = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD) {
      next.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (confirm !== password) next.confirm = 'Both passwords must match.';
    if (farmName.trim().length < 2) next.farmName = 'Enter the name of your farm.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setBusy(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        farm_name: farmName.trim(),
        location: location.trim() || null,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setFormError(
          'The sign-up service could not be found. Check that the backend is running on port 8000 and that frontend/.env.local sets NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api',
        );
      } else if (err instanceof ApiError && err.status === 409) {
        setErrors((current) => ({
          ...current,
          email: 'An account already exists for this email address.',
        }));
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
    <AuthLayout
      headline="Set up your farm once, then let the field tell you what it needs."
      support="Add your fields and sensors, and the assistant starts turning readings into daily decisions."
    >
      <div>
        <p className="eyebrow">Smart Farming Assistant</p>
        <h1 className="mt-2 font-display text-[1.6rem] leading-tight text-leaf-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          A few details is all we need. You can add fields and sensors once you are inside.
        </p>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        {formError ? <FormAlert message={formError} /> : null}

        <TextField
          label="Full name"
          value={fullName}
          onChange={(value) => {
            setFullName(value);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
          error={errors.fullName}
          placeholder="Ravi Kumar"
          autoComplete="name"
          required
        />

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email}
          placeholder="you@yourfarm.in"
          autoComplete="email"
          required
        />

        <TextField
          label="Farm name"
          value={farmName}
          onChange={(value) => {
            setFarmName(value);
            setErrors((current) => ({ ...current, farmName: undefined }));
          }}
          error={errors.farmName}
          placeholder="Sunehra Khet Farm"
          autoComplete="organization"
          required
        />

        <TextField
          label="Location"
          value={location}
          onChange={setLocation}
          placeholder="Medak District, Telangana"
          hint="Used to label your farm. You can add it later."
          autoComplete="address-level2"
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          placeholder="Choose a password"
          autoComplete="new-password"
        />

        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            setErrors((current) => ({ ...current, confirm: undefined }));
          }}
          error={errors.confirm}
          placeholder="Type it once more"
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creating your account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <AuthSwitch question="Already have an account?" actionLabel="Sign in" href="/login" />

      <AuthFooterNote>
        Your password is hashed with bcrypt before it is stored. It is never saved in readable form
        and never returned by the API.
      </AuthFooterNote>
    </AuthLayout>
  );
}
