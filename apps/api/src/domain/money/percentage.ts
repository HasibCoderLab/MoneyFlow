/**
 * Display percentage math (accounting-rules.md §7).
 *
 * `percentTimes10 = roundHalfUp(numerator × 1000 / denominator)` computed
 * with exact integer arithmetic only — no floating-point multiplication or
 * division. "Half-up" here means ties round away from zero, which keeps the
 * rule symmetric for negative numerators (net-refund periods, §11.6).
 *
 * Rounded values are display-only and must never feed another financial
 * calculation. The zero-denominator case ("not set") is represented as
 * `null`; the UI localizes the label.
 */
import { MoneyDomainError } from './errors';

/**
 * Returns the percentage ×10 rounded to one decimal (e.g. `267n` displays
 * as "26.7"). Returns `null` when the denominator is zero (no budget limit
 * / no goal target set).
 *
 * @throws MoneyDomainError `PERCENT_INVALID_DENOMINATOR` for a negative
 * denominator (limit/target values are always positive).
 */
export function percentTimes10(numerator: bigint, denominator: bigint): bigint | null {
  if (denominator === 0n) {
    return null;
  }
  if (denominator < 0n) {
    throw new MoneyDomainError(
      'PERCENT_INVALID_DENOMINATOR',
      'Percentage denominator must not be negative.',
    );
  }

  const scaled = numerator * 1000n;
  const quotient = scaled / denominator; // truncated division (toward zero)
  const remainder = scaled % denominator; // sign follows the dividend
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;

  if (absoluteRemainder * 2n >= denominator) {
    return scaled < 0n ? quotient - 1n : quotient + 1n;
  }
  return quotient;
}

/**
 * Formats a `percentTimes10` value as a display string with exactly one
 * decimal (`267n → "26.7"`, `1000n → "100.0"`). The percent glyph is added
 * by the UI. `0n` formats as `"0.0"` — there is no negative-zero output.
 */
export function formatPercentTimes10(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 10n;
  const fraction = absolute % 10n;
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}
