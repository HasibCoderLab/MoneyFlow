import type {
  CategorySpendSummary,
  RecentSummaryTransaction,
  SummaryPeriod,
} from '@moneyflow/contracts';

import { formatBdtMinor, formatPercentTimes10 } from './money-format';

/**
 * Display models and label formatting for the wired dashboard/report widgets
 * (IT-8). All money text arrives pre-formatted from `money-format.ts`; this
 * module only composes human-readable labels and never does money math
 * (requirements.md §11.1).
 */

export type TransactionDirection = 'income' | 'expense' | 'transfer' | 'adjustment';

/** One rendered recent-activity row (server amounts stay exact strings). */
export interface TransactionRow {
  readonly id: string;
  readonly direction: TransactionDirection;
  /**
   * Note, else category name, else null — when null the list renders the
   * type's translated fallback label instead of an invented description.
   */
  readonly description: string | null;
  /** Category display name, or null when the record has none. */
  readonly category: string | null;
  readonly dateLabel: string;
  /** Pre-formatted amount with its sign, e.g. "+BDT 12,000" or "−BDT 80". */
  readonly amountText: string;
}

/** One donut segment/legend row (percentages arrive pre-computed, half-up). */
export interface CategoryBarDatum {
  readonly categoryId: string;
  readonly name: string;
  readonly amountText: string;
  /** Server percentage ×10 formatted for display (e.g. "26.7%"). */
  readonly percentText: string;
  /** Display geometry only (percent ×10 → percent); never money math. */
  readonly sharePercent: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Parses a validated `YYYY-MM-DD` local date into a UTC-anchored Date so
 * calendar formatting can never drift by the viewer's timezone.
 */
function localDateToUtc(localDate: string): Date {
  const probe = new Date(`${localDate}T00:00:00.000Z`);
  if (Number.isNaN(probe.getTime())) {
    throw new Error(`Expected a YYYY-MM-DD local date, got "${localDate}".`);
  }
  return probe;
}

/** `2026-02-05` → `5 Feb 2026`. */
export function formatLocalDate(localDate: string): string {
  return DATE_FORMATTER.format(localDateToUtc(localDate));
}

/** True when the range covers exactly one calendar month. */
export function isWholeMonth(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom.endsWith('-01')) {
    return false;
  }
  const start = localDateToUtc(dateFrom);
  const end = localDateToUtc(dateTo);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return end.getTime() === lastDay.getTime();
}

/** `1 Feb 2026 – 6 Feb 2026`, `1–6 Feb 2026` within one month, or one date. */
export function formatRangeLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatLocalDate(startDate);
  }
  const start = localDateToUtc(startDate);
  const end = localDateToUtc(endDate);
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return `${start.getUTCDate()}–${DATE_FORMATTER.format(end)}`;
  }
  return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(end)}`;
}

/** Period chip label: `February 2026` for whole months, a range otherwise. */
export function formatPeriodLabel(period: Pick<SummaryPeriod, 'dateFrom' | 'dateTo'>): string {
  if (isWholeMonth(period.dateFrom, period.dateTo)) {
    return MONTH_FORMATTER.format(localDateToUtc(period.dateFrom));
  }
  return formatRangeLabel(period.dateFrom, period.dateTo);
}

/** Date label in the user's reporting timezone (e.g. a UTC instant near midnight). */
export function formatOccurredAt(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(iso));
}

function directionOf(row: RecentSummaryTransaction): TransactionDirection {
  switch (row.type) {
    case 'INCOME':
      return 'income';
    case 'EXPENSE':
      return 'expense';
    case 'TRANSFER':
      return 'transfer';
    case 'ADJUSTMENT':
      return 'adjustment';
  }
}

function describe(row: RecentSummaryTransaction): string | null {
  if (row.note !== null && row.note.trim().length > 0) {
    return row.note;
  }
  return row.categoryName;
}

/** `+` for income and positive adjustments, `−` for expense/negative, none for transfers. */
function signOf(row: RecentSummaryTransaction): '+' | '\u2212' | '' {
  switch (row.type) {
    case 'INCOME':
      return '+';
    case 'EXPENSE':
      return '\u2212';
    case 'ADJUSTMENT':
      return row.adjustmentSign === -1 ? '\u2212' : '+';
    case 'TRANSFER':
      return '';
  }
}

/** Maps API recent-activity rows to display rows (order and bounds are the API's). */
export function recentTransactionRows(
  recent: readonly RecentSummaryTransaction[],
  timezone: string,
): TransactionRow[] {
  return recent.map((row) => ({
    id: row.id,
    direction: directionOf(row),
    description: describe(row),
    category: row.categoryName,
    dateLabel: formatOccurredAt(row.occurredAt, timezone),
    amountText: `${signOf(row)}${formatBdtMinor(row.amountMinor)}`,
  }));
}

/**
 * Maps API category spending to donut/legend data. The API already orders
 * rows (largest first) and computes half-up percentages, so nothing is
 * recalculated here — only formatted for display (AGENTS.md rule 8).
 */
export function categoryBarData(categories: readonly CategorySpendSummary[]): CategoryBarDatum[] {
  return categories.map((category) => ({
    categoryId: category.categoryId,
    name: category.name,
    amountText: formatBdtMinor(category.expenseMinor),
    // The API returns a null percentage only when nothing was spent, in
    // which case no rows are returned at all; the dash is an unreachable
    // defensive fallback, not a claim about the data.
    percentText: formatPercentTimes10(category.percentTimes10) ?? '\u2014',
    sharePercent: category.percentTimes10 === null ? 0 : Number(category.percentTimes10) / 10,
  }));
}
