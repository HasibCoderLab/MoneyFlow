import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DEFAULT_USER_PREFERENCES } from '@moneyflow/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { PreferencesService } from '../preferences/preferences.service';
import { BudgetsService } from './budgets.service';

/**
 * Budgets service tests with a mocked database (IT-9): ownership scoping,
 * category eligibility, the one-active-limit-per-category rule, status
 * transitions, and deterministic utilization math (exact bigint sums,
 * half-up percentages, unclamped overspend). Real PostgreSQL behavior is
 * covered by `test/integration/budgets.test.ts`.
 */

const USER_ID = 'user-1';
const BUDGET_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CAT_GROCERIES = '11111111-1111-4111-8111-111111111111';
const CAT_TRANSPORT = '22222222-2222-4222-8222-222222222222';

const OCTOBER = new Date('2026-10-01T00:00:00.000Z');

function categoryRow(id: string, overrides: Record<string, unknown> = {}) {
  return { id, name: 'Category', color: null, type: 'EXPENSE', status: 'ACTIVE', ...overrides };
}

function limitRow(categoryId: string, limitMinor: bigint, category: Record<string, unknown>) {
  return {
    id: `limit-${categoryId}`,
    budgetId: BUDGET_ID,
    categoryId,
    limitMinor,
    category,
    createdAt: OCTOBER,
    updatedAt: OCTOBER,
  };
}

function budgetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BUDGET_ID,
    userId: USER_ID,
    name: 'October plan',
    period: 'MONTHLY',
    startDate: OCTOBER,
    totalLimitMinor: null,
    status: 'ACTIVE',
    createdAt: OCTOBER,
    updatedAt: OCTOBER,
    categoryLimits: [],
    ...overrides,
  };
}

function mockDb() {
  const tx = {
    budget: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    budgetCategoryLimit: { createMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  };
  const top = {
    budget: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    budgetCategoryLimit: { count: vi.fn() },
    category: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((argument: unknown) =>
      typeof argument === 'function'
        ? (argument as (client: unknown) => unknown)(tx)
        : Promise.all(argument as Array<Promise<unknown>>),
    ),
  };
  return { prisma: top as unknown as PrismaService, tx, top };
}

function serviceWith(top: ReturnType<typeof mockDb>['top']): BudgetsService {
  const preferences = {
    getEffectivePreferences: vi
      .fn()
      .mockResolvedValue({ ...DEFAULT_USER_PREFERENCES, updatedAt: null }),
  };
  const audit = {
    recordInTransaction: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;
  return new BudgetsService(
    top as unknown as PrismaService,
    preferences as unknown as PreferencesService,
    audit,
  );
}

describe('BudgetsService.listBudgets', () => {
  it('scopes to the caller, defaults to ACTIVE+PAUSED, and orders deterministically', async () => {
    const { prisma, top } = mockDb();
    top.budget.findMany.mockResolvedValue([]);
    const service = serviceWith(top);

    await service.listBudgets(USER_ID, {});

    expect(top.budget.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: { categoryLimits: { include: { category: true } } },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    });
    expect(prisma).toBeDefined();
  });

  it('includes archived budgets only when asked', async () => {
    const { top } = mockDb();
    top.budget.findMany.mockResolvedValue([]);
    const service = serviceWith(top);

    await service.listBudgets(USER_ID, { includeArchived: 'true' });

    expect(top.budget.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
    const where = top.budget.findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.status).toBeUndefined();
  });

  it('computes per-category utilization with exact sums, half-up percent, and unclamped overspend', async () => {
    const { top } = mockDb();
    const groceries = categoryRow(CAT_GROCERIES, { name: 'Groceries', color: '#2563eb' });
    const budget = budgetRow({
      categoryLimits: [
        limitRow(CAT_GROCERIES, 500_000n, groceries),
        limitRow(CAT_TRANSPORT, 100_000n, categoryRow(CAT_TRANSPORT, { name: 'Transport' })),
      ],
    });
    top.budget.findMany.mockResolvedValue([budget]);
    // Grouped per-category totals for October: groceries 320000, transport 120000
    // (over its 100000 limit → negative remainder, percent > 1000).
    top.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('GROUP BY')) {
        return Promise.resolve([
          { categoryId: CAT_GROCERIES, total: '320000' },
          { categoryId: CAT_TRANSPORT, total: '120000' },
        ]);
      }
      return Promise.resolve([{ total: '440000' }]);
    });
    const service = serviceWith(top);

    const [result] = await service.listBudgets(USER_ID, {});

    // Largest limit first: groceries (5000.00) before transport (1000.00).
    expect(result?.categoryLimits.map((limit) => limit.categoryName)).toEqual([
      'Groceries',
      'Transport',
    ]);
    expect(result?.categoryLimits[0]?.figures).toEqual({
      limitMinor: '500000',
      spentMinor: '320000',
      remainingMinor: '180000',
      percentTimes10: '640',
    });
    expect(result?.categoryLimits[1]?.figures).toEqual({
      limitMinor: '100000',
      spentMinor: '120000',
      remainingMinor: '-20000',
      percentTimes10: '1200',
    });
    // No total limit → null, never a fabricated zero budget.
    expect(result?.totalFigures).toBeNull();
    expect(result?.startDate).toBe('2026-10-01');
    expect(result?.currency).toBe('BDT');
  });

  it('computes totalFigures from ALL period expenses and stays exact above 2^53', async () => {
    const { top } = mockDb();
    const hugeLimit = 90_000_000_000_000n; // 10^14 minor — beyond Number.MAX_SAFE_INTEGER
    const budget = budgetRow({
      totalLimitMinor: hugeLimit,
      categoryLimits: [limitRow(CAT_GROCERIES, 100_000n, categoryRow(CAT_GROCERIES))],
    });
    top.budget.findMany.mockResolvedValue([budget]);
    top.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('GROUP BY')) {
        return Promise.resolve([{ categoryId: CAT_GROCERIES, total: '9007199254740993' }]);
      }
      return Promise.resolve([{ total: '9007199254740993' }]);
    });
    const service = serviceWith(top);

    const [result] = await service.listBudgets(USER_ID, {});

    expect(result?.totalFigures?.spentMinor).toBe('9007199254740993');
    expect(result?.totalFigures?.limitMinor).toBe('90000000000000');
    // 90000000000000 - 9007199254740993, never clamped.
    expect(result?.totalFigures?.remainingMinor).toBe('-8917199254740993');
    // roundHalfUp(9007199254740993 × 1000 / 90000000000000) = 100079.99… → 100080.
    expect(result?.totalFigures?.percentTimes10).toBe('100080');
    // The per-category figure keeps its own exact sum.
    expect(result?.categoryLimits[0]?.figures.spentMinor).toBe('9007199254740993');
  });
});

describe('BudgetsService.createBudget', () => {
  const validBody = {
    name: 'October plan',
    startDate: '2026-10',
    totalLimit: '8000',
    categoryLimits: [{ categoryId: CAT_GROCERIES, limit: '5000' }],
  };

  it('creates the budget and its limits inside one transaction', async () => {
    const { top, tx } = mockDb();
    top.category.findMany.mockResolvedValue([categoryRow(CAT_GROCERIES, { name: 'Groceries' })]);
    top.budget.findFirst.mockResolvedValue(null); // overlap probe
    tx.budget.create.mockResolvedValue(budgetRow({ totalLimitMinor: 800000n }));
    top.budget.findFirstOrThrow.mockResolvedValue(
      budgetRow({
        totalLimitMinor: 800000n,
        categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
      }),
    );
    top.$queryRaw.mockResolvedValue([{ total: '0' }, { categoryId: null, total: null }]);
    const service = serviceWith(top);

    const result = await service.createBudget(USER_ID, validBody);

    expect(tx.budget.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        name: 'October plan',
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        totalLimitMinor: 800000n,
      },
    });
    expect(tx.budgetCategoryLimit.createMany).toHaveBeenCalledWith({
      data: [{ budgetId: BUDGET_ID, categoryId: CAT_GROCERIES, limitMinor: 500000n }],
    });
    expect(result.name).toBe('October plan');
    expect(result.totalFigures?.limitMinor).toBe('800000');
  });

  it('rejects archived, income, foreign, and malformed categories with 400', async () => {
    const cases = [
      [categoryRow(CAT_GROCERIES, { status: 'ARCHIVED' }), 'archived'],
      [categoryRow(CAT_GROCERIES, { type: 'INCOME' }), 'income'],
      [], // foreign id simply does not come back
    ] as const;
    for (const [row] of cases) {
      const { top } = mockDb();
      top.category.findMany.mockResolvedValue(row === undefined ? [] : [row]);
      const service = serviceWith(top);
      await expect(service.createBudget(USER_ID, validBody)).rejects.toThrow(BadRequestException);
    }
  });

  it('rejects a malformed category id with 400 before any query', async () => {
    const { top } = mockDb();
    const service = serviceWith(top);
    await expect(
      service.createBudget(USER_ID, {
        name: 'Plan',
        startDate: '2026-10',
        categoryLimits: [{ categoryId: 'not-a-uuid', limit: '100' }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(top.category.findMany).not.toHaveBeenCalled();
  });

  it('answers 409 when another ACTIVE budget already limits the category that month', async () => {
    const { top } = mockDb();
    top.category.findMany.mockResolvedValue([categoryRow(CAT_GROCERIES)]);
    top.budget.findFirst.mockResolvedValue({ id: OTHER_ID }); // overlap probe hits
    const service = serviceWith(top);

    await expect(service.createBudget(USER_ID, validBody)).rejects.toThrow(ConflictException);
  });
});

describe('BudgetsService.updateBudget', () => {
  it('answers 404 for malformed and foreign budget ids', async () => {
    const { top } = mockDb();
    const service = serviceWith(top);
    await expect(service.updateBudget(USER_ID, 'nope', {})).rejects.toThrow(NotFoundException);

    top.budget.findFirst.mockResolvedValue(null);
    await expect(service.updateBudget(USER_ID, OTHER_ID, {})).rejects.toThrow(NotFoundException);
  });

  it('replaces the category-limit set and re-checks the overlap rule when ACTIVE', async () => {
    const { top, tx } = mockDb();
    top.budget.findFirst
      .mockResolvedValueOnce(
        budgetRow({
          categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
        }),
      )
      .mockResolvedValueOnce(null); // overlap probe: no conflict
    top.category.findMany.mockResolvedValue([categoryRow(CAT_TRANSPORT, { name: 'Transport' })]);
    top.budget.findFirstOrThrow.mockResolvedValue(
      budgetRow({ categoryLimits: [limitRow(CAT_TRANSPORT, 100000n, categoryRow(CAT_TRANSPORT))] }),
    );
    top.$queryRaw.mockResolvedValue([{ total: '0' }]);
    const service = serviceWith(top);

    await service.updateBudget(USER_ID, BUDGET_ID, {
      categoryLimits: [{ categoryId: CAT_TRANSPORT, limit: '1000' }],
    });

    expect(tx.budgetCategoryLimit.deleteMany).toHaveBeenCalledWith({
      where: { budgetId: BUDGET_ID, categoryId: { notIn: [CAT_TRANSPORT] } },
    });
    expect(tx.budgetCategoryLimit.upsert).toHaveBeenCalledWith({
      where: { budgetId_categoryId: { budgetId: BUDGET_ID, categoryId: CAT_TRANSPORT } },
      create: { budgetId: BUDGET_ID, categoryId: CAT_TRANSPORT, limitMinor: 100000n },
      update: { limitMinor: 100000n },
    });
  });

  it('skips the overlap rule for a PAUSED budget (it holds no active limits)', async () => {
    const { top } = mockDb();
    top.budget.findFirst.mockResolvedValueOnce(
      budgetRow({
        status: 'PAUSED',
        categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
      }),
    );
    top.category.findMany.mockResolvedValue([categoryRow(CAT_GROCERIES)]);
    top.budget.findFirstOrThrow.mockResolvedValue(
      budgetRow({
        status: 'PAUSED',
        categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
      }),
    );
    top.$queryRaw.mockResolvedValue([{ total: '0' }]);
    const service = serviceWith(top);

    await service.updateBudget(USER_ID, BUDGET_ID, {
      categoryLimits: [{ categoryId: CAT_GROCERIES, limit: '5000' }],
    });

    // Only the current-budget lookup ran; no overlap probe.
    expect(top.budget.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe('BudgetsService status transitions', () => {
  function transitionDb(status: string) {
    const { top, tx } = mockDb();
    top.budget.findFirst.mockResolvedValue(
      budgetRow({
        status,
        categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
      }),
    );
    top.budget.findFirstOrThrow.mockResolvedValue(
      budgetRow({
        status,
        categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
      }),
    );
    top.$queryRaw.mockResolvedValue([{ total: '0' }]);
    return { top, tx };
  }

  it('pauses an ACTIVE budget', async () => {
    const { top } = transitionDb('ACTIVE');
    // The re-read after the update returns the persisted PAUSED row.
    top.budget.findFirstOrThrow.mockResolvedValue(
      budgetRow({
        status: 'PAUSED',
        categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
      }),
    );
    const service = serviceWith(top);
    const result = await service.pauseBudget(USER_ID, BUDGET_ID);
    expect(top.budget.update).toHaveBeenCalledWith({
      where: { id: BUDGET_ID },
      data: { status: 'PAUSED' },
    });
    expect(result.status).toBe('PAUSED');
  });

  it('refuses to pause an ARCHIVED budget (unarchive first)', async () => {
    const { top } = transitionDb('ARCHIVED');
    const service = serviceWith(top);
    await expect(service.pauseBudget(USER_ID, BUDGET_ID)).rejects.toThrow(ConflictException);
  });

  it('resumes a PAUSED budget after re-checking the overlap rule', async () => {
    const { top } = transitionDb('PAUSED');
    top.budget.findFirst
      .mockResolvedValueOnce(
        budgetRow({
          status: 'PAUSED',
          categoryLimits: [limitRow(CAT_GROCERIES, 500000n, categoryRow(CAT_GROCERIES))],
        }),
      )
      .mockResolvedValueOnce(null); // overlap probe: no conflict
    const service = serviceWith(top);

    await service.resumeBudget(USER_ID, BUDGET_ID);

    expect(top.budget.update).toHaveBeenCalledWith({
      where: { id: BUDGET_ID },
      data: { status: 'ACTIVE' },
    });
  });

  it('refuses to resume an ARCHIVED budget (unarchive first)', async () => {
    const { top } = transitionDb('ARCHIVED');
    const service = serviceWith(top);
    await expect(service.resumeBudget(USER_ID, BUDGET_ID)).rejects.toThrow(ConflictException);
  });

  it('archives from any status and answers 404 for foreign ids', async () => {
    const { top } = transitionDb('PAUSED');
    const service = serviceWith(top);
    await service.archiveBudget(USER_ID, BUDGET_ID);
    expect(top.budget.update).toHaveBeenCalledWith({
      where: { id: BUDGET_ID },
      data: { status: 'ARCHIVED' },
    });

    top.budget.findFirst.mockResolvedValue(null);
    await expect(service.archiveBudget(USER_ID, OTHER_ID)).rejects.toThrow(NotFoundException);
  });
});

describe('BudgetsService.deleteBudget', () => {
  it('deletes the caller\u2019s budget and answers 404 otherwise', async () => {
    const { top, tx } = mockDb();
    tx.budget.findFirst.mockResolvedValueOnce(budgetRow()).mockResolvedValueOnce(null);
    const service = serviceWith(top);

    await service.deleteBudget(USER_ID, BUDGET_ID);
    expect(tx.budget.delete).toHaveBeenCalledWith({ where: { id: BUDGET_ID } });

    await expect(service.deleteBudget(USER_ID, OTHER_ID)).rejects.toThrow(NotFoundException);
    expect(tx.budget.delete).toHaveBeenCalledTimes(1);
  });
});
