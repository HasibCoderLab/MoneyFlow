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

/** Fixed sample period label — deterministic, no date maths. */
export const MOCK_PERIOD_LABEL = 'October 2026';

/** One-line disclaimer rendered next to every preview figure. */
export const MOCK_DATA_DISCLAIMER =
  'All amounts, names, and dates below are fictional sample data shown for UI review only.';

export type MockSummary = {
  readonly totalBalance: string;
  readonly monthlyIncome: string;
  readonly monthlySpent: string;
};

/** Headline numbers for the dashboard summary cards (sample). */
export const MOCK_SUMMARY: MockSummary = {
  totalBalance: '12,450',
  monthlyIncome: '18,000',
  monthlySpent: '9,750',
};

export type MockTransaction = {
  readonly id: string;
  readonly description: string;
  readonly category: string;
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
    description: 'Part-time stipend',
    category: 'Income',
    direction: 'income',
    amount: '12,000',
    dateLabel: '12 Oct 2026',
  },
  {
    id: 'mock-tx-2',
    description: 'Groceries — monthly restock',
    category: 'Groceries',
    direction: 'expense',
    amount: '3,200',
    dateLabel: '11 Oct 2026',
  },
  {
    id: 'mock-tx-3',
    description: 'Mobile recharge',
    category: 'Utilities',
    direction: 'expense',
    amount: '399',
    dateLabel: '10 Oct 2026',
  },
  {
    id: 'mock-tx-4',
    description: 'Move to Emergency fund',
    category: 'Transfer',
    direction: 'transfer',
    amount: '2,000',
    dateLabel: '9 Oct 2026',
  },
  {
    id: 'mock-tx-5',
    description: 'Freelance design work',
    category: 'Freelance',
    direction: 'income',
    amount: '6,000',
    dateLabel: '8 Oct 2026',
  },
  {
    id: 'mock-tx-6',
    description: 'Bus pass',
    category: 'Transport',
    direction: 'expense',
    amount: '1,200',
    dateLabel: '7 Oct 2026',
  },
];

export type MockCategorySpend = {
  readonly name: string;
  readonly amount: string;
  /** Literal share of the sample total, hand-written — never derived. */
  readonly percentOfTotal: number;
};

/** Spending-by-category breakdown (sample). Amounts and shares are literals. */
export const MOCK_SPENDING_BY_CATEGORY: readonly MockCategorySpend[] = [
  { name: 'Groceries', amount: '3,200', percentOfTotal: 33 },
  { name: 'Food & dining', amount: '2,400', percentOfTotal: 25 },
  { name: 'Transport', amount: '1,500', percentOfTotal: 15 },
  { name: 'Utilities', amount: '1,200', percentOfTotal: 12 },
  { name: 'Entertainment', amount: '850', percentOfTotal: 9 },
  { name: 'Other', amount: '600', percentOfTotal: 6 },
];

export type MockSavingsGoal = {
  readonly id: string;
  readonly name: string;
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
    name: 'Emergency fund',
    saved: '8,000',
    target: '30,000',
    percent: 27,
    remaining: '22,000',
    targetDateLabel: 'Mar 2027',
  },
  {
    id: 'mock-goal-2',
    name: 'New laptop',
    saved: '12,000',
    target: '48,000',
    percent: 25,
    remaining: '36,000',
    targetDateLabel: 'Jun 2027',
  },
  {
    id: 'mock-goal-3',
    name: 'Semester fees buffer',
    saved: '6,000',
    target: '10,000',
    percent: 60,
    remaining: '4,000',
    targetDateLabel: 'Jan 2027',
  },
];

export type MockBudget = {
  readonly id: string;
  readonly category: string;
  readonly spent: string;
  readonly limit: string;
  /** Literal utilisation percentage — not calculated. */
  readonly percentUsed: number;
  /** Literal remaining amount — not calculated. */
  readonly remaining: string;
  /** Neutral status copy; meaning is text, never color alone. */
  readonly statusLabel: string;
};

/** Budget snapshot (sample). */
export const MOCK_BUDGETS: readonly MockBudget[] = [
  {
    id: 'mock-budget-1',
    category: 'Groceries',
    spent: '3,200',
    limit: '5,000',
    percentUsed: 64,
    remaining: '1,800',
    statusLabel: 'Within plan',
  },
  {
    id: 'mock-budget-2',
    category: 'Food & dining',
    spent: '2,400',
    limit: '2,500',
    percentUsed: 96,
    remaining: '100',
    statusLabel: 'Close to limit',
  },
  {
    id: 'mock-budget-3',
    category: 'Transport',
    spent: '1,500',
    limit: '2,000',
    percentUsed: 75,
    remaining: '500',
    statusLabel: 'Within plan',
  },
  {
    id: 'mock-budget-4',
    category: 'Entertainment',
    spent: '850',
    limit: '1,000',
    percentUsed: 85,
    remaining: '150',
    statusLabel: 'Close to limit',
  },
];

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

export type MockCategory = {
  readonly id: string;
  readonly name: string;
  readonly kind: 'income' | 'expense';
  /** Sample swatch color — decorative only; meaning is always the name text. */
  readonly color: string;
  readonly status: 'active' | 'archived';
};

/**
 * Default + custom categories (sample, requirements.md §5.5). Colors are
 * decoration; the name carries the meaning. Deletion safeguards and
 * reassignment arrive with the categories API (IT-5); the archived row
 * shows history stays readable.
 */
export const MOCK_CATEGORIES: readonly MockCategory[] = [
  { id: 'mock-cat-1', name: 'Salary', kind: 'income', color: '#15803d', status: 'active' },
  { id: 'mock-cat-2', name: 'Freelance', kind: 'income', color: '#0369a1', status: 'active' },
  { id: 'mock-cat-3', name: 'Gifts', kind: 'income', color: '#7c3aed', status: 'active' },
  { id: 'mock-cat-4', name: 'Groceries', kind: 'expense', color: '#2563eb', status: 'active' },
  { id: 'mock-cat-5', name: 'Transport', kind: 'expense', color: '#06b6d4', status: 'active' },
  {
    id: 'mock-cat-6',
    name: 'Food & dining',
    kind: 'expense',
    color: '#f59e0b',
    status: 'active',
  },
  { id: 'mock-cat-7', name: 'Utilities', kind: 'expense', color: '#be123c', status: 'active' },
  { id: 'mock-cat-8', name: 'Old hobby', kind: 'expense', color: '#64748b', status: 'archived' },
];
