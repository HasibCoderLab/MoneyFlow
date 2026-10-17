import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createAccount,
  createCategory,
  createTestPrismaClient,
  createUser,
  resetDatabase,
} from './harness';

/**
 * Migration replay and schema smoke against real PostgreSQL (IT-2
 * acceptance): the initial migration is applied and recorded, every table
 * exists, and valid rows of every transaction shape round-trip with exact
 * BigInt money and UTC timestamps.
 */

const prisma = createTestPrismaClient();

const EXPECTED_TABLES = [
  'account',
  'authAccount',
  'category',
  'session',
  'transaction',
  'user',
  'verification',
];

describe('initial migration (real PostgreSQL)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('is applied and recorded as finished', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
    >`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at ASC`;

    const initial = rows.filter((row) => row.migration_name.endsWith('_initial'));
    expect(initial).toHaveLength(1);
    expect(initial[0]?.finished_at).not.toBeNull();
    expect(initial[0]?.rolled_back_at).toBeNull();
  });

  it('created every IT-2 table in the public schema', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ table_name: string }>
    >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;

    const names = rows.map((row) => row.table_name);
    for (const table of EXPECTED_TABLES) {
      expect(names).toContain(table);
    }
  });

  it('installed the hand-added CHECK constraints and the case-insensitive account index', async () => {
    const constraints = await prisma.$queryRaw<
      Array<{ conname: string }>
    >`SELECT conname FROM pg_constraint WHERE conname IN ('transaction_amount_positive_check', 'transaction_type_shape_check')`;
    expect(constraints.map((row) => row.conname).sort()).toEqual([
      'transaction_amount_positive_check',
      'transaction_type_shape_check',
    ]);

    const indexes = await prisma.$queryRaw<
      Array<{ indexname: string }>
    >`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'account_userId_name_lower_key'`;
    expect(indexes).toHaveLength(1);
  });

  it('round-trips an income transaction with relations, BigInt money and UTC timestamps', async () => {
    const user = await createUser(prisma);
    const account = await createAccount(prisma, user.id, {
      openingBalanceMinor: -1234567890123n,
    });
    const category = await createCategory(prisma, user.id, {
      name: 'Salary',
      nameKey: 'salary',
      type: 'INCOME',
    });
    const occurredAt = new Date('2026-10-01T10:30:00.123Z');

    const created = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'INCOME',
        amountMinor: 350000n,
        currency: 'BDT',
        occurredAt,
        accountId: account.id,
        categoryId: category.id,
        note: 'Monthly salary',
        idempotencyKey: 'salary-oct-2026',
      },
    });

    const loaded = await prisma.transaction.findUniqueOrThrow({
      where: { id: created.id },
      include: { account: true, category: true },
    });

    expect(loaded.amountMinor).toBe(350000n);
    expect(loaded.occurredAt.toISOString()).toBe(occurredAt.toISOString());
    expect(loaded.account?.name).toBe(account.name);
    expect(loaded.category?.name).toBe('Salary');

    const accountRow = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(accountRow.openingBalanceMinor).toBe(-1234567890123n);
  });

  it('accepts the legal transfer and adjustment row shapes', async () => {
    const user = await createUser(prisma);
    const from = await createAccount(prisma, user.id, { name: 'From account' });
    const to = await createAccount(prisma, user.id, { name: 'To account' });
    const occurredAt = new Date('2026-10-02T00:00:00.000Z');

    const transfer = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'TRANSFER',
        amountMinor: 100n,
        currency: 'BDT',
        occurredAt,
        fromAccountId: from.id,
        toAccountId: to.id,
      },
    });
    expect(transfer.type).toBe('TRANSFER');

    const adjustment = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'ADJUSTMENT',
        amountMinor: 50n,
        currency: 'BDT',
        occurredAt,
        accountId: from.id,
        adjustmentSign: -1,
        note: 'Cash count correction',
      },
    });
    expect(adjustment.adjustmentSign).toBe(-1);
  });
});
