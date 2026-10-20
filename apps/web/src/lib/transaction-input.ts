/**
 * Presentation and input helpers for transaction/account forms.
 *
 * These functions convert dates for `<input>` controls and validate the
 * *grammar* of amount text. They never perform money arithmetic: balances,
 * totals, and effects remain server-side (requirements.md §11.1,
 * AGENTS.md rules 5 and 8).
 */

function dateParts(instant: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** Today's local calendar date (`YYYY-MM-DD`) in the user's reporting timezone. */
export function todayInTimezone(timeZone: string): string {
  const parts = dateParts(new Date(), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** UTC instant → local calendar date in the reporting timezone. */
export function localDateFromInstant(instantIso: string, timeZone: string): string {
  const parts = dateParts(new Date(instantIso), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** UTC instant → local time (`HH:mm`) in the reporting timezone. */
export function localTimeFromInstant(instantIso: string, timeZone: string): string {
  const parts = dateParts(new Date(instantIso), timeZone);
  return `${parts.hour}:${parts.minute}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const OPENING_BALANCE_PATTERN = /^-?(0|[1-9]\d*)(\.\d{1,2})?$/;
const MAX_MINOR = BigInt('100000000000');

/** True for a real `YYYY-MM-DD` date (not merely a matching shape). */
export function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year as number, (month as number) - 1, day as number));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === (month as number) - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Optional local time for a transaction; empty means the server's local noon. */
export function isValidOccurredTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Mirrors the server's signed opening-balance grammar: optional leading `-`,
 * canonical integer, at most two decimals, within the ৳1B input cap.
 */
export function isValidOpeningBalance(value: string): boolean {
  if (!OPENING_BALANCE_PATTERN.test(value)) return false;
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0') || '0');
  return minor <= MAX_MINOR;
}
