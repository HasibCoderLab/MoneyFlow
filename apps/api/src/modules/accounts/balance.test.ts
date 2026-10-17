import { describe, expect, it } from 'vitest';

import { deriveAccountBalance, type BalanceLeg } from './balance';

/**
 * Balance derivation tests, including the accounting-rules.md §8 worked
 * example: Cash opens at 1,000,000 minor, +1,800,000 income, −320,000
 * expense, −200,000 transfer out, −5,000 adjustment → 2,275,000.
 */

const CASH = 'cash-id';
const BANK = 'bank-id';

function leg(partial: Partial<BalanceLeg> & Pick<BalanceLeg, 'type' | 'amountMinor'>): BalanceLeg {
  return {
    accountId: null,
    fromAccountId: null,
    toAccountId: null,
    adjustmentSign: null,
    ...partial,
  };
}

describe('deriveAccountBalance', () => {
  it('reproduces the §8 worked example for Cash', () => {
    const legs = [
      leg({ type: 'INCOME', amountMinor: 1_800_000n, accountId: CASH }),
      leg({ type: 'EXPENSE', amountMinor: 320_000n, accountId: CASH }),
      leg({ type: 'TRANSFER', amountMinor: 200_000n, fromAccountId: CASH, toAccountId: BANK }),
      leg({ type: 'ADJUSTMENT', amountMinor: 5_000n, accountId: CASH, adjustmentSign: -1 }),
    ];
    expect(deriveAccountBalance(1_000_000n, CASH, legs)).toBe(2_275_000n);
  });

  it('credits the transfer destination and nets to zero overall', () => {
    const legs = [
      leg({ type: 'TRANSFER', amountMinor: 200_000n, fromAccountId: CASH, toAccountId: BANK }),
    ];
    expect(deriveAccountBalance(0n, BANK, legs)).toBe(200_000n);
    const total =
      deriveAccountBalance(1_000_000n, CASH, legs) + deriveAccountBalance(0n, BANK, legs);
    expect(total).toBe(1_000_000n);
  });

  it('applies adjustment direction and allows negative balances', () => {
    const legs = [
      leg({ type: 'ADJUSTMENT', amountMinor: 7_500n, accountId: CASH, adjustmentSign: 1 }),
      leg({ type: 'EXPENSE', amountMinor: 10_000n, accountId: CASH }),
    ];
    expect(deriveAccountBalance(0n, CASH, legs)).toBe(-2_500n);
  });

  it('ignores legs that do not touch the account', () => {
    const legs = [leg({ type: 'INCOME', amountMinor: 100n, accountId: BANK })];
    expect(deriveAccountBalance(50n, CASH, legs)).toBe(50n);
  });

  it('returns the opening balance when there are no legs', () => {
    expect(deriveAccountBalance(-1_250n, CASH, [])).toBe(-1_250n);
  });
});
