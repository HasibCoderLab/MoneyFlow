/**
 * Display helpers for the goals UI (IT-10, ADR-0005).
 *
 * Everything here is presentation only: progress arrives from the API as an
 * exact minor-unit/percentage string and is never recomputed from other
 * numbers in the browser (requirements.md §5.6/§9.4, AGENTS.md rule 8).
 */

import type { Locale } from './i18n/translations';

const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', bn: 'bn-BD' };

/** Visual cap for progress bars; the exact value always appears as text (§7). */
const BAR_CAP = 100;

/**
 * Converts the server's exact percentage-times-10 into the capped number a
 * progress bar can draw. `null` (no denominator) draws an empty bar.
 */
export function cappedPercent(percentTimes10: string | null): number {
  if (percentTimes10 === null) {
    return 0;
  }
  return Math.min(Number(percentTimes10) / 10, BAR_CAP);
}

/** Strict display→input conversion: "3000000" → "30000" (no floats). */
export function minorToDecimalInput(minorText: string): string {
  const negative = minorText.startsWith('-');
  const digits = (negative ? minorText.slice(1) : minorText).padStart(3, '0');
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

/**
 * The same strict grammar the API accepts for positive decimal amounts
 * (canonical, ≤2 decimals, ≤10^11 minor units). Client-side validation only
 * mirrors the server; it never replaces it.
 */
export function isValidPositiveAmount(value: string): boolean {
  if (!AMOUNT_PATTERN.test(value)) {
    return false;
  }
  const [whole = '0', fraction = ''] = value.split('.');
  const minor = BigInt(whole) * BigInt(100) + BigInt((fraction.padEnd(2, '0') || '0').slice(0, 2));
  return minor > BigInt(0) && minor <= BigInt('100000000000');
}

/** Local calendar date `YYYY-MM-DD` (browser timezone) for date inputs. */
export function todayLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** "31 Mar 2027" / localized equivalent from a stored `YYYY-MM-DD` date. */
export function formatGoalDate(locale: Locale, dateText: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateText}T00:00:00.000Z`));
}

/**
 * Localized calendar date of a recorded ledger instant. Rendered in
 * `Asia/Dhaka` — the MVP default timezone that anchors date-only
 * contributions — until the IT-11 preferences exist, so the displayed date
 * matches the date the server recorded rather than the viewer's device timezone.
 */
export function formatInstantDate(locale: Locale, instantText: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(instantText));
}
