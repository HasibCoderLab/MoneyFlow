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
import { useLocale, usePreferences } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';

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

function errorMessage(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return t('preferences.sessionExpired');
    }
    return error.message;
  }
  return t('preferences.saveError');
}

/** The editable preferences form, mounted only for a signed-in session. */
export function PreferencesForm() {
  const { preferences, preferencesStatus, savePreferences, reloadPreferences } = usePreferences();
  const { t } = useLocale();
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
      <div className="mf-loading" aria-busy="true" aria-label={t('preferences.loading')}>
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--card" />
      </div>
    );
  }

  if (preferencesStatus === 'guest') {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">{t('preferences.guestTitle')}</p>
        <p className="mf-empty__text">{t('preferences.guestBody')}</p>
        <Link className="mf-btn mf-btn--primary" href="/sign-in">
          {t('common.signIn')}
        </Link>
      </div>
    );
  }

  if (preferencesStatus === 'error') {
    return (
      <div className="mf-empty" role="alert">
        <p className="mf-empty__title">{t('preferences.loadErrorTitle')}</p>
        <p className="mf-empty__text">{t('preferences.loadErrorBody')}</p>
        <Button variant="ghost" onClick={reloadPreferences}>
          {t('common.tryAgain')}
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
      setFeedback({ tone: 'success', text: t('preferences.noChanges') });
      return;
    }
    setSaving(true);
    try {
      await savePreferences(patch);
      setFeedback({ tone: 'success', text: t('preferences.saved') });
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error, t) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mf-form mf-preferences-form" noValidate onSubmit={onSubmit}>
      <div className="mf-preferences-grid">
        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-theme`}>
            {t('preferences.theme')}
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
                {value === 'LIGHT'
                  ? t('preferences.option.light')
                  : value === 'DARK'
                    ? t('preferences.option.dark')
                    : t('preferences.option.system')}
              </option>
            ))}
          </select>
          <p className="mf-field__hint">{t('preferences.themeSystemHint')}</p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-locale`}>
            {t('preferences.language')}
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
          <p className="mf-field__hint">{t('preferences.languageHint')}</p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={timezoneId}>
            {t('preferences.timezone')}
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
          <p className="mf-field__hint">{t('preferences.timezoneHint')}</p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-currency`}>
            {t('preferences.currency')}
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
            {t('preferences.currencyHint')}
          </p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-week-start`}>
            {t('preferences.weekStart')}
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
                {t(`preferences.weekday.${value}`)}
              </option>
            ))}
          </select>
          <p className="mf-field__hint">{t('preferences.weekStartHint')}</p>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-date-format`}>
            {t('preferences.dateFormat')}
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
            <option value="DMY">{t('preferences.option.dmy')}</option>
            <option value="MDY">{t('preferences.option.mdy')}</option>
            <option value="YMD">{t('preferences.option.ymd')}</option>
          </select>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-number-format`}>
            {t('preferences.numberFormat')}
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
            <option value="LOCALE">{t('preferences.option.localeDigits')}</option>
            <option value="LATIN">{t('preferences.option.latinDigits')}</option>
            <option value="BENGALI">{t('preferences.option.bengaliDigits')}</option>
          </select>
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor={`${baseId}-reduced-motion`}>
            {t('preferences.reducedMotion')}
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
                {value === 'SYSTEM'
                  ? t('preferences.option.followSystem')
                  : t('preferences.option.reduceMotion')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mf-preferences-preview" aria-live="polite">
        <p className="mf-field__label">{t('preferences.preview')}</p>
        <p className="mf-field__hint">
          {t('preferences.previewAmount', {
            amount: formatBdtMinor('123456789', draft),
          })}{' '}
          ·{' '}
          {t('preferences.previewDate', {
            date: formatLocalDate('2026-10-20', draft),
          })}{' '}
          ·{' '}
          {t('preferences.previewShare', {
            share: formatPercentTimes10('123', draft) ?? '',
          })}
        </p>
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled={saving}>
          {saving ? t('preferences.saving') : t('preferences.save')}
        </Button>
        {feedback ? (
          <p
            className={feedback.tone === 'error' ? 'mf-field__error' : 'mf-field__hint'}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </p>
        ) : null}
        <p className="mf-field__hint">{t('preferences.savedNote')}</p>
      </div>
    </form>
  );
}
