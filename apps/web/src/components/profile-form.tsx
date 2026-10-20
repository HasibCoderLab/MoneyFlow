'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ApiClientError, fetchMe, updateMe } from '@/lib/api-client';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Profile editor (IT-11, requirements.md §5.2). The display name is loaded
 * from `GET /api/v1/me` and saved with `PATCH /api/v1/me`; identity always
 * comes from the verified session, never from a field in this form. The API
 * remains the authority on validation — the client only mirrors the same
 * length/blank rules to give immediate feedback.
 */
export function ProfileForm() {
  const load = useCallback(() => fetchMe(), []);
  const { state, retry } = useAsyncData(load);

  if (state.status === 'loading') {
    return (
      <div className="mf-loading" aria-busy="true" aria-label="Loading profile">
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--line" />
      </div>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">Sign in to manage your profile</p>
        <p className="mf-empty__text">Your profile belongs to your MoneyFlow account.</p>
        <Link className="mf-btn mf-btn--primary" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mf-empty" role="alert">
        <p className="mf-empty__title">Could not load your profile</p>
        <p className="mf-empty__text">Check your connection and try again.</p>
        <Button variant="ghost" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return <ProfileEditor email={state.data.email} initialName={state.data.name} />;
}

function ProfileEditor({
  email,
  initialName,
}: {
  readonly email: string;
  readonly initialName: string;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const trimmed = displayName.trim();
  const error =
    touched || displayName
      ? !trimmed
        ? 'Enter a display name.'
        : trimmed.length < 2
          ? 'Use at least 2 characters.'
          : trimmed.length > 100
            ? 'Keep it to 100 characters or fewer.'
            : undefined
      : undefined;

  const unchanged = trimmed === savedName;
  const disabled = saving || error !== undefined || unchanged;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setTouched(true);
    if (error !== undefined || unchanged) {
      return;
    }
    setSaving(true);
    try {
      const saved = await updateMe({ name: trimmed });
      setDisplayName(saved.name);
      setSavedName(saved.name);
      setFeedback({ tone: 'success', text: 'Profile saved.' });
    } catch (failure) {
      setFeedback({
        tone: 'error',
        text:
          failure instanceof ApiClientError
            ? failure.message
            : 'Could not save your profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mf-form" noValidate onSubmit={onSubmit}>
      <div className="mf-field">
        <label className="mf-field__label" htmlFor="profile-email">
          Email
        </label>
        <input
          id="profile-email"
          className="mf-input"
          type="email"
          value={email}
          readOnly
          aria-describedby="profile-email-note"
        />
        <p id="profile-email-note" className="mf-field__hint">
          Email is your sign-in identity and cannot be changed here.
        </p>
      </div>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor="profile-display-name">
          Display name
        </label>
        <input
          id="profile-display-name"
          className="mf-input"
          type="text"
          autoComplete="nickname"
          maxLength={100}
          value={displayName}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'profile-display-name-error' : undefined}
          onChange={(event) => setDisplayName(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {error ? (
          <p id="profile-display-name-error" className="mf-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mf-field__hint">Shown in greetings and on your dashboard. Never a login.</p>
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled={disabled}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
        {feedback ? (
          <p
            className={feedback.tone === 'error' ? 'mf-field__error' : 'mf-field__hint'}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
