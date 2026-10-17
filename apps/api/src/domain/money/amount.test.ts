import { describe, expect, it } from 'vitest';

import {
  MAX_AMOUNT_INPUT_LENGTH,
  MAX_AMOUNT_MINOR,
  assertPositiveAmount,
  fromContractString,
  parseAmountToMinor,
  parseOpeningBalanceToMinor,
  parsePositiveAmountToMinor,
  toContractString,
} from './amount';
import { MoneyDomainError, type MoneyErrorCode } from './errors';

function describeInput(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

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

describe('parseAmountToMinor', () => {
  it('parses canonical unsigned amounts exactly (BDT exponent 2)', () => {
    const cases: ReadonlyArray<readonly [string, bigint]> = [
      ['0', 0n],
      ['0.00', 0n],
      ['0.01', 1n],
      ['1', 100n],
      ['1.2', 120n],
      ['1.20', 120n],
      ['3500', 350_000n],
      ['3500.00', 350_000n],
      ['3500.5', 350_050n],
      ['999999999.99', 99_999_999_999n],
    ];

    for (const [input, expected] of cases) {
      expect(parseAmountToMinor(input), `input ${input}`).toBe(expected);
    }
  });

  it('accepts the cap boundary and rejects amounts above it', () => {
    expect(MAX_AMOUNT_MINOR).toBe(100_000_000_000n);
    expect(parseAmountToMinor('1000000000.00')).toBe(MAX_AMOUNT_MINOR);
    expectMoneyError(() => parseAmountToMinor('1000000000.01'), 'AMOUNT_TOO_LARGE', 'over cap');
    expectMoneyError(() => parseAmountToMinor('9223372036854775808'), 'AMOUNT_TOO_LARGE', '2^63');
  });

  it('rejects malformed input with AMOUNT_INVALID_FORMAT and never normalizes it', () => {
    const malformed = [
      '',
      '   ',
      ' 3500',
      '3500 ',
      '\t3500',
      '3500\n',
      '3,500',
      '1,000',
      '3 500',
      '৳3500',
      'BDT 3500',
      '-100',
      '+100',
      '-0',
      '-',
      '.',
      '.5',
      '5.',
      '1..2',
      '1.2.3',
      '00.50',
      '0001',
      '1.234',
      '1e3',
      '0x10',
      'NaN',
      'Infinity',
      '৩৫০০',
      '٣٥٠',
    ];

    for (const input of malformed) {
      expectMoneyError(
        () => parseAmountToMinor(input),
        'AMOUNT_INVALID_FORMAT',
        `input ${describeInput(input)}`,
      );
    }
  });

  it('rejects values that are not strings instead of coercing them', () => {
    const nonStrings: unknown[] = [123, 3500.0, 350_000n, null, undefined, true, {}, [], ['3500']];

    for (const value of nonStrings) {
      expectMoneyError(
        () => parseAmountToMinor(value),
        'AMOUNT_INVALID_FORMAT',
        `input ${describeInput(value)}`,
      );
    }
  });

  it('applies the length guard before parsing', () => {
    expect(MAX_AMOUNT_INPUT_LENGTH).toBe(20);

    const tooLong = '1'.repeat(MAX_AMOUNT_INPUT_LENGTH + 1);
    expectMoneyError(() => parseAmountToMinor(tooLong), 'AMOUNT_INVALID_FORMAT', '21-digit input');

    // Exactly at the length guard: the format is valid, so the cap applies.
    expectMoneyError(
      () => parseAmountToMinor('9'.repeat(MAX_AMOUNT_INPUT_LENGTH)),
      'AMOUNT_TOO_LARGE',
      '20-digit input',
    );
  });
});

describe('parsePositiveAmountToMinor', () => {
  it('parses positive amounts exactly', () => {
    expect(parsePositiveAmountToMinor('3500.00')).toBe(350_000n);
    expect(parsePositiveAmountToMinor('0.01')).toBe(1n);
  });

  it('rejects zero with AMOUNT_NOT_POSITIVE', () => {
    expectMoneyError(() => parsePositiveAmountToMinor('0'), 'AMOUNT_NOT_POSITIVE', '"0"');
    expectMoneyError(() => parsePositiveAmountToMinor('0.00'), 'AMOUNT_NOT_POSITIVE', '"0.00"');
  });

  it('keeps format errors distinct from positivity errors', () => {
    expectMoneyError(() => parsePositiveAmountToMinor('abc'), 'AMOUNT_INVALID_FORMAT', '"abc"');
    expectMoneyError(() => parsePositiveAmountToMinor('-1'), 'AMOUNT_INVALID_FORMAT', '"-1"');
  });
});

describe('parseOpeningBalanceToMinor', () => {
  it('parses signed opening balances, including zero', () => {
    const cases: ReadonlyArray<readonly [string, bigint]> = [
      ['0', 0n],
      ['0.00', 0n],
      ['10000.00', 1_000_000n],
      ['-100', -10_000n],
      ['-50.25', -5_025n],
      ['-1000000000.00', -MAX_AMOUNT_MINOR],
    ];

    for (const [input, expected] of cases) {
      expect(parseOpeningBalanceToMinor(input), `input ${input}`).toBe(expected);
    }
  });

  it('rejects negative zero and malformed signs', () => {
    const malformed = ['-0', '-0.00', '--50', '-.5', '50-', '+50', '- 50'];

    for (const input of malformed) {
      expectMoneyError(
        () => parseOpeningBalanceToMinor(input),
        'AMOUNT_INVALID_FORMAT',
        `input ${input}`,
      );
    }
  });

  it('applies the magnitude cap to negative balances too', () => {
    expectMoneyError(
      () => parseOpeningBalanceToMinor('-1000000000.01'),
      'AMOUNT_TOO_LARGE',
      'below the negative cap',
    );
  });
});

describe('fromContractString', () => {
  it('parses contract minor-unit integer strings', () => {
    const cases: ReadonlyArray<readonly [string, bigint]> = [
      ['0', 0n],
      ['1', 1n],
      ['350000', 350_000n],
      ['-5025', -5_025n],
      ['100000000000', MAX_AMOUNT_MINOR],
      ['-100000000000', -MAX_AMOUNT_MINOR],
    ];

    for (const [input, expected] of cases) {
      expect(fromContractString(input), `input ${input}`).toBe(expected);
    }
  });

  it('rejects decimals and non-canonical integer strings', () => {
    const malformed = ['3500.00', '003500', '-0', '+5', '', ' 5', '5 ', '0.0', '1e3'];

    for (const input of malformed) {
      expectMoneyError(
        () => fromContractString(input),
        'AMOUNT_INVALID_FORMAT',
        `input ${describeInput(input)}`,
      );
    }
  });

  it('applies the cap in both directions', () => {
    expectMoneyError(() => fromContractString('100000000001'), 'AMOUNT_TOO_LARGE', 'over cap');
    expectMoneyError(() => fromContractString('-100000000001'), 'AMOUNT_TOO_LARGE', 'below cap');
  });

  it('rejects non-string input', () => {
    expectMoneyError(() => fromContractString(350_000), 'AMOUNT_INVALID_FORMAT', 'number input');
  });
});

describe('toContractString', () => {
  it('serializes minor units as exact integer strings', () => {
    expect(toContractString(0n)).toBe('0');
    expect(toContractString(350_000n)).toBe('350000');
    expect(toContractString(-5_025n)).toBe('-5025');
    expect(toContractString(9_007_199_254_740_993n)).toBe('9007199254740993');
  });

  it('round-trips through fromContractString within the input cap', () => {
    // fromContractString is an *input* parser, so it enforces the service
    // cap; values above the cap are covered on the output side above and by
    // the AMOUNT_TOO_LARGE tests. Derived totals never pass through it.
    const values = [0n, 1n, 350_000n, -5_025n, MAX_AMOUNT_MINOR, -MAX_AMOUNT_MINOR];

    for (const value of values) {
      expect(fromContractString(toContractString(value)), `value ${value}`).toBe(value);
    }
  });
});

describe('contract JSON serialization', () => {
  it('keeps amounts as exact strings through JSON.stringify', () => {
    const payload = { amountMinor: toContractString(9_007_199_254_740_993n), currency: 'BDT' };
    const roundTripped: unknown = JSON.parse(JSON.stringify(payload));

    expect(roundTripped).toEqual(payload);
    expect(roundTripped).toMatchObject({ amountMinor: '9007199254740993' });
  });

  it('documents that raw BigInt cannot cross JSON directly', () => {
    expect(() => JSON.stringify({ amountMinor: 350_000n })).toThrow(TypeError);
  });
});

describe('assertPositiveAmount', () => {
  it('returns positive values unchanged', () => {
    expect(assertPositiveAmount(1n)).toBe(1n);
    expect(assertPositiveAmount(MAX_AMOUNT_MINOR)).toBe(MAX_AMOUNT_MINOR);
  });

  it('rejects zero and negative values with AMOUNT_NOT_POSITIVE', () => {
    expectMoneyError(() => assertPositiveAmount(0n), 'AMOUNT_NOT_POSITIVE', '0n');
    expectMoneyError(() => assertPositiveAmount(-1n), 'AMOUNT_NOT_POSITIVE', '-1n');
  });
});
