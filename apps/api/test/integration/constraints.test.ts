import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { Prisma } from '../../src/generated/prisma/client';
import {
  createAccount,
  createCategory,
  createTestPrismaClient,
  createUser,
  resetDatabase,
  uniqueEmail,
} from './harness';

/**
 * Database-level integrity against real PostgreSQL (IT-2 acceptance):
 * invalid rows are rejected by CHECK constraints and indexes themselves —
 * not only by future services — and user-owned reads stay scoped by the
 * owning user id.
 */

const prisma = createTestPrismaClient();

const OCCURRED_AT = new Date('2026-10-01T00:00:00.000Z');

async function validIncomeData() {
  const user = await createUser(prisma);
  const account = await createAccount(prisma, user.id);
  const category = await createCategory(prisma, user.id);
  const base: Prisma.TransactionUncheckedCreateInput = {
    userId: user.id,
    type: 'INCOME',
    amountMinor: 100n,
    currency: 'BDT',
    occurredAt: OCCURRED_AT,
    accountId: account.id,
    categoryId: category.id,
  };
  return { user, account, category, base };
}

describe('database-level integrity (real PostgreSQL)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects zero and negative amounts', async () => {
    const { base } = await validIncomeData();

    await expect(prisma.transaction.create({ data: { ...base, amountMinor: 0n } })).rejects.toThrow(
      /transaction_amount_positive_check/,
    );
    await expect(
      prisma.transaction.create({ data: { ...base, amountMinor: -1n } }),
    ).rejects.toThrow(/transaction_amount_positive_check/);
  });

  it('rejects INCOME/EXPENSE rows without an account or category', async () => {
    const { base } = await validIncomeData();

    await expect(
      prisma.transaction.create({ data: { ...base, categoryId: null } }),
    ).rejects.toThrow(/transaction_type_shape_check/);
    await expect(prisma.transaction.create({ data: { ...base, accountId: null } })).rejects.toThrow(
      /transaction_type_shape_check/,
    );
  });

  it('rejects TRANSFER rows with the same account on both sides', async () => {
    const user = await createUser(prisma);
    const account = await createAccount(prisma, user.id);

    await expect(
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'TRANSFER',
          amountMinor: 100n,
          currency: 'BDT',
          occurredAt: OCCURRED_AT,
          fromAccountId: account.id,
          toAccountId: account.id,
        },
      }),
    ).rejects.toThrow(/transaction_type_shape_check/);
  });

  it('rejects columns that do not belong to the row type', async () => {
    const { base } = await validIncomeData();
    const otherAccount = await createAccount(prisma, base.userId);

    // TRANSFER must not carry a category.
    await expect(
      prisma.transaction.create({
        data: {
          userId: base.userId,
          type: 'TRANSFER',
          amountMinor: 100n,
          currency: 'BDT',
          occurredAt: OCCURRED_AT,
          fromAccountId: base.accountId,
          toAccountId: otherAccount.id,
          categoryId: base.categoryId,
        },
      }),
    ).rejects.toThrow(/transaction_type_shape_check/);

    // EXPENSE must not carry an adjustment sign.
    await expect(
      prisma.transaction.create({ data: { ...base, adjustmentSign: 1 } }),
    ).rejects.toThrow(/transaction_type_shape_check/);
  });

  it('rejects ADJUSTMENT rows without a note or with an out-of-range sign', async () => {
    const { base } = await validIncomeData();
    const adjustment: Prisma.TransactionUncheckedCreateInput = {
      userId: base.userId,
      type: 'ADJUSTMENT',
      amountMinor: 100n,
      currency: 'BDT',
      occurredAt: OCCURRED_AT,
      accountId: base.accountId,
      adjustmentSign: 1,
    };

    await expect(prisma.transaction.create({ data: adjustment })).rejects.toThrow(
      /transaction_type_shape_check/,
    );
    await expect(
      prisma.transaction.create({ data: { ...adjustment, note: 'ok', adjustmentSign: 0 } }),
    ).rejects.toThrow(/transaction_type_shape_check/);
  });

  it('enforces case-insensitive unique account names per user', async () => {
    const user = await createUser(prisma);
    await createAccount(prisma, user.id, { name: 'Cash' });

    await expect(createAccount(prisma, user.id, { name: 'cash' })).rejects.toThrow(
      /account_userId_name_lower_key/,
    );

    // A different user may reuse the same name.
    const other = await createUser(prisma);
    const otherAccount = await createAccount(prisma, other.id, { name: 'Cash' });
    expect(otherAccount.name).toBe('Cash');
  });

  it('enforces unique category names per user and type', async () => {
    const user = await createUser(prisma);
    await createCategory(prisma, user.id, { name: 'Bonus', nameKey: 'bonus', type: 'INCOME' });

    await expect(
      createCategory(prisma, user.id, { name: 'Bonus', nameKey: 'bonus', type: 'INCOME' }),
    ).rejects.toThrow(/category_userId_nameKey_type_key/);

    // Same name for the other type is allowed.
    const expense = await createCategory(prisma, user.id, {
      name: 'Bonus',
      nameKey: 'bonus',
      type: 'EXPENSE',
    });
    expect(expense.type).toBe('EXPENSE');
  });

  it('enforces idempotency keys per user but allows them across users', async () => {
    const { base } = await validIncomeData();
    const first = await prisma.transaction.create({
      data: { ...base, idempotencyKey: 'retry-key-1' },
    });
    expect(first.idempotencyKey).toBe('retry-key-1');

    await expect(
      prisma.transaction.create({ data: { ...base, idempotencyKey: 'retry-key-1' } }),
    ).rejects.toThrow(/transaction_userId_idempotencyKey_key/);

    const other = await createUser(prisma, { email: uniqueEmail('other') });
    const otherAccount = await createAccount(prisma, other.id);
    const otherCategory = await createCategory(prisma, other.id);
    const otherTx = await prisma.transaction.create({
      data: {
        userId: other.id,
        type: 'INCOME',
        amountMinor: 100n,
        currency: 'BDT',
        occurredAt: OCCURRED_AT,
        accountId: otherAccount.id,
        categoryId: otherCategory.id,
        idempotencyKey: 'retry-key-1',
      },
    });
    expect(otherTx.userId).toBe(other.id);
  });

  it('rejects transactions referencing a nonexistent account', async () => {
    const { base } = await validIncomeData();

    await expect(
      prisma.transaction.create({ data: { ...base, accountId: randomUUID() } }),
    ).rejects.toThrow(/foreign key/i);
  });

  it('blocks deleting accounts and categories that still have transactions', async () => {
    const { account, category, base } = await validIncomeData();
    await prisma.transaction.create({ data: base });

    await expect(prisma.account.delete({ where: { id: account.id } })).rejects.toThrow(
      /foreign key/i,
    );
    await expect(prisma.category.delete({ where: { id: category.id } })).rejects.toThrow(
      /foreign key/i,
    );
  });

  it('keeps user-scoped reads isolated to the owning user', async () => {
    const userA = await createUser(prisma);
    const userB = await createUser(prisma);
    const accountA = await createAccount(prisma, userA.id);
    const accountB = await createAccount(prisma, userB.id);
    const categoryA = await createCategory(prisma, userA.id);
    const categoryB = await createCategory(prisma, userB.id);

    await prisma.transaction.create({
      data: {
        userId: userA.id,
        type: 'EXPENSE',
        amountMinor: 100n,
        currency: 'BDT',
        occurredAt: OCCURRED_AT,
        accountId: accountA.id,
        categoryId: categoryA.id,
      },
    });
    await prisma.transaction.create({
      data: {
        userId: userB.id,
        type: 'EXPENSE',
        amountMinor: 200n,
        currency: 'BDT',
        occurredAt: OCCURRED_AT,
        accountId: accountB.id,
        categoryId: categoryB.id,
      },
    });

    const aTransactions = await prisma.transaction.findMany({ where: { userId: userA.id } });
    expect(aTransactions).toHaveLength(1);
    expect(aTransactions[0]?.userId).toBe(userA.id);

    const bAccounts = await prisma.account.findMany({ where: { userId: userB.id } });
    expect(bAccounts.map((account) => account.id)).toEqual([accountB.id]);
  });

  it('supports the explicit ordered account-deletion workflow in one transaction', async () => {
    const { user, base } = await validIncomeData();
    await prisma.transaction.create({ data: base });

    // The IT-12 deletion workflow removes rows in dependency order; the
    // NO ACTION references make the order mandatory instead of silent.
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId: user.id } });
      await tx.category.deleteMany({ where: { userId: user.id } });
      await tx.account.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    expect(await prisma.transaction.count()).toBe(0);
    expect(await prisma.account.count()).toBe(0);
    expect(await prisma.category.count()).toBe(0);
  });
});
