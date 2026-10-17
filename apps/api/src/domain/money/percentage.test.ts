import { describe, expect, it } from 'vitest';

import { MoneyDomainError, type MoneyErrorCode } from './errors';
import { formatPercentTimes10, percentTimes10 } from './percentage';

function expectMoneyError(run: () => unknown, code: MoneyErrorCode, label: string): void {
  try {
    run();
  } catch (error) {
    if (error instanceof MoneyDomainError) {
      expect(error.code, `code for ${label}`).toBe(code);
      return;
    }
    throw error;
  }
  throw new Error(`Expected MoneyDomainError(${code}) for ${label}, but nothing was thrown`);
}

describe('percentTimes10', () => {
  it('returns null ("not set") when the denominator is zero', () => {
    expect(percentTimes10(0n, 0n)).toBeNull();
    expect(percentTimes10(500_000n, 0n)).toBeNull();
  });

  it('computes the documented worked-example values', () => {
    expect(percentTimes10(320_000n, 500_000n)).toBe(640n); // budget 64.0%
    expect(percentTimes10(800_000n, 3_000_000n)).toBe(267n); // goal 26.7%
  });

  it('rounds half-up (ties away from zero) at the display boundary', () => {
    expect(percentTimes10(533n, 2_000n)).toBe(267n); // 26.65% is an exact tie
    expect(percentTimes10(2_664_999n, 10_000_000n)).toBe(266n); // 26.64999%
    expect(percentTimes10(2_665_001n, 10_000_000n)).toBe(267n); // 26.65001%
    expect(percentTimes10(-533n, 2_000n)).toBe(-267n); // symmetric for negatives
    expect(percentTimes10(-2_664_999n, 10_000_000n)).toBe(-266n);
  });

  it('handles large numerators with exact integer math', () => {
    expect(percentTimes10(100_000_000_000n, 3n)).toBe(33_333_333_333_333n);
    expect(formatPercentTimes10(33_333_333_333_333n)).toBe('3333333333333.3');
  });

  it('rounds tiny negatives to zero without a negative-zero artifact', () => {
    expect(percentTimes10(-1n, 10_000n)).toBe(0n);
    expect(formatPercentTimes10(0n)).toBe('0.0');
  });

  it('rejects a negative denominator', () => {
    expectMoneyError(
      () => percentTimes10(100n, -1n),
      'PERCENT_INVALID_DENOMINATOR',
      'denominator -1',
    );
  });
});

describe('formatPercentTimes10', () => {
  it('formats with exactly one decimal place', () => {
    expect(formatPercentTimes10(0n)).toBe('0.0');
    expect(formatPercentTimes10(5n)).toBe('0.5');
    expect(formatPercentTimes10(267n)).toBe('26.7');
    expect(formatPercentTimes10(640n)).toBe('64.0');
    expect(formatPercentTimes10(1000n)).toBe('100.0');
    expect(formatPercentTimes10(12_345n)).toBe('1234.5');
    expect(formatPercentTimes10(-4n)).toBe('-0.4');
    expect(formatPercentTimes10(-267n)).toBe('-26.7');
    expect(formatPercentTimes10(-10n)).toBe('-1.0');
  });
});
