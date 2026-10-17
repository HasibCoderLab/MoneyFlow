/**
 * Pure account-balance derivation (accounting-rules.md §1, §2, §11.3).
 *
 * `balance = openingBalanceMinor + Σ signedEffect(transactions)` where each
 * leg's signed effect comes from the transaction type (and `adjustmentSign`
 * for adjustments) — the exact matrix in `domain/money/effects.ts`, applied
 * here over persisted rows. Balances are always derived, never stored (§9.2).
 *
 * Database-free so the arithmetic is unit-testable without PostgreSQL;
 * services supply the legs from a user-scoped query.
 */

export interface BalanceLeg {
  readonly type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT';
  readonly amountMinor: bigint;
  readonly accountId: string | null;
  readonly fromAccountId: string | null;
  readonly toAccountId: string | null;
  readonly adjustmentSign: number | null;
}

/**
 * Derives one account's balance from its opening balance and every stored
 * transaction leg touching it. Legs for other accounts are ignored, so a
 * caller may pass a shared leg set for a whole listing.
 */
export function deriveAccountBalance(
  openingBalanceMinor: bigint,
  accountId: string,
  legs: readonly BalanceLeg[],
): bigint {
  let balance = openingBalanceMinor;
  for (const leg of legs) {
    switch (leg.type) {
      case 'INCOME':
        if (leg.accountId === accountId) {
          balance += leg.amountMinor;
        }
        break;
      case 'EXPENSE':
        if (leg.accountId === accountId) {
          balance -= leg.amountMinor;
        }
        break;
      case 'TRANSFER':
        if (leg.fromAccountId === accountId) {
          balance -= leg.amountMinor;
        }
        if (leg.toAccountId === accountId) {
          balance += leg.amountMinor;
        }
        break;
      case 'ADJUSTMENT':
        if (leg.accountId === accountId) {
          balance += leg.adjustmentSign === 1 ? leg.amountMinor : -leg.amountMinor;
        }
        break;
    }
  }
  return balance;
}
