import { describe, expect, it } from 'vitest';

import { parseAmountToMinor } from './amount';
import { DEFAULT_CURRENCY_CODE, getCurrencyMetadata } from './currency';
import { MoneyDomainError, type MoneyErrorCode } from './errors';

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

describe('getCurrencyMetadata', () => {
  it('returns BDT metadata with exponent 2', () => {
    expect(getCurrencyMetadata('BDT')).toEqual({ code: 'BDT', exponent: 2 });
  });

  it('rejects unsupported currencies with UNSUPPORTED_CURRENCY', () => {
    const unsupported = ['USD', 'EUR', 'bdt', 'usd', '', ' BDT', 'BDT '];

    for (const code of unsupported) {
      expectMoneyError(
        () => getCurrencyMetadata(code),
        'UNSUPPORTED_CURRENCY',
        `code ${JSON.stringify(code)}`,
      );
    }
  });
});

describe('default currency', () => {
  it('uses BDT as the documented MVP default', () => {
    expect(DEFAULT_CURRENCY_CODE).toBe('BDT');
    expect(parseAmountToMinor('1.00')).toBe(100n);
  });

  it('rejects an unsupported currency passed to the parser instead of defaulting', () => {
    expectMoneyError(() => parseAmountToMinor('1.00', 'USD'), 'UNSUPPORTED_CURRENCY', 'USD parse');
    expectMoneyError(
      () => parseAmountToMinor('1.00', 'bdt'),
      'UNSUPPORTED_CURRENCY',
      'lowercase bdt',
    );
  });
});
