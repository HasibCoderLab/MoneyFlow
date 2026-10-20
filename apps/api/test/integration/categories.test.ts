import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AuditService } from '../../src/modules/audit/audit.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { createTestPrismaClient, createUser, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';
import { authed, signUpUser, type TestAccount } from './auth-session';

/**
 * IT-5 categories acceptance against real PostgreSQL: the owner-approved
 * default clone at sign-up plus the lazy backfill, CRUD over HTTP, the real
 * case-insensitive unique index, rename/recolour rules, archive semantics,
 * referenced-delete 409s, and cross-user isolation.
 *
 * The `category_userId_nameKey_type_key` unique index and the transaction FK
 * below are database-enforced, never mocked.
 */

/** nameKey-ascending order of the owner-approved seed (2026-10-17). */
const DEFAULT_NAMES = [
  'Food & dining',
  'Freelance',
  'Gifts',
  'Groceries',
  'Other expense',
  'Salary',
  'Transport',
  'Utilities',
];

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;

beforeAll(async () => {
  testApp = await startTestApp();
});

afterAll(async () => {
  await testApp.app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  user = await signUpUser(testApp.baseUrl, 'categories');
});

interface CategoryItem {
  id: string;
  name: string;
  type: string;
  color: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function itemsOf(response: { body: unknown }): CategoryItem[] {
  return response.body as CategoryItem[];
}

function listCategories(query = '', account: TestAccount = user) {
  return authed(testApp.baseUrl, account, { path: `/api/v1/categories${query}` });
}

function createCategoryRequest(body: Record<string, unknown>, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/categories',
    body,
  });
}

function patchCategory(id: string, body: Record<string, unknown>, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'PATCH',
    path: `/api/v1/categories/${id}`,
    body,
  });
}

function archiveCategory(id: string, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: `/api/v1/categories/${id}/archive`,
  });
}

function unarchiveCategory(id: string, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: `/api/v1/categories/${id}/unarchive`,
  });
}

function deleteCategory(id: string, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, { method: 'DELETE', path: `/api/v1/categories/${id}` });
}

async function categoryIdByName(name: string, account: TestAccount = user): Promise<string> {
  const match = itemsOf(await listCategories('', account)).find((item) => item.name === name);
  if (!match) {
    throw new Error(`Category "${name}" not found in the list.`);
  }
  return match.id;
}

async function createWallet(account: TestAccount = user): Promise<string> {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/accounts',
    body: { name: 'Wallet', type: 'CASH', currency: 'BDT', openingBalance: '0' },
  });
  if (response.status !== 201) {
    throw new Error(`Wallet creation failed (status ${response.status}).`);
  }
  return (response.body as { id: string }).id;
}

describe('default categories', () => {
  it('clones the owner-approved defaults at sign-up, before any read', async () => {
    const rows = await prisma.category.findMany({
      where: { userId: user.userId },
      orderBy: { nameKey: 'asc' },
    });

    expect(rows.map((row) => row.name)).toEqual(DEFAULT_NAMES);
    expect(rows.map((row) => row.type)).toEqual([
      'EXPENSE',
      'INCOME',
      'INCOME',
      'EXPENSE',
      'EXPENSE',
      'INCOME',
      'EXPENSE',
      'EXPENSE',
    ]);
    const salary = rows.find((row) => row.name === 'Salary');
    expect(salary?.nameKey).toBe('salary');
    expect(salary?.color).toBe('#15803d');
    expect(rows.every((row) => row.status === 'ACTIVE')).toBe(true);
  });

  it('serves the defaults over HTTP, name-ascending, with contract fields', async () => {
    const response = await listCategories();
    expect(response.status).toBe(200);

    const items = itemsOf(response);
    expect(items.map((item) => item.name)).toEqual(DEFAULT_NAMES);
    expect(items[0]).toMatchObject({
      name: 'Food & dining',
      type: 'EXPENSE',
      color: '#f59e0b',
      status: 'ACTIVE',
    });
    expect(typeof items[0]?.id).toBe('string');
    expect(typeof items[0]?.createdAt).toBe('string');
    expect(typeof items[0]?.updatedAt).toBe('string');
  });

  it('backfills a user created before IT-5 on the first read, idempotently', async () => {
    // No session exists for a directly-inserted legacy user, so this drives
    // the domain service — the same lazy path the HTTP list triggers.
    const legacy = await createUser(prisma);
    const service = new CategoriesService(prisma, new AuditService(prisma));

    await service.listCategories(legacy.id, {});
    await service.listCategories(legacy.id, {});

    const rows = await prisma.category.findMany({ where: { userId: legacy.id } });
    expect(rows).toHaveLength(DEFAULT_NAMES.length);
  });

  it('re-seeds the defaults after a user deletes every category (lazy path over HTTP)', async () => {
    await prisma.category.deleteMany({ where: { userId: user.userId } });

    const response = await listCategories();
    expect(itemsOf(response)).toHaveLength(DEFAULT_NAMES.length);
  });

  it('never re-seeds while rows exist — archived categories count as existing', async () => {
    const groceries = await categoryIdByName('Groceries');
    expect((await archiveCategory(groceries)).status).toBe(200);
    await prisma.category.deleteMany({ where: { userId: user.userId, status: 'ACTIVE' } });

    const response = await listCategories('?includeArchived=true');
    const items = itemsOf(response);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Groceries', status: 'ARCHIVED' });
  });
});

describe('POST /api/v1/categories', () => {
  it('creates a custom category with trimmed name and contract fields (201)', async () => {
    const response = await createCategoryRequest({
      name: '  Coffee  ',
      type: 'EXPENSE',
      color: '#6d28d9',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Coffee',
      type: 'EXPENSE',
      color: '#6d28d9',
      status: 'ACTIVE',
    });
  });

  it('rejects case-insensitive duplicates per type with 409 and allows the other type', async () => {
    expect((await createCategoryRequest({ name: 'Coffee', type: 'EXPENSE' })).status).toBe(201);
    expect((await createCategoryRequest({ name: 'coffee', type: 'EXPENSE' })).status).toBe(409);
    expect((await createCategoryRequest({ name: 'COFFEE', type: 'EXPENSE' })).status).toBe(409);
    expect((await createCategoryRequest({ name: 'Coffee', type: 'INCOME' })).status).toBe(201);
  });

  it('treats a seeded default as an existing duplicate', async () => {
    const response = await createCategoryRequest({ name: 'salary', type: 'INCOME' });
    expect(response.status).toBe(409);
  });

  it('rejects invalid input with 400 and accepts the 60-character boundary', async () => {
    const bodies: Array<Record<string, unknown>> = [
      { name: '', type: 'EXPENSE' },
      { name: 'x'.repeat(61), type: 'EXPENSE' },
      { name: 'Bad\u0000Name', type: 'EXPENSE' },
      { name: 'Coffee' },
      { name: 'Coffee', type: 'TRANSFER' },
      { name: 'Coffee', type: 'EXPENSE', color: 'red' },
      { name: 'Coffee', type: 'EXPENSE', color: '#FFF' },
    ];
    for (const body of bodies) {
      const response = await createCategoryRequest(body);
      expect(response.status).toBe(400);
    }

    const boundary = await createCategoryRequest({ name: 'n'.repeat(60), type: 'EXPENSE' });
    expect(boundary.status).toBe(201);
  });

  it('requires authentication', async () => {
    const response = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/categories',
      body: { name: 'Coffee', type: 'EXPENSE' },
    });
    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/v1/categories/:id', () => {
  it('renames and recolours, recomputing the uniqueness key', async () => {
    const id = await categoryIdByName('Groceries');

    const renamed = await patchCategory(id, { name: 'Food shopping', color: '#16a34a' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Food shopping', color: '#16a34a' });

    // The old key is free again, the new one is taken case-insensitively.
    expect((await createCategoryRequest({ name: 'Groceries', type: 'EXPENSE' })).status).toBe(201);
    expect((await createCategoryRequest({ name: 'food shopping', type: 'EXPENSE' })).status).toBe(
      409,
    );
  });

  it('keeps the colour when the field is absent and clears it with an explicit null', async () => {
    const id = await categoryIdByName('Utilities');

    const renamed = await patchCategory(id, { name: 'Bills' });
    expect(renamed.body).toMatchObject({ name: 'Bills', color: '#be123c' });

    const cleared = await patchCategory(id, { color: null });
    expect(cleared.body).toMatchObject({ name: 'Bills', color: null });
  });

  it('maps rename collisions to 409', async () => {
    const id = await categoryIdByName('Gifts');
    expect((await patchCategory(id, { name: 'Salary' })).status).toBe(409);
  });

  it('rejects type changes with 400 and leaves the category unchanged', async () => {
    const id = await categoryIdByName('Gifts');

    const response = await patchCategory(id, { name: 'Presents', type: 'EXPENSE' });
    expect(response.status).toBe(400);

    const again = itemsOf(await listCategories()).find((item) => item.id === id);
    expect(again?.name).toBe('Gifts');
  });

  it('allows renaming an archived category', async () => {
    const id = await categoryIdByName('Transport');
    expect((await archiveCategory(id)).status).toBe(200);

    const renamed = await patchCategory(id, { name: 'Commute' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Commute', status: 'ARCHIVED' });
  });

  it('answers 404 for foreign and malformed ids', async () => {
    const other = await signUpUser(testApp.baseUrl, 'categories-foreign');
    const foreignId = await categoryIdByName('Groceries', other);

    for (const id of [foreignId, 'not-a-uuid']) {
      expect((await patchCategory(id, { name: 'Nope' })).status).toBe(404);
    }
  });
});

describe('archive lifecycle', () => {
  it('archives, hides from the default list, shows with the flag, and unarchives idempotently', async () => {
    const id = await categoryIdByName('Gifts');

    const archived = await archiveCategory(id);
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({ status: 'ARCHIVED' });

    const active = itemsOf(await listCategories());
    expect(active).toHaveLength(DEFAULT_NAMES.length - 1);
    expect(active.some((item) => item.id === id)).toBe(false);

    const all = itemsOf(await listCategories('?includeArchived=true'));
    expect(all).toHaveLength(DEFAULT_NAMES.length);
    expect(all.find((item) => item.id === id)).toMatchObject({ status: 'ARCHIVED' });

    // Idempotent in both directions.
    expect((await archiveCategory(id)).status).toBe(200);
    const unarchived = await unarchiveCategory(id);
    expect(unarchived.body).toMatchObject({ status: 'ACTIVE' });
    expect((await unarchiveCategory(id)).status).toBe(200);
  });

  it('rejects a non-boolean includeArchived with 400', async () => {
    expect((await listCategories('?includeArchived=yes')).status).toBe(400);
  });

  it('answers 404 for foreign ids', async () => {
    const other = await signUpUser(testApp.baseUrl, 'categories-archive-foreign');
    const foreignId = await categoryIdByName('Gifts', other);
    expect((await archiveCategory(foreignId)).status).toBe(404);
  });
});

describe('DELETE /api/v1/categories/:id', () => {
  it('deletes an unreferenced category with 204', async () => {
    const created = await createCategoryRequest({ name: 'Temporary', type: 'EXPENSE' });
    const id = (created.body as { id: string }).id;

    const response = await deleteCategory(id);
    expect(response.status).toBe(204);

    const names = itemsOf(await listCategories()).map((item) => item.name);
    expect(names).not.toContain('Temporary');
  });

  it('deletes an archived unreferenced category as well', async () => {
    const id = await categoryIdByName('Transport');
    expect((await archiveCategory(id)).status).toBe(200);
    expect((await deleteCategory(id)).status).toBe(204);
  });

  it('answers 409 while a transaction references the category, then permits archiving', async () => {
    const accountId = await createWallet();
    const groceriesId = await categoryIdByName('Groceries');
    const created = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/transactions',
      body: {
        type: 'EXPENSE',
        amount: '10.00',
        occurredDate: '2026-10-17',
        accountId,
        categoryId: groceriesId,
      },
    });
    expect(created.status).toBe(201);

    const response = await deleteCategory(groceriesId);
    expect(response.status).toBe(409);
    expect((response.body as { message: string }).message).toMatch(/Archive it/);

    // Archiving stays available and keeps the reference intact.
    expect((await archiveCategory(groceriesId)).status).toBe(200);
    expect((await deleteCategory(groceriesId)).status).toBe(409);
  });

  it('answers 404 for foreign and malformed ids', async () => {
    const other = await signUpUser(testApp.baseUrl, 'categories-delete-foreign');
    const foreignId = await categoryIdByName('Gifts', other);

    for (const id of [foreignId, 'not-a-uuid']) {
      expect((await deleteCategory(id)).status).toBe(404);
    }
  });

  it('requires authentication', async () => {
    const id = await categoryIdByName('Gifts');
    const response = await apiRequest(testApp.baseUrl, {
      method: 'DELETE',
      path: `/api/v1/categories/${id}`,
    });
    expect(response.status).toBe(401);
  });
});

describe('preserving history', () => {
  it('keeps transactions readable through category renames and archives', async () => {
    const accountId = await createWallet();
    const groceriesId = await categoryIdByName('Groceries');
    const created = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: '/api/v1/transactions',
      body: {
        type: 'EXPENSE',
        amount: '10.00',
        occurredDate: '2026-10-17',
        accountId,
        categoryId: groceriesId,
      },
    });
    const transactionId = (created.body as { id: string }).id;

    expect((await patchCategory(groceriesId, { name: 'Food shopping' })).status).toBe(200);
    expect((await archiveCategory(groceriesId)).status).toBe(200);

    const fetched = await authed(testApp.baseUrl, user, {
      path: `/api/v1/transactions/${transactionId}`,
    });
    expect(fetched.status).toBe(200);
    expect(fetched.body).toMatchObject({ categoryId: groceriesId });
  });
});

describe('user isolation', () => {
  it('lists only the caller’s categories and hides foreign mutations', async () => {
    const other = await signUpUser(testApp.baseUrl, 'categories-isolated');
    const created = await createCategoryRequest({ name: 'Private', type: 'EXPENSE' });
    const privateId = (created.body as { id: string }).id;

    const otherList = itemsOf(await listCategories('', other));
    expect(otherList).toHaveLength(DEFAULT_NAMES.length);
    expect(otherList.some((item) => item.name === 'Private')).toBe(false);

    expect((await deleteCategory(privateId, other)).status).toBe(404);
    expect((await patchCategory(privateId, { name: 'Hijacked' }, other)).status).toBe(404);

    const stillMine = itemsOf(await listCategories()).find((item) => item.id === privateId);
    expect(stillMine?.name).toBe('Private');
  });
});
