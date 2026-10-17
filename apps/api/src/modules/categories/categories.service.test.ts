import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from './categories.service';

/**
 * Categories service tests with a mocked database (IT-5): ownership scoping,
 * name-key recomputation, case-insensitive conflict mapping, archive
 * semantics, the referenced-delete 409, and the lazy default clone. Real
 * PostgreSQL behavior (unique index, FK, isolation) is covered by
 * `test/integration/categories.test.ts`.
 */

const USER_ID = 'user-1';
const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function categoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CATEGORY_ID,
    userId: USER_ID,
    name: 'Groceries',
    nameKey: 'groceries',
    type: 'EXPENSE',
    color: '#2563eb',
    status: 'ACTIVE',
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

function foreignKeyViolation() {
  return new Prisma.PrismaClientKnownRequestError('Foreign key constraint violated', {
    code: 'P2003',
    clientVersion: 'test',
  });
}

function mockDb() {
  const tx = {
    category: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    transaction: { count: vi.fn() },
  };
  const top = {
    category: { findFirst: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn((argument: unknown) =>
      typeof argument === 'function'
        ? (argument as (client: unknown) => unknown)(tx)
        : Promise.all(argument as Array<Promise<unknown>>),
    ),
  };
  return { prisma: top as unknown as PrismaService, tx, top };
}

describe('CategoriesService.listCategories', () => {
  it('seeds defaults on first read and lists active rows ordered by name key', async () => {
    const { prisma, top } = mockDb();
    top.category.findFirst.mockResolvedValue(null);
    top.category.createMany.mockResolvedValue({ count: 8 });
    const row = categoryRow();
    top.category.findMany.mockResolvedValue([row]);
    const service = new CategoriesService(prisma);

    const response = await service.listCategories(USER_ID, {});

    expect(top.category.createMany).toHaveBeenCalledTimes(1);
    expect(top.category.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: 'ACTIVE' },
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
    expect(response).toEqual([
      {
        id: CATEGORY_ID,
        name: 'Groceries',
        type: 'EXPENSE',
        color: '#2563eb',
        status: 'ACTIVE',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
  });

  it('does not re-seed once any row exists and can include archived rows', async () => {
    const { prisma, top } = mockDb();
    top.category.findFirst.mockResolvedValue({ id: CATEGORY_ID });
    top.category.findMany.mockResolvedValue([categoryRow({ status: 'ARCHIVED' })]);
    const service = new CategoriesService(prisma);

    await service.listCategories(USER_ID, { includeArchived: 'true' });

    expect(top.category.createMany).not.toHaveBeenCalled();
    expect(top.category.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
  });
});

describe('CategoriesService.createCategory', () => {
  it('persists the name key and colour and returns the contract shape', async () => {
    const { prisma, tx } = mockDb();
    tx.category.create.mockResolvedValue(categoryRow({ name: 'Food', nameKey: 'food' }));
    const service = new CategoriesService(prisma);

    const response = await service.createCategory(USER_ID, {
      name: ' Food ',
      type: 'EXPENSE',
      color: '#f59e0b',
    });

    expect(tx.category.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        name: 'Food',
        nameKey: 'food',
        type: 'EXPENSE',
        color: '#f59e0b',
      },
    });
    expect(response.name).toBe('Food');
  });

  it('maps the case-insensitive name conflict to 409', async () => {
    const { prisma, tx } = mockDb();
    tx.category.create.mockRejectedValue(uniqueViolation('category_userId_nameKey_type_key'));
    const service = new CategoriesService(prisma);

    await expect(
      service.createCategory(USER_ID, { name: 'groceries', type: 'EXPENSE' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid input before touching the database', async () => {
    const { prisma, tx } = mockDb();
    const service = new CategoriesService(prisma);

    await expect(
      service.createCategory(USER_ID, { name: 'X', type: 'NOPE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.category.create).not.toHaveBeenCalled();
  });
});

describe('CategoriesService.updateCategory', () => {
  it('answers 404 for foreign and malformed ids without updating', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(null);
    const service = new CategoriesService(prisma);

    await expect(service.updateCategory(USER_ID, OTHER_ID, { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.updateCategory(USER_ID, 'not-a-uuid', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.category.update).not.toHaveBeenCalled();
  });

  it('recomputes the name key on rename and clears the colour with null', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow());
    tx.category.update.mockResolvedValue(
      categoryRow({ name: 'Food & dining', nameKey: 'food & dining', color: null }),
    );
    const service = new CategoriesService(prisma);

    const response = await service.updateCategory(USER_ID, CATEGORY_ID, {
      name: ' Food & Dining ',
      color: null,
    });

    expect(tx.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: { name: 'Food & Dining', nameKey: 'food & dining', color: null },
    });
    expect(response.color).toBeNull();
  });

  it('returns the current row untouched for an empty patch', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow());
    const service = new CategoriesService(prisma);

    const response = await service.updateCategory(USER_ID, CATEGORY_ID, {});

    expect(tx.category.update).not.toHaveBeenCalled();
    expect(response.name).toBe('Groceries');
  });

  it('maps a rename collision to 409', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow());
    tx.category.update.mockRejectedValue(uniqueViolation('category_userId_nameKey_type_key'));
    const service = new CategoriesService(prisma);

    await expect(
      service.updateCategory(USER_ID, CATEGORY_ID, { name: 'Transport' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows renaming an archived category', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow({ status: 'ARCHIVED' }));
    tx.category.update.mockResolvedValue(
      categoryRow({ status: 'ARCHIVED', name: 'Old hobby', nameKey: 'old hobby' }),
    );
    const service = new CategoriesService(prisma);

    const response = await service.updateCategory(USER_ID, CATEGORY_ID, { name: 'Old hobby' });
    expect(response.status).toBe('ARCHIVED');
    expect(response.name).toBe('Old hobby');
  });
});

describe('CategoriesService archive', () => {
  it('flips the status and is idempotent in both directions', async () => {
    const { prisma, tx } = mockDb();
    const service = new CategoriesService(prisma);

    tx.category.findFirst.mockResolvedValue(categoryRow());
    tx.category.update.mockResolvedValue(categoryRow({ status: 'ARCHIVED' }));
    const archived = await service.archiveCategory(USER_ID, CATEGORY_ID);
    expect(archived.status).toBe('ARCHIVED');

    // Already archived: no write, current row returned.
    tx.category.findFirst.mockResolvedValue(categoryRow({ status: 'ARCHIVED' }));
    const again = await service.archiveCategory(USER_ID, CATEGORY_ID);
    expect(again.status).toBe('ARCHIVED');
    expect(tx.category.update).toHaveBeenCalledTimes(1);

    tx.category.findFirst.mockResolvedValue(categoryRow({ status: 'ARCHIVED' }));
    tx.category.update.mockResolvedValue(categoryRow());
    const unarchived = await service.unarchiveCategory(USER_ID, CATEGORY_ID);
    expect(unarchived.status).toBe('ACTIVE');
  });

  it('answers 404 for foreign ids', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(null);
    const service = new CategoriesService(prisma);

    await expect(service.archiveCategory(USER_ID, OTHER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('CategoriesService.deleteCategory', () => {
  it('deletes an unreferenced category', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow());
    tx.transaction.count.mockResolvedValue(0);
    tx.category.delete.mockResolvedValue(categoryRow());
    const service = new CategoriesService(prisma);

    await service.deleteCategory(USER_ID, CATEGORY_ID);

    expect(tx.transaction.count).toHaveBeenCalledWith({
      where: { userId: USER_ID, categoryId: CATEGORY_ID },
    });
    expect(tx.category.delete).toHaveBeenCalledWith({ where: { id: CATEGORY_ID } });
  });

  it('answers 409 while any transaction references the category', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow());
    tx.transaction.count.mockResolvedValue(1);
    const service = new CategoriesService(prisma);

    await expect(service.deleteCategory(USER_ID, CATEGORY_ID)).rejects.toThrow(/Archive it/);
    expect(tx.category.delete).not.toHaveBeenCalled();
  });

  it('maps a delete race (FK violation) to the same 409', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(categoryRow());
    tx.transaction.count.mockResolvedValue(0);
    tx.category.delete.mockRejectedValue(foreignKeyViolation());
    const service = new CategoriesService(prisma);

    await expect(service.deleteCategory(USER_ID, CATEGORY_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('answers 404 for foreign and malformed ids', async () => {
    const { prisma, tx } = mockDb();
    tx.category.findFirst.mockResolvedValue(null);
    const service = new CategoriesService(prisma);

    await expect(service.deleteCategory(USER_ID, OTHER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.deleteCategory(USER_ID, 'not-a-uuid')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
