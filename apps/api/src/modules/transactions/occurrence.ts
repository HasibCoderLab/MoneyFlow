import { BadRequestException } from '@nestjs/common';

/**
 * Occurrence resolution for transaction timestamps (accounting-rules.md §3
 * rule 3, §6, §11.5).
 *
 * Clients send a local calendar date (`occurredDate`, `YYYY-MM-DD`) and an
 * optional local time (`occurredTime`, `HH:mm`); the server resolves both in
 * an IANA timezone — clients never perform timezone math. Until IT-11
 * preferences land (DR-11), the timezone comes from the request and defaults
 * to `Asia/Dhaka` (initial locale); the resolved default is documented, not
 * guessed from the server environment.
 *
 * Rules implemented here:
 * - date-only entries anchor at 12:00 local (noon) and are validated by local
 *   date (`occurredDate ≤ today` in the timezone);
 * - time-bearing entries are validated as instants (`occurredAt ≤ now + 5
 *   minutes` clock-skew tolerance);
 * - the resolved instant must be on/after 1970-01-01 UTC;
 * - DST gaps shift forward by the gap; ambiguous times use the earlier
 *   offset (§11.5).
 *
 * Pure apart from the `now` parameter (injectable for tests). Validation
 * failures throw `BadRequestException` directly, following the
 * request-validation precedent in `modules/auth/profile.ts`.
 */

export const DEFAULT_TIMEZONE = 'Asia/Dhaka';

/** Clock-skew tolerance for time-bearing entries (§11.5). */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export interface OccurrenceInput {
  readonly occurredDate: unknown;
  readonly occurredTime?: unknown;
  readonly timezone?: unknown;
}

export interface ResolvedOccurrence {
  readonly occurredAt: Date;
  readonly timezone: string;
}

let supportedTimeZones: ReadonlySet<string> | null = null;

function getSupportedTimeZones(): ReadonlySet<string> {
  if (!supportedTimeZones) {
    supportedTimeZones = new Set(Intl.supportedValuesOf('timeZone'));
  }
  return supportedTimeZones;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

interface WallParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

function wallParts(timeZone: string, utcMs: number): WallParts {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value);
    }
  }
  return {
    // `noUncheckedIndexedAccess` is on; every part above is always present.
    year: values['year'] ?? 0,
    month: values['month'] ?? 0,
    day: values['day'] ?? 0,
    hour: values['hour'] ?? 0,
    minute: values['minute'] ?? 0,
  };
}

/** Offset of `timeZone` at `utcMs`, in whole minutes (east positive). */
function offsetMinutes(timeZone: string, utcMs: number): number {
  const wall = wallParts(timeZone, utcMs);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  return Math.round((asUtc - utcMs) / 60000);
}

/**
 * Resolves a local wall time to a UTC instant. Two offset iterations cross
 * transitions; a fixed-point round-trip check then accepts normal times,
 * gap-shifted times (forward by the gap), and the earlier side of ambiguous
 * times. A single forward adjustment covers the residual gap case.
 */
function wallToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let utc = guess - offsetMinutes(timeZone, guess) * 60000;
  const second = offsetMinutes(timeZone, utc);
  if (second !== offsetMinutes(timeZone, guess)) {
    utc = guess - second * 60000;
  }

  const back = wallParts(timeZone, utc);
  if (
    back.year === year &&
    back.month === month &&
    back.day === day &&
    back.hour === hour &&
    back.minute === minute
  ) {
    return utc;
  }
  const requestedAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const actualAsUtc = Date.UTC(back.year, back.month - 1, back.day, back.hour, back.minute);
  return utc + (requestedAsUtc - actualAsUtc);
}

/** Local calendar date (`YYYY-MM-DD`) of an instant in `timeZone`. */
export function localDateString(timeZone: string, instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * Start of a local calendar day as a UTC instant (for range filters).
 * Accepts the same `YYYY-MM-DD` grammar as occurrence input.
 */
export function startOfLocalDay(timeZone: string, dateText: string): Date {
  const parsed = parseDate(dateText);
  return new Date(wallToUtcMs(parsed.year, parsed.month, parsed.day, 0, 0, timeZone));
}

/** Adds whole calendar days to a local date text (`YYYY-MM-DD`). */
export function addLocalDays(dateText: string, days: number): string {
  const parsed = parseDate(dateText);
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * 86400000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(input: unknown): { year: number; month: number; day: number; text: string } {
  if (typeof input !== 'string') {
    throw new BadRequestException('"occurredDate" is required and must be a string.');
  }
  const match = DATE_PATTERN.exec(input);
  if (!match) {
    throw new BadRequestException('"occurredDate" must use the YYYY-MM-DD format.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day ||
    new Date(Date.UTC(year, month - 1, day)).getUTCMonth() !== month - 1
  ) {
    throw new BadRequestException('"occurredDate" is not a real calendar date.');
  }
  return { year, month, day, text: input };
}

function parseTime(input: unknown): { hour: number; minute: number } | null {
  if (input === undefined) {
    return null;
  }
  if (typeof input !== 'string') {
    throw new BadRequestException('"occurredTime" must be a string when provided.');
  }
  const match = TIME_PATTERN.exec(input);
  if (!match) {
    throw new BadRequestException('"occurredTime" must use the HH:mm format.');
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new BadRequestException('"occurredTime" is not a real time of day.');
  }
  return { hour, minute };
}

function parseTimezone(input: unknown): string {
  return resolveTimezone(input);
}

/**
 * Validates an IANA timezone name, defaulting to `Asia/Dhaka` when omitted
 * (exported for list-range filters; occurrence resolution uses it too).
 */
export function resolveTimezone(input: unknown): string {
  if (input === undefined) {
    return DEFAULT_TIMEZONE;
  }
  if (typeof input !== 'string' || !getSupportedTimeZones().has(input)) {
    throw new BadRequestException('"timezone" must be a valid IANA timezone name.');
  }
  return input;
}

/**
 * Validates occurrence input and resolves the UTC instant.
 *
 * @throws BadRequestException for malformed input, unknown timezones,
 * pre-1970 instants, future dates/times beyond the documented tolerance.
 */
export function resolveOccurrence(
  input: OccurrenceInput,
  now: Date = new Date(),
): ResolvedOccurrence {
  const timezone = parseTimezone(input.timezone);
  const date = parseDate(input.occurredDate);
  const time = parseTime(input.occurredTime);

  // Date-only entries anchor at local noon (§11.5); time-bearing entries
  // resolve exactly.
  const hour = time ? time.hour : 12;
  const minute = time ? time.minute : 0;
  const utcMs = wallToUtcMs(date.year, date.month, date.day, hour, minute, timezone);

  if (utcMs < 0) {
    throw new BadRequestException('The occurrence must not be before 1970-01-01.');
  }

  if (!time) {
    if (date.text > localDateString(timezone, now)) {
      throw new BadRequestException('"occurredDate" must not be in the future.');
    }
  } else if (utcMs > now.getTime() + CLOCK_SKEW_TOLERANCE_MS) {
    throw new BadRequestException('"occurredTime" must not be in the future.');
  }

  return { occurredAt: new Date(utcMs), timezone };
}
