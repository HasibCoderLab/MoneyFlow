import type { DateFormatPreference, NumberFormatPreference, UiLocale } from '@moneyflow/contracts';

/**
 * Display-only date and number preferences (IT-11, requirements.md §5.2/§5.7).
 *
 * These helpers never touch money arithmetic or stored data; they choose the
 * numeral set, digit grouping, and calendar order used to render values that
 * the API already computed exactly. `DEFAULT_DISPLAY_FORMAT` mirrors the
 * documented server defaults (English labels, DMY dates, locale numerals) so
 * every existing call site keeps its current output when no preference is
 * supplied.
 */

export interface DisplayFormatOptions {
  readonly locale: UiLocale;
  readonly dateFormat: DateFormatPreference;
  readonly numberFormat: NumberFormatPreference;
}

export const DEFAULT_DISPLAY_FORMAT: DisplayFormatOptions = Object.freeze({
  locale: 'en',
  dateFormat: 'DMY',
  numberFormat: 'LOCALE',
});

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

type CalendarParts = {
  readonly year: string;
  readonly month: string;
  readonly day: string;
};

/** CLDR locale that follows the selected UI language (`LOCALE` option). */
function localeNumberLocale(locale: UiLocale): string {
  return locale === 'bn' ? 'bn-BD' : 'en-US';
}

/** CLDR locale used for grouping and (when selected) Bengali numerals. */
export function resolveNumberLocale(
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  switch (options.numberFormat) {
    case 'LATIN':
      return 'en-US';
    case 'BENGALI':
      return 'bn-BD';
    case 'LOCALE':
      return localeNumberLocale(options.locale);
  }
}

/** True when the selected numeral preference should render Bengali digits. */
export function usesBengaliDigits(options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT): boolean {
  return resolveNumberLocale(options) === 'bn-BD';
}

/** Converts ASCII digits in an already-formatted string to Bengali numerals. */
export function localizeDigits(
  text: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  if (!usesBengaliDigits(options)) {
    return text;
  }
  return text.replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}

/**
 * CLDR locale used for names: the UI language supplies month names while the
 * numeral preference selects the digit set (`-u-nu-latn` / `-u-nu-beng`).
 */
export function resolveDateLocale(options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT): string {
  const base = options.locale === 'bn' ? 'bn-BD' : 'en-GB';
  switch (options.numberFormat) {
    case 'LATIN':
      return `${base}-u-nu-latn`;
    case 'BENGALI':
      return `${base}-u-nu-beng`;
    case 'LOCALE':
      return base;
  }
}

function calendarParts(
  date: Date,
  options: DisplayFormatOptions,
  timeZone?: string,
): CalendarParts {
  const formatter = new Intl.DateTimeFormat(resolveDateLocale(options), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });
  const result: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type === 'day' || part.type === 'month' || part.type === 'year') {
      result[part.type] = part.value;
    }
  }
  return {
    year: result.year ?? '',
    month: result.month ?? '',
    day: result.day ?? '',
  };
}

/** Orders a formatted date by the user's DMY/MDY/YMD preference. */
export function orderDateParts(
  parts: CalendarParts,
  dateFormat: DateFormatPreference = DEFAULT_DISPLAY_FORMAT.dateFormat,
): string {
  switch (dateFormat) {
    case 'MDY':
      return `${parts.month} ${parts.day}, ${parts.year}`;
    case 'YMD':
      return `${parts.year} ${parts.month} ${parts.day}`;
    case 'DMY':
      return `${parts.day} ${parts.month} ${parts.year}`;
  }
}

/** Formats a calendar date in the preferred field order and numeral set. */
export function formatCalendarDate(
  date: Date,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
  timeZone?: string,
): string {
  return orderDateParts(calendarParts(date, options, timeZone), options.dateFormat);
}

/** Formats a month anchor, e.g. `October 2026` / `অক্টোবর ২০২৬`. */
export function formatMonthYear(
  date: Date,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(resolveDateLocale(options), {
    month: 'long',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/** Formats one day in the preferred field order (used inside range labels). */
export function formatDayOnly(
  date: Date,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(resolveDateLocale(options), {
    day: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/** Parses a validated `YYYY-MM-DD` local date into a UTC-anchored Date. */
export function localDateToUtc(localDate: string): Date {
  const probe = new Date(`${localDate}T00:00:00.000Z`);
  if (Number.isNaN(probe.getTime())) {
    throw new Error(`Expected a YYYY-MM-DD local date, got "${localDate}".`);
  }
  return probe;
}
