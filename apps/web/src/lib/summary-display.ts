import type {
  AccountResponse,
  CategoryResponse,
  CategorySpendSummary,
  RecentSummaryTransaction,
  SummaryPeriod,
  TransactionResponse,
  TransactionType,
} from '@moneyflow/contracts';

import {
  DEFAULT_DISPLAY_FORMAT,
  formatCalendarDate,
  formatDayOnly,
  formatMonthYear,
  localDateToUtc,
  resolveDateLocale,
  type DisplayFormatOptions,
} from './display-format';
import { formatBdtMinor, formatPercentTimes10 } from './money-format';

/**
 * Display models and label formatting for the wired dashboard/report widgets
 * (IT-8, preferences in IT-11). All money text arrives pre-formatted from
 * `money-format.ts`; this module only composes human-readable labels and
 * never does money math (requirements.md §11.1). Date order and numerals
 * follow the user's saved preferences; the defaults preserve the IT-8
 * output exactly.
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
  /** Account name, or "From → To" for a transfer, when the caller supplies it. */
  readonly accountLabel?: string | null;
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

/** `2026-02-05` → `5 Feb 2026` (or the saved DMY/MDY/YMD order). */
export function formatLocalDate(
  localDate: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  return formatCalendarDate(localDateToUtc(localDate), options);
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

function rangeParts(date: Date, options: DisplayFormatOptions) {
  const locale = resolveDateLocale(options);
  return {
    year: new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: 'UTC' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date),
    day: formatDayOnly(date, options),
  };
}

/** `1 Feb 2026 – 6 Feb 2026`, `1–6 Feb 2026` within one month, or one date. */
export function formatRangeLabel(
  startDate: string,
  endDate: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  if (startDate === endDate) {
    return formatLocalDate(startDate, options);
  }
  const start = localDateToUtc(startDate);
  const end = localDateToUtc(endDate);
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    const parts = rangeParts(start, options);
    switch (options.dateFormat) {
      case 'MDY':
        return `${parts.month} ${parts.day}–${formatDayOnly(end, options)}, ${parts.year}`;
      case 'YMD':
        return `${parts.year} ${parts.month} ${parts.day}–${formatDayOnly(end, options)}`;
      case 'DMY':
        return `${parts.day}–${formatDayOnly(end, options)} ${parts.month} ${parts.year}`;
    }
  }
  return `${formatLocalDate(startDate, options)} – ${formatLocalDate(endDate, options)}`;
}

/** Period chip label: `February 2026` for whole months, a range otherwise. */
export function formatPeriodLabel(
  period: Pick<SummaryPeriod, 'dateFrom' | 'dateTo'>,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  if (isWholeMonth(period.dateFrom, period.dateTo)) {
    return formatMonthYear(localDateToUtc(period.dateFrom), options);
  }
  return formatRangeLabel(period.dateFrom, period.dateTo, options);
}

/** Date label in the user's reporting timezone (e.g. a UTC instant near midnight). */
export function formatOccurredAt(
  iso: string,
  timezone: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): string {
  return formatCalendarDate(new Date(iso), options, timezone);
}

function directionOf(row: RecentSummaryTransaction): TransactionDirection {
  return directionOfType(row.type);
}

function directionOfType(type: TransactionType): TransactionDirection {
  switch (type) {
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
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): TransactionRow[] {
  return recent.map((row) => ({
    id: row.id,
    direction: directionOf(row),
    description: describe(row),
    category: row.categoryName,
    dateLabel: formatOccurredAt(row.occurredAt, timezone, options),
    amountText: `${signOf(row)}${formatBdtMinor(row.amountMinor, options)}`,
  }));
}

function signOfType(row: Pick<TransactionResponse, 'type' | 'adjustmentSign'>): string {
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

/**
 * Maps persisted transaction rows to the shared list model. Account and
 * category names are resolved from the caller's API responses; missing
 * references stay null instead of inventing a label. Amounts are formatted
 * exactly as stored — never recalculated.
 */
export function transactionRows(
  transactions: readonly TransactionResponse[],
  accounts: readonly Pick<AccountResponse, 'id' | 'name'>[],
  categories: readonly Pick<CategoryResponse, 'id' | 'name'>[],
  timezone: string,
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): TransactionRow[] {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return transactions.map((row) => {
    const categoryName =
      row.categoryId === null ? null : (categoryNames.get(row.categoryId) ?? null);
    const accountName = row.accountId === null ? null : (accountNames.get(row.accountId) ?? null);
    const fromName =
      row.fromAccountId === null ? null : (accountNames.get(row.fromAccountId) ?? null);
    const toName = row.toAccountId === null ? null : (accountNames.get(row.toAccountId) ?? null);
    const transferAccounts = [fromName, toName].filter((name): name is string => name !== null);
    return {
      id: row.id,
      direction: directionOfType(row.type),
      description: row.note !== null && row.note.trim().length > 0 ? row.note : categoryName,
      category: categoryName,
      accountLabel:
        row.type === 'TRANSFER'
          ? transferAccounts.length === 2
            ? transferAccounts.join(' \u2192 ')
            : null
          : accountName,
      dateLabel: formatOccurredAt(row.occurredAt, timezone, options),
      amountText: `${signOfType(row)}${formatBdtMinor(row.amountMinor, options)}`,
    };
  });
}

/**
 * Maps API category spending to donut/legend data. The API already orders
 * rows (largest first) and computes half-up percentages, so nothing is
 * recalculated here — only formatted for display (AGENTS.md rule 8).
 */
export function categoryBarData(
  categories: readonly CategorySpendSummary[],
  options: DisplayFormatOptions = DEFAULT_DISPLAY_FORMAT,
): CategoryBarDatum[] {
  return categories.map((category) => ({
    categoryId: category.categoryId,
    name: category.name,
    amountText: formatBdtMinor(category.expenseMinor, options),
    // The API returns a null percentage only when nothing was spent, in
    // which case no rows are returned at all; the dash is an unreachable
    // defensive fallback, not a claim about the data.
    percentText: formatPercentTimes10(category.percentTimes10, options) ?? '\u2014',
    sharePercent: category.percentTimes10 === null ? 0 : Number(category.percentTimes10) / 10,
  }));
}
