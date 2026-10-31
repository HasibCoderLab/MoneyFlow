'use client';

import type { ThemePreference } from '@moneyflow/contracts';
import { useState } from 'react';

import { useLocale, usePreferences } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';

/**
 * Theme switcher: Light → Dark → System (requirements.md §5.2, §5.7).
 *
 * - `LIGHT` is the documented default; `SYSTEM` follows the OS setting live.
 * - The provider applies the resolved theme to `data-theme` and caches the
 *   chosen value before first paint (root layout script), so there is no
 *   theme flash.
 * - A signed-in change is PATCHed to `GET /api/v1/preferences`; a guest keeps
 *   the browser-local display choice (IT-11).
 * - Icons are inline here (not in the shared icon set) so this self-contained
 *   control never conflicts with concurrently edited files.
 */

const ORDER: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];

const LABEL_KEYS: Record<ThemePreference, TranslationKey> = {
  LIGHT: 'theme.light',
  DARK: 'theme.dark',
  SYSTEM: 'theme.system',
};

function SunGlyph() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
    </svg>
  );
}

function MoonGlyph() {
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
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </svg>
  );
}

function MonitorGlyph() {
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
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function Glyph({ theme }: { readonly theme: ThemePreference }) {
  if (theme === 'DARK') return <MoonGlyph />;
  if (theme === 'SYSTEM') return <MonitorGlyph />;
  return <SunGlyph />;
}

export function ThemeToggle() {
  const { preferences, savePreferences, preferencesStatus } = usePreferences();
  const { t } = useLocale();
  const [saveFailed, setSaveFailed] = useState(false);

  const choice = preferences.theme;
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] ?? 'LIGHT';

  const onSwitch = () => {
    setSaveFailed(false);
    void savePreferences({ theme: next }).catch(() => setSaveFailed(true));
  };

  return (
    <>
      <button
        type="button"
        className="mf-btn mf-btn--ghost"
        onClick={onSwitch}
        aria-label={t('theme.triggerLabel', {
          current: t(LABEL_KEYS[choice]),
          next: t(LABEL_KEYS[next]),
        })}
        title={t('theme.titleLabel', {
          current: t(LABEL_KEYS[choice]),
          next: t(LABEL_KEYS[next]),
        })}
      >
        <Glyph theme={choice} />
        <span>{t(LABEL_KEYS[choice])}</span>
      </button>
      {saveFailed && preferencesStatus !== 'guest' ? (
        <span className="mf-visually-hidden" role="status">
          {t('theme.saveFailed')}
        </span>
      ) : null}
    </>
  );
}
