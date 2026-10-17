import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrismaClient, resetDatabase } from './harness';
import { apiRequest, startTestApp, type TestApp } from './http-test-app';
import { authed, signUpUser, type TestAccount } from './auth-session';

/**
 * IT-4 accounts acceptance against real PostgreSQL: full CRUD over HTTP,
 * derived balances from persisted rows, the opening-balance freeze,
 * archive semantics, name conflicts, and cross-user isolation. The
 * `account_userId_name_lower_key` index and the transaction CHECK
 * constraints below are database-enforced, never mocked.
 */

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
  user = await signUpUser(testApp.baseUrl, 'accounts');
});

async function createAccount(body: Record<string, unknown>, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/accounts',
    body,
  });
}

describe('POST /api/v1/accounts', () => {
  it('creates an account with contract-string money', async () => {
    const response = await createAccount({
      name: 'Cash',
      type: 'CASH',
      currency: 'BDT',
      openingBalance: '5000.00',
    });

    expect(response.status).toBe(201);
    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'Cash',
      type: 'CASH',
      status: 'ACTIVE',
      currency: 'BDT',
      openingBalanceMinor: '500000',
      balanceMinor: '500000',
      archivedAt: null,
    });
    expect(typeof body.id).toBe('string');
  });

  it('rejects duplicate names case-insensitively with 409', async () => {
    await createAccount({ name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '0' });
    const response = await createAccount({
      name: 'CASH',
      type: 'BANK',
      currency: 'BDT',
      openingBalance: '0',
    });
    expect(response.status).toBe(409);
  });

  it('rejects malformed money, unknown types, and non-BDT currency', async () => {
    for (const body of [
      { name: 'A', type: 'CASH', currency: 'BDT', openingBalance: '1.234' },
      { name: 'A', type: 'CRYPTO', currency: 'BDT', openingBalance: '0' },
      { name: 'A', type: 'CASH', currency: 'USD', openingBalance: '0' },
      { name: '', type: 'CASH', currency: 'BDT', openingBalance: '0' },
    ]) {
      const response = await createAccount(body);
      expect(response.status).toBe(400);
    }
  });

  it('requires authentication', async () => {
    const response = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/accounts',
      body: { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '0' },
    });
    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/accounts', () => {
  it('lists only the caller’s accounts with derived balances', async () => {
    const other = await signUpUser(testApp.baseUrl, 'accounts-other');
    await createAccount(
      { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '100.00' },
      other,
    );
    await createAccount({ name: 'Bank', type: 'BANK', currency: 'BDT', openingBalance: '50.00' });

    const response = await authed(testApp.baseUrl, user, {
      path: '/api/v1/accounts',
    });
    expect(response.status).toBe(200);
    const items = response.body as Array<{ name: string; balanceMinor: string }>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Bank', balanceMinor: '5000' });
  });

  it('answers 404 for foreign and malformed ids', async () => {
    const other = await signUpUser(testApp.baseUrl, 'accounts-foreign');
    const created = await createAccount(
      { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '0' },
      other,
    );
    const id = (created.body as { id: string }).id;

    for (const path of [`/api/v1/accounts/${id}`, '/api/v1/accounts/not-a-uuid']) {
      const response = await authed(testApp.baseUrl, user, { path });
      expect(response.status).toBe(404);
    }
  });
});

describe('PATCH /api/v1/accounts/:id', () => {
  it('renames and corrects the opening balance of an empty account', async () => {
    const created = await createAccount({
      name: 'Cash',
      type: 'CASH',
      currency: 'BDT',
      openingBalance: '100.00',
    });
    const id = (created.body as { id: string }).id;

    const response = await authed(testApp.baseUrl, user, {
      method: 'PATCH',
      path: `/api/v1/accounts/${id}`,
      body: { name: 'Wallet', openingBalance: '150.00' },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: 'Wallet',
      openingBalanceMinor: '15000',
      balanceMinor: '15000',
    });
  });
});

describe('archive lifecycle', () => {
  it('archives with a timestamp and unarchives cleanly', async () => {
    const created = await createAccount({
      name: 'Cash',
      type: 'CASH',
      currency: 'BDT',
      openingBalance: '0',
    });
    const id = (created.body as { id: string }).id;

    const archived = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/accounts/${id}/archive`,
    });
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({ status: 'ARCHIVED' });
    expect(typeof (archived.body as { archivedAt: unknown }).archivedAt).toBe('string');

    const unarchived = await authed(testApp.baseUrl, user, {
      method: 'POST',
      path: `/api/v1/accounts/${id}/unarchive`,
    });
    expect(unarchived.body).toMatchObject({ status: 'ACTIVE', archivedAt: null });
  });
});
