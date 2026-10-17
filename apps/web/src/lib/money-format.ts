/**
 * Display formatting for minor-unit money strings (IT-8).
 *
 * The API returns every money figure as an exact minor-unit integer string
 * (ADR-0003, requirements.md §11.1: "no `Number` touches money"). This
 * module is DISPLAY-ONLY: it never converts, rounds, or compares monetary
 * values. It splits the decimal text with string/BigInt operations, groups
 * the major-unit part with `Intl.NumberFormat` (BigInt input), and appends
 * the fraction only when it is non-zero, so "350000" renders as
 * "BDT 3,500" and "350050" as "BDT 3,500.50".
 *
 * BDT is the only registered MVP currency (ADR-0003 §2); its exponent 2 is
 * the only local assumption here and multi-currency display arrives with
 * the preferences work (IT-11).
 */

const BDT_PREFIX = 'BDT ';
const BDT_EXPONENT = 2;
const INTEGER_PATTERN = /^-?\d+$/;
// Written as a call, not a `0n` literal: the web tsconfig targets ES2017 and
// only the literal syntax is gated on `target` (tsc TS2737); BigInt values
// themselves are exact and universally supported by the target browsers.
const ZERO = BigInt(0);

/** Formats a minor-unit integer string as a BDT amount (negative → "−BDT …"). */
export function formatBdtMinor(minorText: string): string {
  if (!INTEGER_PATTERN.test(minorText)) {
    throw new Error(`Expected a minor-unit integer string, got "${minorText}".`);
  }
  const value = BigInt(minorText);
  const negative = value < ZERO;
  const magnitude = negative ? -value : value;
  const digits = magnitude.toString().padStart(BDT_EXPONENT + 1, '0');
  const integerDigits = digits.slice(0, -BDT_EXPONENT);
  const fractionDigits = digits.slice(-BDT_EXPONENT);
  const grouped = new Intl.NumberFormat('en-US').format(BigInt(integerDigits));
  const fraction = fractionDigits === '0'.repeat(BDT_EXPONENT) ? '' : `.${fractionDigits}`;
  return `${negative ? '\u2212' : ''}${BDT_PREFIX}${grouped}${fraction}`;
}

/**
 * Formats a server-computed percentage ×10 (`"267"` → `"26.7%"`) with the
 * trailing `.0` trimmed (`"270"` → `"27%"`). `null` (no denominator) stays
 * `null` so the caller can render its own localized "not set" copy.
 */
export function formatPercentTimes10(percentTimes10: string | null): string | null {
  if (percentTimes10 === null) {
    return null;
  }
  if (!INTEGER_PATTERN.test(percentTimes10)) {
    throw new Error(`Expected a percentage-times-10 integer string, got "${percentTimes10}".`);
  }
  const value = BigInt(percentTimes10);
  const negative = value < ZERO;
  const magnitude = negative ? -value : value;
  const digits = magnitude.toString().padStart(2, '0');
  const whole = digits.slice(0, -1);
  const tenth = digits.slice(-1);
  const grouped = new Intl.NumberFormat('en-US').format(BigInt(whole));
  const fraction = tenth === '0' ? '' : `.${tenth}`;
  return `${negative ? '\u2212' : ''}${grouped}${fraction}%`;
}
