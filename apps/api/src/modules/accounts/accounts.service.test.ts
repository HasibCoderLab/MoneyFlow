import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from './accounts.service';

/**
 * Accounts service tests with a mocked database: ownership scoping,
 * contract-string balances, the opening-balance freeze, archive semantics,
 * and name-conflict mapping. Real-PostgreSQL behavior (constraints,
 * isolation, balances over persisted rows) is covered by
 * `test/integration/accounts.test.ts`.
 */

const USER_ID = 'user-1';
const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ACCOUNT_ID,
    userId: USER_ID,
    name: 'Cash',
    type: 'CASH',
    currency: 'BDT',
    openingBalanceMinor: 500000n,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  };
}

function uniqueViolation(indexName: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: indexName },
  });
}

function mockDb() {
  const tx = {
    account: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    transaction: { findMany: vi.fn(), count: vi.fn() },
    category: { findFirst: vi.fn() },
  };
  const top = {
    account: { findFirst: vi.fn(), findMany: vi.fn() },
    transaction: { findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((argument: unknown) =>
      typeof argument === 'function'
        ? (argument as (client: unknown) => unknown)(tx)
        : Promise.all(argument as Array<Promise<unknown>>),
    ),
  };
  return { prisma: top as unknown as PrismaService, tx, top };
}

describe('AccountsService.createAccount', () => {
  it('persists minor units and returns contract strings', async () => {
    const { prisma, tx } = mockDb();
    tx.account.create.mockResolvedValue(accountRow());
    const service = new AccountsService(prisma);

    const response = await service.createAccount(USER_ID, {
      name: 'Cash',
      type: 'CASH',
      currency: 'BDT',
      openingBalance: '5000.00',
    });

    expect(tx.account.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        name: 'Cash',
        type: 'CASH',
        currency: 'BDT',
        openingBalanceMinor: 500000n,
      },
    });
    expect(response.openingBalanceMinor).toBe('500000');
    expect(response.balanceMinor).toBe('500000');
    expect(response.archivedAt).toBeNull();
  });

  it('maps the case-insensitive name conflict to 409', async () => {
    const { prisma, tx } = mockDb();
    tx.account.create.mockRejectedValue(uniqueViolation('account_userId_name_lower_key'));
    const service = new AccountsService(prisma);

    await expect(
      service.createAccount(USER_ID, {
        name: 'cash',
        type: 'CASH',
        currency: 'BDT',
        openingBalance: '0',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects malformed money before touching the database', async () => {
    const { prisma, tx } = mockDb();
    const service = new AccountsService(prisma);

    await expect(
      service.createAccount(USER_ID, {
        name: 'Cash',
        type: 'CASH',
        currency: 'BDT',
        openingBalance: '1.234',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.account.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported currencies', async () => {
    const { prisma, tx } = mockDb();
    const service = new AccountsService(prisma);

    await expect(
      service.createAccount(USER_ID, {
        name: 'Cash',
        type: 'CASH',
        currency: 'USD',
        openingBalance: '10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.account.create).not.toHaveBeenCalled();
  });
});

describe('AccountsService ownership', () => {
  it('answers 404 for foreign and malformed ids without distinguishing them', async () => {
    const { prisma, top } = mockDb();
    top.account.findFirst.mockResolvedValue(null);
    const service = new AccountsService(prisma);

    await expect(service.getAccount(USER_ID, OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getAccount(USER_ID, 'not-a-uuid')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('derives list balances from user-scoped legs', async () => {
    const { prisma, top } = mockDb();
    const cash = accountRow();
    const bank = accountRow({ id: OTHER_ID, name: 'Bank', openingBalanceMinor: 0n });
    top.account.findMany.mockResolvedValue([cash, bank]);
    top.transaction.findMany.mockResolvedValue([
      {
        type: 'INCOME',
        amountMinor: 100n,
        accountId: ACCOUNT_ID,
        fromAccountId: null,
        toAccountId: null,
        adjustmentSign: null,
      },
      {
        type: 'TRANSFER',
        amountMinor: 50n,
        accountId: null,
        fromAccountId: ACCOUNT_ID,
        toAccountId: OTHER_ID,
        adjustmentSign: null,
      },
    ]);
    const service = new AccountsService(prisma);

    const [cashResponse, bankResponse] = await service.listAccounts(USER_ID);
    expect(cashResponse?.balanceMinor).toBe('500050');
    expect(bankResponse?.balanceMinor).toBe('50');
    expect(top.transaction.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      select: expect.anything(),
    });
  });
});

describe('AccountsService.updateAccount', () => {
  it('freezes the opening balance once transactions exist', async () => {
    const { prisma, tx } = mockDb();
    tx.account.findFirst.mockResolvedValue(accountRow());
    tx.transaction.count.mockResolvedValue(2);
    const service = new AccountsService(prisma);

    await expect(
      service.updateAccount(USER_ID, ACCOUNT_ID, { openingBalance: '6000' }),
    ).rejects.toThrow(/OPENING_BALANCE_FROZEN/);
    expect(tx.account.update).not.toHaveBeenCalled();
  });

  it('allows the opening-balance correction on an empty account', async () => {
    const { prisma, tx, top } = mockDb();
    tx.account.findFirst.mockResolvedValue(accountRow());
    tx.transaction.count.mockResolvedValue(0);
    tx.account.update.mockResolvedValue(accountRow({ openingBalanceMinor: 600000n }));
    top.transaction.findMany.mockResolvedValue([]);
    const service = new AccountsService(prisma);

    const response = await service.updateAccount(USER_ID, ACCOUNT_ID, {
      openingBalance: '6000',
    });
    expect(response.openingBalanceMinor).toBe('600000');
    expect(response.balanceMinor).toBe('600000');
  });
});

describe('AccountsService archive', () => {
  it('archives with a timestamp and unarchives idempotently', async () => {
    const { prisma, tx, top } = mockDb();
    const service = new AccountsService(prisma);

    tx.account.findFirst.mockResolvedValue(accountRow());
    tx.account.update.mockResolvedValue(
      accountRow({ status: 'ARCHIVED', archivedAt: new Date('2026-10-16T00:00:00.000Z') }),
    );
    top.transaction.findMany.mockResolvedValue([]);
    const archived = await service.archiveAccount(USER_ID, ACCOUNT_ID);
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.archivedAt).toBe('2026-10-16T00:00:00.000Z');

    tx.account.findFirst.mockResolvedValue(
      accountRow({ status: 'ARCHIVED', archivedAt: new Date('2026-10-16T00:00:00.000Z') }),
    );
    tx.account.update.mockResolvedValue(accountRow());
    const unarchived = await service.unarchiveAccount(USER_ID, ACCOUNT_ID);
    expect(unarchived.status).toBe('ACTIVE');
    expect(unarchived.archivedAt).toBeNull();
  });

  it('answers 404 when archiving a foreign account', async () => {
    const { prisma, tx } = mockDb();
    tx.account.findFirst.mockResolvedValue(null);
    const service = new AccountsService(prisma);

    await expect(service.archiveAccount(USER_ID, OTHER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
