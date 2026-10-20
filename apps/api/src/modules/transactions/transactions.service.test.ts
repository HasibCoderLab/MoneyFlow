import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { parseIdempotencyKey, parseUpdateTransactionInput } from './dto';
import { TransactionsService } from './transactions.service';

/**
 * Transactions service tests with a mocked database: per-type reference
 * resolution, ownership scoping, archived-account rules, category matching,
 * idempotency replay, type immutability, and list filtering. Real-PostgreSQL
 * behavior (constraints, atomicity, isolation, balance consistency) is
 * covered by `test/integration/transactions.test.ts`.
 */

const USER_ID = 'user-1';
const CASH_ID = '11111111-1111-4111-8111-111111111111';
const BANK_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const TX_ID = '44444444-4444-4434-8434-444444444444';

const audit = {
  recordInTransaction: vi.fn().mockResolvedValue(undefined),
} as unknown as AuditService;

function serviceWith(prisma: PrismaService): TransactionsService {
  return new TransactionsService(prisma, audit);
}

function accountRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: USER_ID,
    name: 'Account',
    type: 'CASH',
    currency: 'BDT',
    openingBalanceMinor: 0n,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  };
}

function categoryRow(type: string) {
  return {
    id: CATEGORY_ID,
    userId: USER_ID,
    name: 'Category',
    nameKey: 'category',
    type,
    color: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  };
}

function transactionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TX_ID,
    userId: USER_ID,
    type: 'INCOME',
    amountMinor: 1200000n,
    currency: 'BDT',
    occurredAt: new Date('2026-10-10T06:00:00.000Z'),
    accountId: CASH_ID,
    fromAccountId: null,
    toAccountId: null,
    categoryId: CATEGORY_ID,
    adjustmentSign: null,
    note: null,
    idempotencyKey: null,
    createdAt: new Date('2026-10-10T06:00:00.000Z'),
    updatedAt: new Date('2026-10-10T06:00:00.000Z'),
    ...overrides,
  };
}

function mockDb() {
  const tx = {
    account: { findFirst: vi.fn() },
    transaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: { findFirst: vi.fn() },
  };
  const top = {
    account: { findFirst: vi.fn() },
    transaction: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    category: { findFirst: vi.fn() },
    $transaction: vi.fn((argument: unknown) =>
      typeof argument === 'function'
        ? (argument as (client: unknown) => unknown)(tx)
        : Promise.all(argument as Array<Promise<unknown>>),
    ),
  };
  return { prisma: top as unknown as PrismaService, tx, top };
}

const INCOME_BODY = {
  type: 'INCOME',
  amount: '12000',
  occurredDate: '2026-10-10',
  accountId: CASH_ID,
  categoryId: CATEGORY_ID,
};

function mockIncomeRefs(tx: ReturnType<typeof mockDb>['tx']) {
  tx.account.findFirst.mockResolvedValue(accountRow(CASH_ID));
  tx.category.findFirst.mockResolvedValue(categoryRow('INCOME'));
  tx.transaction.findFirst.mockResolvedValue(null);
  tx.transaction.create.mockImplementation((args: { data: Record<string, unknown> }) =>
    Promise.resolve(transactionRow({ ...args.data })),
  );
}

describe('TransactionsService.createTransaction', () => {
  it('resolves income references and returns contract strings', async () => {
    const { prisma, tx } = mockDb();
    mockIncomeRefs(tx);
    const service = serviceWith(prisma);

    const result = await service.createTransaction(USER_ID, INCOME_BODY, undefined);

    expect(result.replayed).toBe(false);
    expect(result.transaction.amountMinor).toBe('1200000');
    expect(result.transaction.occurredAt).toBe('2026-10-10T06:00:00.000Z');
    expect(result.transaction.currency).toBe('BDT');
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        type: 'INCOME',
        amountMinor: 1200000n,
        idempotencyKey: null,
      }),
    });
  });

  it('replays a stored row for a repeated idempotency key', async () => {
    const { prisma, tx } = mockDb();
    const stored = transactionRow({ idempotencyKey: 'key-1' });
    tx.transaction.findFirst.mockResolvedValue(stored);
    const service = serviceWith(prisma);

    const result = await service.createTransaction(USER_ID, INCOME_BODY, 'key-1');

    expect(result.replayed).toBe(true);
    expect(result.transaction.id).toBe(stored.id);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects same-account transfers', async () => {
    const { prisma, tx } = mockDb();
    tx.account.findFirst.mockResolvedValue(accountRow(CASH_ID));
    const service = serviceWith(prisma);

    await expect(
      service.createTransaction(
        USER_ID,
        {
          type: 'TRANSFER',
          amount: '100',
          occurredDate: '2026-10-10',
          fromAccountId: CASH_ID,
          toAccountId: CASH_ID,
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects transfers across different currencies', async () => {
    // MVP accounts are BDT-only, so the mismatch is only reachable with a
    // mocked second account — the service rule itself must still hold.
    const { prisma, tx } = mockDb();
    tx.account.findFirst
      .mockResolvedValueOnce(accountRow(CASH_ID))
      .mockResolvedValueOnce(accountRow(BANK_ID, { currency: 'USD' }));
    const service = serviceWith(prisma);

    await expect(
      service.createTransaction(
        USER_ID,
        {
          type: 'TRANSFER',
          amount: '100',
          occurredDate: '2026-10-10',
          fromAccountId: CASH_ID,
          toAccountId: BANK_ID,
        },
        undefined,
      ),
    ).rejects.toThrow(/same currency/);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects new transactions on archived accounts', async () => {
    const { prisma, tx } = mockDb();
    tx.account.findFirst.mockResolvedValue(accountRow(CASH_ID, { status: 'ARCHIVED' }));
    const service = serviceWith(prisma);

    await expect(service.createTransaction(USER_ID, INCOME_BODY, undefined)).rejects.toThrow(
      /archived/,
    );
  });

  it('rejects category type mismatches and foreign references', async () => {
    const { prisma, tx } = mockDb();
    tx.account.findFirst.mockResolvedValue(accountRow(CASH_ID));
    tx.category.findFirst.mockResolvedValue(categoryRow('EXPENSE'));
    const service = serviceWith(prisma);

    await expect(service.createTransaction(USER_ID, INCOME_BODY, undefined)).rejects.toThrow(
      /must match/,
    );

    tx.category.findFirst.mockResolvedValue(null);
    await expect(service.createTransaction(USER_ID, INCOME_BODY, undefined)).rejects.toThrow(
      /category does not exist/,
    );
  });

  it('creates adjustments only with direction and a real note', async () => {
    const { prisma, tx } = mockDb();
    tx.account.findFirst.mockResolvedValue(accountRow(CASH_ID));
    tx.transaction.findFirst.mockResolvedValue(null);
    tx.transaction.create.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve(transactionRow({ ...args.data, type: 'ADJUSTMENT' })),
    );
    const service = serviceWith(prisma);

    const result = await service.createTransaction(
      USER_ID,
      {
        type: 'ADJUSTMENT',
        amount: '50',
        occurredDate: '2026-10-10',
        accountId: CASH_ID,
        direction: 'DECREASE',
        note: 'Cash count correction',
      },
      undefined,
    );
    expect(result.transaction.adjustmentSign).toBe(-1);

    await expect(
      service.createTransaction(
        USER_ID,
        {
          type: 'ADJUSTMENT',
          amount: '50',
          occurredDate: '2026-10-10',
          accountId: CASH_ID,
          direction: 'DECREASE',
        },
        undefined,
      ),
    ).rejects.toThrow(/note/);
  });
});

describe('TransactionsService.updateTransaction', () => {
  it('rejects type changes on an existing row', async () => {
    const { prisma, tx } = mockDb();
    tx.transaction.findFirst.mockResolvedValue(transactionRow());
    const service = serviceWith(prisma);

    await expect(
      service.updateTransaction(USER_ID, TX_ID, { ...INCOME_BODY, type: 'EXPENSE' }),
    ).rejects.toThrow(/TRANSACTION_TYPE_IMMUTABLE/);
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });

  it('answers 404 for foreign rows and re-resolves edited references', async () => {
    const { prisma, tx } = mockDb();
    const service = serviceWith(prisma);
    const updateBody = {
      amount: '5',
      occurredDate: INCOME_BODY.occurredDate,
      accountId: INCOME_BODY.accountId,
      categoryId: INCOME_BODY.categoryId,
    };

    tx.transaction.findFirst.mockResolvedValue(null);
    await expect(
      service.updateTransaction(USER_ID, TX_ID, { ...updateBody, amount: '5' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    tx.transaction.findFirst.mockResolvedValue(transactionRow());
    tx.account.findFirst.mockResolvedValue(accountRow(CASH_ID));
    tx.category.findFirst.mockResolvedValue(categoryRow('INCOME'));
    tx.transaction.update.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve(transactionRow({ ...args.data })),
    );
    const updated = await service.updateTransaction(USER_ID, TX_ID, {
      ...updateBody,
      amount: '5',
    });
    expect(updated.amountMinor).toBe('500');
  });
});

describe('TransactionsService.deleteTransaction', () => {
  it('deletes owned rows and answers 404 otherwise', async () => {
    const { prisma, tx } = mockDb();
    const service = serviceWith(prisma);

    tx.transaction.findFirst.mockResolvedValue(null);
    await expect(service.deleteTransaction(USER_ID, TX_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    tx.transaction.findFirst.mockResolvedValue(transactionRow());
    tx.transaction.delete.mockResolvedValue(transactionRow());
    await expect(service.deleteTransaction(USER_ID, TX_ID)).resolves.toBeUndefined();
    expect(tx.transaction.delete).toHaveBeenCalledWith({ where: { id: TX_ID } });
    expect(audit.recordInTransaction).toHaveBeenCalledWith(tx, {
      userId: USER_ID,
      type: 'TRANSACTION_DELETED',
      resourceType: 'transaction',
      resourceId: TX_ID,
    });
  });
});

describe('TransactionsService.listTransactions', () => {
  it('passes filters with stable ordering and next-offset paging', async () => {
    const { prisma, top } = mockDb();
    top.transaction.count.mockResolvedValue(3);
    top.transaction.findMany.mockResolvedValue([
      transactionRow(),
      transactionRow({ id: '55555555-5555-4555-8555-555555555555' }),
    ]);
    const service = serviceWith(prisma);

    const page = await service.listTransactions(USER_ID, {
      type: 'INCOME',
      accountId: CASH_ID,
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      limit: '1',
    });

    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
    expect(page.nextOffset).toBe(1);
    expect(top.transaction.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: USER_ID, type: 'INCOME' }),
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 2,
    });
  });

  it('builds the account OR clause plus the category and amount-range filters', async () => {
    const { prisma, top } = mockDb();
    top.transaction.count.mockResolvedValue(0);
    top.transaction.findMany.mockResolvedValue([]);
    const service = serviceWith(prisma);

    await service.listTransactions(USER_ID, {
      accountId: CASH_ID,
      categoryId: CATEGORY_ID,
      minAmount: '10.00',
      maxAmount: '20.50',
    });

    // The account filter must catch every side of a transfer (IT-7 rows
    // carry from/to instead of accountId); amounts compare in minor units.
    expect(top.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        categoryId: CATEGORY_ID,
        OR: [{ accountId: CASH_ID }, { fromAccountId: CASH_ID }, { toAccountId: CASH_ID }],
        amountMinor: { gte: 1000n, lte: 2050n },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 21,
    });
  });

  it('rejects invalid list parameters before touching the database', async () => {
    const { prisma, top } = mockDb();
    const service = serviceWith(prisma);

    const cases: Record<string, unknown>[] = [
      { limit: '0' },
      { limit: '101' },
      { type: 'REFUND' },
      { accountId: 'not-a-uuid' },
      { categoryId: 42 },
      { dateFrom: '2026-13-40' },
      { dateFrom: '2026-10-31', dateTo: '2026-10-01' },
      { minAmount: 'abc' },
      { minAmount: '20.00', maxAmount: '10.00' },
    ];
    for (const query of cases) {
      await expect(service.listTransactions(USER_ID, query)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(top.transaction.findMany).not.toHaveBeenCalled();
  });
});

describe('transaction dto helpers', () => {
  it('normalizes idempotency keys', () => {
    expect(parseIdempotencyKey(undefined)).toBeNull();
    expect(parseIdempotencyKey('   ')).toBeNull();
    expect(parseIdempotencyKey('key-1')).toBe('key-1');
    expect(() => parseIdempotencyKey('k'.repeat(101))).toThrow(BadRequestException);
  });

  it('rejects structurally invalid update bodies', () => {
    expect(() => parseUpdateTransactionInput({}, 'INCOME')).toThrow(BadRequestException);
    expect(() =>
      parseUpdateTransactionInput({ ...INCOME_BODY, categoryId: undefined }, 'TRANSFER'),
    ).toThrow(BadRequestException);
  });
});
