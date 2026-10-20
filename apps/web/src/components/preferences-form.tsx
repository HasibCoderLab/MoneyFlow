'use client';

import {
  DEFAULT_USER_PREFERENCES,
  type DateFormatPreference,
  type NumberFormatPreference,
  type ReducedMotionPreference,
  type ThemePreference,
  type UiLocale,
  type UpdateUserPreferencesRequest,
  type UserPreferencesResponse,
  type WeekStartsOn,
} from '@moneyflow/contracts';
import Link from 'next/link';
import { useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { formatBdtMinor, formatPercentTimes10 } from '@/lib/money-format';
import { formatLocalDate } from '@/lib/summary-display';
import { usePreferences } from '@/lib/i18n/locale-context';

/**
 * Preferences form (IT-11, requirements.md §5.2/§5.7). Values are loaded
 * from and saved to `GET/PATCH /api/v1/preferences`; the server validates
 * every field and derives the user from the session. Currency is displayed
 * read-only because BDT is the only MVP currency (DR-08/ADR-0003) and no
 * conversion exists — showing a selectable list would be a false promise.
 *
 * The form is display-only: changing a preference never alters recorded
 * transactions, balances, budgets, goals, or totals.
 */

type PreferenceDraft = Pick<
  UserPreferencesResponse,
  | 'locale'
  | 'timezone'
  | 'currency'
  | 'theme'
  | 'weekStartsOn'
  | 'dateFormat'
  | 'numberFormat'
  | 'reducedMotion'
>;

const FALLBACK_TIMEZONES = [
  'Asia/Dhaka',
  'UTC',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const;

const THEMES: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];
const WEEK_STARTS: readonly WeekStartsOn[] = [
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];
const REDUCED_MOTION: readonly ReducedMotionPreference[] = ['SYSTEM', 'REDUCE'];

function supportedTimezones(): readonly string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    const values = intl.supportedValuesOf?.('timeZone');
    return values && values.length > 0 ? values : FALLBACK_TIMEZONES;
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

function toDraft(preferences: UserPreferencesResponse): PreferenceDraft {
  return {
    locale: preferences.locale,
    timezone: preferences.timezone,
    currency: preferences.currency,
    theme: preferences.theme,
    weekStartsOn: preferences.weekStartsOn,
    dateFormat: preferences.dateFormat,
    numberFormat: preferences.numberFormat,
    reducedMotion: preferences.reducedMotion,
  };
}

function buildPatch(
  draft: PreferenceDraft,
  saved: UserPreferencesResponse,
): UpdateUserPreferencesRequest {
  const patch: UpdateUserPreferencesRequest = {};
  if (draft.locale !== saved.locale) patch.locale = draft.locale;
  if (draft.timezone !== saved.timezone) patch.timezone = draft.timezone;
  if (draft.theme !== saved.theme) patch.theme = draft.theme;
  if (draft.weekStartsOn !== saved.weekStartsOn) patch.weekStartsOn = draft.weekStartsOn;
  if (draft.dateFormat !== saved.dateFormat) patch.dateFormat = draft.dateFormat;
  if (draft.numberFormat !== saved.numberFormat) patch.numberFormat = draft.numberFormat;
  if (draft.reducedMotion !== saved.reducedMotion) patch.reducedMotion = draft.reducedMotion;
  return patch;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return 'Your session has expired. Sign in again to save preferences.';
    }
    return error.message;
  }
  return 'Could not save preferences. Please try again.';
}

/** The editable preferences form, mounted only for a signed-in session. */
export function PreferencesForm() {
  const { preferences, preferencesStatus, savePreferences, reloadPreferences } = usePreferences();
  const baseId = useId();
  const timezoneId = `${baseId}-timezone`;
  const [draft, setDraft] = useState<PreferenceDraft>(() => toDraft(preferences));
  // The provider resolves the saved values after mount, so the first ready
  // render must not show a stale default draft. Adjusting during render
  // commits the loaded values in the same paint (no flicker, unlike an effect).
  const [draftSource, setDraftSource] = useState(preferences);
  if (draftSource !== preferences) {
    setDraftSource(preferences);
    setDraft(toDraft(preferences));
  }
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const timezones = useMemo(supportedTimezones, []);

  if (preferencesStatus === 'loading') {
    return (
      <div className="mf-loading" aria-busy="true" aria-label="Loading preferences">
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--card" />
      </div>
    );
  }

  if (preferencesStatus === 'guest') {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">Sign in to manage preferences</p>
        <p className="mf-empty__text">
          Preferences are saved to your account. Without a session, only this browser&apos;s theme
          and language choices are remembered.
        </p>
        <Link className="mf-btn mf-btn--primary" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  }

  if (preferencesStatus === 'error') {
    return (
      <div className="mf-empty" role="alert">
        <p className="mf-empty__title">Could not load your preferences</p>
        <p className="mf-empty__text">Check your connection and try again.</p>
        <Button variant="ghost" onClick={reloadPreferences}>
          Try again
        </Button>
      </div>
    );
  }

  const patch = buildPatch(draft, {
    ...DEFAULT_USER_PREFERENCES,
    ...preferences,
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (Object.keys(patch).length === 0) {
      setFeedback({ tone: 'success', text: 'No changes to save.' });
      return;
    }
    setSaving(true);
    try {
      await savePreferences(patch);
      setFeedback({ tone: 'success', text: 'Preferences saved to your account.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mf-form mf-preferences-form" noValidate onSubmit={onSubmit}>
      <div className="mf-preferences-grid">
        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-theme`}>
            Theme
          </label>
          <select
            id={`${baseId}-theme`}
            className="mf-input"
            value={draft.theme}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                theme: event.target.value as ThemePreference,
              }))
            }
          >
            {THEMES.map((value) => (
              <option key={value} value={value}>
                {value === 'LIGHT' ? 'Light' : value === 'DARK' ? 'Dark' : 'System'}
              </option>
            ))}
          </select>
          <p className="mf-field__hint">System follows your operating-system setting.</p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-locale`}>
            Language
          </label>
          <select
            id={`${baseId}-locale`}
            className="mf-input"
            value={draft.locale}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                locale: event.target.value as UiLocale,
              }))
            }
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
          <p className="mf-field__hint">
            Label language. Number numerals follow the format choice below.
          </p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={timezoneId}>
            Timezone
          </label>
          <input
            id={timezoneId}
            className="mf-input"
            type="text"
            list={`${timezoneId}-options`}
            autoComplete="off"
            value={draft.timezone}
            onChange={(event) =>
              setDraft((current) => ({ ...current, timezone: event.target.value }))
            }
          />
          <datalist id={`${timezoneId}-options`}>
            {timezones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <p className="mf-field__hint">
            Used for reporting and budget periods. Choose any IANA timezone, e.g. Asia/Dhaka.
          </p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-currency`}>
            Currency
          </label>
          <input
            id={`${baseId}-currency`}
            className="mf-input"
            type="text"
            value="BDT"
            readOnly
            aria-describedby={`${baseId}-currency-note`}
          />
          <p id={`${baseId}-currency-note`} className="mf-field__hint">
            BDT is the only MVP currency. Amounts are stored exactly and are never converted.
          </p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-week-start`}>
            Week starts on
          </label>
          <select
            id={`${baseId}-week-start`}
            className="mf-input"
            value={draft.weekStartsOn}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                weekStartsOn: event.target.value as WeekStartsOn,
              }))
            }
          >
            {WEEK_STARTS.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <p className="mf-field__hint">Used for weekly report buckets.</p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-date-format`}>
            Date format
          </label>
          <select
            id={`${baseId}-date-format`}
            className="mf-input"
            value={draft.dateFormat}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                dateFormat: event.target.value as DateFormatPreference,
              }))
            }
          >
            <option value="DMY">Day / month / year</option>
            <option value="MDY">Month / day / year</option>
            <option value="YMD">Year / month / day</option>
          </select>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-number-format`}>
            Numerals
          </label>
          <select
            id={`${baseId}-number-format`}
            className="mf-input"
            value={draft.numberFormat}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                numberFormat: event.target.value as NumberFormatPreference,
              }))
            }
          >
            <option value="LOCALE">Follow language</option>
            <option value="LATIN">Latin digits (0–9)</option>
            <option value="BENGALI">Bengali digits (০–৯)</option>
          </select>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-reduced-motion`}>
            Reduced motion
          </label>
          <select
            id={`${baseId}-reduced-motion`}
            className="mf-input"
            value={draft.reducedMotion}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                reducedMotion: event.target.value as ReducedMotionPreference,
              }))
            }
          >
            {REDUCED_MOTION.map((value) => (
              <option key={value} value={value}>
                {value === 'SYSTEM' ? 'Follow system' : 'Reduce motion'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mf-preferences-preview" aria-live="polite">
        <p className="mf-field__label">Preview</p>
        <p className="mf-field__hint">
          Amount: {formatBdtMinor('123456789', draft)} · Date:{' '}
          {formatLocalDate('2026-10-20', draft)} · Share: {formatPercentTimes10('123', draft)}
        </p>
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
        {feedback ? (
          <p
            className={feedback.tone === 'error' ? 'mf-field__error' : 'mf-field__hint'}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </p>
        ) : null}
        <p className="mf-field__hint">
          Saving preferences never changes recorded transactions, balances, budgets, or goals.
        </p>
      </div>
    </form>
  );
}
