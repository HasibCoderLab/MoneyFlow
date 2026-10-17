'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Profile form — UI FOUNDATION ONLY (preview, IT-11 wires saving).
 *
 * Display-name editing with live validation. The field starts with a sample
 * value so the editing affordance is visible; nothing is fetched or stored.
 * Save stays disabled with an explicit reason until the profile API lands —
 * a visibly non-operational control is honest, a fake success would not be.
 *
 * TODO(IT-11): prefill from GET /api/v1/me, enable save, PATCH on submit
 * with pending/success/error handling.
 */
export function ProfileForm() {
  const [displayName, setDisplayName] = useState('Sample User');
  const [touched, setTouched] = useState(false);
  const baseId = useId();

  const fieldId = `${baseId}-display-name`;
  const errorId = `${baseId}-display-name-error`;

  const trimmed = displayName.trim();
  const error =
    touched || displayName
      ? !trimmed
        ? 'Enter a display name.'
        : trimmed.length < 2
          ? 'Use at least 2 characters.'
          : trimmed.length > 50
            ? 'Keep it to 50 characters or fewer.'
            : undefined
      : undefined;

  return (
    <form className="mf-form" noValidate onSubmit={(event) => event.preventDefault()}>
      <div className="mf-field">
        <label className="mf-field__label" htmlFor={fieldId}>
          Display name
        </label>
        <input
          id={fieldId}
          className="mf-input"
          type="text"
          autoComplete="nickname"
          maxLength={51}
          value={displayName}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setDisplayName(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {error ? (
          <p id={errorId} className="mf-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mf-field__hint">Shown in greetings and on your dashboard. Never a login.</p>
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled aria-disabled="true">
          Save profile
        </Button>
        <p className="mf-field__hint">
          Preview only — saving connects when the profile API lands (IT-11). Nothing here is stored,
          and there is no signed-in user yet.
        </p>
      </div>
    </form>
  );
}
