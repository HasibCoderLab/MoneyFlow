import { describe, expect, it } from 'vitest';

import { MAX_AMOUNT_MINOR } from './amount';
import { addMinorUnits, compareMinorUnits, sumMinorUnits } from './arithmetic';

describe('addMinorUnits', () => {
  it('adds exactly, including negatives and zero', () => {
    expect(addMinorUnits(1n, 2n)).toBe(3n);
    expect(addMinorUnits(-5n, 3n)).toBe(-2n);
    expect(addMinorUnits(0n, 0n)).toBe(0n);
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    expect(addMinorUnits(9_007_199_254_740_993n, 1n)).toBe(9_007_199_254_740_994n);
  });
});

describe('sumMinorUnits', () => {
  it('sums exactly, including the empty list', () => {
    expect(sumMinorUnits([])).toBe(0n);
    expect(sumMinorUnits([1n, 2n, 3n])).toBe(6n);
    expect(sumMinorUnits([1_000_000n, -320_000n, -200_000n, -5_000n])).toBe(475_000n);
  });

  it('is not capped by the per-input limit (derived totals may exceed it)', () => {
    expect(sumMinorUnits([MAX_AMOUNT_MINOR, MAX_AMOUNT_MINOR])).toBe(200_000_000_000n);
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    const big = 9_007_199_254_740_993n;
    expect(sumMinorUnits([big, big])).toBe(18_014_398_509_481_986n);
  });
});

describe('compareMinorUnits', () => {
  it('returns -1, 0, or 1', () => {
    expect(compareMinorUnits(1n, 2n)).toBe(-1);
    expect(compareMinorUnits(2n, 1n)).toBe(1);
    expect(compareMinorUnits(2n, 2n)).toBe(0);
    expect(compareMinorUnits(-2n, -1n)).toBe(-1);
    expect(compareMinorUnits(9_007_199_254_740_993n, 9_007_199_254_740_994n)).toBe(-1);
  });
});
