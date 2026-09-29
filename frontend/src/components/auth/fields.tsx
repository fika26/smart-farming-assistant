'use client';

import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

import { cx } from '@/lib/format';

interface BaseProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}

function fieldClasses(hasError: boolean) {
  return cx(
    'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors',
    'placeholder:text-ink-faint',
    'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-canvas',
    hasError
      ? 'border-ember-300 focus:border-ember-500 focus:ring-ember-300'
      : 'border-line hover:border-leaf-200 focus:border-leaf-500 focus:ring-leaf-300',
    'disabled:cursor-not-allowed disabled:bg-raised disabled:text-ink-muted',
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-ember-700">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  autoComplete,
  required,
  disabled,
  type = 'text',
}: BaseProps & { type?: 'text' | 'email' }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
        {!required ? <span className="ml-1.5 text-2xs text-ink-faint">Optional</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={fieldClasses(Boolean(error))}
      />
      {error ? <FieldError id={errorId} message={error} /> : null}
      {!error && hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  autoComplete,
  disabled,
}: BaseProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cx(fieldClasses(Boolean(error)), 'pr-11')}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-muted transition-colors hover:bg-raised hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? <FieldError id={errorId} message={error} /> : null}
      {!error && hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-line-strong text-leaf-700 accent-leaf-700 focus-visible:ring-2 focus-visible:ring-leaf-300"
      />
      {label}
    </label>
  );
}

/** Form-level error — used for credential failures and unreachable-backend cases. */
export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-ember-300/60 bg-ember-100/50 px-3.5 py-3 text-sm text-ember-700"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
