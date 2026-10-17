import { BadRequestException } from '@nestjs/common';
import type { ReportGranularity, WeekStartsOn } from '@moneyflow/contracts';

import {
  addLocalDays,
  localDateString,
  resolveTimezone,
  startOfLocalDay,
} from '../transactions/occurrence';

/**
 * Reporting-period math for summaries and reports (IT-8, requirements.md
 * §5.6/§5.10, accounting-rules.md §6).
 *
 * Boundaries are half-open in the user's IANA timezone:
 * `fromInstant <= occurredAt < toInstant`, where `fromInstant` is local
 * midnight of `dateFrom` and `toInstant` is local midnight of the day after
 * `dateTo`. The default period is the current local month. Weeks start on
 * Saturday (DR-11, owner-confirmed 2026-10-17) until the IT-11 preference
 * exists.
 *
 * Everything here is pure apart from the `now` parameter so the period,
 * boundary, and bucket rules are unit-testable without a database.
 */

/** Week start used for weekly buckets until IT-11 preferences exist. */
export const SUMMARY_WEEK_STARTS_ON: WeekStartsOn = 'SATURDAY';

/**
 * Guard against unbounded ranges (documented engineering default): the most
 * a single summary request may span, inclusive. Longer ranges need paging or
 * a dedicated report later; they are refused with a clear message.
 */
export const MAX_SUMMARY_RANGE_DAYS = 366;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export interface SummaryPeriodInput {
  readonly dateFrom?: unknown;
  readonly dateTo?: unknown;
  readonly timezone?: unknown;
}

export interface ResolvedSummaryPeriod {
  /** Local calendar date `YYYY-MM-DD`, inclusive. */
  readonly dateFrom: string;
  /** Local calendar date `YYYY-MM-DD`, inclusive. */
  readonly dateTo: string;
  /** Resolved IANA timezone name. */
  readonly timezone: string;
  /** Half-open lower bound: `fromInstant <= occurredAt`. */
  readonly fromInstant: Date;
  /** Half-open upper bound: `occurredAt < toInstant`. */
  readonly toInstant: Date;
}

/** One local day's totals, ready for bucketing. */
export interface DayTotals {
  readonly day: string;
  readonly incomeMinor: bigint;
  readonly expenseMinor: bigint;
}

/** One aggregated series bucket (contract-shaped, exact integers). */
export interface SeriesBucket {
  readonly startDate: string;
  readonly endDate: string;
  readonly incomeMinor: bigint;
  readonly expenseMinor: bigint;
}

/** The requested period a series is bucketing within. */
export interface SummaryPeriodBounds {
  readonly dateFrom: string;
  readonly dateTo: string;
}

/**
 * Validates a local calendar date string and returns it unchanged.
 * Rejects malformed text and impossible dates (e.g. `2026-02-30`).
 */
export function assertLocalDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException(`"${field}" must be a real calendar date (YYYY-MM-DD).`);
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new BadRequestException(`"${field}" must be a real calendar date (YYYY-MM-DD).`);
  }
  return value;
}

/** Adds whole months to a `YYYY-MM` text (e.g. `"2026-12" + 1 → "2027-01"`). */
export function addLocalMonths(monthText: string, months: number): string {
  if (!MONTH_PATTERN.test(monthText) || !Number.isInteger(months)) {
    throw new Error('addLocalMonths expects a "YYYY-MM" month text and an integer offset.');
  }
  const year = Number(monthText.slice(0, 4));
  const month = Number(monthText.slice(5, 7));
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`;
}

/** Inclusive day count between two validated local dates. */
export function dayCount(dateFrom: string, dateTo: string): number {
  const from = Date.UTC(
    Number(dateFrom.slice(0, 4)),
    Number(dateFrom.slice(5, 7)) - 1,
    Number(dateFrom.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(dateTo.slice(0, 4)),
    Number(dateTo.slice(5, 7)) - 1,
    Number(dateTo.slice(8, 10)),
  );
  return Math.round((to - from) / 86400000) + 1;
}

/** First local date of the month containing `day`. */
export function monthStartOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Last local date of the month containing `day` (leap-year aware). */
export function monthEndOf(day: string): string {
  return addLocalDays(`${addLocalMonths(day.slice(0, 7), 1)}-01`, -1);
}

/**
 * Start of the `weekStartsOn` week containing `day`, computed purely on
 * calendar dates (timezone-independent by construction). With a Saturday
 * start: Saturday → itself, Friday → the previous Saturday.
 */
export function weekStartOf(day: string, weekStartsOn: WeekStartsOn): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  const dayOfWeek = new Date(Date.UTC(year, month - 1, date)).getUTCDay(); // 0 Sun … 6 Sat
  const daysSinceStart = weekStartsOn === 'SATURDAY' ? (dayOfWeek + 1) % 7 : 0;
  return addLocalDays(day, -daysSinceStart);
}

/**
 * Resolves the requested reporting period:
 * - `dateFrom`/`dateTo` are validated local dates, inclusive, and must be
 *   supplied together with `dateFrom <= dateTo` and a span of at most
 *   `MAX_SUMMARY_RANGE_DAYS` days;
 * - when omitted, the period defaults to the current local month;
 * - `timezone` is a validated IANA name (default `Asia/Dhaka`).
 *
 * @throws BadRequestException for malformed or impossible input.
 */
export function resolveSummaryPeriod(
  input: SummaryPeriodInput,
  now: Date = new Date(),
): ResolvedSummaryPeriod {
  const timezone = resolveTimezone(input.timezone);

  const hasFrom = input.dateFrom !== undefined;
  const hasTo = input.dateTo !== undefined;
  if (hasFrom !== hasTo) {
    throw new BadRequestException('"dateFrom" and "dateTo" must be provided together.');
  }

  let dateFrom: string;
  let dateTo: string;
  if (hasFrom && hasTo) {
    dateFrom = assertLocalDate(input.dateFrom, 'dateFrom');
    dateTo = assertLocalDate(input.dateTo, 'dateTo');
    if (dateFrom > dateTo) {
      throw new BadRequestException('"dateFrom" must not be after "dateTo".');
    }
    if (dayCount(dateFrom, dateTo) > MAX_SUMMARY_RANGE_DAYS) {
      throw new BadRequestException(
        `The reporting period must span at most ${MAX_SUMMARY_RANGE_DAYS} days.`,
      );
    }
  } else {
    const month = localDateString(timezone, now).slice(0, 7);
    dateFrom = `${month}-01`;
    dateTo = monthEndOf(dateFrom);
  }

  return {
    dateFrom,
    dateTo,
    timezone,
    fromInstant: startOfLocalDay(timezone, dateFrom),
    toInstant: startOfLocalDay(timezone, addLocalDays(dateTo, 1)),
  };
}

/**
 * Aggregates per-day totals into daily, weekly, or monthly buckets. Buckets
 * are sparse (only periods with at least one qualifying record appear) and
 * sorted ascending by start date — a period with no activity must render an
 * honest empty state, never a fabricated zero trend (§5.10).
 *
 * Bucket edges are clipped to the requested period, so every returned range
 * lies inside `[dateFrom, dateTo]` and no bucket ever claims days outside
 * the report the caller asked for.
 */
export function bucketDayTotals(
  days: readonly DayTotals[],
  granularity: ReportGranularity,
  period: SummaryPeriodBounds,
): SeriesBucket[] {
  const buckets = new Map<
    string,
    { startDate: string; endDate: string; incomeMinor: bigint; expenseMinor: bigint }
  >();

  for (const entry of days) {
    let keyStart: string;
    let keyEnd: string;
    if (granularity === 'daily') {
      keyStart = entry.day;
      keyEnd = entry.day;
    } else if (granularity === 'weekly') {
      keyStart = weekStartOf(entry.day, SUMMARY_WEEK_STARTS_ON);
      keyEnd = addLocalDays(keyStart, 6);
    } else {
      keyStart = monthStartOf(entry.day);
      keyEnd = monthEndOf(entry.day);
    }
    const startDate = keyStart < period.dateFrom ? period.dateFrom : keyStart;
    const endDate = keyEnd > period.dateTo ? period.dateTo : keyEnd;

    const existing = buckets.get(startDate);
    if (existing) {
      existing.incomeMinor += entry.incomeMinor;
      existing.expenseMinor += entry.expenseMinor;
    } else {
      buckets.set(startDate, {
        startDate,
        endDate,
        incomeMinor: entry.incomeMinor,
        expenseMinor: entry.expenseMinor,
      });
    }
  }

  return [...buckets.values()].sort((a, b) =>
    a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0,
  );
}
