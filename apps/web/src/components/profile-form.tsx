'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ApiClientError, fetchMe, updateMe } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Profile editor (IT-11, requirements.md §5.2). The display name is loaded
 * from `GET /api/v1/me` and saved with `PATCH /api/v1/me`; identity always
 * comes from the verified session, never from a field in this form. The API
 * remains the authority on validation — the client only mirrors the same
 * length/blank rules to give immediate feedback.
 */
export function ProfileForm() {
  const { t } = useLocale();
  const load = useCallback(() => fetchMe(), []);
  const { state, retry } = useAsyncData(load);

  if (state.status === 'loading') {
    return (
      <div className="mf-loading" aria-busy="true" aria-label={t('profile.loading')}>
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--line" />
      </div>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">{t('profile.guestTitle')}</p>
        <p className="mf-empty__text">{t('profile.guestBody')}</p>
        <Link className="mf-btn mf-btn--primary" href="/sign-in">
          {t('common.signIn')}
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mf-empty" role="alert">
        <p className="mf-empty__title">{t('profile.loadErrorTitle')}</p>
        <p className="mf-empty__text">{t('profile.loadErrorBody')}</p>
        <Button variant="ghost" onClick={retry}>
          {t('common.tryAgain')}
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
  const { t } = useLocale();
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
        ? t('profile.nameErrorRequired')
        : trimmed.length < 2
          ? t('profile.nameErrorShort')
          : trimmed.length > 100
            ? t('profile.nameErrorLong')
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
      setFeedback({ tone: 'success', text: t('profile.saved') });
    } catch (failure) {
      setFeedback({
        tone: 'error',
        text: failure instanceof ApiClientError ? failure.message : t('profile.saveError'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mf-form" noValidate onSubmit={onSubmit}>
      <div className="mf-field">
        <label className="mf-field__label" htmlFor="profile-email">
          {t('profile.email')}
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
          {t('profile.emailHint')}
        </p>
      </div>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor="profile-display-name">
          {t('profile.displayName')}
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
        <p className="mf-field__hint">{t('profile.nameHint')}</p>
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled={disabled}>
          {saving ? t('profile.saving') : t('profile.save')}
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
