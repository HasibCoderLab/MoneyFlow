'use client';

import { useId, useState, type FormEvent } from 'react';

import { EyeIcon, EyeOffIcon, InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

import { AuthError, signIn, signUp } from '@/lib/auth-client';

type AuthVariant = 'sign-in' | 'sign-up';

type AuthFormProps = {
  readonly variant: AuthVariant;
  /** Navigation after a successful sign-in/sign-up (injectable for tests). */
  readonly onAuthenticated?: (destination: string) => void;
};

function defaultNavigate(destination: string): void {
  // Full-page navigation: guarantees fresh server state with the new
  // HttpOnly session cookie, which JavaScript itself cannot read.
  window.location.assign(destination);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accepted password policy (ADR-0006): minimum length 12, no composition
 * rules. The preview shows the decided rule; enforcement lands with the
 * real auth flow.
 */
const MIN_PASSWORD_LENGTH = 12;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

type PasswordFieldProps = {
  readonly id: string;
  readonly label: string;
  readonly autoComplete: string;
  readonly placeholder: string;
  readonly value: string;
  readonly error?: string;
  readonly hint?: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
};

/** Masked input with a working show/hide control (local only). */
function PasswordField({
  id,
  label,
  autoComplete,
  placeholder,
  value,
  error,
  hint,
  onChange,
  onBlur,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = `${id}-hint`;

  return (
    <div className="mf-field">
      <label className="mf-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="mf-field__control">
        <input
          id={id}
          className="mf-input"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="mf-field__toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mf-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mf-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Shared sign-in / sign-up form, connected to the MoneyFlow API (IT-3).
 *
 * Client-side validation runs first (requirements.md §5.1, §4.2); valid
 * submissions POST to the verified auth endpoints with `credentials:
 * 'include'`, so the session stays in an HttpOnly cookie that JavaScript
 * never reads. Failures surface the API's safe message or a generic
 * fallback — never whether an email is registered (AGENTS.md rule 12).
 *
 * Password guidance mirrors the accepted policy (ADR-0006: minimum 12
 * characters, no composition rules). Recovery and third-party buttons
 * arrive only with their real flows — never as fakes.
 */
export function AuthForm({ variant, onAuthenticated = defaultNavigate }: AuthFormProps) {
  const isSignUp = variant === 'sign-up';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const baseId = useId();

  const errors: FieldErrors = {};
  if (isSignUp && touched && !name.trim()) errors.name = 'Enter your name.';
  if (touched || email) {
    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim()))
      errors.email = 'Enter a valid email address, e.g. you@example.com.';
  }
  if (touched && !password) errors.password = 'Enter your password.';
  else if (isSignUp && touched && password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (isSignUp) {
    if (touched && !confirm) errors.confirm = 'Repeat your password.';
    else if (confirm && confirm !== password) errors.confirm = 'Passwords do not match.';
  }

  const fieldId = (field: string) => `${baseId}-${field}`;
  const previewNoteId = `${baseId}-preview-note`;
  const serverErrorId = `${baseId}-server-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) {
      return;
    }
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setPending(true);
    setServerError(null);
    try {
      if (isSignUp) {
        await signUp({ name: name.trim(), email: email.trim(), password });
      } else {
        await signIn({ email: email.trim(), password });
      }
      onAuthenticated('/app/dashboard');
    } catch (error) {
      setServerError(
        error instanceof AuthError ? error.message : 'Something went wrong. Please try again.',
      );
      setPending(false);
    }
  }

  return (
    <form
      className="mf-form mf-form--auth"
      noValidate
      aria-describedby={previewNoteId}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="mf-auth-note" id={previewNoteId}>
        <InfoIcon className="mf-auth-note__icon" />
        <p className="mf-auth-note__text">
          Your session is kept in an HttpOnly cookie that page scripts cannot read. For your
          privacy, sign-in problems are always described in general terms.
        </p>
      </div>

      {isSignUp ? (
        <div className="mf-field">
          <label className="mf-field__label" htmlFor={fieldId('name')}>
            Full name
          </label>
          <input
            id={fieldId('name')}
            className="mf-input"
            type="text"
            autoComplete="name"
            placeholder="e.g. Ayesha Rahman"
            value={name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${fieldId('name')}-error` : undefined}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          {errors.name ? (
            <p id={`${fieldId('name')}-error`} className="mf-field__error" role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mf-field">
        <label className="mf-field__label" htmlFor={fieldId('email')}>
          Email
        </label>
        <input
          id={fieldId('email')}
          className="mf-input"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${fieldId('email')}-error` : undefined}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {errors.email ? (
          <p id={`${fieldId('email')}-error`} className="mf-field__error" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <PasswordField
        id={fieldId('password')}
        label="Password"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        placeholder={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Your password'}
        value={password}
        error={errors.password}
        hint={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
        onChange={setPassword}
        onBlur={() => setTouched(true)}
      />

      {isSignUp ? (
        <PasswordField
          id={fieldId('confirm')}
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          error={errors.confirm}
          onChange={setConfirm}
          onBlur={() => setTouched(true)}
        />
      ) : null}

      <div className="mf-form__actions">
        {serverError ? (
          <p id={serverErrorId} className="mf-field__error" role="alert">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending
            ? isSignUp
              ? 'Creating account…'
              : 'Signing in…'
            : isSignUp
              ? 'Create account'
              : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}
