/**
 * Strict monetary amount parsing and contract-string conversion
 * (ADR-0003, accounting-rules.md §3 rule 1, §11.1–§11.2).
 *
 * Accepted formats:
 * - **User-entered decimal strings** (`"3500.00"`, `"3500.5"`) follow the
 *   canonical grammar `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$` for BDT. The raw
 *   string must match exactly: surrounding whitespace is rejected (never
 *   trimmed), and extra fractional digits are rejected (never rounded).
 * - **Opening balances** use the same grammar with one optional leading
 *   `-`; `-0` / `-0.00` are rejected because zero has one canonical
 *   spelling.
 * - **Contract fields** (`amountMinor` in API payloads) use minor-unit
 *   integer strings (`^-?(0|[1-9][0-9]*)$`, no decimals).
 *
 * Shared rules:
 * - The input must be a `string`; other types are rejected, not coerced.
 * - Inputs longer than `MAX_AMOUNT_INPUT_LENGTH` are rejected before any
 *   parsing work.
 * - The magnitude cap `MAX_AMOUNT_MINOR` (10^11 minor units = ৳1B) is a
 *   service-layer *input* rule; derived totals (balances, sums) are not
 *   capped by it.
 * - No value is ever converted through a JavaScript `number`.
 */
import { DEFAULT_CURRENCY_CODE, getCurrencyMetadata } from './currency';
import { MoneyDomainError } from './errors';

/** Maximum accepted input magnitude: 10^11 minor units (৳1,000,000,000.00). */
export const MAX_AMOUNT_MINOR = 100_000_000_000n;

/** Length guard applied before pattern matching (accounting-rules.md §11.2). */
export const MAX_AMOUNT_INPUT_LENGTH = 20;

const CONTRACT_PATTERN = /^-?(0|[1-9][0-9]*)$/;

function decimalPattern(currencyExponent: number, allowNegative: boolean): RegExp {
  const sign = allowNegative ? '-?' : '';
  const fraction = currencyExponent > 0 ? `(\\.[0-9]{1,${currencyExponent}})?` : '';
  return new RegExp(`^${sign}(0|[1-9][0-9]*)${fraction}$`);
}

function assertStringInput(input: unknown): asserts input is string {
  if (typeof input !== 'string') {
    throw new MoneyDomainError('AMOUNT_INVALID_FORMAT', 'Money input must be a string.');
  }
  if (input.length > MAX_AMOUNT_INPUT_LENGTH) {
    throw new MoneyDomainError(
      'AMOUNT_INVALID_FORMAT',
      `Money input is longer than the ${MAX_AMOUNT_INPUT_LENGTH}-character limit.`,
    );
  }
}

function assertWithinCap(value: bigint): bigint {
  if (value > MAX_AMOUNT_MINOR || value < -MAX_AMOUNT_MINOR) {
    throw new MoneyDomainError(
      'AMOUNT_TOO_LARGE',
      'Amount exceeds the allowed maximum of 1,000,000,000.00 (10^11 minor units).',
    );
  }
  return value;
}

function parseDecimal(input: unknown, currencyCode: string, allowNegative: boolean): bigint {
  assertStringInput(input);
  const { exponent } = getCurrencyMetadata(currencyCode);

  if (!decimalPattern(exponent, allowNegative).test(input)) {
    throw new MoneyDomainError('AMOUNT_INVALID_FORMAT', 'Amount has an invalid format.');
  }

  const negative = input.startsWith('-');
  const digits = negative ? input.slice(1) : input;
  const [whole = '0', fraction = ''] = digits.split('.');
  const value =
    BigInt(whole) * 10n ** BigInt(exponent) + BigInt(fraction.padEnd(exponent, '0') || '0');

  if (negative && value === 0n) {
    throw new MoneyDomainError('AMOUNT_INVALID_FORMAT', 'Negative zero is not a canonical amount.');
  }

  return negative ? -value : value;
}

/**
 * Parses an unsigned user-entered amount into minor units.
 * Zero is allowed at this layer; transaction amounts add the positivity
 * rule via `parsePositiveAmountToMinor` / `assertPositiveAmount`.
 *
 * @throws MoneyDomainError `AMOUNT_INVALID_FORMAT` | `AMOUNT_TOO_LARGE`
 * | `UNSUPPORTED_CURRENCY`.
 */
export function parseAmountToMinor(
  input: unknown,
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): bigint {
  return assertWithinCap(parseDecimal(input, currencyCode, false));
}

/**
 * Parses an unsigned user-entered amount and enforces the positive-amount
 * rule used by transaction, adjustment, goal, and budget inputs
 * (accounting-rules.md §3 rule 1, §11.2).
 *
 * @throws MoneyDomainError `AMOUNT_NOT_POSITIVE` in addition to the codes
 * thrown by `parseAmountToMinor`.
 */
export function parsePositiveAmountToMinor(
  input: unknown,
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): bigint {
  return assertPositiveAmount(parseAmountToMinor(input, currencyCode));
}

/**
 * Parses a signed account opening balance (may be zero, positive, or
 * negative). `-0` / `-0.00` are rejected.
 *
 * @throws MoneyDomainError `AMOUNT_INVALID_FORMAT` | `AMOUNT_TOO_LARGE`
 * | `UNSUPPORTED_CURRENCY`.
 */
export function parseOpeningBalanceToMinor(
  input: unknown,
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): bigint {
  return assertWithinCap(parseDecimal(input, currencyCode, true));
}

/**
 * Parses a contract minor-unit integer string such as `"350000"`.
 * Decimals, `+`, leading zeros, and `-0` are rejected; the same length and
 * cap rules as user-entered parsing apply.
 *
 * @throws MoneyDomainError `AMOUNT_INVALID_FORMAT` | `AMOUNT_TOO_LARGE`.
 */
export function fromContractString(input: unknown): bigint {
  assertStringInput(input);
  if (!CONTRACT_PATTERN.test(input) || input === '-0') {
    throw new MoneyDomainError('AMOUNT_INVALID_FORMAT', 'Contract amount has an invalid format.');
  }
  return assertWithinCap(BigInt(input));
}

/**
 * Converts minor units to the API contract string (`350000n → "350000"`).
 *
 * This is the only supported way for money to cross the JSON boundary:
 * `BigInt` cannot be serialized by `JSON.stringify` directly, and JSON
 * `number` would lose precision above `Number.MAX_SAFE_INTEGER`.
 */
export function toContractString(amountMinor: bigint): string {
  return amountMinor.toString();
}

/**
 * Enforces the strictly-positive rule for transaction-family amounts
 * (§5.4: "amount must be strictly greater than zero"; direction comes from
 * the transaction type, never from a sign).
 *
 * @throws MoneyDomainError `AMOUNT_NOT_POSITIVE` when `amountMinor <= 0`.
 */
export function assertPositiveAmount(amountMinor: bigint): bigint {
  if (amountMinor <= 0n) {
    throw new MoneyDomainError('AMOUNT_NOT_POSITIVE', 'Amount must be greater than zero.');
  }
  return amountMinor;
}
