'use client';

import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/translations';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Language switcher: English ↔ বাংলা (requirements.md §7.4).
 *
 * - English is the default; the stored choice is applied after mount, so
 *   the server and first client render always agree (no hydration flash).
 * - The choice is stored in `localStorage` under `mf-locale` (a display
 *   preference only — no financial or personal data) and updates
 *   `<html lang>` so screen readers announce the right language.
 * - The visible label always names the language it would switch to, so
 *   the control stays usable in either language: "বাংলা" → "English".
 * - Icons are inline here (as in the theme toggle) so this self-contained
 *   control never conflicts with concurrently edited files.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  const index = LOCALES.indexOf(locale);
  const next: Locale = LOCALES[(index + 1) % LOCALES.length] ?? 'en';
  const currentLabel = LOCALE_LABELS[locale];
  const nextLabel = LOCALE_LABELS[next];

  return (
    <button
      type="button"
      className="mf-btn mf-btn--ghost"
      lang={next === 'en' ? 'en' : undefined}
      onClick={() => setLocale(next)}
      aria-label={`Language: ${currentLabel}. Switch to ${nextLabel}.`}
      title={`Language: ${currentLabel} (switch to ${nextLabel})`}
    >
      <GlobeGlyph />
      <span lang={next === 'bn' ? 'bn' : undefined}>{nextLabel}</span>
    </button>
  );
}

function GlobeGlyph() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.7 5.7 3.7 9S14.5 18.4 12 21c-2.5-2.6-3.7-5.7-3.7-9S9.5 5.6 12 3Z" />
    </svg>
  );
}
