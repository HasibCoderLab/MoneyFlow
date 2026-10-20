/**
 * Display helpers for the goals UI (IT-10, ADR-0005; preferences in IT-11).
 *
 * Everything here is presentation only: progress arrives from the API as an
 * exact minor-unit/percentage string and is never recomputed from other
 * numbers in the browser (requirements.md §5.6/§9.4, AGENTS.md rule 8).
 * Date order and numerals follow the saved display preferences.
 */

import {
  DEFAULT_DISPLAY_FORMAT,
  formatCalendarDate,
  localDateToUtc,
  type DisplayFormatOptions,
} from './display-format';

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
export function formatGoalDate(
  dateText: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  return formatCalendarDate(localDateToUtc(dateText), options);
}

/**
 * Localized calendar date of a recorded ledger instant, rendered in the
 * user's saved reporting timezone (defaults to Asia/Dhaka until IT-11 data
 * exists), so the date matches the server's recorded local day rather than
 * the viewer's device timezone.
 */
export function formatInstantDate(
  instantText: string,
  timeZone: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  return formatCalendarDate(new Date(instantText), options, timeZone);
}
