import type { TransactionType } from '@moneyflow/contracts';

import { getCurrencyMetadata } from '../../domain/money/currency';

/**
 * CSV encoding for the transaction export (IT-12, ADR-0011).
 *
 * All cells are quoted and internal quotes are doubled (RFC 4180). The
 * formula-injection guard prefixes a single apostrophe when the first
 * non-whitespace/control character is one of `=`, `+`, `-`, `@`, or when the
 * value begins with a tab/CR/LF/control character. This leaves the stored
 * financial amount untouched (stored amounts are always positive) while
 * preventing notes, names, and other untrusted text from becoming formulas.
 */

export const CSV_COLUMNS = [
  'occurred_at_utc',
  'type',
  'amount',
  'currency',
  'account',
  'from_account',
  'to_account',
  'category',
  'adjustment_direction',
  'note',
] as const;

// eslint-disable-next-line no-control-regex -- detecting control characters is the guard
const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;
// eslint-disable-next-line no-control-regex -- detecting control characters is the guard
const CONTROL_START = /^[\u0000-\u001F\u007F]/;

/** Header row with the UTF-8 BOM required by spreadsheet importers. */
export const CSV_HEADER = `\uFEFF${CSV_COLUMNS.map(csvCell).join(',')}\r\n`;

/** Adds a leading apostrophe to values a spreadsheet could execute. */
export function neutralizeCsvFormula(value: string): string {
  return FORMULA_PREFIX.test(value) || CONTROL_START.test(value) ? `'${value}` : value;
}

/** Encodes one cell, always quoted, with CSV formula neutralization. */
export function csvCell(value: string | null | undefined): string {
  const text = value ?? '';
  const safe = neutralizeCsvFormula(text);
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Encodes one export row (no BOM; the header carries it). */
export function csvRow(values: readonly (string | null | undefined)[]): string {
  return `${values.map(csvCell).join(',')}\r\n`;
}

/** Exact minor-unit integer → decimal string for the currency exponent. */
export function formatMinorUnits(amountMinor: bigint, exponent: number): string {
  const negative = amountMinor < 0n;
  const magnitude = negative ? -amountMinor : amountMinor;
  const digits = magnitude.toString().padStart(exponent + 1, '0');
  if (exponent === 0) {
    return `${negative ? '-' : ''}${digits}`;
  }
  const whole = digits.slice(0, -exponent);
  const fraction = digits.slice(-exponent);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function formatAmountForExport(amountMinor: bigint, currency: string): string {
  return formatMinorUnits(amountMinor, getCurrencyMetadata(currency).exponent);
}

export interface ExportRowSource {
  readonly occurredAt: Date;
  readonly type: TransactionType;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly accountName: string | null;
  readonly fromAccountName: string | null;
  readonly toAccountName: string | null;
  readonly categoryName: string | null;
  readonly adjustmentSign: number | null;
  readonly note: string | null;
}

/** Maps one persisted transaction to the documented export columns. */
export function exportRow(source: ExportRowSource): string {
  return csvRow([
    source.occurredAt.toISOString(),
    source.type,
    formatAmountForExport(source.amountMinor, source.currency),
    source.currency,
    source.accountName,
    source.fromAccountName,
    source.toAccountName,
    source.categoryName,
    source.adjustmentSign === 1 ? 'INCREASE' : source.adjustmentSign === -1 ? 'DECREASE' : null,
    source.note,
  ]);
}

/** `moneyflow-transactions-YYYY-MM-DD.csv` (UTC calendar date). */
export function exportFilename(now = new Date()): string {
  return `moneyflow-transactions-${now.toISOString().slice(0, 10)}.csv`;
}
