import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { startTestApp, type TestApp } from './http-test-app';
import { authed, signUpUser, type TestAccount } from './auth-session';

/**
 * IT-12 minimal audit acceptance against real PostgreSQL (ADR-0011): each
 * approved destructive action writes exactly one same-transaction event,
 * refused actions write none, rows are user-scoped, no financial content or
 * credentials leak into metadata, and there is no public read surface.
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let cashId = '';

function dhakaDate(offsetDays: number): string {
  const instant = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

async function createAccount(account: TestAccount): Promise<string> {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/accounts',
    body: { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '0' },
  });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

async function createTransaction(account: TestAccount, accountId: string, categoryId: string) {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/transactions',
    body: {
      type: 'EXPENSE',
      amount: '42.75',
      occurredDate: dhakaDate(-2),
      accountId,
      categoryId,
      note: 'SENSITIVE NOTE',
    },
  });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
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
  user = await signUpUser(testApp.baseUrl, 'audit');
  cashId = await createAccount(user);
});

describe('audit events', () => {
  it('records transaction deletion with an id but no financial content', async () => {
    const categoryId = (
      await createCategory(prisma, user.userId, {
        name: 'Groceries',
        nameKey: `audit-groceries-${Date.now()}`,
        type: 'EXPENSE',
      })
    ).id;
    const transactionId = await createTransaction(user, cashId, categoryId);

    const response = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/transactions/${transactionId}`,
    });
    expect(response.status).toBe(204);

    const events = await prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: user.userId,
      type: 'TRANSACTION_DELETED',
      resourceType: 'transaction',
      resourceId: transactionId,
      metadata: null,
    });
    // No amount, note, category name, or credential material.
    expect(JSON.stringify(events[0])).not.toContain('42.75');
    expect(JSON.stringify(events[0])).not.toContain('SENSITIVE NOTE');
    expect(JSON.stringify(events[0])).not.toContain('Groceries');
  });

  it('records unreferenced category, budget, and goal deletion; refused deletes write nothing', async () => {
    const category = await createCategory(prisma, user.userId, {
      name: 'Unused category',
      nameKey: `audit-unused-${Date.now()}`,
      type: 'EXPENSE',
    });
    const usedCategory = await createCategory(prisma, user.userId, {
      name: 'Used category',
      nameKey: `audit-used-${Date.now()}`,
      type: 'EXPENSE',
    });
    await createTransaction(user, cashId, usedCategory.id);

    const categoryDelete = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/categories/${category.id}`,
    });
    expect(categoryDelete.status).toBe(204);

    const refusedCategoryDelete = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/categories/${usedCategory.id}`,
    });
    expect(refusedCategoryDelete.status).toBe(409);
    expect(
      await prisma.auditEvent.count({
        where: { resourceId: usedCategory.id, type: 'CATEGORY_DELETED' },
      }),
    ).toBe(0);

    const budget = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/budgets',
      body: {
        name: 'Audit budget',
        startDate: dhakaDate(0).slice(0, 7),
        totalLimit: '100',
        categoryLimits: [{ categoryId: usedCategory.id, limit: '50' }],
      },
    });
    expect(budget.status).toBe(201);
    const budgetId = (budget.body as { id: string }).id;
    expect(
      (
        await authed(testApp.baseUrl, user, {
          method: 'DELETE',
          path: `/api/v1/budgets/${budgetId}`,
        })
      ).status,
    ).toBe(204);

    const goal = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/goals',
      body: { name: 'Audit goal', target: '1000', startDate: dhakaDate(-10) },
    });
    expect(goal.status).toBe(201);
    const goalId = (goal.body as { id: string }).id;
    expect(
      (
        await authed(testApp.baseUrl, user, {
          method: 'DELETE',
          path: `/api/v1/goals/${goalId}`,
        })
      ).status,
    ).toBe(204);

    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'asc' } });
    expect(events.map((event) => event.type)).toEqual([
      'CATEGORY_DELETED',
      'BUDGET_DELETED',
      'GOAL_DELETED',
    ]);
    expect(events.map((event) => event.resourceId)).toEqual([category.id, budgetId, goalId]);
    expect(events.every((event) => event.userId === user.userId)).toBe(true);
  });

  it('never trusts a foreign id: a refused delete writes neither a row nor an event', async () => {
    const other = await signUpUser(testApp.baseUrl, 'audit-other');
    const categoryId = (
      await createCategory(prisma, user.userId, {
        name: 'Private category',
        nameKey: `audit-private-${Date.now()}`,
        type: 'EXPENSE',
      })
    ).id;
    const transactionId = await createTransaction(user, cashId, categoryId);

    const foreign = await authed(testApp.baseUrl, other, {
      method: 'DELETE',
      path: `/api/v1/transactions/${transactionId}`,
    });
    expect(foreign.status).toBe(404);
    expect(await prisma.auditEvent.count()).toBe(0);
    expect(await prisma.transaction.count({ where: { id: transactionId } })).toBe(1);

    // The owner's own delete is recorded against the owner, not the caller id
    // the browser might try to supply.
    const own = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/transactions/${transactionId}`,
    });
    expect(own.status).toBe(204);
    const events = await prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ userId: user.userId, resourceId: transactionId });
  });

  it('keeps audit metadata as an object and exposes no audit API', async () => {
    await expect(
      prisma.auditEvent.create({
        data: {
          userId: user.userId,
          type: 'DATA_EXPORT_REQUESTED',
          metadata: ['not', 'an', 'object'],
        },
      }),
    ).rejects.toThrow();

    for (const path of ['/api/v1/audit', '/api/v1/audit-events', '/api/v1/audit/events']) {
      const response = await authed(testApp.baseUrl, user, { path });
      expect([401, 404]).toContain(response.status);
    }
  });
});
