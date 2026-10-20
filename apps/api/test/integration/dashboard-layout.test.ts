import { DASHBOARD_WIDGET_IDS, type DashboardWidgetPreference } from '@moneyflow/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TestAccount } from './auth-session';
import { authed, signUpUser } from './auth-session';
import { createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';

/**
 * IT-11 dashboard layout acceptance against real PostgreSQL (requirements.md
 * §5.6/§5.7, ADR-0010): documented default, strict full-layout writes,
 * persistence, reset, defensive recovery from stale rows, session-scoped
 * isolation, and presentation-only behavior (no financial mutations).
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let other: TestAccount;

interface LayoutBody {
  widgets: DashboardWidgetPreference[];
  isDefault: boolean;
  updatedAt: string | null;
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
  user = await signUpUser(testApp.baseUrl, 'layout');
  other = await signUpUser(testApp.baseUrl, 'layout-other');
});

function widgets(
  visible: Partial<Record<(typeof DASHBOARD_WIDGET_IDS)[number], boolean>> = {},
): DashboardWidgetPreference[] {
  return DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: visible[id] ?? true }));
}

function defaultWidgets(): DashboardWidgetPreference[] {
  return widgets();
}

function getLayout(account: TestAccount) {
  return authed(testApp.baseUrl, account, { path: '/api/v1/dashboard/layout' });
}

function putLayout(account: TestAccount, body: unknown) {
  return authed(testApp.baseUrl, account, {
    method: 'PUT',
    path: '/api/v1/dashboard/layout',
    body,
  });
}

function resetLayout(account: TestAccount) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/dashboard/layout/reset',
    body: {},
  });
}

describe('GET /api/v1/dashboard/layout', () => {
  it('returns the documented default without writing a row', async () => {
    const response = await getLayout(user);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      widgets: defaultWidgets(),
      isDefault: true,
      updatedAt: null,
    });
    expect(await prisma.dashboardLayout.count()).toBe(0);
  });

  it('requires a session', async () => {
    const response = await apiRequest(testApp.baseUrl, { path: '/api/v1/dashboard/layout' });
    expect(response.status).toBe(401);
  });
});

describe('PUT /api/v1/dashboard/layout', () => {
  it('persists a reordered layout with hidden widgets and reads it back', async () => {
    const saved = [
      { id: 'recentTransactions', visible: false },
      { id: 'totalBalance', visible: true },
      { id: 'goals', visible: false },
      { id: 'income', visible: true },
      { id: 'expense', visible: true },
      { id: 'spendingByCategory', visible: true },
      { id: 'budgets', visible: true },
    ] satisfies DashboardWidgetPreference[];

    const put = await putLayout(user, { widgets: saved });
    expect(put.status).toBe(200);
    const putBody = put.body as LayoutBody;
    expect(putBody.widgets).toEqual(saved);
    expect(putBody.isDefault).toBe(false);
    expect(typeof putBody.updatedAt).toBe('string');

    const get = await getLayout(user);
    expect(get.status).toBe(200);
    expect((get.body as LayoutBody).widgets).toEqual(saved);
    expect((get.body as LayoutBody).isDefault).toBe(false);

    const row = await prisma.dashboardLayout.findUnique({ where: { userId: user.userId } });
    expect(row?.layout).toEqual({ version: 1, widgets: saved });
  });

  it('replaces the previous layout instead of accumulating rows', async () => {
    const first = widgets({ goals: false });
    const second = [...widgets({ income: false })].reverse();

    expect((await putLayout(user, { widgets: first })).status).toBe(200);
    expect((await putLayout(user, { widgets: second })).status).toBe(200);

    expect(await prisma.dashboardLayout.count()).toBe(1);
    expect((await getLayout(user)).body).toMatchObject({ widgets: second });
  });

  it('rejects partial, duplicate, unknown, and malformed widgets without writing', async () => {
    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [{ widgets: widgets().slice(0, 3) }, /every supported widget exactly once/],
      [
        {
          widgets: [...widgets().slice(0, 6), { id: 'income', visible: true }],
        },
        /appears more than once/,
      ],
      [
        {
          widgets: [...widgets().slice(0, 6), { id: 'crypto', visible: true }],
        },
        /not a supported dashboard widget/,
      ],
      [{ widgets: widgets(), userId: other.userId }, /Unknown field "userId"/],
      [
        {
          widgets: widgets().map((entry, index) => (index === 0 ? { ...entry, height: 2 } : entry)),
        },
        /Unknown field "widgets\[0\]\.height"/,
      ],
      [
        {
          widgets: widgets().map((entry, index) =>
            index === 0 ? { id: entry.id, visible: 'yes' } : entry,
          ),
        },
        /visible" must be a boolean/,
      ],
      [{ widgets: 'all' }, /must be an array/],
      [{}, /must be an array/],
    ];

    for (const [body, message] of cases) {
      const response = await putLayout(user, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((response.body as { message?: string }).message ?? '').toMatch(message);
    }
    expect(await prisma.dashboardLayout.count()).toBe(0);
  });

  it('cannot read or overwrite another user’s layout', async () => {
    const mine = widgets({ goals: false });
    const theirs = [...widgets({ income: false })].reverse();
    expect((await putLayout(user, { widgets: mine })).status).toBe(200);

    const otherRead = await getLayout(other);
    expect(otherRead.status).toBe(200);
    expect(otherRead.body).toEqual({
      widgets: defaultWidgets(),
      isDefault: true,
      updatedAt: null,
    });

    expect((await putLayout(other, { widgets: theirs })).status).toBe(200);

    expect((await getLayout(user)).body).toMatchObject({ widgets: mine });
    expect((await getLayout(other)).body).toMatchObject({ widgets: theirs });
    expect(await prisma.dashboardLayout.count()).toBe(2);
  });
});

describe('POST /api/v1/dashboard/layout/reset', () => {
  it('deletes the saved row and returns the documented default', async () => {
    expect((await putLayout(user, { widgets: widgets({ expense: false }) })).status).toBe(200);

    const reset = await resetLayout(user);
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({
      widgets: defaultWidgets(),
      isDefault: true,
      updatedAt: null,
    });
    expect(await prisma.dashboardLayout.count()).toBe(0);

    // Reset is idempotent.
    const again = await resetLayout(user);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(reset.body);
  });
});

describe('stale saved layouts', () => {
  it('repairs unknown ids, duplicates, malformed entries, and missing widgets on read', async () => {
    await prisma.dashboardLayout.create({
      data: {
        userId: user.userId,
        layout: {
          version: 1,
          widgets: [
            { id: 'goals', visible: false },
            { id: 'removedWidget', visible: true },
            { id: 'goals', visible: true },
            { id: 'income', visible: 'yes' },
            { id: 'recentTransactions', visible: true },
          ],
        },
      },
    });

    const response = await getLayout(user);
    expect(response.status).toBe(200);
    const body = response.body as LayoutBody;
    expect(body.isDefault).toBe(false);
    expect(body.widgets.slice(0, 2)).toEqual([
      { id: 'goals', visible: false },
      { id: 'recentTransactions', visible: true },
    ]);
    expect(body.widgets).toHaveLength(DASHBOARD_WIDGET_IDS.length);
    expect(new Set(body.widgets.map((entry) => entry.id))).toEqual(new Set(DASHBOARD_WIDGET_IDS));
    expect(body.widgets.find((entry) => entry.id === 'totalBalance')).toEqual({
      id: 'totalBalance',
      visible: true,
    });
  });
});

describe('layout writes do not touch financial data', () => {
  it('leaves records unchanged after save and reset', async () => {
    const account = await prisma.account.create({
      data: {
        userId: user.userId,
        name: 'Cash',
        type: 'CASH',
        currency: 'BDT',
        openingBalanceMinor: 12345n,
      },
    });
    const category = await prisma.category.create({
      data: {
        userId: user.userId,
        name: 'Salary',
        nameKey: `salary-${Date.now()}`,
        type: 'INCOME',
      },
    });
    await prisma.transaction.create({
      data: {
        userId: user.userId,
        type: 'INCOME',
        amountMinor: 500000n,
        currency: 'BDT',
        occurredAt: new Date('2026-02-09T06:00:00.000Z'),
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect((await putLayout(user, { widgets: widgets({ budgets: false }) })).status).toBe(200);
    expect((await resetLayout(user)).status).toBe(200);

    expect(await prisma.transaction.count()).toBe(1);
    expect(
      (await prisma.account.findUnique({ where: { id: account.id } }))?.openingBalanceMinor,
    ).toBe(12345n);
  });
});
