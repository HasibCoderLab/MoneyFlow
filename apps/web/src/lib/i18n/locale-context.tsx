'use client';

import {
  DEFAULT_USER_PREFERENCES,
  type ThemePreference,
  type UiLocale,
  type UpdateUserPreferencesRequest,
  type UserPreferencesResponse,
} from '@moneyflow/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ApiClientError, fetchPreferences, updatePreferences } from '../api-client';
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
 * Client preference state for the UI (IT-11, requirements.md §5.2/§5.7).
 *
 * - Locale, theme, and reduced motion are applied immediately for a responsive
 *   interface, then reconciled with the signed-in user's saved preferences
 *   from `GET /api/v1/preferences`. Server values win on load; a guest keeps
 *   the browser-cached display choice.
 * - The browser cache (`mf-locale`, `mf-theme`) contains display preferences
 *   only — no financial or personal data.
 * - `savePreferences` is optimistic: it updates the local view first and then
 *   PATCHes the server. A 401 marks the session as a guest so public pages
 *   keep working; the preferences screen surfaces the sign-in requirement.
 * - Dates, numbers, and money are formatted by the deterministic display
 *   helpers using these values; nothing here computes a financial figure.
 */

export type PreferencesStatus = 'loading' | 'ready' | 'guest' | 'error';

export type LocaleContextValue = {
  readonly locale: Locale;
  readonly setLocale: (next: Locale) => void;
  readonly t: (key: TranslationKey, params?: Readonly<Record<string, string | number>>) => string;
  /** Current display/reporting preferences (documented defaults until saved). */
  readonly preferences: UserPreferencesResponse;
  readonly preferencesStatus: PreferencesStatus;
  /** Saves a partial preference update; resolves with the server value. */
  readonly savePreferences: (
    patch: UpdateUserPreferencesRequest,
  ) => Promise<UserPreferencesResponse>;
  /** Retries loading preferences after a network/API failure. */
  readonly reloadPreferences: () => void;
};

const DEFAULT_PREFERENCES: UserPreferencesResponse = Object.freeze({
  ...DEFAULT_USER_PREFERENCES,
  updatedAt: null,
});

const THEME_STORAGE_KEY = 'mf-theme';

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

function readStoredTheme(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'Light' || stored === 'light') return 'LIGHT';
    if (stored === 'Dark' || stored === 'dark') return 'DARK';
    if (stored === 'System' || stored === 'system') return 'SYSTEM';
  } catch {
    // Private mode / blocked storage: fall back to the documented default.
  }
  return 'LIGHT';
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function resolvedTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'SYSTEM') {
    return prefersDark() ? 'dark' : 'light';
  }
  return theme === 'DARK' ? 'dark' : 'light';
}

function applyTheme(theme: ThemePreference): void {
  document.documentElement.setAttribute('data-theme', resolvedTheme(theme));
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.toLowerCase());
  } catch {
    // Storage unavailable: the choice still applies for this session.
  }
}

function applyReducedMotion(preference: UserPreferencesResponse['reducedMotion']): void {
  document.documentElement.setAttribute(
    'data-reduced-motion',
    preference === 'REDUCE' ? 'reduce' : 'system',
  );
}

/** True for an expired/missing session, which is normal for public pages. */
function isSignedOut(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
  // SSR-safe initial: English/light on the server and the first client render
  // (the stored choice is restored in an effect, exactly as before IT-11).
  const [preferences, setPreferences] = useState<UserPreferencesResponse>(DEFAULT_PREFERENCES);
  const [preferencesStatus, setPreferencesStatusState] = useState<PreferencesStatus>('loading');
  const [reloadToken, setReloadToken] = useState(0);

  const preferencesRef = useRef(preferences);
  const statusRef = useRef<PreferencesStatus>('loading');

  // Keep the ref in lockstep with state synchronously. An effect would leave a
  // window where the UI already says "ready" but a click still reads "loading"
  // and skips the PATCH.
  const setPreferencesStatus = useCallback((next: PreferencesStatus) => {
    statusRef.current = next;
    setPreferencesStatusState(next);
  }, []);

  const applyPreferences = useCallback((next: UserPreferencesResponse) => {
    preferencesRef.current = next;
    setPreferences(next);
    document.documentElement.setAttribute('lang', LOCALE_HTML_LANG[next.locale]);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next.locale);
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }
  }, []);

  // Restore cached display choices immediately (never during SSR).
  useEffect(() => {
    const cachedLocale = readStoredLocale();
    const cachedTheme = readStoredTheme();
    applyPreferences({
      ...preferencesRef.current,
      locale: cachedLocale,
      theme: cachedTheme,
    });
  }, [applyPreferences]);

  // Reconcile with the signed-in user's saved preferences. The server is the
  // source of truth when a session exists; a 401 is a normal guest state.
  useEffect(() => {
    let cancelled = false;
    setPreferencesStatus('loading');
    fetchPreferences()
      .then((saved) => {
        if (cancelled) return;
        applyPreferences(saved);
        setPreferencesStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPreferencesStatus(isSignedOut(error) ? 'guest' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [applyPreferences, reloadToken, setPreferencesStatus]);

  // Apply the theme, including live OS changes while `SYSTEM` is selected.
  useEffect(() => {
    applyTheme(preferences.theme);
    if (preferences.theme !== 'SYSTEM' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('SYSTEM');
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, [preferences.theme]);

  useEffect(() => {
    applyReducedMotion(preferences.reducedMotion);
  }, [preferences.reducedMotion]);

  const savePreferences = useCallback(
    async (patch: UpdateUserPreferencesRequest): Promise<UserPreferencesResponse> => {
      const optimistic = { ...preferencesRef.current, ...patch };
      applyPreferences(optimistic);

      // Public/guest pages keep the cached display choice; there is no account
      // to write to. While the initial GET is in flight, wait for it instead of
      // racing it with a PATCH.
      if (statusRef.current === 'guest' || statusRef.current === 'loading') {
        return optimistic;
      }

      try {
        const saved = await updatePreferences(patch);
        applyPreferences(saved);
        setPreferencesStatus('ready');
        return saved;
      } catch (error) {
        setPreferencesStatus(isSignedOut(error) ? 'guest' : 'error');
        throw error;
      }
    },
    [applyPreferences, setPreferencesStatus],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      applyPreferences({ ...preferencesRef.current, locale: next as UiLocale });
      void savePreferences({ locale: next as UiLocale }).catch(() => {
        // The header toggle stays responsive; the preferences page reports
        // persistence failures explicitly.
      });
    },
    [applyPreferences, savePreferences],
  );

  const reloadPreferences = useCallback(() => setReloadToken((token) => token + 1), []);

  const t = useCallback(
    (key: TranslationKey, params?: Readonly<Record<string, string | number>>) =>
      translate(preferences.locale, key, params),
    [preferences.locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: preferences.locale,
      setLocale,
      t,
      preferences,
      preferencesStatus,
      savePreferences,
      reloadPreferences,
    }),
    [preferences, preferencesStatus, reloadPreferences, savePreferences, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Safe fallback for renders that happen without the provider — page-level
 * tests and isolated compositions mount pages directly, and the provider
 * lives in the root layout. Labels resolve in English (the default), the
 * documented defaults are returned, and switching is an inert no-op rather
 * than a crash; real app usage always goes through the mounted provider.
 */
const FALLBACK_VALUE: LocaleContextValue = Object.freeze({
  locale: DEFAULT_LOCALE,
  setLocale: () => {
    // Inert: no provider instance owns the state in this render.
  },
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  preferences: DEFAULT_PREFERENCES,
  preferencesStatus: 'guest',
  savePreferences: async (patch) => ({ ...DEFAULT_PREFERENCES, ...patch }),
  reloadPreferences: () => {
    // Inert: no provider instance owns the state in this render.
  },
});

/** Reads the active preferences; documented defaults when used outside the provider. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext) ?? FALLBACK_VALUE;
}

/** Alias with preference-focused naming for screens that manage settings. */
export function usePreferences(): LocaleContextValue {
  return useLocale();
}
