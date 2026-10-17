import { describe, expect, it } from 'vitest';

import { formatBdtMinor, formatPercentTimes10 } from './money-format';

/**
 * Display-formatting tests: exact minor-unit strings map to grouped BDT
 * text with zero float arithmetic (requirements.md §11.1) — including
 * magnitudes beyond `Number.MAX_SAFE_INTEGER`.
 */

describe('formatBdtMinor', () => {
  it('formats whole amounts with thousands grouping and no fraction', () => {
    expect(formatBdtMinor('0')).toBe('BDT 0');
    expect(formatBdtMinor('100')).toBe('BDT 1');
    expect(formatBdtMinor('350000')).toBe('BDT 3,500');
    expect(formatBdtMinor('123456789')).toBe('BDT 1,234,567.89');
  });

  it('pads, keeps, and drops fraction digits exactly', () => {
    expect(formatBdtMinor('5')).toBe('BDT 0.05');
    expect(formatBdtMinor('50')).toBe('BDT 0.50');
    expect(formatBdtMinor('350055')).toBe('BDT 3,500.55');
  });

  it('marks negatives with the typographic minus and never a float', () => {
    expect(formatBdtMinor('-123456')).toBe('\u2212BDT 1,234.56');
    expect(formatBdtMinor('-0')).toBe('BDT 0');
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatBdtMinor('9007199254740993')).toBe('BDT 90,071,992,547,409.93');
  });

  it('rejects non-integer text instead of rendering a guess', () => {
    for (const invalid of ['12.5', 'abc', '', '1e3', '--5', ' 5 ']) {
      expect(() => formatBdtMinor(invalid), invalid).toThrow();
    }
  });
});

describe('formatPercentTimes10', () => {
  it('renders one decimal from the ×10 integer', () => {
    expect(formatPercentTimes10('0')).toBe('0%');
    expect(formatPercentTimes10('5')).toBe('0.5%');
    expect(formatPercentTimes10('267')).toBe('26.7%');
    expect(formatPercentTimes10('1000')).toBe('100%');
  });

  it('trims a zero tenth', () => {
    expect(formatPercentTimes10('270')).toBe('27%');
  });

  it('keeps null as null (no denominator, no invented value)', () => {
    expect(formatPercentTimes10(null)).toBeNull();
  });

  it('rejects non-integer text', () => {
    expect(() => formatPercentTimes10('2.5')).toThrow();
    expect(() => formatPercentTimes10('')).toThrow();
  });
});
