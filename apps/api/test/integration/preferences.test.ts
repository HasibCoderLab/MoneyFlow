import { DEFAULT_USER_PREFERENCES } from '@moneyflow/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TestAccount } from './auth-session';
import { authed, signUpUser } from './auth-session';
import { createAccount, createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';

/**
 * IT-11 preferences acceptance against real PostgreSQL (requirements.md
 * §5.2/§5.7, ADR-0010): documented defaults without a row, partial upserts,
 * strict validation, session-scoped isolation, and the effect of timezone /
 * week-start preferences on reporting and budget boundaries without changing
 * any recorded financial data.
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let other: TestAccount;

let accountId = '';
let salaryId = '';
let groceriesId = '';

interface DashboardBody {
  totals: { incomeMinor: string; expenseMinor: string };
  totalTrackedBalanceMinor: string;
}

interface ReportBody {
  weekStartsOn: string | null;
  series: Array<{ startDate: string; endDate: string; incomeMinor: string }>;
}

interface BudgetBody {
  id: string;
  totalFigures: { spentMinor: string } | null;
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
  user = await signUpUser(testApp.baseUrl, 'preferences');
  other = await signUpUser(testApp.baseUrl, 'preferences-other');

  accountId = (await createAccount(prisma, user.userId, { name: 'Cash', openingBalanceMinor: 0n }))
    .id;
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
});

function getPreferences(account: TestAccount) {
  return authed(testApp.baseUrl, account, { path: '/api/v1/preferences' });
}

function patchPreferences(account: TestAccount, body: unknown) {
  return authed(testApp.baseUrl, account, {
    method: 'PATCH',
    path: '/api/v1/preferences',
    body,
  });
}

async function seedRows() {
  // 2026-02-09 is a Monday. This income falls on the same date in both zones.
  await prisma.transaction.create({
    data: {
      userId: user.userId,
      type: 'INCOME',
      amountMinor: 500000n,
      currency: 'BDT',
      occurredAt: new Date('2026-02-09T06:00:00.000Z'),
      accountId,
      categoryId: salaryId,
    },
  });
  // 18:30Z on 28 Feb is already 1 Mar in Asia/Dhaka (UTC+6), but still
  // 28 Feb in UTC. It proves the preference moves period boundaries only.
  await prisma.transaction.create({
    data: {
      userId: user.userId,
      type: 'EXPENSE',
      amountMinor: 100000n,
      currency: 'BDT',
      occurredAt: new Date('2026-02-28T18:30:00.000Z'),
      accountId,
      categoryId: groceriesId,
    },
  });

  const budget = await authed(testApp.baseUrl, user, {
    method: 'POST',
    path: '/api/v1/budgets',
    body: { name: 'February plan', startDate: '2026-02-01', totalLimit: '10000' },
  });
  expect(budget.status).toBe(201);
}

async function dashboard() {
  const response = await authed(testApp.baseUrl, user, {
    path: '/api/v1/dashboard?dateFrom=2026-02-01&dateTo=2026-02-28',
  });
  expect(response.status).toBe(200);
  return response.body as DashboardBody;
}

async function weeklyReport() {
  const response = await authed(testApp.baseUrl, user, {
    path: '/api/v1/reports/summary?granularity=weekly&dateFrom=2026-02-01&dateTo=2026-02-28',
  });
  expect(response.status).toBe(200);
  return response.body as ReportBody;
}

async function budgets() {
  const response = await authed(testApp.baseUrl, user, { path: '/api/v1/budgets' });
  expect(response.status).toBe(200);
  return response.body as BudgetBody[];
}

describe('GET /api/v1/preferences', () => {
  it('returns the documented defaults without writing a row', async () => {
    const response = await getPreferences(user);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...DEFAULT_USER_PREFERENCES, updatedAt: null });
    expect(await prisma.userPreference.count()).toBe(0);
  });

  it('requires a session', async () => {
    const response = await apiRequest(testApp.baseUrl, { path: '/api/v1/preferences' });
    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/v1/preferences', () => {
  it('upserts partial updates and keeps omitted fields', async () => {
    const first = await patchPreferences(user, { locale: 'bn', theme: 'DARK' });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      locale: 'bn',
      theme: 'DARK',
      timezone: DEFAULT_USER_PREFERENCES.timezone,
      weekStartsOn: DEFAULT_USER_PREFERENCES.weekStartsOn,
      currency: 'BDT',
    });

    const second = await patchPreferences(user, { theme: 'SYSTEM' });
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ locale: 'bn', theme: 'SYSTEM' });

    const saved = await prisma.userPreference.findUnique({ where: { userId: user.userId } });
    expect(saved?.locale).toBe('BN');
    expect(saved?.theme).toBe('SYSTEM');
    expect(saved?.timezone).toBe('Asia/Dhaka');
    expect(await prisma.userPreference.count()).toBe(1);
  });

  it('rejects unknown fields, invalid values, and unsupported currencies', async () => {
    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [{ userId: other.userId }, /Unknown field "userId"/],
      [{ theme: 'NEON' }, /"theme" must be one of/],
      [{ timezone: 'Mars/Olympus' }, /valid IANA timezone/],
      [{ currency: 'USD' }, /"currency" must be "BDT"/],
      [{}, /at least one preference/i],
    ];
    for (const [body, message] of cases) {
      const response = await patchPreferences(user, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((response.body as { message?: string }).message ?? '').toMatch(message);
    }
    expect(await prisma.userPreference.count()).toBe(0);
  });

  it('cannot read or write another user’s preferences', async () => {
    const own = await patchPreferences(user, { locale: 'bn', timezone: 'UTC' });
    expect(own.status).toBe(200);

    const otherRead = await getPreferences(other);
    expect(otherRead.status).toBe(200);
    expect(otherRead.body).toEqual({ ...DEFAULT_USER_PREFERENCES, updatedAt: null });

    const otherWrite = await patchPreferences(other, { locale: 'en', theme: 'DARK' });
    expect(otherWrite.status).toBe(200);

    const userRead = await getPreferences(user);
    expect(userRead.body).toMatchObject({ locale: 'bn', timezone: 'UTC', theme: 'LIGHT' });
    expect(await prisma.userPreference.count()).toBe(2);
  });
});

describe('preference effects on reporting (no financial mutation)', () => {
  it('uses the saved timezone for dashboard and budget boundaries', async () => {
    await seedRows();

    // Default Asia/Dhaka: the income is inside February, while the 28 Feb
    // 18:30Z expense has already crossed into 1 March and is excluded.
    const before = await dashboard();
    expect(before.totals.incomeMinor).toBe('500000');
    expect(before.totals.expenseMinor).toBe('0');
    expect((await budgets())[0]?.totalFigures?.spentMinor).toBe('0');

    const patched = await patchPreferences(user, { timezone: 'UTC' });
    expect(patched.status).toBe(200);

    const after = await dashboard();
    expect(after.totals.incomeMinor).toBe('500000');
    expect(after.totals.expenseMinor).toBe('100000');
    expect((await budgets())[0]?.totalFigures?.spentMinor).toBe('100000');

    // Preferences never write financial rows: still two seeded transactions.
    expect(await prisma.transaction.count()).toBe(2);
    expect(
      (await prisma.account.findUnique({ where: { id: accountId } }))?.openingBalanceMinor,
    ).toBe(0n);
  });

  it('uses the saved week start for weekly report buckets', async () => {
    await seedRows();

    const saturday = await weeklyReport();
    expect(saturday.weekStartsOn).toBe('SATURDAY');
    expect(saturday.series.find((bucket) => bucket.incomeMinor === '500000')?.startDate).toBe(
      '2026-02-07',
    );

    const patched = await patchPreferences(user, { weekStartsOn: 'MONDAY', timezone: 'UTC' });
    expect(patched.status).toBe(200);

    const monday = await weeklyReport();
    expect(monday.weekStartsOn).toBe('MONDAY');
    expect(monday.series.find((bucket) => bucket.incomeMinor === '500000')?.startDate).toBe(
      '2026-02-09',
    );
  });

  it('keeps an explicit query timezone ahead of the stored preference', async () => {
    await seedRows();
    await patchPreferences(user, { timezone: 'UTC' });

    const response = await authed(testApp.baseUrl, user, {
      path: '/api/v1/dashboard?dateFrom=2026-02-01&dateTo=2026-02-28&timezone=Asia%2FDhaka',
    });
    expect(response.status).toBe(200);
    // The stored UTC preference would include the late-February expense, but
    // the explicit Dhaka query moves it into March and must win.
    expect((response.body as DashboardBody).totals.incomeMinor).toBe('500000');
    expect((response.body as DashboardBody).totals.expenseMinor).toBe('0');
  });
});
