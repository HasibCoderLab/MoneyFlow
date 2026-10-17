/**
 * Pure accounting effect matrix (ADR-0004, accounting-rules.md §2,
 * §11.3–§11.4).
 *
 * Direction is always derived from the transaction `type` (and
 * `adjustmentSign` for adjustments) — never from a sign a user typed.
 * Input `amountMinor` values are strictly positive; the signed account
 * effects are computed here.
 *
 * `REFUND` is deferred (ADR-0004) and intentionally not represented. The
 * transfer invariant (`from ≠ to`, zero net tracked-balance effect) is
 * enforced here because the §2 matrix relies on it.
 */
import { assertPositiveAmount } from './amount';
import { MoneyDomainError } from './errors';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Mirrors the stored `adjustmentSign` column (+1 increase / −1 decrease). */
export type AdjustmentSign = 1 | -1;

/** Strongly typed input for the effect matrix; one member per MVP type. */
export type TransactionEffectInput =
  | {
      readonly type: 'INCOME';
      readonly amountMinor: bigint;
      readonly accountId: string;
      readonly categoryId: string;
    }
  | {
      readonly type: 'EXPENSE';
      readonly amountMinor: bigint;
      readonly accountId: string;
      readonly categoryId: string;
    }
  | {
      readonly type: 'TRANSFER';
      readonly amountMinor: bigint;
      readonly fromAccountId: string;
      readonly toAccountId: string;
    }
  | {
      readonly type: 'ADJUSTMENT';
      readonly amountMinor: bigint;
      readonly accountId: string;
      readonly adjustmentSign: AdjustmentSign;
    };

/** Signed balance change for one account; negative reduces the balance. */
export interface AccountBalanceEffect {
  readonly accountId: string;
  readonly signedAmountMinor: bigint;
}

export interface TransactionEffectSummary {
  readonly accountEffects: readonly AccountBalanceEffect[];
  /** Contributes to period income totals (accounting-rules.md §1). */
  readonly countsAsIncome: boolean;
  /** Contributes to period expense totals (refund-aware at aggregation). */
  readonly countsAsExpense: boolean;
  /** Increases/decreases budget spending (§2 matrix: EXPENSE only in MVP). */
  readonly affectsBudget: boolean;
  /** Category attribution target; `null` for TRANSFER/ADJUSTMENT. */
  readonly categoryId: string | null;
}

/**
 * Computes the full effect summary of one valid transaction.
 *
 * @throws MoneyDomainError `AMOUNT_NOT_POSITIVE` for a non-positive amount;
 * `TRANSFER_ACCOUNTS_MUST_DIFFER` when both transfer sides are the same
 * account; `UNSUPPORTED_TRANSACTION_TYPE` when a value that bypasses the
 * TypeScript union reaches the function.
 */
export function calculateTransactionEffects(
  input: TransactionEffectInput,
): TransactionEffectSummary {
  assertPositiveAmount(input.amountMinor);

  switch (input.type) {
    case 'INCOME':
      return {
        accountEffects: [{ accountId: input.accountId, signedAmountMinor: input.amountMinor }],
        countsAsIncome: true,
        countsAsExpense: false,
        affectsBudget: false,
        categoryId: input.categoryId,
      };
    case 'EXPENSE':
      return {
        accountEffects: [{ accountId: input.accountId, signedAmountMinor: -input.amountMinor }],
        countsAsIncome: false,
        countsAsExpense: true,
        affectsBudget: true,
        categoryId: input.categoryId,
      };
    case 'TRANSFER': {
      if (input.fromAccountId === input.toAccountId) {
        throw new MoneyDomainError(
          'TRANSFER_ACCOUNTS_MUST_DIFFER',
          'Transfer source and destination accounts must differ.',
        );
      }
      return {
        accountEffects: [
          { accountId: input.fromAccountId, signedAmountMinor: -input.amountMinor },
          { accountId: input.toAccountId, signedAmountMinor: input.amountMinor },
        ],
        countsAsIncome: false,
        countsAsExpense: false,
        affectsBudget: false,
        categoryId: null,
      };
    }
    case 'ADJUSTMENT':
      return {
        accountEffects: [
          {
            accountId: input.accountId,
            signedAmountMinor: input.adjustmentSign === 1 ? input.amountMinor : -input.amountMinor,
          },
        ],
        countsAsIncome: false,
        countsAsExpense: false,
        affectsBudget: false,
        categoryId: null,
      };
    default: {
      // Compile-time exhaustiveness check: adding a union member without a
      // case fails here. Also guards callers that bypass TypeScript types.
      const unreachable: never = input;
      void unreachable;
      throw new MoneyDomainError('UNSUPPORTED_TRANSACTION_TYPE', 'Unsupported transaction type.');
    }
  }
}

/**
 * Net signed effect across all affected accounts. Exactly `0n` for a valid
 * transfer — moving money between own accounts never changes the total
 * tracked balance (accounting-rules.md §11.3).
 */
export function netBalanceEffect(summary: TransactionEffectSummary): bigint {
  let total = 0n;
  for (const effect of summary.accountEffects) {
    total += effect.signedAmountMinor;
  }
  return total;
}
