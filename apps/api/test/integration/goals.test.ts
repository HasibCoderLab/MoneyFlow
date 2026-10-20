import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type {
  GoalContributionResponse,
  GoalDetailResponse,
  GoalResponse,
} from '@moneyflow/contracts';

import type { TestAccount } from './auth-session';
import { authed, signUpUser } from './auth-session';
import { createAccount, createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';

/**
 * IT-10 goals acceptance against real PostgreSQL (ADR-0005,
 * requirements.md §5.8/§9, accounting-rules.md §1/§7/§9):
 *
 * - CRUD over HTTP with decimal-string money in and exact minor-unit
 *   strings out, lifecycle transitions, and validation failures;
 * - progress is the exact ledger sum (including reversals), computed on
 *   read, exact beyond `Number.MAX_SAFE_INTEGER`, overfunding unclamped;
 * - contributions are immutable; a second reversal, a reversal-of-a-reversal,
 *   malformed ids, and foreign records are all rejected without leaking
 *   existence;
 * - ledger rows never change account balances, dashboard/period totals, or
 *   budget utilization (the double-counting invariant);
 * - deleting a goal cascades its ledger rows only;
 * - the database CHECK/UNIQUE guards hold even against direct writes.
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let other: TestAccount;

let categoryId = '';

/** Local calendar date in Asia/Dhaka (the MVP default timezone). */
function todayDhaka(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function createGoalViaApi(
  account: TestAccount,
  body: Record<string, unknown> = {},
): Promise<GoalResponse> {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/goals',
    body: {
      name: 'Emergency fund',
      type: 'EMERGENCY_FUND',
      target: '30000.00',
      startDate: '2026-01-01',
      ...body,
    },
  });
  expect(response.status).toBe(201);
  return response.body as GoalResponse;
}

async function addContribution(
  account: TestAccount,
  goalId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: GoalContributionResponse | { message: string } }> {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: `/api/v1/goals/${goalId}/contributions`,
    body,
  });
  return {
    status: response.status,
    body: response.body as GoalContributionResponse | { message: string },
  };
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
  user = await signUpUser(testApp.baseUrl, 'goals');
  other = await signUpUser(testApp.baseUrl, 'goals-other');

  await createAccount(prisma, user.userId, { name: 'Cash' });
  categoryId = (
    await createCategory(prisma, user.userId, {
      name: 'Groceries',
      nameKey: `groceries-${Date.now()}`,
      type: 'EXPENSE',
    })
  ).id;
});

describe('authentication', () => {
  it('protects every goal endpoint', async () => {
    const list = await apiRequest(testApp.baseUrl, { path: '/api/v1/goals' });
    const create = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/goals',
      body: { name: 'x', target: '1', startDate: '2026-01-01' },
    });
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });
});

describe('goal CRUD and validation', () => {
  it('creates a goal with defaults and returns exact minor-unit strings', async () => {
    const response = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/goals',
      body: {
        name: '  New laptop  ',
        target: '48000.50',
        startDate: '2026-10-05',
        deadline: '2027-06-30',
      },
    });

    expect(response.status).toBe(201);
    const goal = response.body as GoalResponse;
    expect(goal).toMatchObject({
      name: 'New laptop',
      type: 'GENERAL',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      currency: 'BDT',
      targetMinor: '4800050',
      startDate: '2026-10-05',
      deadline: '2027-06-30',
    });
    expect(goal.figures).toEqual({
      savedMinor: '0',
      remainingMinor: '4800050',
      percentTimes10: '0',
      overfunded: false,
    });
  });

  it('rejects malformed input with 400 and a safe message', async () => {
    const cases: Array<Record<string, unknown>> = [
      { name: '', target: '100', startDate: '2026-01-01' },
      { name: 'Goal', target: '0', startDate: '2026-01-01' },
      { name: 'Goal', target: '100', startDate: '2026-02-30' },
      { name: 'Goal', target: '100', startDate: '2026-10-10', deadline: '2026-10-09' },
      { name: 'Goal', target: '100', startDate: '2026-01-01', type: 'VACATION' },
      { name: 'Goal', target: '100', startDate: '2026-01-01', targetMinor: '10000' },
    ];
    for (const body of cases) {
      const response = await authed(testApp.baseUrl, user, {
        method: 'POST',
        path: '/api/v1/goals',
        body,
      });
      expect(response.status).toBe(400);
    }
  });

  it('rejects status edits through PATCH and supports plan edits', async () => {
    const goal = await createGoalViaApi(user);

    const statusPatch = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/goals/${goal.id}`,
      body: { status: 'PAUSED' },
    });
    expect(statusPatch.status).toBe(400);

    const patch = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/goals/${goal.id}`,
      body: { name: 'Rainy day fund', target: '45000', deadline: null, priority: 'HIGH' },
    });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({
      name: 'Rainy day fund',
      targetMinor: '4500000',
      deadline: null,
      priority: 'HIGH',
    });

    // Deadline edits are validated against the stored start date.
    const badDeadline = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/goals/${goal.id}`,
      body: { deadline: '2025-12-31' },
    });
    expect(badDeadline.status).toBe(400);
  });

  it('hides archived goals unless asked, and lists priority-first', async () => {
    const low = await createGoalViaApi(user, { name: 'Low', priority: 'LOW' });
    await createGoalViaApi(user, { name: 'High', priority: 'HIGH' });
    await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${low.id}/archive`,
    });

    const activeOnly = await authed(testApp.baseUrl, user, { path: '/api/v1/goals' });
    expect(activeOnly.status).toBe(200);
    const names = (activeOnly.body as GoalResponse[]).map((goal) => goal.name);
    expect(names).toEqual(['High']);

    const withArchived = await authed(testApp.baseUrl, user, {
      path: '/api/v1/goals?includeArchived=true',
    });
    expect((withArchived.body as GoalResponse[]).map((goal) => goal.name)).toEqual(['High', 'Low']);
  });

  it('moves through pause → resume → complete → archive → unarchive', async () => {
    const goal = await createGoalViaApi(user);
    const move = async (action: string) =>
      authed(testApp.baseUrl, user, {
        method: 'POST',
        path: `/api/v1/goals/${goal.id}/${action}`,
      });

    expect((await move('pause')).body).toMatchObject({ status: 'PAUSED' });
    expect((await move('resume')).body).toMatchObject({ status: 'ACTIVE' });
    expect((await move('complete')).body).toMatchObject({ status: 'COMPLETED' });
    // A completed goal cannot be paused directly.
    expect((await move('pause')).status).toBe(409);
    expect((await move('archive')).body).toMatchObject({ status: 'ARCHIVED' });
    expect((await move('complete')).status).toBe(409);
    expect((await move('unarchive')).body).toMatchObject({ status: 'ACTIVE' });
  });

  it('deletes a goal and cascades only its ledger rows', async () => {
    const goal = await createGoalViaApi(user);
    await addContribution(user, goal.id, { amount: '1000', occurredDate: todayDhaka() });
    const keep = await createGoalViaApi(user, { name: 'Keep' });

    const deleted = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/goals/${goal.id}`,
    });
    expect(deleted.status).toBe(204);
    expect(await prisma.goalContribution.count({ where: { goalId: goal.id } })).toBe(0);
    expect(await prisma.goal.count({ where: { id: keep.id } })).toBe(1);

    const missing = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    expect(missing.status).toBe(404);
  });
});

describe('contribution ledger', () => {
  it('sums contributions exactly and tells the truth about overfunding', async () => {
    const goal = await createGoalViaApi(user, { target: '1000' });

    expect((await addContribution(user, goal.id, { amount: '700' })).status).toBe(201);
    expect((await addContribution(user, goal.id, { amount: '500.50' })).status).toBe(201);

    const detail = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    expect(detail.status).toBe(200);
    const body = detail.body as GoalDetailResponse;
    expect(body.figures).toEqual({
      savedMinor: '120050',
      remainingMinor: '-20050',
      percentTimes10: '1201', // 120.05% → one-decimal half-up
      overfunded: true,
    });
    expect(body.contributions).toHaveLength(2);
  });

  it('keeps progress exact beyond Number.MAX_SAFE_INTEGER', async () => {
    // ৳1,000,000,000.00 = the largest accepted input (10^11 minor units).
    const goal = await createGoalViaApi(user, { target: '1000000000.00' });
    // Seeded directly: the HTTP input cap (৳1B per amount) would need ~90k
    // rows to reach this magnitude, and the read path is what must stay exact.
    await prisma.goalContribution.createMany({
      data: [
        {
          userId: user.userId,
          goalId: goal.id,
          amountMinor: 9_000_000_000_000_000n,
          occurredAt: new Date('2026-10-01T00:00:00.000Z'),
        },
        {
          userId: user.userId,
          goalId: goal.id,
          amountMinor: 9_007_199_254_740_993n,
          occurredAt: new Date('2026-10-02T00:00:00.000Z'),
        },
      ],
    });

    const detail = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    const figures = (detail.body as GoalDetailResponse).figures;
    expect(figures.savedMinor).toBe('18007199254740993');
    expect(figures.remainingMinor).toBe('-18007099254740993');
    expect(figures.overfunded).toBe(true);
  });

  it('appends a linked reversal and keeps both rows in history', async () => {
    const goal = await createGoalViaApi(user, { target: '1000' });
    const added = await addContribution(user, goal.id, {
      amount: '800',
      occurredDate: todayDhaka(),
      note: 'salary leftover',
    });
    const contribution = added.body as GoalContributionResponse;

    const reversed = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`,
      body: {},
    });
    expect(reversed.status).toBe(200);
    expect(reversed.body).toMatchObject({
      amountMinor: '-80000',
      reversesContributionId: contribution.id,
      reversedByContributionId: null,
    });

    const detail = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    const body = detail.body as GoalDetailResponse;
    expect(body.figures.savedMinor).toBe('0');
    expect(body.contributions).toHaveLength(2);
    const original = body.contributions.find((row) => row.id === contribution.id);
    expect(original).toMatchObject({
      amountMinor: '80000',
      reversedByContributionId: (reversed.body as GoalContributionResponse).id,
    });
  });

  it('rejects a duplicate reversal and a reversal of a reversal', async () => {
    const goal = await createGoalViaApi(user);
    const contribution = (await addContribution(user, goal.id, { amount: '500' }))
      .body as GoalContributionResponse;

    const first = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`,
      body: {},
    });
    const reversal = first.body as GoalContributionResponse;

    const second = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`,
      body: {},
    });
    expect(second.status).toBe(409);

    const reversalOfReversal = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/contributions/${reversal.id}/reverse`,
      body: {},
    });
    expect(reversalOfReversal.status).toBe(409);

    // A single reversal exists; nothing was appended by the rejected calls.
    const rows = await prisma.goalContribution.findMany({ where: { goalId: goal.id } });
    expect(rows).toHaveLength(2);
  });

  it('lets only one of two concurrent reversals succeed', async () => {
    const goal = await createGoalViaApi(user);
    const contribution = (await addContribution(user, goal.id, { amount: '750' }))
      .body as GoalContributionResponse;
    const path = `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`;

    // Both requests race on the real database: the goal row lock serializes
    // them, and the UNIQUE reversal index is the final guard.
    const results = await Promise.all([
      authed(testApp.baseUrl, user, { method: 'POST', path, body: {} }),
      authed(testApp.baseUrl, user, { method: 'POST', path, body: {} }),
    ]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);

    const reversals = await prisma.goalContribution.count({
      where: { reversesContributionId: contribution.id },
    });
    expect(reversals).toBe(1);

    const detail = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    expect((detail.body as GoalDetailResponse).figures.savedMinor).toBe('0');
  });

  it('rejects bad amounts, future dates, and contributions to non-active goals', async () => {
    const goal = await createGoalViaApi(user);

    expect((await addContribution(user, goal.id, { amount: '0' })).status).toBe(400);
    expect((await addContribution(user, goal.id, { amount: '-5' })).status).toBe(400);
    expect((await addContribution(user, goal.id, { amount: '1000000000.01' })).status).toBe(400);
    expect(
      (await addContribution(user, goal.id, { amount: '10', occurredDate: '2099-01-01' })).status,
    ).toBe(400);
    expect((await addContribution(user, goal.id, { amount: '10', extra: true })).status).toBe(400);

    await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/pause`,
    });
    expect((await addContribution(user, goal.id, { amount: '10' })).status).toBe(409);
  });

  it('lets a reversal correct a paused goal but never edits history', async () => {
    const goal = await createGoalViaApi(user);
    const contribution = (await addContribution(user, goal.id, { amount: '250' }))
      .body as GoalContributionResponse;
    await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/pause`,
    });

    const reversed = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`,
      body: {},
    });
    expect(reversed.status).toBe(200);
    expect((await addContribution(user, goal.id, { amount: '10' })).status).toBe(409);
  });
});

describe('authorization and isolation', () => {
  it('returns 404 for another user’s goal and contributions', async () => {
    const goal = await createGoalViaApi(user);
    const contribution = (await addContribution(user, goal.id, { amount: '100' }))
      .body as GoalContributionResponse;

    for (const path of [
      `/api/v1/goals/${goal.id}`,
      `/api/v1/goals/${goal.id}/contributions`,
      `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`,
    ]) {
      const response = await authed(testApp.baseUrl, other, {
        method: path.endsWith('/reverse') ? 'POST' : 'GET',
        path,
        body: path.endsWith('/reverse') ? {} : undefined,
      });
      expect(response.status).toBe(404);
    }

    const otherPatch = await authed(testApp.baseUrl, other, {
      method: 'PATCH',
      path: `/api/v1/goals/${goal.id}`,
      body: { name: 'Stolen' },
    });
    expect(otherPatch.status).toBe(404);

    const otherDelete = await authed(testApp.baseUrl, other, {
      method: 'DELETE',
      path: `/api/v1/goals/${goal.id}`,
    });
    expect(otherDelete.status).toBe(404);

    // The owner’s data is untouched.
    const detail = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    expect(detail.status).toBe(200);
    expect((detail.body as GoalDetailResponse).name).toBe('Emergency fund');
  });

  it('treats malformed ids as not found', async () => {
    const response = await authed(testApp.baseUrl, user, { path: '/api/v1/goals/not-a-uuid' });
    expect(response.status).toBe(404);
  });

  it('never lists another user’s goals', async () => {
    await createGoalViaApi(user);
    const otherList = await authed(testApp.baseUrl, other, { path: '/api/v1/goals' });
    expect(otherList.body).toEqual([]);
  });
});

describe('double-counting invariant', () => {
  it('never changes balances, period totals, or budget utilization', async () => {
    const goalsMonth = todayDhaka().slice(0, 7);

    const account = await createAccount(prisma, user.userId, { name: 'Wallet' });
    await prisma.transaction.create({
      data: {
        userId: user.userId,
        type: 'EXPENSE',
        amountMinor: 25_000n,
        currency: 'BDT',
        occurredAt: new Date(),
        accountId: account.id,
        categoryId,
      },
    });

    const budget = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/budgets',
      body: { name: 'Monthly plan', startDate: goalsMonth, totalLimit: '1000' },
    });
    expect(budget.status).toBe(201);

    const snapshot = async () => {
      const dashboard = await authed(testApp.baseUrl, user, { path: '/api/v1/dashboard' });
      const accounts = await authed(testApp.baseUrl, user, { path: '/api/v1/accounts' });
      const budgets = await authed(testApp.baseUrl, user, { path: '/api/v1/budgets' });
      const accountRows = accounts.body as Array<{ id: string; balanceMinor: string }>;
      const budgetRows = budgets.body as Array<{
        totalFigures: { spentMinor: string; remainingMinor: string } | null;
      }>;
      const dashboardBody = dashboard.body as {
        totalTrackedBalanceMinor: string;
        totals: { incomeMinor: string; expenseMinor: string; transactionCount: number };
      };
      return {
        balance: accountRows.find((row) => row.id === account.id)?.balanceMinor,
        tracked: dashboardBody.totalTrackedBalanceMinor,
        totals: dashboardBody.totals,
        spent: budgetRows[0]?.totalFigures?.spentMinor,
        remaining: budgetRows[0]?.totalFigures?.remainingMinor,
      };
    };

    const before = await snapshot();
    expect(before.spent).toBe('25000');
    expect(before.balance).toBe('-25000');
    expect(before.totals.expenseMinor).toBe('25000');

    const goal = await createGoalViaApi(user, { target: '1000' });
    const contribution = (await addContribution(user, goal.id, { amount: '800' }))
      .body as GoalContributionResponse;
    await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goal.id}/contributions/${contribution.id}/reverse`,
      body: {},
    });
    await addContribution(user, goal.id, { amount: '300' });

    const after = await snapshot();
    expect(after).toEqual(before);

    const detail = await authed(testApp.baseUrl, user, { path: `/api/v1/goals/${goal.id}` });
    expect((detail.body as GoalDetailResponse).figures.savedMinor).toBe('30000');
  });
});

describe('database guards', () => {
  it('rejects invalid ledger rows even on direct writes', async () => {
    const goal = await createGoalViaApi(user);
    const base = {
      userId: user.userId,
      goalId: goal.id,
      occurredAt: new Date(),
    };

    // Zero and unsigned-negative contributions violate the sign CHECK.
    await expect(
      prisma.goalContribution.create({ data: { ...base, amountMinor: 0n } }),
    ).rejects.toThrow();
    await expect(
      prisma.goalContribution.create({ data: { ...base, amountMinor: -500n } }),
    ).rejects.toThrow();

    // A reversal needs a link, and the link must be unique.
    const original = await prisma.goalContribution.create({
      data: { ...base, amountMinor: 500n },
    });
    await prisma.goalContribution.create({
      data: { ...base, amountMinor: -500n, reversesContributionId: original.id },
    });
    await expect(
      prisma.goalContribution.create({
        data: { ...base, amountMinor: -500n, reversesContributionId: original.id },
      }),
    ).rejects.toThrow();

    // A goal target must be positive.
    await expect(
      prisma.goal.update({ where: { id: goal.id }, data: { targetMinor: 0n } }),
    ).rejects.toThrow();
  });
});
