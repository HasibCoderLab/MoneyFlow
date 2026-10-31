// ──────────────────────────────────────────────────────────────────────────────
// MOCK DATA — UI PREVIEW ONLY. NOTHING HERE IS REAL.
//
// Every value is a hand-written literal used to review layout and
// interaction before any backend exists. No figures are calculated,
// summed, or derived anywhere in this file or in the components that
// render it. When real features land (requirements.md phases 3–5), this
// module is deleted and components consume the API instead.
//
// Do not copy these values into tests of financial behaviour, docs, or
// marketing material (AGENTS.md rule 12: nothing fake presented as real).
// ──────────────────────────────────────────────────────────────────────────────

import type { TranslationKey } from '@/lib/i18n/translations';

/** One-line disclaimer key rendered next to every preview figure. */
export const MOCK_DATA_DISCLAIMER_KEY: TranslationKey = 'preview.dataDisclaimer';

export type MockTransaction = {
  readonly id: string;
  readonly descriptionKey: TranslationKey;
  readonly categoryKey: TranslationKey;
  readonly direction: 'income' | 'expense' | 'transfer';
  /** Absolute amount, pre-formatted with thousands separators. */
  readonly amount: string;
  /** Pre-formatted display date — no date parsing or timezone logic here. */
  readonly dateLabel: string;
};

/**
 * Recent activity (sample). Note the transfer row: transfers between a
 * user's own accounts are never income or expense (requirements.md §5).
 */
export const MOCK_RECENT_TRANSACTIONS: readonly MockTransaction[] = [
  {
    id: 'mock-tx-1',
    descriptionKey: 'mock.tx.stipend',
    categoryKey: 'mock.category.income',
    direction: 'income',
    amount: '12,000',
    dateLabel: '12 Oct 2026',
  },
  {
    id: 'mock-tx-2',
    descriptionKey: 'mock.tx.groceries',
    categoryKey: 'mock.category.groceries',
    direction: 'expense',
    amount: '3,200',
    dateLabel: '11 Oct 2026',
  },
  {
    id: 'mock-tx-3',
    descriptionKey: 'mock.tx.recharge',
    categoryKey: 'mock.category.utilities',
    direction: 'expense',
    amount: '399',
    dateLabel: '10 Oct 2026',
  },
  {
    id: 'mock-tx-4',
    descriptionKey: 'mock.tx.emergencyTransfer',
    categoryKey: 'mock.category.transfer',
    direction: 'transfer',
    amount: '2,000',
    dateLabel: '9 Oct 2026',
  },
  {
    id: 'mock-tx-5',
    descriptionKey: 'mock.tx.freelance',
    categoryKey: 'mock.category.freelance',
    direction: 'income',
    amount: '6,000',
    dateLabel: '8 Oct 2026',
  },
  {
    id: 'mock-tx-6',
    descriptionKey: 'mock.tx.busPass',
    categoryKey: 'mock.category.transport',
    direction: 'expense',
    amount: '1,200',
    dateLabel: '7 Oct 2026',
  },
];

export type MockSavingsGoal = {
  readonly id: string;
  readonly nameKey: TranslationKey;
  readonly saved: string;
  readonly target: string;
  /** Literal progress percentage — not calculated from the fields above. */
  readonly percent: number;
  /** Literal remaining amount — not calculated. */
  readonly remaining: string;
  readonly targetDateLabel: string;
};

/** Savings goals (sample). */
export const MOCK_SAVINGS_GOALS: readonly MockSavingsGoal[] = [
  {
    id: 'mock-goal-1',
    nameKey: 'mock.goal.emergencyFund',
    saved: '8,000',
    target: '30,000',
    percent: 27,
    remaining: '22,000',
    targetDateLabel: 'Mar 2027',
  },
  {
    id: 'mock-goal-2',
    nameKey: 'mock.goal.newLaptop',
    saved: '12,000',
    target: '48,000',
    percent: 25,
    remaining: '36,000',
    targetDateLabel: 'Jun 2027',
  },
  {
    id: 'mock-goal-3',
    nameKey: 'mock.goal.semesterBuffer',
    saved: '6,000',
    target: '10,000',
    percent: 60,
    remaining: '4,000',
    targetDateLabel: 'Jan 2027',
  },
];

// Budget sample data was removed with IT-9: the budgets page renders real
// API data (list, utilization, create/edit/delete) like dashboard,
// reports, and categories.

export type MockAccount = {
  readonly id: string;
  readonly name: string;
  /** Account kind label (requirements.md §5.3: cash, bank, wallet, savings). */
  readonly kind: string;
  readonly currency: string;
  /** Opening balance, pre-formatted display string — never derived. */
  readonly openingBalance: string;
  readonly status: 'active' | 'archived';
};

/**
 * Accounts and wallets (sample). Opening balances are starting points only:
 * current balances are computed from opening balances plus recorded activity
 * once the backend lands (IT-4) — no activity exists in this preview.
 * The archived row shows that archiving keeps history visible ( §5.3).
 */
export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    id: 'mock-account-1',
    name: 'Cash',
    kind: 'Cash',
    currency: 'BDT',
    openingBalance: '5,000',
    status: 'active',
  },
  {
    id: 'mock-account-2',
    name: 'City Bank savings',
    kind: 'Bank account',
    currency: 'BDT',
    openingBalance: '45,000',
    status: 'active',
  },
  {
    id: 'mock-account-3',
    name: 'bKash wallet',
    kind: 'Mobile wallet',
    currency: 'BDT',
    openingBalance: '2,450',
    status: 'active',
  },
  {
    id: 'mock-account-4',
    name: 'Old student account',
    kind: 'Savings account',
    currency: 'BDT',
    openingBalance: '10,000',
    status: 'archived',
  },
];
