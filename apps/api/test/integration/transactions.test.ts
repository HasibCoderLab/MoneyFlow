import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';
import { authed, signUpUser, type TestAccount } from './auth-session';

/**
 * IT-4/IT-6/IT-7 transactions acceptance against real PostgreSQL: the
 * accounting-rules.md §8 worked example executed over HTTP, idempotency
 * replay, the full validation matrix, edit/delete consistency, list
 * filtering/pagination, and cross-user isolation. Single-row transfer
 * atomicity and the type-shape CHECK constraints are database-enforced.
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let cashId = '';
let bankId = '';
let salaryId = '';
let groceriesId = '';

/** Local `YYYY-MM-DD` in Asia/Dhaka, offset from today (never a real date). */
function dhakaDate(offsetDays: number): string {
  const instant = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
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
  user = await signUpUser(testApp.baseUrl, 'transactions');

  const cash = await authed(testApp.baseUrl, user, {
    method: 'POST',
    path: '/api/v1/accounts',
    body: { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '10000.00' },
  });
  cashId = (cash.body as { id: string }).id;
  const bank = await authed(testApp.baseUrl, user, {
    method: 'POST',
    path: '/api/v1/accounts',
    body: { name: 'Bank', type: 'BANK', currency: 'BDT', openingBalance: '0.00' },
  });
  bankId = (bank.body as { id: string }).id;

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
    })
  ).id;
});

function postTransaction(body: Record<string, unknown>, key?: string, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/transactions',
    body,
    headers: key ? { 'idempotency-key': key } : undefined,
  });
}

async function balanceOf(accountId: string): Promise<string> {
  const response = await authed(testApp.baseUrl, user, {
    path: `/api/v1/accounts/${accountId}`,
  });
  expect(response.status).toBe(200);
  return (response.body as { balanceMinor: string }).balanceMinor;
}

describe('worked example over HTTP (accounting-rules.md §8)', () => {
  it('derives Cash 2275000 and Bank 200000 from persisted rows', async () => {
    const day = dhakaDate(-10);
    const income = await postTransaction({
      type: 'INCOME',
      amount: '18000',
      occurredDate: day,
      accountId: cashId,
      categoryId: salaryId,
    });
    expect(income.status).toBe(201);
    expect(income.body).toMatchObject({ amountMinor: '1800000', currency: 'BDT' });

    const expense = await postTransaction({
      type: 'EXPENSE',
      amount: '3200',
      occurredDate: day,
      accountId: cashId,
      categoryId: groceriesId,
    });
    expect(expense.status).toBe(201);

    const transfer = await postTransaction({
      type: 'TRANSFER',
      amount: '2000',
      occurredDate: day,
      fromAccountId: cashId,
      toAccountId: bankId,
    });
    expect(transfer.status).toBe(201);
    expect(transfer.body).toMatchObject({ categoryId: null });

    const adjustment = await postTransaction({
      type: 'ADJUSTMENT',
      amount: '50',
      occurredDate: day,
      accountId: cashId,
      direction: 'DECREASE',
      note: 'Cash count correction',
    });
    expect(adjustment.status).toBe(201);
    expect(adjustment.body).toMatchObject({ adjustmentSign: -1 });

    expect(await balanceOf(cashId)).toBe('2275000');
    expect(await balanceOf(bankId)).toBe('200000');
  });
});

describe('idempotency', () => {
  it('replays the stored row for a repeated key without duplicating', async () => {
    const first = await postTransaction(
      {
        type: 'EXPENSE',
        amount: '100',
        occurredDate: dhakaDate(-5),
        accountId: cashId,
        categoryId: groceriesId,
      },
      'expense-retry-1',
    );
    expect(first.status).toBe(201);
    const id = (first.body as { id: string }).id;

    const replay = await postTransaction(
      {
        type: 'EXPENSE',
        amount: '999',
        occurredDate: dhakaDate(-5),
        accountId: cashId,
        categoryId: groceriesId,
      },
      'expense-retry-1',
    );
    expect(replay.status).toBe(200);
    expect((replay.body as { id: string }).id).toBe(id);
    expect((replay.body as { amountMinor: string }).amountMinor).toBe('10000');
  });
});

describe('validation matrix', () => {
  it('rejects invalid shapes, references, and future dates with 400', async () => {
    const other = await signUpUser(testApp.baseUrl, 'transactions-foreign');
    const foreignCash = await authed(testApp.baseUrl, other, {
      method: 'POST',
      path: '/api/v1/accounts',
      body: { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '0' },
    });
    const foreignCashId = (foreignCash.body as { id: string }).id;

    // Archive the bank: new activity must refuse it, history stays readable.
    await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/accounts/${bankId}/archive`,
    });

    const day = dhakaDate(-5);
    const cases: Record<string, unknown>[] = [
      {
        type: 'EXPENSE',
        amount: '0',
        occurredDate: day,
        accountId: cashId,
        categoryId: groceriesId,
      },
      {
        type: 'EXPENSE',
        amount: '1.234',
        occurredDate: day,
        accountId: cashId,
        categoryId: groceriesId,
      },
      {
        type: 'EXPENSE',
        amount: '10',
        occurredDate: dhakaDate(2),
        accountId: cashId,
        categoryId: groceriesId,
      },
      {
        type: 'TRANSFER',
        amount: '10',
        occurredDate: day,
        fromAccountId: cashId,
        toAccountId: cashId,
      },
      {
        type: 'TRANSFER',
        amount: '10',
        occurredDate: day,
        fromAccountId: cashId,
        toAccountId: bankId,
      },
      { type: 'INCOME', amount: '10', occurredDate: day, accountId: bankId, categoryId: salaryId },
      {
        type: 'INCOME',
        amount: '10',
        occurredDate: day,
        accountId: foreignCashId,
        categoryId: salaryId,
      },
      {
        type: 'INCOME',
        amount: '10',
        occurredDate: day,
        accountId: cashId,
        categoryId: groceriesId,
      },
      {
        type: 'TRANSFER',
        amount: '10',
        occurredDate: day,
        fromAccountId: cashId,
        toAccountId: bankId,
        categoryId: groceriesId,
      },
      {
        type: 'ADJUSTMENT',
        amount: '10',
        occurredDate: day,
        accountId: cashId,
        direction: 'DECREASE',
      },
    ];
    for (const body of cases) {
      const response = await postTransaction(body);
      expect(response.status).toBe(400);
    }
  });

  it('requires authentication and answers 404 for foreign rows', async () => {
    const created = await postTransaction({
      type: 'INCOME',
      amount: '10',
      occurredDate: dhakaDate(-5),
      accountId: cashId,
      categoryId: salaryId,
    });
    const id = (created.body as { id: string }).id;
    const other = await signUpUser(testApp.baseUrl, 'transactions-reader');

    const anonymous = await apiRequest(testApp.baseUrl, {
      path: `/api/v1/transactions/${id}`,
    });
    expect(anonymous.status).toBe(401);

    const foreign = await authed(testApp.baseUrl, other, {
      path: `/api/v1/transactions/${id}`,
    });
    expect(foreign.status).toBe(404);

    const list = await authed(testApp.baseUrl, other, { path: '/api/v1/transactions' });
    expect(list.body).toMatchObject({ items: [], total: 0 });
  });
});

describe('edit and delete consistency', () => {
  it('re-derives balances after edits and deletes; type is immutable', async () => {
    const day = dhakaDate(-10);
    await postTransaction({
      type: 'INCOME',
      amount: '18000',
      occurredDate: day,
      accountId: cashId,
      categoryId: salaryId,
    });
    const expense = await postTransaction({
      type: 'EXPENSE',
      amount: '3200',
      occurredDate: day,
      accountId: cashId,
      categoryId: groceriesId,
    });
    const expenseId = (expense.body as { id: string }).id;
    await postTransaction({
      type: 'TRANSFER',
      amount: '2000',
      occurredDate: day,
      fromAccountId: cashId,
      toAccountId: bankId,
    });
    await postTransaction({
      type: 'ADJUSTMENT',
      amount: '50',
      occurredDate: day,
      accountId: cashId,
      direction: 'DECREASE',
      note: 'Cash count correction',
    });
    expect(await balanceOf(cashId)).toBe('2275000');

    const edited = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/transactions/${expenseId}`,
      body: {
        amount: '1000',
        occurredDate: day,
        accountId: cashId,
        categoryId: groceriesId,
      },
    });
    expect(edited.status).toBe(200);
    expect(await balanceOf(cashId)).toBe('2495000');

    const typeChange = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/transactions/${expenseId}`,
      body: {
        type: 'INCOME',
        amount: '1000',
        occurredDate: day,
        accountId: cashId,
        categoryId: salaryId,
      },
    });
    expect(typeChange.status).toBe(400);

    const deleted = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/transactions/${expenseId}`,
    });
    expect(deleted.status).toBe(204);
    expect(await balanceOf(cashId)).toBe('2595000');

    const missing = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/transactions/${expenseId}`,
    });
    expect(missing.status).toBe(404);
  });
});

describe('listing', () => {
  it('filters, orders stably, and paginates with totals', async () => {
    const day = dhakaDate(-20);
    for (const amount of ['10', '20', '30']) {
      await postTransaction({
        type: 'EXPENSE',
        amount,
        occurredDate: day,
        accountId: cashId,
        categoryId: groceriesId,
      });
    }
    await postTransaction({
      type: 'INCOME',
      amount: '100',
      occurredDate: dhakaDate(-2),
      accountId: cashId,
      categoryId: salaryId,
    });

    const incomeOnly = await authed(testApp.baseUrl, user, {
      path: '/api/v1/transactions?type=INCOME',
    });
    expect(incomeOnly.body).toMatchObject({ total: 1 });

    const windowed = await authed(testApp.baseUrl, user, {
      path: `/api/v1/transactions?dateFrom=${dhakaDate(-30)}&dateTo=${dhakaDate(-10)}`,
    });
    expect((windowed.body as { total: number }).total).toBe(3);

    const first = await authed(testApp.baseUrl, user, {
      path: '/api/v1/transactions?limit=2&offset=0',
    });
    const firstBody = first.body as { items: unknown[]; nextOffset: number | null; total: number };
    expect(firstBody.items).toHaveLength(2);
    expect(firstBody.nextOffset).toBe(2);
    expect(firstBody.total).toBe(4);

    const last = await authed(testApp.baseUrl, user, {
      path: '/api/v1/transactions?limit=2&offset=2',
    });
    const lastBody = last.body as { items: unknown[]; nextOffset: number | null };
    expect(lastBody.items).toHaveLength(2);
    expect(lastBody.nextOffset).toBeNull();

    const badLimit = await authed(testApp.baseUrl, user, {
      path: '/api/v1/transactions?limit=500',
    });
    expect(badLimit.status).toBe(400);
  });
});
