/**
 * Typed domain errors for the money module.
 *
 * Stable, machine-readable codes (accounting-rules.md §11.2):
 * - `AMOUNT_INVALID_FORMAT`, `AMOUNT_TOO_LARGE`, `AMOUNT_NOT_POSITIVE` are
 *   the documented amount-validation codes.
 * - `UNSUPPORTED_CURRENCY`, `TRANSFER_ACCOUNTS_MUST_DIFFER`,
 *   `PERCENT_INVALID_DENOMINATOR`, and `UNSUPPORTED_TRANSACTION_TYPE` are
 *   the documented guards of this module.
 *
 * Messages are safe developer-facing fallbacks only; user-facing wording is
 * produced by the UI from the code and must never include internals.
 */
export const MONEY_ERROR_CODES = [
  'AMOUNT_INVALID_FORMAT',
  'AMOUNT_TOO_LARGE',
  'AMOUNT_NOT_POSITIVE',
  'UNSUPPORTED_CURRENCY',
  'TRANSFER_ACCOUNTS_MUST_DIFFER',
  'PERCENT_INVALID_DENOMINATOR',
  'UNSUPPORTED_TRANSACTION_TYPE',
] as const;

export type MoneyErrorCode = (typeof MONEY_ERROR_CODES)[number];

export class MoneyDomainError extends Error {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = 'MoneyDomainError';
    this.code = code;
  }
}
