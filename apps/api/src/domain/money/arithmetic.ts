/**
 * Exact integer arithmetic on minor units (ADR-0003 §4).
 *
 * Plain `bigint` operations — no floats, no rounding, no clamping — wrapped
 * in named helpers so the domain has a single tested arithmetic surface.
 * Helper results are not capped by the per-input service cap
 * (`MAX_AMOUNT_MINOR`): derived balances and totals may legitimately exceed
 * a single input's limit.
 */

/** Exact sum of two minor-unit values. */
export function addMinorUnits(a: bigint, b: bigint): bigint {
  return a + b;
}

/** Exact sum of minor-unit values; an empty list sums to `0n`. */
export function sumMinorUnits(values: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of values) {
    total += value;
  }
  return total;
}

/** Compares two minor-unit values: `-1` (a < b), `0` (equal), `1` (a > b). */
export function compareMinorUnits(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}
