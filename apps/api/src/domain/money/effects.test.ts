import { describe, expect, it } from 'vitest';

import { sumMinorUnits } from './arithmetic';
import {
  calculateTransactionEffects,
  netBalanceEffect,
  type TransactionEffectInput,
} from './effects';
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

describe('calculateTransactionEffects — INCOME', () => {
  it('increases the account, counts as income, and attributes the category', () => {
    const summary = calculateTransactionEffects({
      type: 'INCOME',
      amountMinor: 1_800_000n,
      accountId: 'cash',
      categoryId: 'cat-salary',
    });

    expect(summary).toEqual({
      accountEffects: [{ accountId: 'cash', signedAmountMinor: 1_800_000n }],
      countsAsIncome: true,
      countsAsExpense: false,
      affectsBudget: false,
      categoryId: 'cat-salary',
    });
    expect(netBalanceEffect(summary)).toBe(1_800_000n);
  });
});

describe('calculateTransactionEffects — EXPENSE', () => {
  it('decreases the account and counts as expense and budget spending', () => {
    const summary = calculateTransactionEffects({
      type: 'EXPENSE',
      amountMinor: 320_000n,
      accountId: 'cash',
      categoryId: 'cat-groceries',
    });

    expect(summary).toEqual({
      accountEffects: [{ accountId: 'cash', signedAmountMinor: -320_000n }],
      countsAsIncome: false,
      countsAsExpense: true,
      affectsBudget: true,
      categoryId: 'cat-groceries',
    });
    expect(netBalanceEffect(summary)).toBe(-320_000n);
  });
});

describe('calculateTransactionEffects — TRANSFER', () => {
  it('moves the amount between accounts with zero net tracked-balance effect', () => {
    const summary = calculateTransactionEffects({
      type: 'TRANSFER',
      amountMinor: 200_000n,
      fromAccountId: 'cash',
      toAccountId: 'bank',
    });

    expect(summary).toEqual({
      accountEffects: [
        { accountId: 'cash', signedAmountMinor: -200_000n },
        { accountId: 'bank', signedAmountMinor: 200_000n },
      ],
      countsAsIncome: false,
      countsAsExpense: false,
      affectsBudget: false,
      categoryId: null,
    });
    expect(netBalanceEffect(summary)).toBe(0n);
  });

  it('rejects a transfer whose source and destination are the same account', () => {
    expectMoneyError(
      () =>
        calculateTransactionEffects({
          type: 'TRANSFER',
          amountMinor: 100n,
          fromAccountId: 'cash',
          toAccountId: 'cash',
        }),
      'TRANSFER_ACCOUNTS_MUST_DIFFER',
      'same account',
    );
  });
});

describe('calculateTransactionEffects — ADJUSTMENT', () => {
  it('applies the documented direction and never affects income/expense/budget', () => {
    const increase = calculateTransactionEffects({
      type: 'ADJUSTMENT',
      amountMinor: 5_000n,
      accountId: 'cash',
      adjustmentSign: 1,
    });

    expect(increase).toEqual({
      accountEffects: [{ accountId: 'cash', signedAmountMinor: 5_000n }],
      countsAsIncome: false,
      countsAsExpense: false,
      affectsBudget: false,
      categoryId: null,
    });

    const decrease = calculateTransactionEffects({
      type: 'ADJUSTMENT',
      amountMinor: 5_000n,
      accountId: 'cash',
      adjustmentSign: -1,
    });

    expect(decrease.accountEffects).toEqual([{ accountId: 'cash', signedAmountMinor: -5_000n }]);
    expect(netBalanceEffect(decrease)).toBe(-5_000n);
  });
});

describe('calculateTransactionEffects — validation guards', () => {
  it('rejects non-positive amounts for every transaction type', () => {
    const nonPositive: TransactionEffectInput[] = [
      { type: 'INCOME', amountMinor: 0n, accountId: 'cash', categoryId: 'cat' },
      { type: 'EXPENSE', amountMinor: -1n, accountId: 'cash', categoryId: 'cat' },
      { type: 'TRANSFER', amountMinor: 0n, fromAccountId: 'cash', toAccountId: 'bank' },
      { type: 'ADJUSTMENT', amountMinor: 0n, accountId: 'cash', adjustmentSign: 1 },
    ];

    for (const input of nonPositive) {
      expectMoneyError(() => calculateTransactionEffects(input), 'AMOUNT_NOT_POSITIVE', input.type);
    }
  });

  it('rejects a transaction type outside the union instead of accepting it silently', () => {
    const unsupported = {
      type: 'REFUND',
      amountMinor: 100n,
      accountId: 'cash',
    } as unknown as TransactionEffectInput;

    expectMoneyError(
      () => calculateTransactionEffects(unsupported),
      'UNSUPPORTED_TRANSACTION_TYPE',
      'REFUND',
    );
  });
});

describe('worked example (accounting-rules.md §8)', () => {
  it('reproduces the documented balances and period totals', () => {
    const openingBalances = new Map<string, bigint>([
      ['cash', 1_000_000n],
      ['bank', 0n],
    ]);
    const transactions: TransactionEffectInput[] = [
      { type: 'INCOME', amountMinor: 1_800_000n, accountId: 'cash', categoryId: 'cat-salary' },
      { type: 'EXPENSE', amountMinor: 320_000n, accountId: 'cash', categoryId: 'cat-groceries' },
      { type: 'TRANSFER', amountMinor: 200_000n, fromAccountId: 'cash', toAccountId: 'bank' },
      { type: 'ADJUSTMENT', amountMinor: 5_000n, accountId: 'cash', adjustmentSign: -1 },
    ];

    const balances = new Map(openingBalances);
    let incomeTotal = 0n;
    let expenseTotal = 0n;

    for (const transaction of transactions) {
      const summary = calculateTransactionEffects(transaction);

      for (const effect of summary.accountEffects) {
        balances.set(
          effect.accountId,
          (balances.get(effect.accountId) ?? 0n) + effect.signedAmountMinor,
        );
      }

      if (summary.countsAsIncome) {
        incomeTotal += transaction.amountMinor;
      }
      if (summary.countsAsExpense) {
        expenseTotal += transaction.amountMinor;
      }
    }

    // Cash: +1,800,000 −320,000 −200,000 (transfer) −5,000 (adjustment).
    expect(balances.get('cash')).toBe(2_275_000n);
    expect(balances.get('bank')).toBe(200_000n);
    expect(incomeTotal).toBe(1_800_000n); // transfers and adjustments excluded
    expect(expenseTotal).toBe(320_000n);
    expect(sumMinorUnits([...balances.values()])).toBe(2_475_000n);
  });
});
