import { DASHBOARD_WIDGET_IDS } from '@moneyflow/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditService } from '../../src/modules/audit/audit.service';
import { createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';
import { authed, signUpUser, type TestAccount } from './auth-session';

/**
 * IT-12 self-service deletion acceptance against real PostgreSQL (ADR-0011):
 * password verification, explicit confirmation, per-user rate limiting,
 * one-transaction removal of every owned row, session revocation, surviving
 * `USER_ACCOUNT_DELETED` audit data, rollback on failure, and isolation from
 * other users.
 */

const prisma = createTestPrismaClient();
const PASSWORD = 'integration-pass-12';
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

function deleteMe(account: TestAccount, body: unknown) {
  return authed(testApp.baseUrl, account, {
    method: 'DELETE',
    path: '/api/v1/me',
    body,
  });
}

function signIn(email: string, password = PASSWORD) {
  return apiRequest(testApp.baseUrl, {
    method: 'POST',
    path: '/api/v1/auth/sign-in/email',
    body: { email, password },
  });
}

async function seedAccount(account: TestAccount): Promise<string> {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/accounts',
    body: { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '1000.00' },
  });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

async function expenseCategoryId(account: TestAccount): Promise<string> {
  const response = await authed(testApp.baseUrl, account, {
    path: '/api/v1/categories?includeArchived=true',
  });
  expect(response.status).toBe(200);
  const category = (response.body as Array<{ id: string; type: string }>).find(
    (row) => row.type === 'EXPENSE',
  );
  if (!category) {
    throw new Error('Sign-up did not clone a default expense category.');
  }
  return category.id;
}

async function createTransaction(account: TestAccount, accountId: string, categoryId: string) {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/transactions',
    body: {
      type: 'EXPENSE',
      amount: '10',
      occurredDate: dhakaDate(-1),
      accountId,
      categoryId,
      note: 'deletion fixture',
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
  user = await signUpUser(testApp.baseUrl, 'delete');
  cashId = await seedAccount(user);
});

describe('DELETE /api/v1/me', () => {
  it('requires exactly DELETE and a non-empty password without consuming attempts', async () => {
    const cases: unknown[] = [
      { password: PASSWORD },
      { password: PASSWORD, confirmation: 'delete' },
      { password: '', confirmation: 'DELETE' },
      { password: 42, confirmation: 'DELETE' },
      null,
    ];
    for (const body of cases) {
      const response = await deleteMe(user, body);
      expect(response.status).toBe(400);
    }

    // Validation failures never reached the credential/rate-limit path.
    const stillThere = await authed(testApp.baseUrl, user, { path: '/api/v1/me' });
    expect(stillThere.status).toBe(200);
    expect(await prisma.auditEvent.count()).toBe(0);

    // And the correct request afterwards still succeeds.
    expect((await deleteMe(user, { password: PASSWORD, confirmation: 'DELETE' })).status).toBe(204);
  });

  it('rejects a wrong current password generically and rate-limits after five attempts', async () => {
    const originalUser = await prisma.user.count({ where: { id: user.userId } });
    expect(originalUser).toBe(1);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await deleteMe(user, { password: 'wrong-password', confirmation: 'DELETE' });
      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Current password is incorrect.' }),
      );
      expect(JSON.stringify(response.body)).not.toContain(user.email);
    }

    const limited = await deleteMe(user, { password: PASSWORD, confirmation: 'DELETE' });
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({
      message: 'Too many deletion attempts. Try again later.',
    });
    expect(await prisma.user.count({ where: { id: user.userId } })).toBe(1);

    // Another user has an independent budget.
    const other = await signUpUser(testApp.baseUrl, 'delete-other');
    const otherAttempt = await deleteMe(other, {
      password: 'wrong-password',
      confirmation: 'DELETE',
    });
    expect(otherAttempt.status).toBe(401);
  });

  it('removes every owned row, revokes all sessions, and preserves an anonymous audit event', async () => {
    const other = await signUpUser(testApp.baseUrl, 'delete-bystander');
    const otherAccountId = await seedAccount(other);
    const otherCategoryId = await expenseCategoryId(other);
    await createTransaction(other, otherAccountId, otherCategoryId);

    const categoryId = await expenseCategoryId(user);
    const transactionId = await createTransaction(user, cashId, categoryId);

    // A second device session, a verification row, preferences, layout, a
    // budget, a goal ledger row, and an earlier destructive audit event.
    const secondSession = await signIn(user.email);
    expect(secondSession.status).toBe(200);

    await prisma.verification.create({
      data: {
        id: `verification-${Date.now()}`,
        identifier: user.email,
        value: 'hashed-token',
        expiresAt: new Date(Date.now() + 600000),
      },
    });

    const preferences = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: '/api/v1/preferences',
      body: { theme: 'DARK', timezone: 'Asia/Dhaka' },
    });
    expect(preferences.status).toBe(200);

    const layout = await authed(testApp.baseUrl, user, {
      method: 'PUT',
      path: '/api/v1/dashboard/layout',
      body: {
        widgets: DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: id !== 'goals' })),
      },
    });
    expect(layout.status).toBe(200);

    const budget = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/budgets',
      body: {
        name: 'Monthly plan',
        startDate: dhakaDate(0).slice(0, 7),
        categoryLimits: [{ categoryId, limit: '500' }],
      },
    });
    expect(budget.status).toBe(201);

    const goal = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/goals',
      body: {
        name: 'Emergency fund',
        target: '10000',
        startDate: dhakaDate(-30),
      },
    });
    expect(goal.status).toBe(201);
    const goalId = (goal.body as { id: string }).id;
    const contribution = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/goals/${goalId}/contributions`,
      body: { amount: '250', occurredDate: dhakaDate(-2), note: 'first deposit' },
    });
    expect(contribution.status).toBe(201);

    const deletedTransaction = await authed(testApp.baseUrl, user, {
      method: 'DELETE',
      path: `/api/v1/transactions/${transactionId}`,
    });
    expect(deletedTransaction.status).toBe(204);

    // A foreign-looking `userId` must be ignored: the session decides.
    const deleted = await deleteMe(user, {
      password: PASSWORD,
      confirmation: 'DELETE',
      userId: other.userId,
    });
    expect(deleted.status).toBe(204);

    // The old cookie and the second device session can no longer authenticate.
    expect((await authed(testApp.baseUrl, user, { path: '/api/v1/me' })).status).toBe(401);
    const secondCookie = secondSession.setCookie
      .find((value) => value.startsWith('better-auth.session_token='))
      ?.split(';')[0];
    expect(secondCookie).toBeTruthy();
    const secondSessionCheck = await apiRequest(testApp.baseUrl, {
      path: '/api/v1/me',
      cookie: secondCookie,
    });
    expect(secondSessionCheck.status).toBe(401);

    // Credentials are gone, so the same email/password cannot sign in.
    expect((await signIn(user.email)).status).toBe(401);

    expect(await prisma.user.count({ where: { id: user.userId } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.authAccount.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.category.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.budget.count({ where: { userId: user.userId } })).toBe(0);
    expect(
      await prisma.budgetCategoryLimit.count({ where: { budget: { userId: user.userId } } }),
    ).toBe(0);
    expect(await prisma.goal.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.goalContribution.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.userPreference.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.dashboardLayout.count({ where: { userId: user.userId } })).toBe(0);
    expect(await prisma.verification.count({ where: { identifier: user.email } })).toBe(0);

    // Audit rows survive with the actor link nulled, and contain no finances.
    const audit = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'asc' } });
    expect(audit.map((event) => event.type).sort()).toEqual([
      'TRANSACTION_DELETED',
      'USER_ACCOUNT_DELETED',
    ]);
    for (const event of audit) {
      expect(event.userId).toBeNull();
      expect(JSON.stringify(event)).not.toContain('deletion fixture');
      expect(JSON.stringify(event)).not.toContain('250');
    }
    const accountDeleted = audit.find((event) => event.type === 'USER_ACCOUNT_DELETED');
    expect(accountDeleted).toMatchObject({
      resourceType: 'user',
      metadata: { reason: 'self_service' },
    });

    // The bystander's data and audit-free activity are untouched.
    expect(await prisma.user.count({ where: { id: other.userId } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: other.userId } })).toBe(1);
    expect((await authed(testApp.baseUrl, other, { path: '/api/v1/me' })).status).toBe(200);
  });

  it('rolls the whole deletion back when the audit write fails', async () => {
    const categoryId = await expenseCategoryId(user);
    const transactionId = await createTransaction(user, cashId, categoryId);

    const audit = testApp.app.get(AuditService);
    const spy = vi
      .spyOn(audit, 'recordInTransaction')
      .mockRejectedValueOnce(new Error('forced audit failure'));

    const failed = await deleteMe(user, { password: PASSWORD, confirmation: 'DELETE' });
    expect(failed.status).toBe(500);
    spy.mockRestore();

    expect(await prisma.user.count({ where: { id: user.userId } })).toBe(1);
    expect(await prisma.account.count({ where: { userId: user.userId } })).toBe(1);
    expect(
      await prisma.transaction.count({ where: { id: transactionId, userId: user.userId } }),
    ).toBe(1);
    expect(await prisma.session.count({ where: { userId: user.userId } })).toBeGreaterThan(0);
    expect(await prisma.auditEvent.count({ where: { type: 'USER_ACCOUNT_DELETED' } })).toBe(0);
    expect((await authed(testApp.baseUrl, user, { path: '/api/v1/me' })).status).toBe(200);

    // The same request works once the transient failure clears.
    expect((await deleteMe(user, { password: PASSWORD, confirmation: 'DELETE' })).status).toBe(204);
    expect(await prisma.user.count({ where: { id: user.userId } })).toBe(0);
  });
});
