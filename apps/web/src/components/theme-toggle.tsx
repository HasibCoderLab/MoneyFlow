'use client';

import { useEffect, useState } from 'react';

/**
 * Theme switcher: Light ↔ Dark (requirements.md §5.2, §5.7).
 *
 * - Default `light`: the `data-theme` attribute is always set explicitly,
 *   so the rendered theme never depends on the OS setting.
 * - The choice is stored in `localStorage` (theme preference only —
 *   no financial or sensitive data) and applied by a blocking script in the
 *   root layout before first paint, so there is no theme flash.
 * - A legacy stored `system` value (from before the option was removed)
 *   falls back to `light`.
 * - Icons are inline here (not in the shared icon set) so this self-contained
 *   control never conflicts with concurrently edited files.
 */
type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'mf-theme';

const ORDER: readonly ThemeChoice[] = ['light', 'dark'];

const LABELS: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
};

function readStoredChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Private mode / blocked storage: fall back to light, stay silent.
  }
  return 'light';
}

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

export function ThemeToggle() {
  // SSR-safe initial: 'light' on both server and first client render.
  const [choice, setChoice] = useState<ThemeChoice>('light');

  useEffect(() => {
    setChoice(readStoredChoice());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', choice);
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage unavailable: theme still applies for this session.
    }
  }, [choice]);

  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] ?? 'light';

  return (
    <button
      type="button"
      className="mf-btn mf-btn--ghost"
      onClick={() => setChoice(next)}
      aria-label={`Theme: ${LABELS[choice]}. Switch to ${LABELS[next]}.`}
      title={`Theme: ${LABELS[choice]} (switch to ${LABELS[next]})`}
    >
      {choice === 'light' ? <SunGlyph /> : <MoonGlyph />}
      <span>{LABELS[choice]}</span>
    </button>
  );
}
