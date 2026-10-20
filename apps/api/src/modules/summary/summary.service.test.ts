import { BadRequestException } from '@nestjs/common';
import { DEFAULT_USER_PREFERENCES } from '@moneyflow/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../prisma/prisma.service';
import type { PreferencesService } from '../preferences/preferences.service';
import { SummaryService } from './summary.service';

/**
 * Summary service tests with a mocked database (IT-8): dashboard assembly,
 * balance derivation reuse, exact minor-unit strings, half-open period
 * scoping, category ordering/percentages, recent-activity enrichment, and
 * report series bucketing. Real-PostgreSQL behavior (SQL aggregation,
 * timezone conversion, isolation, exactness above 2^53) is covered by
 * `test/integration/summary.test.ts`.
 */

const USER_ID = 'user-1';
const CASH_ID = '11111111-1111-4111-8111-111111111111';
const BANK_ID = '22222222-2222-4222-8222-222222222222';
const GROCERIES_ID = '33333333-3333-4333-8333-333333333333';
const TRANSPORT_ID = '44444444-4444-4434-8434-444444444444';
const ARCHIVED_ID = '55555555-5555-4555-8555-555555555555';

/** 16:00 in Asia/Dhaka on 2026-10-17 — inside October. */
const NOW = new Date('2026-10-17T10:00:00.000Z');

function mockDb() {
  return {
    account: { findMany: vi.fn() },
    transaction: { findMany: vi.fn(), groupBy: vi.fn() },
    category: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
}

type MockDb = ReturnType<typeof mockDb>;

function createService(mock: MockDb): SummaryService {
  const preferences = {
    getEffectivePreferences: vi
      .fn()
      .mockResolvedValue({ ...DEFAULT_USER_PREFERENCES, updatedAt: null }),
  };
  return new SummaryService(
    mock as unknown as PrismaService,
    preferences as unknown as PreferencesService,
  );
}

function accountRow(id: string, openingBalanceMinor: bigint, status = 'ACTIVE') {
  return { id, openingBalanceMinor, status };
}

function recentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    type: 'INCOME',
    amountMinor: 500000n,
    currency: 'BDT',
    occurredAt: new Date('2026-10-05T06:00:00.000Z'),
    adjustmentSign: null,
    note: 'Salary',
    categoryId: GROCERIES_ID,
    ...overrides,
  };
}

/**
 * `loadActiveBalance` and `loadRecentTransactions` both use
 * `transaction.findMany`; the recent query is the only one selecting `note`.
 * Routing by the select projection keeps the test deterministic even though
 * the dashboard issues the queries concurrently.
 */
function routeTransactionFindMany(mock: MockDb, legs: unknown[], recent: unknown[]) {
  mock.transaction.findMany.mockImplementation((args: { select?: Record<string, unknown> }) => {
    if (args.select && 'note' in args.select) {
      return Promise.resolve(recent);
    }
    return Promise.resolve(legs);
  });
}

function periodAggregateRows() {
  return [
    { localDate: '2026-10-05', type: 'INCOME', total: '400000', count: 1 },
    { localDate: '2026-10-06', type: 'EXPENSE', total: '120000', count: 2 },
  ];
}

describe('SummaryService.getDashboard', () => {
  it('derives the tracked balance from active accounts with the shared effect matrix', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([
      accountRow(CASH_ID, 10000n),
      accountRow(BANK_ID, 250000n),
    ]);
    routeTransactionFindMany(
      mock,
      [
        {
          type: 'INCOME',
          amountMinor: 500000n,
          accountId: CASH_ID,
          fromAccountId: null,
          toAccountId: null,
          adjustmentSign: null,
        },
        {
          type: 'EXPENSE',
          amountMinor: 120000n,
          accountId: CASH_ID,
          fromAccountId: null,
          toAccountId: null,
          adjustmentSign: null,
        },
        {
          type: 'TRANSFER',
          amountMinor: 30000n,
          accountId: null,
          fromAccountId: CASH_ID,
          toAccountId: BANK_ID,
          adjustmentSign: null,
        },
        {
          type: 'ADJUSTMENT',
          amountMinor: 5000n,
          accountId: CASH_ID,
          fromAccountId: null,
          toAccountId: null,
          adjustmentSign: -1,
        },
      ],
      [recentRow()],
    );
    mock.$queryRaw.mockResolvedValue(periodAggregateRows());
    mock.transaction.groupBy.mockResolvedValue([
      { categoryId: GROCERIES_ID, _sum: { amountMinor: 120000n } },
    ]);
    mock.category.findMany.mockResolvedValue([
      { id: GROCERIES_ID, name: 'Groceries', color: '#FF0000', status: 'ACTIVE' },
    ]);

    const dashboard = await createService(mock).getDashboard(USER_ID, {}, NOW);

    // Cash: 10000 + 500000 − 120000 − 30000 − 5000 = 355000
    // Bank: 250000 + 30000 = 280000 → total 635000
    expect(dashboard.totalTrackedBalanceMinor).toBe('635000');
    expect(dashboard.activeAccountCount).toBe(2);
    expect(dashboard.totals).toEqual({
      incomeMinor: '400000',
      expenseMinor: '120000',
      transactionCount: 3,
    });
    expect(dashboard.period).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
    });
    expect(dashboard.recentTransactions).toEqual([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        type: 'INCOME',
        amountMinor: '500000',
        currency: 'BDT',
        occurredAt: '2026-10-05T06:00:00.000Z',
        adjustmentSign: null,
        note: 'Salary',
        categoryName: 'Groceries',
        categoryColor: '#FF0000',
      },
    ]);
    expect(dashboard.spendingByCategory).toEqual([
      {
        categoryId: GROCERIES_ID,
        name: 'Groceries',
        color: '#FF0000',
        status: 'ACTIVE',
        expenseMinor: '120000',
        percentTimes10: '1000',
      },
    ]);
  });

  it('scopes every query to the session user and only ACTIVE accounts', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([accountRow(CASH_ID, 0n)]);
    routeTransactionFindMany(mock, [], []);
    mock.$queryRaw.mockResolvedValue([]);
    mock.transaction.groupBy.mockResolvedValue([]);

    await createService(mock).getDashboard(USER_ID, {}, NOW);

    expect(mock.account.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: 'ACTIVE' },
      select: { id: true, openingBalanceMinor: true },
    });
    expect(mock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USER_ID,
          OR: [
            { accountId: { in: [CASH_ID] } },
            { fromAccountId: { in: [CASH_ID] } },
            { toAccountId: { in: [CASH_ID] } },
          ],
        },
      }),
    );
    expect(mock.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USER_ID,
          type: 'EXPENSE',
          occurredAt: { gte: expect.any(Date), lt: expect.any(Date) },
        },
      }),
    );
    expect(mock.$queryRaw.mock.calls[0]![1]).toBe('Asia/Dhaka');
    expect(mock.$queryRaw.mock.calls[0]![2]).toBe(USER_ID);
  });

  it('returns honest zeros for a user without accounts', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([]);
    routeTransactionFindMany(mock, [], []);
    mock.$queryRaw.mockResolvedValue([]);
    mock.transaction.groupBy.mockResolvedValue([]);

    const dashboard = await createService(mock).getDashboard(USER_ID, {}, NOW);

    expect(dashboard.totalTrackedBalanceMinor).toBe('0');
    expect(dashboard.activeAccountCount).toBe(0);
    expect(dashboard.totals).toEqual({
      incomeMinor: '0',
      expenseMinor: '0',
      transactionCount: 0,
    });
    // Only the recent-activity query runs; the leg query is skipped entirely.
    expect(mock.transaction.findMany).toHaveBeenCalledTimes(1);
    expect(mock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] }),
    );
  });

  it('passes the half-open period bounds and never leaks other declarations into the SQL', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([]);
    routeTransactionFindMany(mock, [], []);
    mock.$queryRaw.mockResolvedValue([]);
    mock.transaction.groupBy.mockResolvedValue([]);

    await createService(mock).getDashboard(
      USER_ID,
      { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      NOW,
    );

    const sql = String(mock.$queryRaw.mock.calls[0]![0]);
    expect(sql).toContain(`"type" IN ('INCOME', 'EXPENSE')`);
    expect(sql).not.toContain('TRANSFER');
    expect(sql).not.toContain('ADJUSTMENT');
    const [, timezone, userId, fromInstant, toInstant] = mock.$queryRaw.mock.calls[0] as [
      unknown,
      string,
      string,
      Date,
      Date,
    ];
    expect(timezone).toBe('Asia/Dhaka');
    expect(userId).toBe(USER_ID);
    // Local October in Dhaka: 30 Sep 18:00Z (inclusive) → 31 Oct 18:00Z (exclusive).
    expect(fromInstant.toISOString()).toBe('2026-09-30T18:00:00.000Z');
    expect(toInstant.toISOString()).toBe('2026-10-31T18:00:00.000Z');
  });

  it('returns exact minor-unit strings beyond Number.MAX_SAFE_INTEGER', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([]);
    routeTransactionFindMany(mock, [], []);
    mock.$queryRaw.mockResolvedValue([
      { localDate: '2026-10-05', type: 'INCOME', total: '9007199254740993', count: 1 },
    ]);
    mock.transaction.groupBy.mockResolvedValue([]);

    const dashboard = await createService(mock).getDashboard(USER_ID, {}, NOW);

    expect(dashboard.totals.incomeMinor).toBe('9007199254740993');
  });

  it('orders category spending by amount desc, tie-broken by categoryId, with half-up percentages', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([]);
    routeTransactionFindMany(mock, [], []);
    mock.$queryRaw.mockResolvedValue([]);
    mock.transaction.groupBy.mockResolvedValue([
      { categoryId: TRANSPORT_ID, _sum: { amountMinor: 200000n } },
      { categoryId: GROCERIES_ID, _sum: { amountMinor: 500000n } },
      { categoryId: ARCHIVED_ID, _sum: { amountMinor: 200000n } },
    ]);
    mock.category.findMany.mockResolvedValue([
      { id: TRANSPORT_ID, name: 'Transport', color: null, status: 'ACTIVE' },
      { id: GROCERIES_ID, name: 'Groceries', color: null, status: 'ACTIVE' },
      { id: ARCHIVED_ID, name: 'Old category', color: null, status: 'ARCHIVED' },
    ]);

    const dashboard = await createService(mock).getDashboard(USER_ID, {}, NOW);

    // 900000 total: 500000 → 556, 200000 → 222 for both ties.
    expect(
      dashboard.spendingByCategory.map((row) => [
        row.categoryId,
        row.expenseMinor,
        row.percentTimes10,
        row.status,
      ]),
    ).toEqual([
      [GROCERIES_ID, '500000', '556', 'ACTIVE'],
      [TRANSPORT_ID, '200000', '222', 'ACTIVE'],
      [ARCHIVED_ID, '200000', '222', 'ARCHIVED'],
    ]);
  });

  it('bounds and enriches recent activity deterministically', async () => {
    const mock = mockDb();
    mock.account.findMany.mockResolvedValue([]);
    routeTransactionFindMany(
      mock,
      [],
      [
        recentRow({ id: 'tx-1' }),
        recentRow({
          id: 'tx-2',
          type: 'TRANSFER',
          amountMinor: 30000n,
          adjustmentSign: null,
          note: null,
          categoryId: null,
          occurredAt: new Date('2026-10-04T06:00:00.000Z'),
        }),
        recentRow({
          id: 'tx-3',
          type: 'ADJUSTMENT',
          amountMinor: 5000n,
          adjustmentSign: -1,
          note: null,
          categoryId: null,
          occurredAt: new Date('2026-10-03T06:00:00.000Z'),
        }),
      ],
    );
    mock.$queryRaw.mockResolvedValue([]);
    mock.transaction.groupBy.mockResolvedValue([]);
    mock.category.findMany.mockResolvedValue([
      { id: GROCERIES_ID, name: 'Groceries', color: '#FF0000' },
    ]);

    const dashboard = await createService(mock).getDashboard(USER_ID, { recentLimit: '3' }, NOW);

    expect(mock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 3,
        where: { userId: USER_ID },
      }),
    );
    expect(
      dashboard.recentTransactions.map((row) => [row.id, row.categoryName, row.adjustmentSign]),
    ).toEqual([
      ['tx-1', 'Groceries', null],
      ['tx-2', null, null],
      ['tx-3', null, -1],
    ]);
  });

  it('validates the query before touching the database', async () => {
    const mock = mockDb();
    await expect(
      createService(mock).getDashboard(USER_ID, { dateFrom: '2026-10-01' }, NOW),
    ).rejects.toThrow(BadRequestException);
    expect(mock.account.findMany).not.toHaveBeenCalled();
    expect(mock.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('SummaryService.getReportSummary', () => {
  it('builds sparse daily buckets from the local-day aggregation', async () => {
    const mock = mockDb();
    mock.$queryRaw.mockResolvedValue([
      { localDate: '2026-10-06', type: 'EXPENSE', total: '120000', count: 2 },
      { localDate: '2026-10-05', type: 'INCOME', total: '400000', count: 1 },
      { localDate: '2026-10-05', type: 'EXPENSE', total: '80000', count: 1 },
    ]);

    const report = await createService(mock).getReportSummary(USER_ID, {}, NOW);

    expect(report.period.dateFrom).toBe('2026-10-01');
    expect(report.granularity).toBe('daily');
    expect(report.weekStartsOn).toBeNull();
    expect(report.totals).toEqual({
      incomeMinor: '400000',
      expenseMinor: '200000',
      transactionCount: 4,
    });
    expect(report.series).toEqual([
      {
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        incomeMinor: '400000',
        expenseMinor: '80000',
      },
      { startDate: '2026-10-06', endDate: '2026-10-06', incomeMinor: '0', expenseMinor: '120000' },
    ]);
  });

  it('merges days into Saturday-start weeks (DR-11)', async () => {
    const mock = mockDb();
    mock.$queryRaw.mockResolvedValue([
      { localDate: '2026-10-17', type: 'INCOME', total: '100000', count: 1 }, // Saturday
      { localDate: '2026-10-18', type: 'EXPENSE', total: '40000', count: 1 }, // Sunday, same week
      { localDate: '2026-10-24', type: 'INCOME', total: '90000', count: 1 }, // next Saturday
    ]);

    const report = await createService(mock).getReportSummary(
      USER_ID,
      { granularity: 'weekly' },
      NOW,
    );

    expect(report.granularity).toBe('weekly');
    expect(report.weekStartsOn).toBe('SATURDAY');
    expect(report.series).toEqual([
      {
        startDate: '2026-10-17',
        endDate: '2026-10-23',
        incomeMinor: '100000',
        expenseMinor: '40000',
      },
      { startDate: '2026-10-24', endDate: '2026-10-30', incomeMinor: '90000', expenseMinor: '0' },
    ]);
  });

  it('merges days into calendar months with month edges', async () => {
    const mock = mockDb();
    mock.$queryRaw.mockResolvedValue([
      { localDate: '2026-09-30', type: 'INCOME', total: '10000', count: 1 },
      { localDate: '2026-10-01', type: 'INCOME', total: '20000', count: 1 },
    ]);

    const report = await createService(mock).getReportSummary(
      USER_ID,
      { dateFrom: '2026-09-01', dateTo: '2026-10-31', granularity: 'monthly' },
      NOW,
    );

    expect(report.series).toEqual([
      { startDate: '2026-09-01', endDate: '2026-09-30', incomeMinor: '10000', expenseMinor: '0' },
      { startDate: '2026-10-01', endDate: '2026-10-31', incomeMinor: '20000', expenseMinor: '0' },
    ]);
  });

  it('returns an empty series (never a fabricated zero trend) for an empty period', async () => {
    const mock = mockDb();
    mock.$queryRaw.mockResolvedValue([]);

    const report = await createService(mock).getReportSummary(USER_ID, {}, NOW);

    expect(report.series).toEqual([]);
    expect(report.totals).toEqual({ incomeMinor: '0', expenseMinor: '0', transactionCount: 0 });
  });

  it('rejects an invalid granularity with a safe 400', async () => {
    const mock = mockDb();
    await expect(
      createService(mock).getReportSummary(USER_ID, { granularity: 'yearly' }, NOW),
    ).rejects.toThrow(BadRequestException);
    expect(mock.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('SummaryService.getReportCategories', () => {
  it('returns the period, exact total, and deterministic category rows', async () => {
    const mock = mockDb();
    mock.transaction.groupBy.mockResolvedValue([
      { categoryId: TRANSPORT_ID, _sum: { amountMinor: 200000n } },
      { categoryId: GROCERIES_ID, _sum: { amountMinor: 800000n } },
    ]);
    mock.category.findMany.mockResolvedValue([
      { id: TRANSPORT_ID, name: 'Transport', color: '#00FF00', status: 'ACTIVE' },
      { id: GROCERIES_ID, name: 'Groceries', color: '#FF0000', status: 'ACTIVE' },
    ]);

    const report = await createService(mock).getReportCategories(USER_ID, {}, NOW);

    expect(report.period).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
    });
    expect(report.totalExpenseMinor).toBe('1000000');
    expect(report.categories).toEqual([
      {
        categoryId: GROCERIES_ID,
        name: 'Groceries',
        color: '#FF0000',
        status: 'ACTIVE',
        expenseMinor: '800000',
        percentTimes10: '800',
      },
      {
        categoryId: TRANSPORT_ID,
        name: 'Transport',
        color: '#00FF00',
        status: 'ACTIVE',
        expenseMinor: '200000',
        percentTimes10: '200',
      },
    ]);
  });

  it('scopes the category lookup to the session user', async () => {
    const mock = mockDb();
    mock.transaction.groupBy.mockResolvedValue([
      { categoryId: GROCERIES_ID, _sum: { amountMinor: 100n } },
    ]);
    mock.category.findMany.mockResolvedValue([
      { id: GROCERIES_ID, name: 'Groceries', color: null, status: 'ACTIVE' },
    ]);

    await createService(mock).getReportCategories(USER_ID, {}, NOW);

    expect(mock.category.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, id: { in: [GROCERIES_ID] } },
      select: { id: true, name: true, color: true, status: true },
    });
  });

  it('returns an empty totals object with a zero total when nothing was spent', async () => {
    const mock = mockDb();
    mock.transaction.groupBy.mockResolvedValue([]);

    const report = await createService(mock).getReportCategories(USER_ID, {}, NOW);

    expect(report.totalExpenseMinor).toBe('0');
    expect(report.categories).toEqual([]);
    expect(mock.category.findMany).not.toHaveBeenCalled();
  });
});
