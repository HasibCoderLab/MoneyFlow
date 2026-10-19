import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TestAccount } from './auth-session';
import { authed, signUpUser } from './auth-session';
import { createAccount, createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';

/**
 * IT-8 summary acceptance against real PostgreSQL: dashboard balance and
 * totals, transfer/adjustment/opening-balance exclusion, local-day timezone
 * boundaries, Saturday week buckets (DR-11), category breakdowns with
 * archived categories, deterministic ordering, empty states, query
 * validation, authentication, cross-user isolation, and exactness beyond
 * `Number.MAX_SAFE_INTEGER` (accounting-rules.md §9, requirements.md §5.6,
 * §5.10).
 *
 * Periods are explicit fixed dates in the past (Feb 2026, Asia/Dhaka) so no
 * assertion depends on the wall-clock day CI runs on. Fixed instants are
 * seeded through Prisma directly — the HTTP create path refuses future
 * dates by design and cannot express exact UTC boundary instants.
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let other: TestAccount;

let cashId = '';
let bankId = '';
let salaryId = '';
let groceriesId = '';
let transportId = '';
let retiredCategoryId = '';
let otherCashId = '';
let otherSalaryId = '';

const FEBRUARY = { dateFrom: '2026-02-01', dateTo: '2026-02-28' };

beforeAll(async () => {
  testApp = await startTestApp();
});

afterAll(async () => {
  await testApp.app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  user = await signUpUser(testApp.baseUrl, 'summary');
  other = await signUpUser(testApp.baseUrl, 'summary-other');

  cashId = (
    await createAccount(prisma, user.userId, { name: 'Cash', openingBalanceMinor: 1000000n })
  ).id;
  bankId = (await createAccount(prisma, user.userId, { name: 'Bank', openingBalanceMinor: 0n })).id;
  otherCashId = (
    await createAccount(prisma, other.userId, { name: 'Other cash', openingBalanceMinor: 0n })
  ).id;

  // nameKeys are suffixed because sign-up clones the IT-5 default categories
  // ("Salary"/"Groceries"/"Transport" included) and the database's
  // `(userId, nameKey, type)` index is unique — same pattern as the
  // transactions suite. Display names stay realistic; assertions below
  // match on names, never on nameKeys.
  salaryId = (
    await createCategory(prisma, user.userId, {
      name: 'Salary',
      nameKey: `salary-${Date.now()}`,
      type: 'INCOME',
    })
  ).id;
  groceriesId = (
    await createCategory(prisma, user.userId, {
      name: 'Groceries',
      nameKey: `groceries-${Date.now()}`,
      type: 'EXPENSE',
    })
  ).id;
  transportId = (
    await createCategory(prisma, user.userId, {
      name: 'Transport',
      nameKey: `transport-${Date.now()}`,
      type: 'EXPENSE',
    })
  ).id;
  retiredCategoryId = (
    await createCategory(prisma, user.userId, {
      name: 'Old category',
      nameKey: 'old-category',
      type: 'EXPENSE',
      status: 'ARCHIVED',
    })
  ).id;
  otherSalaryId = (
    await createCategory(prisma, other.userId, {
      name: 'Salary',
      nameKey: `salary-${Date.now()}`,
      type: 'INCOME',
    })
  ).id;
});

type SeedInput =
  | {
      type: 'INCOME' | 'EXPENSE';
      amountMinor: bigint;
      occurredAt: Date;
      accountId: string;
      categoryId: string;
    }
  | {
      type: 'TRANSFER';
      amountMinor: bigint;
      occurredAt: Date;
      fromAccountId: string;
      toAccountId: string;
    }
  | {
      type: 'ADJUSTMENT';
      amountMinor: bigint;
      occurredAt: Date;
      accountId: string;
      adjustmentSign: 1 | -1;
      note?: string;
    };

/** Seeds a persisted row directly (bypasses HTTP-date validation by design). */
function seedTransaction(owner: TestAccount, input: SeedInput): Promise<{ id: string }> {
  const base = {
    userId: owner.userId,
    amountMinor: input.amountMinor,
    currency: 'BDT',
    occurredAt: input.occurredAt,
  };
  if (input.type === 'TRANSFER') {
    return prisma.transaction.create({
      data: {
        ...base,
        type: 'TRANSFER',
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
      },
    });
  }
  if (input.type === 'ADJUSTMENT') {
    return prisma.transaction.create({
      data: {
        ...base,
        type: 'ADJUSTMENT',
        accountId: input.accountId,
        adjustmentSign: input.adjustmentSign,
        note: input.note ?? 'Seed adjustment',
      },
    });
  }
  return prisma.transaction.create({
    data: {
      ...base,
      type: input.type,
      accountId: input.accountId,
      categoryId: input.categoryId,
    },
  });
}

/** Local noon in Asia/Dhaka for a fixed date — safely inside that local day. */
function dhakaNoon(date: string): Date {
  return new Date(`${date}T06:00:00.000Z`);
}

function getJson(path: string, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, { path });
}

function periodQuery(base: string, period = FEBRUARY, extra = ''): string {
  return `${base}?dateFrom=${period.dateFrom}&dateTo=${period.dateTo}${extra}`;
}

interface TotalsBody {
  incomeMinor: string;
  expenseMinor: string;
  transactionCount: number;
}

interface DashboardBody {
  period: { dateFrom: string; dateTo: string; timezone: string; currency: string };
  totalTrackedBalanceMinor: string;
  activeAccountCount: number;
  totals: TotalsBody;
  recentTransactions: Array<{
    id: string;
    type: string;
    amountMinor: string;
    currency: string;
    occurredAt: string;
    adjustmentSign: number | null;
    note: string | null;
    categoryName: string | null;
    categoryColor: string | null;
  }>;
  spendingByCategory: Array<{
    categoryId: string;
    name: string;
    color: string | null;
    status: string;
    expenseMinor: string;
    percentTimes10: string | null;
  }>;
}

interface ReportSummaryBody {
  period: DashboardBody['period'];
  totals: TotalsBody;
  granularity: string;
  weekStartsOn: string | null;
  series: Array<{ startDate: string; endDate: string; incomeMinor: string; expenseMinor: string }>;
}

interface ReportCategoriesBody {
  period: DashboardBody['period'];
  totalExpenseMinor: string;
  categories: DashboardBody['spendingByCategory'];
}

describe('GET /api/v1/dashboard', () => {
  it('derives balance, period totals, recent activity, and category spending', async () => {
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 1800000n,
      occurredAt: dhakaNoon('2026-02-05'),
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 320000n,
      occurredAt: dhakaNoon('2026-02-06'),
      accountId: cashId,
      categoryId: groceriesId,
    });
    await seedTransaction(user, {
      type: 'TRANSFER',
      amountMinor: 200000n,
      occurredAt: dhakaNoon('2026-02-07'),
      fromAccountId: cashId,
      toAccountId: bankId,
    });
    await seedTransaction(user, {
      type: 'ADJUSTMENT',
      amountMinor: 50000n,
      occurredAt: dhakaNoon('2026-02-08'),
      accountId: cashId,
      adjustmentSign: -1,
      note: 'Cash count correction',
    });
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 80000n,
      occurredAt: dhakaNoon('2026-02-09'),
      accountId: bankId,
      categoryId: transportId,
    });
    // Outside the period but on the books: must affect the balance, never
    // the February totals.
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 999999n,
      occurredAt: dhakaNoon('2026-03-05'),
      accountId: cashId,
      categoryId: salaryId,
    });

    const response = await getJson(periodQuery('/api/v1/dashboard', FEBRUARY, '&recentLimit=3'));
    expect(response.status).toBe(200);
    const body = response.body as DashboardBody;

    // Cash: 1000000 + 1800000 − 320000 − 200000 − 50000 + 999999 = 3229999
    // Bank: 0 + 200000 − 80000 = 120000 → 3349999 total.
    expect(body.totalTrackedBalanceMinor).toBe('3349999');
    expect(body.activeAccountCount).toBe(2);
    expect(body.period).toEqual({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
    });
    expect(body.totals).toEqual({
      incomeMinor: '1800000',
      expenseMinor: '400000',
      transactionCount: 3,
    });
    expect(
      body.recentTransactions.map((row) => [
        row.type,
        row.amountMinor,
        row.categoryName,
        row.adjustmentSign,
      ]),
    ).toEqual([
      ['INCOME', '999999', 'Salary', null], // latest overall, even outside the period
      ['EXPENSE', '80000', 'Transport', null],
      ['ADJUSTMENT', '50000', null, -1],
    ]);
    expect(
      body.spendingByCategory.map((row) => [row.name, row.expenseMinor, row.percentTimes10]),
    ).toEqual([
      ['Groceries', '320000', '800'],
      ['Transport', '80000', '200'],
    ]);
  });

  it('keeps exact strings beyond Number.MAX_SAFE_INTEGER', async () => {
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 9_007_199_254_740_993n,
      occurredAt: dhakaNoon('2026-02-10'),
      accountId: cashId,
      categoryId: salaryId,
    });

    const response = await getJson(periodQuery('/api/v1/dashboard'));
    expect(response.status).toBe(200);
    const body = response.body as DashboardBody;

    expect(body.totals.incomeMinor).toBe('9007199254740993');
    // 1000000 opening + 9007199254740993.
    expect(body.totalTrackedBalanceMinor).toBe('9007199255740993');
  });

  it('excludes transfers, adjustments, and opening balances from the totals', async () => {
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 100000n,
      occurredAt: dhakaNoon('2026-02-12'),
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'TRANSFER',
      amountMinor: 50000n,
      occurredAt: dhakaNoon('2026-02-12'),
      fromAccountId: cashId,
      toAccountId: bankId,
    });
    await seedTransaction(user, {
      type: 'ADJUSTMENT',
      amountMinor: 10000n,
      occurredAt: dhakaNoon('2026-02-12'),
      accountId: cashId,
      adjustmentSign: 1,
    });

    const body = (await getJson(periodQuery('/api/v1/dashboard'))).body as DashboardBody;

    expect(body.totals).toEqual({
      incomeMinor: '100000',
      expenseMinor: '0',
      transactionCount: 1,
    });
    // Transfers net out across accounts: opening 1000000 + income 100000
    // + adjustment 10000 − transfer 50000 + transfer 50000 = 1110000.
    expect(body.totalTrackedBalanceMinor).toBe('1110000');
  });

  it('counts boundary instants by local Dhaka day, not UTC', async () => {
    // 17:59:59Z on 28 Feb is 23:59:59 local — still February.
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 111n,
      occurredAt: new Date('2026-02-28T17:59:59.000Z'),
      accountId: cashId,
      categoryId: salaryId,
    });
    // 18:00:00Z on 28 Feb is 00:00 on 1 Mar local — outside February.
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 222n,
      occurredAt: new Date('2026-02-28T18:00:00.000Z'),
      accountId: cashId,
      categoryId: groceriesId,
    });

    const body = (await getJson(periodQuery('/api/v1/dashboard'))).body as DashboardBody;

    expect(body.totals).toEqual({
      incomeMinor: '111',
      expenseMinor: '0',
      transactionCount: 1,
    });
  });

  it('returns honest empty states for a user with no accounts or records', async () => {
    // A freshly signed-up user with nothing recorded — `other` already has
    // an account from `beforeEach`, so it cannot represent "no accounts".
    const empty = await signUpUser(testApp.baseUrl, 'summary-empty');
    const response = await getJson(periodQuery('/api/v1/dashboard'), empty);
    expect(response.status).toBe(200);
    const body = response.body as DashboardBody;

    expect(body.totalTrackedBalanceMinor).toBe('0');
    expect(body.activeAccountCount).toBe(0);
    expect(body.totals).toEqual({ incomeMinor: '0', expenseMinor: '0', transactionCount: 0 });
    expect(body.recentTransactions).toEqual([]);
    expect(body.spendingByCategory).toEqual([]);
  });

  it('never leaks another user’s records (both directions)', async () => {
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 500000n,
      occurredAt: dhakaNoon('2026-02-14'),
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(other, {
      type: 'INCOME',
      amountMinor: 777000n,
      occurredAt: dhakaNoon('2026-02-14'),
      accountId: otherCashId,
      categoryId: otherSalaryId,
    });

    const mine = (await getJson(periodQuery('/api/v1/dashboard'))).body as DashboardBody;
    expect(mine.totals.incomeMinor).toBe('500000');
    // Own opening 1000000 + own income 500000; the other user's cash never counts.
    expect(mine.totalTrackedBalanceMinor).toBe('1500000');
    expect(mine.recentTransactions.map((row) => row.amountMinor)).toEqual(['500000']);

    const theirs = (await getJson(periodQuery('/api/v1/dashboard'), other)).body as DashboardBody;
    expect(theirs.totals.incomeMinor).toBe('777000');
    expect(theirs.totalTrackedBalanceMinor).toBe('777000');
    expect(theirs.recentTransactions.map((row) => row.amountMinor)).toEqual(['777000']);
  });

  it('requires a session', async () => {
    const response = await apiRequest(testApp.baseUrl, { path: '/api/v1/dashboard' });
    expect(response.status).toBe(401);
  });

  it('rejects malformed periods and out-of-range options with a safe 400', async () => {
    const cases = [
      '/api/v1/dashboard?dateFrom=2026-02-01',
      '/api/v1/dashboard?dateFrom=2026-02-30&dateTo=2026-03-01',
      '/api/v1/dashboard?dateFrom=2026-01-01&dateTo=2027-01-02', // 367 days
      '/api/v1/dashboard?timezone=Mars/Olympus',
      `${periodQuery('/api/v1/dashboard')}&recentLimit=0`,
      `${periodQuery('/api/v1/dashboard')}&recentLimit=21`,
      `${periodQuery('/api/v1/reports/summary')}&granularity=yearly`,
    ];
    for (const path of cases) {
      const response = await getJson(path);
      expect(response.status, path).toBe(400);
      expect(typeof (response.body as { message?: unknown }).message, path).toBe('string');
    }
  });
});

describe('GET /api/v1/reports/summary', () => {
  it('builds sparse daily buckets keyed by the local Dhaka day', async () => {
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 500n,
      occurredAt: dhakaNoon('2026-02-15'),
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 111n,
      occurredAt: new Date('2026-02-28T17:59:59.000Z'), // late local Feb 28
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 222n,
      occurredAt: new Date('2026-02-28T18:00:00.000Z'), // local 1 Mar
      accountId: cashId,
      categoryId: groceriesId,
    });

    const response = await getJson(periodQuery('/api/v1/reports/summary'));
    expect(response.status).toBe(200);
    const body = response.body as ReportSummaryBody;

    expect(body.granularity).toBe('daily');
    expect(body.weekStartsOn).toBeNull();
    expect(body.totals).toEqual({
      incomeMinor: '611',
      expenseMinor: '0',
      transactionCount: 2,
    });
    expect(body.series).toEqual([
      { startDate: '2026-02-15', endDate: '2026-02-15', incomeMinor: '500', expenseMinor: '0' },
      { startDate: '2026-02-28', endDate: '2026-02-28', incomeMinor: '111', expenseMinor: '0' },
    ]);
  });

  it('merges days into Saturday-start weeks and clips edges to the period', async () => {
    // Sat 31 Jan – Fri 6 Feb 2026 is one week; Sat 7 Feb starts the next.
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 100n,
      occurredAt: dhakaNoon('2026-02-01'), // Sunday
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 200n,
      occurredAt: dhakaNoon('2026-02-03'), // Tuesday
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 400n,
      occurredAt: dhakaNoon('2026-02-07'), // Saturday → new week
      accountId: cashId,
      categoryId: salaryId,
    });

    const body = (
      await getJson(periodQuery('/api/v1/reports/summary', FEBRUARY, '&granularity=weekly'))
    ).body as ReportSummaryBody;

    expect(body.weekStartsOn).toBe('SATURDAY');
    expect(body.series).toEqual([
      // Calendar week starts 31 Jan; clipped to the requested period.
      { startDate: '2026-02-01', endDate: '2026-02-06', incomeMinor: '300', expenseMinor: '0' },
      { startDate: '2026-02-07', endDate: '2026-02-13', incomeMinor: '400', expenseMinor: '0' },
    ]);
  });

  it('merges days into months and clips month edges to the period', async () => {
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 100n,
      occurredAt: dhakaNoon('2026-02-10'),
      accountId: cashId,
      categoryId: salaryId,
    });
    await seedTransaction(user, {
      type: 'INCOME',
      amountMinor: 200n,
      occurredAt: new Date('2026-02-28T18:30:00.000Z'), // local 1 Mar 00:30
      accountId: cashId,
      categoryId: salaryId,
    });

    const body = (
      await getJson(
        periodQuery(
          '/api/v1/reports/summary',
          { dateFrom: '2026-02-05', dateTo: '2026-03-05' },
          '&granularity=monthly',
        ),
      )
    ).body as ReportSummaryBody;

    expect(body.series).toEqual([
      { startDate: '2026-02-05', endDate: '2026-02-28', incomeMinor: '100', expenseMinor: '0' },
      { startDate: '2026-03-01', endDate: '2026-03-05', incomeMinor: '200', expenseMinor: '0' },
    ]);
  });

  it('returns an empty series for an empty period', async () => {
    const response = await getJson(periodQuery('/api/v1/reports/summary'), other);
    expect(response.status).toBe(200);
    const body = response.body as ReportSummaryBody;

    expect(body.series).toEqual([]);
    expect(body.totals).toEqual({ incomeMinor: '0', expenseMinor: '0', transactionCount: 0 });
  });
});

describe('GET /api/v1/reports/categories', () => {
  it('returns exact totals, half-up percentages, and archived categories', async () => {
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 300000n,
      occurredAt: dhakaNoon('2026-02-16'),
      accountId: cashId,
      categoryId: groceriesId,
    });
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 200000n,
      occurredAt: dhakaNoon('2026-02-17'),
      accountId: cashId,
      categoryId: retiredCategoryId,
    });
    await seedTransaction(user, {
      type: 'EXPENSE',
      amountMinor: 100000n,
      occurredAt: dhakaNoon('2026-02-18'),
      accountId: cashId,
      categoryId: transportId,
    });

    const response = await getJson(periodQuery('/api/v1/reports/categories'));
    expect(response.status).toBe(200);
    const body = response.body as ReportCategoriesBody;

    expect(body.totalExpenseMinor).toBe('600000');
    expect(
      body.categories.map((row) => [row.name, row.expenseMinor, row.percentTimes10, row.status]),
    ).toEqual([
      ['Groceries', '300000', '500', 'ACTIVE'],
      ['Old category', '200000', '333', 'ARCHIVED'],
      ['Transport', '100000', '167', 'ACTIVE'],
    ]);
  });

  it('returns zero totals and no rows for an empty period', async () => {
    const response = await getJson(periodQuery('/api/v1/reports/categories'), other);
    expect(response.status).toBe(200);
    const body = response.body as ReportCategoriesBody;

    expect(body.totalExpenseMinor).toBe('0');
    expect(body.categories).toEqual([]);
  });
});
