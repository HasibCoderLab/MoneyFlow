/**
 * Shared test helpers for the MoneyFlow workspace.
 *
 * Constraints:
 * - Deterministic and runner-agnostic (no vitest/jest imports) so every
 *   package can use them without extra peer dependencies.
 * - Synthetic data only — never import or generate real personal financial
 *   records (requirements.md §12.4).
 */

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Asserts that `actual` is structurally compatible with `shape` and throws
 * an `Error` with a JSON-path to the first mismatch.
 *
 * - Primitives must be `Object.is`-equal to the expected value.
 * - Plain objects must contain every key present in `shape` (extra keys in
 *   `actual` are allowed, so response shapes can grow).
 * - Arrays must have the same length and match element-wise.
 *
 * @example
 * expectShape({ status: 'ok', service: 'api' }, { status: 'ok' }); // passes
 */
export function expectShape(actual: unknown, shape: unknown, path = '$'): void {
  if (Array.isArray(shape)) {
    if (!Array.isArray(actual)) {
      throw new Error(`Expected array at ${path}, got ${describeValue(actual)}`);
    }
    if (actual.length !== shape.length) {
      throw new Error(
        `Expected array of length ${shape.length} at ${path}, got length ${actual.length}`,
      );
    }
    shape.forEach((element, index) => {
      expectShape(actual[index], element, `${path}[${index}]`);
    });
    return;
  }

  if (isPlainObject(shape)) {
    if (!isPlainObject(actual)) {
      throw new Error(`Expected object at ${path}, got ${describeValue(actual)}`);
    }
    for (const key of Object.keys(shape)) {
      if (!(key in actual)) {
        throw new Error(`Missing key ${path}.${key}`);
      }
      expectShape(actual[key], shape[key], `${path}.${key}`);
    }
    return;
  }

  if (!Object.is(actual, shape)) {
    throw new Error(`Expected ${describeValue(shape)} at ${path}, got ${describeValue(actual)}`);
  }
}
