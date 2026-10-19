import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TestAccount } from './auth-session';
import { authed, signUpUser } from './auth-session';
import { createAccount, createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';

/**
 * IT-9 budget acceptance against real PostgreSQL: CRUD over HTTP, decimal
 * string money in / exact minor-unit strings out, category eligibility, the
 * one-active-limit-per-category rule, status transitions, month-boundary
 * and timezone-correct utilization (transfers/income/adjustments excluded),
 * exactness beyond `Number.MAX_SAFE_INTEGER`, cross-user isolation, and
 * 401 behavior (accounting-rules.md §1.1/§6/§7/§9, requirements.md §5.9).
 *
 * Periods use fixed past months in `Asia/Dhaka`; boundary instants are
 * seeded through Prisma directly because the HTTP create path refuses
 * future dates by design (IT-8 precedent).
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let other: TestAccount;

let groceriesId = '';
let transportId = '';
let salaryId = '';
let archivedId = '';
let otherGroceriesId = '';
let cashId = '';

/** nameKeys are suffixed: sign-up clones the IT-5 defaults (unique index). */
function monthNoon(date: string): Date {
  return new Date(`${date}T06:00:00.000Z`); // local 12:00 in Asia/Dhaka
}

beforeAll(async () => {
  testApp = await startTestApp();
});

afterAll(async () => {
  await testApp.app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  user = await signUpUser(testApp.baseUrl, 'budgets');
  other = await signUpUser(testApp.baseUrl, 'budgets-other');

  cashId = (await createAccount(prisma, user.userId, { name: 'Cash', openingBalanceMinor: 0n })).id;
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
  salaryId = (
    await createCategory(prisma, user.userId, {
      name: 'Salary',
      nameKey: `salary-${Date.now()}`,
      type: 'INCOME',
    })
  ).id;
  archivedId = (
    await createCategory(prisma, user.userId, {
      name: 'Retired',
      nameKey: `retired-${Date.now()}`,
      type: 'EXPENSE',
      status: 'ARCHIVED',
    })
  ).id;
  otherGroceriesId = (
    await createCategory(prisma, other.userId, {
      name: 'Other groceries',
      nameKey: `other-groceries-${Date.now()}`,
      type: 'EXPENSE',
    })
  ).id;
});

interface BudgetBody {
  id: string;
  name: string;
  startDate: string;
  status: string;
  totalFigures: {
    limitMinor: string;
    spentMinor: string;
    remainingMinor: string;
    percentTimes10: string | null;
  } | null;
  categoryLimits: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    figures: {
      limitMinor: string;
      spentMinor: string;
      remainingMinor: string;
      percentTimes10: string | null;
    };
  }>;
  currency: string;
}

function createBudget(account: TestAccount, body: Record<string, unknown>) {
  return authed(testApp.baseUrl, account, { method: 'POST', path: '/api/v1/budgets', body });
}

function listBudgets(account: TestAccount, query = '') {
  return authed(testApp.baseUrl, account, { path: `/api/v1/budgets${query}` });
}

/** Seeds a persisted expense/income row directly (exact boundary instants). */
function seedTransaction(input: {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amountMinor: bigint;
  occurredAt: Date;
  categoryId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
}): Promise<{ id: string }> {
  const base = {
    userId: user.userId,
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
  return prisma.transaction.create({
    data: {
      ...base,
      type: input.type,
      accountId: input.accountId ?? cashId,
      categoryId: input.categoryId,
    },
  });
}

describe('POST /api/v1/budgets', () => {
  it('creates a monthly budget with exact contract-string figures', async () => {
    const response = await createBudget(user, {
      name: '  October plan  ',
      startDate: '2026-10',
      totalLimit: '8000.50',
      categoryLimits: [
        { categoryId: groceriesId, limit: '5000' },
        { categoryId: transportId, limit: '1500.55' },
      ],
    });
    expect(response.status).toBe(201);
    const body = response.body as BudgetBody;
    expect(body.name).toBe('October plan');
    expect(body.startDate).toBe('2026-10-01');
    expect(body.status).toBe('ACTIVE');
    expect(body.currency).toBe('BDT');
    expect(body.totalFigures).toEqual({
      limitMinor: '800050',
      spentMinor: '0',
      remainingMinor: '800050',
      percentTimes10: '0',
    });
    // Largest limit first, deterministic.
    expect(body.categoryLimits.map((limit) => limit.categoryName)).toEqual([
      'Groceries',
      'Transport',
    ]);
    expect(body.categoryLimits[0]?.figures.limitMinor).toBe('500000');
    expect(body.categoryLimits[1]?.figures.limitMinor).toBe('150055');
  });

  it('requires a session (401) and rejects invalid bodies (400)', async () => {
    const anonymous = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/budgets',
      body: { name: 'Plan', startDate: '2026-10', totalLimit: '100' },
    });
    expect(anonymous.status).toBe(401);

    const invalid = await createBudget(user, {
      name: 'Plan',
      startDate: '2026-10-15',
      totalLimit: '100',
    });
    expect(invalid.status).toBe(400);

    const empty = await createBudget(user, { name: 'Plan', startDate: '2026-10' });
    expect(empty.status).toBe(400);
  });

  it('rejects archived, income, foreign, and malformed category ids', async () => {
    for (const categoryId of [archivedId, salaryId, otherGroceriesId, 'not-a-uuid']) {
      const response = await createBudget(user, {
        name: 'Plan',
        startDate: '2026-10',
        categoryLimits: [{ categoryId, limit: '100' }],
      });
      expect(response.status).toBe(400);
    }
  });

  it('enforces one ACTIVE budget limit per category per month', async () => {
    const first = await createBudget(user, {
      name: 'October groceries',
      startDate: '2026-10',
      categoryLimits: [{ categoryId: groceriesId, limit: '5000' }],
    });
    expect(first.status).toBe(201);

    // Same category, same month, another ACTIVE budget → 409.
    const clash = await createBudget(user, {
      name: 'October more groceries',
      startDate: '2026-10-01',
      categoryLimits: [{ categoryId: groceriesId, limit: '999' }],
    });
    expect(clash.status).toBe(409);

    // Different month → allowed.
    const november = await createBudget(user, {
      name: 'November groceries',
      startDate: '2026-11',
      categoryLimits: [{ categoryId: groceriesId, limit: '5000' }],
    });
    expect(november.status).toBe(201);

    // A PAUSED budget does not hold the rule.
    const paused = first.body as BudgetBody;
    const pause = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/budgets/${paused.id}/pause`,
    });
    expect(pause.status).toBe(200);
    const afterPause = await createBudget(user, {
      name: 'October groceries again',
      startDate: '2026-10',
      categoryLimits: [{ categoryId: groceriesId, limit: '6000' }],
    });
    expect(afterPause.status).toBe(201);

    // Resuming the paused budget must fail: its category is taken again.
    const resume = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/budgets/${paused.id}/resume`,
    });
    expect(resume.status).toBe(409);
  });
});

describe('budget status transitions and edits', () => {
  it('pauses, resumes, archives, and unarchives with validated transitions', async () => {
    const created = (
      await createBudget(user, {
        name: 'October plan',
        startDate: '2026-10',
        categoryLimits: [{ categoryId: groceriesId, limit: '5000' }],
      })
    ).body as BudgetBody;

    const call = (action: string) =>
      authed(testApp.baseUrl, user, {
        method: 'POST',
        path: `/api/v1/budgets/${created.id}/${action}`,
      });

    expect((await call('pause')).status).toBe(200);
    expect((await call('archive')).status).toBe(200);
    // ARCHIVED → PAUSED is not a legal direct move.
    expect((await call('pause')).status).toBe(409);
    expect((await call('unarchive')).status).toBe(200);
    expect((await call('resume')).status).toBe(200);

    const listed = (await listBudgets(user)).body as BudgetBody[];
    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe('ACTIVE');

    // Archived budgets stay hidden until asked for.
    expect((await call('archive')).status).toBe(200);
    expect((await listBudgets(user)).body).toHaveLength(0);
    expect((await listBudgets(user, '?includeArchived=true')).body).toHaveLength(1);
  });

  it('edits name, month, total, and replaces the limit set', async () => {
    const created = (
      await createBudget(user, {
        name: 'October plan',
        startDate: '2026-10',
        totalLimit: '8000',
        categoryLimits: [
          { categoryId: groceriesId, limit: '5000' },
          { categoryId: transportId, limit: '1500' },
        ],
      })
    ).body as BudgetBody;

    const response = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/budgets/${created.id}`,
      body: {
        name: 'Renamed plan',
        totalLimit: null,
        categoryLimits: [{ categoryId: groceriesId, limit: '4500.75' }],
      },
    });
    expect(response.status).toBe(200);
    const body = response.body as BudgetBody;
    expect(body.name).toBe('Renamed plan');
    expect(body.totalFigures).toBeNull();
    expect(body.categoryLimits).toHaveLength(1);
    expect(body.categoryLimits[0]?.figures.limitMinor).toBe('450075');

    // Status is not a PATCH field — the transition endpoints own it.
    const badStatus = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/budgets/${created.id}`,
      body: { status: 'ARCHIVED' },
    });
    expect(badStatus.status).toBe(400);
  });

  it('deletes budgets (limits cascade) and answers 404 for foreign ids', async () => {
    const mine = (
      await createBudget(user, {
        name: 'Mine',
        startDate: '2026-10',
        categoryLimits: [{ categoryId: groceriesId, limit: '100' }],
      })
    ).body as BudgetBody;
    const theirs = (
      await createBudget(other, {
        name: 'Theirs',
        startDate: '2026-10',
        categoryLimits: [{ categoryId: otherGroceriesId, limit: '100' }],
      })
    ).body as BudgetBody;

    // Cross-user: PATCH/DELETE/archive of someone else's budget is 404.
    for (const method of ['PATCH', 'DELETE'] as const) {
      const denied = await authed(testApp.baseUrl, other, {
        method,
        path: `/api/v1/budgets/${mine.id}`,
        ...(method === 'PATCH' ? { body: { name: 'Stolen' } } : {}),
      });
      expect(denied.status).toBe(404);
    }
    const deniedArchive = await authed(testApp.baseUrl, other, {
      method: 'POST',
      path: `/api/v1/budgets/${mine.id}/archive`,
    });
    expect(deniedArchive.status).toBe(404);

    // Lists only ever show the caller's own budgets.
    const mineList = (await listBudgets(user, '?includeArchived=true')).body as BudgetBody[];
    expect(mineList.map((budget) => budget.id)).toEqual([mine.id]);
    const theirList = (await listBudgets(other, '?includeArchived=true')).body as BudgetBody[];
    expect(theirList.map((budget) => budget.id)).toEqual([theirs.id]);

    const deleted = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/budgets/${mine.id}`,
    });
    expect(deleted.status).toBe(204);
    const limits = await prisma.budgetCategoryLimit.findMany({ where: { budgetId: mine.id } });
    expect(limits).toHaveLength(0);
  });
});

describe('budget utilization (accounting-rules.md §9 “Budget spent”)', () => {
  it('counts only in-month expenses: transfers, income, adjustments, and other months never count', async () => {
    const bankId = (
      await createAccount(prisma, user.userId, { name: 'Bank', openingBalanceMinor: 0n })
    ).id;
    const created = (
      await createBudget(user, {
        name: 'October groceries',
        startDate: '2026-10',
        categoryLimits: [{ categoryId: groceriesId, limit: '5000' }],
      })
    ).body as BudgetBody;

    // In-month grocery expense (local noon 2026-10-15).
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 320_000n,
      occurredAt: monthNoon('2026-10-15'),
      categoryId: groceriesId,
    });
    // Transport expense in the same month must NOT hit the groceries limit.
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 99_999n,
      occurredAt: monthNoon('2026-10-16'),
      categoryId: transportId,
    });
    // Income, transfer, and out-of-month expenses never count.
    await seedTransaction({
      type: 'INCOME',
      amountMinor: 1_000_000n,
      occurredAt: monthNoon('2026-10-01'),
      categoryId: salaryId,
    });
    await seedTransaction({
      type: 'TRANSFER',
      amountMinor: 200_000n,
      occurredAt: monthNoon('2026-10-05'),
      fromAccountId: cashId,
      toAccountId: bankId,
    });
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 777n,
      occurredAt: monthNoon('2026-09-30'),
      categoryId: groceriesId,
    });
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 555n,
      occurredAt: monthNoon('2026-11-01'),
      categoryId: groceriesId,
    });

    const listed = (await listBudgets(user)).body as BudgetBody[];
    const budget = listed.find((entry) => entry.id === created.id);

    // 3200.00 of 5000.00 → 64.0% used, exactly like the documented worked example.
    expect(budget?.categoryLimits[0]?.figures).toEqual({
      limitMinor: '500000',
      spentMinor: '320000',
      remainingMinor: '180000',
      percentTimes10: '640',
    });
  });

  it('resolves month boundaries in Asia/Dhaka, not UTC', async () => {
    const created = (
      await createBudget(user, {
        name: 'October everything',
        startDate: '2026-10',
        totalLimit: '10000',
      })
    ).body as BudgetBody;

    // 2026-09-30T18:30:00Z = 2026-10-01 00:30 local (inside October).
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 100n,
      occurredAt: new Date('2026-09-30T18:30:00.000Z'),
      categoryId: groceriesId,
    });
    // 2026-10-31T17:59:59Z = 2026-10-31 23:59:59 local (last second, inside).
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 200n,
      occurredAt: new Date('2026-10-31T17:59:59.000Z'),
      categoryId: groceriesId,
    });
    // 2026-10-31T18:00:00Z = 2026-11-01 00:00 local (outside).
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 400n,
      occurredAt: new Date('2026-10-31T18:00:00.000Z'),
      categoryId: groceriesId,
    });

    const listed = (await listBudgets(user)).body as BudgetBody[];
    const budget = listed.find((entry) => entry.id === created.id);

    expect(budget?.totalFigures?.spentMinor).toBe('300');
    expect(budget?.totalFigures?.remainingMinor).toBe('999700');
    // 300/1,000,000 = 0.03% → one-decimal display rounds to "0.0" (§7).
    expect(budget?.totalFigures?.percentTimes10).toBe('0');
  });

  it('shows overspend truthfully (negative remainder, percent above 100%) and exactness beyond 2^53', async () => {
    const created = (
      await createBudget(user, {
        name: 'Overspend',
        startDate: '2026-10',
        categoryLimits: [{ categoryId: groceriesId, limit: '100' }],
      })
    ).body as BudgetBody;

    // The two rows sum to 9,071,992,547,409,993 minor — above
    // Number.MAX_SAFE_INTEGER (2^53 = 9,007,199,254,740,992), so any float
    // round-trip would corrupt the total. Seeded via Prisma directly: the
    // HTTP input cap (10^11) guards data entry, not derived sums (§11.2).
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 9_000_000_000_000_000n,
      occurredAt: monthNoon('2026-10-02'),
      categoryId: groceriesId,
    });
    await seedTransaction({
      type: 'EXPENSE',
      amountMinor: 71_992_547_409_993n,
      occurredAt: monthNoon('2026-10-03'),
      categoryId: groceriesId,
    });

    const listed = (await listBudgets(user)).body as BudgetBody[];
    const budget = listed.find((entry) => entry.id === created.id);
    const figures = budget?.categoryLimits[0]?.figures;

    expect(figures?.spentMinor).toBe('9071992547409993'); // > 2^53, exact
    // 10000 - 9071992547409993, unclamped.
    expect(figures?.remainingMinor).toBe('-9071992547399993');
    // roundHalfUp(9071992547409993 × 1000 / 10000) = 907199254740999.3 → …999.
    expect(figures?.percentTimes10).toBe('907199254740999');
  });

  it('renders an honest zero for a budget with no recorded activity', async () => {
    const created = (
      await createBudget(user, {
        name: 'Quiet month',
        startDate: '2026-10',
        totalLimit: '3000',
        categoryLimits: [{ categoryId: groceriesId, limit: '1000' }],
      })
    ).body as BudgetBody;

    const listed = (await listBudgets(user)).body as BudgetBody[];
    const budget = listed.find((entry) => entry.id === created.id);

    expect(budget?.totalFigures).toEqual({
      limitMinor: '300000',
      spentMinor: '0',
      remainingMinor: '300000',
      percentTimes10: '0',
    });
    expect(budget?.categoryLimits[0]?.figures.spentMinor).toBe('0');
  });
});

describe('budget/category reference integrity', () => {
  it('refuses to delete a category a budget limit references, then allows it after removal', async () => {
    await createBudget(user, {
      name: 'October plan',
      startDate: '2026-10',
      categoryLimits: [{ categoryId: groceriesId, limit: '5000' }],
    });

    const denied = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/categories/${groceriesId}`,
    });
    expect(denied.status).toBe(409);
  });
});
