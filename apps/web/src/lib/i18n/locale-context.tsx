'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LOCALE,
  LOCALE_HTML_LANG,
  LOCALE_STORAGE_KEY,
  isLocale,
  translate,
  type Locale,
  type TranslationKey,
} from './translations';

/**
 * Client-side locale state for the Bangla/English language toggle
 * (requirements.md §5.2 preferred locale, §7.4 Bangla + English labels).
 *
 * Honest scope for this preview:
 * - The choice is stored in this browser only (`mf-locale`); there is no
 *   signed-in user to save it to yet (see /app/settings/preferences).
 * - It translates the shared chrome and the dashboard headings. Other
 *   pages still render English until they are localised.
 * - Initial state is always `DEFAULT_LOCALE` on both the server and the
 *   first client render, so hydration never mismatches: the stored value
 *   is applied in an effect (same pattern as the theme toggle).
 * - Only the `<html lang>` attribute changes here — currency/number
 *   formatting stays in the deterministic formatting layer and is not
 *   switched by this toggle.
 */

type LocaleContextValue = {
  readonly locale: Locale;
  readonly setLocale: (next: Locale) => void;
  readonly t: (key: TranslationKey, params?: Readonly<Record<string, string | number>>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode / blocked storage: fall back to English, stay silent.
  }
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
  // SSR-safe initial: English on the server and the first client render.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Apply `<html lang>` and the choice together so label language and the
  // declared document language never disagree for more than a frame.
  const setLocale = useCallback((next: Locale) => {
    document.documentElement.setAttribute('lang', LOCALE_HTML_LANG[next]);
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }
  }, []);

  // Restore the stored choice after mount (never during SSR).
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== DEFAULT_LOCALE) setLocale(stored);
  }, [setLocale]);

  const t = useCallback(
    (key: TranslationKey, params?: Readonly<Record<string, string | number>>) =>
      translate(locale, key, params),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Safe fallback for renders that happen without the provider — page-level
 * tests and isolated compositions mount pages directly, and the provider
 * lives in the root layout. Labels resolve in English (the default) and
 * switching is an inert no-op rather than a crash; real app usage always
 * goes through the mounted provider above.
 */
const FALLBACK_VALUE: LocaleContextValue = Object.freeze({
  locale: DEFAULT_LOCALE,
  setLocale: () => {
    // Inert: no provider instance owns the state in this render.
  },
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
});

/** Reads the active locale; English labels when used outside the provider. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext) ?? FALLBACK_VALUE;
}
