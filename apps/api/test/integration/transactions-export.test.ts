import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createCategory, createTestPrismaClient, resetDatabase } from './harness';
import { startTestApp, type TestApp } from './http-test-app';
import { authed, signUpUser, type TestAccount } from './auth-session';

/**
 * IT-12 CSV export acceptance against real PostgreSQL (ADR-0011): the exact
 * downloaded bytes (UTF-8 BOM, CRLF, RFC 4180 quoting, formula
 * neutralization), deterministic keyset order, shared list filters, user
 * isolation, response headers, auditing, and the per-user rate limit.
 */

const prisma = createTestPrismaClient();
let testApp: TestApp;
let user: TestAccount;
let cashId = '';

const HEADER =
  '\uFEFF"occurred_at_utc","type","amount","currency","account","from_account","to_account",' +
  '"category","adjustment_direction","note"\r\n';

interface RawExport {
  status: number;
  headers: Headers;
  bytes: Buffer;
  text: string;
}

async function download(account: TestAccount | null, query = ''): Promise<RawExport> {
  const response = await fetch(`${testApp.baseUrl}/api/v1/transactions/export${query}`, {
    headers: account ? { cookie: account.cookie } : {},
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    headers: response.headers,
    bytes,
    text: bytes.toString('utf8'),
  };
}

function dhakaDate(offsetDays: number): string {
  const instant = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function postTransaction(body: Record<string, unknown>, account: TestAccount = user) {
  return authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/transactions',
    body,
  });
}

async function createAccount(
  account: TestAccount,
  name: string,
  currency = 'BDT',
): Promise<string> {
  const response = await authed(testApp.baseUrl, account, {
    method: 'POST',
    path: '/api/v1/accounts',
    body: { name, type: 'CASH', currency, openingBalance: '0' },
  });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

async function createCategoryFor(
  account: TestAccount,
  name: string,
  type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
): Promise<string> {
  return (
    await createCategory(prisma, account.userId, {
      name,
      nameKey: `export-${name.toLowerCase()}-${Date.now()}-${Math.random()}`,
      type,
    })
  ).id;
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
  user = await signUpUser(testApp.baseUrl, 'export');
  cashId = await createAccount(user, 'Cash');
});

describe('GET /api/v1/transactions/export', () => {
  it('requires a verified session and records nothing when unauthenticated', async () => {
    const response = await download(null);

    expect(response.status).toBe(401);
    expect(await prisma.auditEvent.count()).toBe(0);
  });

  it('downloads a header-only file with the documented response headers', async () => {
    const response = await download(user);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="moneyflow-transactions-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect([...response.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(response.text).toBe(HEADER);

    const audit = await prisma.auditEvent.findMany();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      userId: user.userId,
      type: 'DATA_EXPORT_REQUESTED',
      resourceType: 'transactions_export',
      metadata: { format: 'csv' },
    });
  });

  it('encodes persisted money and text exactly, neutrally, and only for the owner', async () => {
    const categoryId = await createCategoryFor(user, '=Food & dining');
    const created = await postTransaction({
      type: 'EXPENSE',
      amount: '12.5',
      occurredDate: dhakaDate(-3),
      occurredTime: '09:30',
      accountId: cashId,
      categoryId,
      note: '+SUM(A1)\r\n"quoted", বাজার',
    });
    expect(created.status).toBe(201);
    const occurredAt = (created.body as { occurredAt: string }).occurredAt;

    const other = await signUpUser(testApp.baseUrl, 'export-foreign');
    const otherAccount = await createAccount(other, 'Foreign Cash');
    const otherCategory = await createCategoryFor(other, 'Foreign Category');
    const foreign = await postTransaction(
      {
        type: 'EXPENSE',
        amount: '999999',
        occurredDate: dhakaDate(-3),
        occurredTime: '10:30',
        accountId: otherAccount,
        categoryId: otherCategory,
        note: 'FOREIGN SECRET',
      },
      other,
    );
    expect(foreign.status).toBe(201);

    const response = await download(user);
    expect(response.status).toBe(200);
    expect(response.text).toBe(
      `${HEADER}` +
        `"${occurredAt}","EXPENSE","12.50","BDT","Cash","","","'=Food & dining","",` +
        `"'+SUM(A1)\r\n""quoted"", বাজার"\r\n`,
    );
    expect(response.text).not.toContain('9999.99');
    expect(response.text).not.toContain('FOREIGN SECRET');
    expect(response.text).not.toContain((created.body as { id: string }).id);

    const foreignResponse = await download(other);
    expect(foreignResponse.text).not.toContain('12.50');
    expect(foreignResponse.text).not.toContain('=Food');
    expect(foreignResponse.text).toContain('FOREIGN SECRET');
  });

  it('maps income, transfer, and adjustment columns in occurredAt DESC, id DESC order', async () => {
    const day = dhakaDate(-5);
    const incomeCategory = await createCategoryFor(user, 'Salary', 'INCOME');
    const bankId = await createAccount(user, 'Bank');

    const income = await postTransaction({
      type: 'INCOME',
      amount: '100',
      occurredDate: day,
      occurredTime: '10:00',
      accountId: cashId,
      categoryId: incomeCategory,
      note: 'Monthly salary',
    });
    const transfer = await postTransaction({
      type: 'TRANSFER',
      amount: '200',
      occurredDate: day,
      occurredTime: '11:00',
      fromAccountId: cashId,
      toAccountId: bankId,
    });
    const adjustment = await postTransaction({
      type: 'ADJUSTMENT',
      amount: '30',
      occurredDate: day,
      occurredTime: '12:00',
      accountId: cashId,
      direction: 'DECREASE',
      note: 'Cash count',
    });
    for (const response of [income, transfer, adjustment]) {
      expect(response.status).toBe(201);
    }

    const response = await download(user);
    const lines = response.text.replace(HEADER, '').split('\r\n').filter(Boolean);
    expect(lines).toEqual([
      `"${(adjustment.body as { occurredAt: string }).occurredAt}","ADJUSTMENT","30.00","BDT","Cash","","","","DECREASE","Cash count"`,
      `"${(transfer.body as { occurredAt: string }).occurredAt}","TRANSFER","200.00","BDT","","Cash","Bank","","",""`,
      `"${(income.body as { occurredAt: string }).occurredAt}","INCOME","100.00","BDT","Cash","","","Salary","","Monthly salary"`,
    ]);

    // The list and the export agree on order for the same rows.
    const list = await authed(testApp.baseUrl, user, {
      path: '/api/v1/transactions?limit=100',
    });
    const listed = (list.body as { items: Array<{ occurredAt: string; type: string }> }).items;
    expect(listed.map((row) => `${row.occurredAt}:${row.type}`)).toEqual(
      lines.map((line) => {
        const cells = line.split('","');
        return `${cells[0]?.slice(1)}:${cells[1]}`;
      }),
    );
  });

  it('applies the same filters as the list, ignores paging, and scopes account filters', async () => {
    const groceriesId = await createCategoryFor(user, 'Groceries');
    const day = dhakaDate(-10);
    await postTransaction({
      type: 'EXPENSE',
      amount: '40',
      occurredDate: day,
      accountId: cashId,
      categoryId: groceriesId,
    });
    await postTransaction({
      type: 'EXPENSE',
      amount: '10',
      occurredDate: dhakaDate(-10),
      accountId: cashId,
      categoryId: groceriesId,
    });
    await postTransaction({
      type: 'EXPENSE',
      amount: '25',
      occurredDate: dhakaDate(-9),
      accountId: cashId,
      categoryId: groceriesId,
    });
    const salaryId = await createCategoryFor(user, 'Salary', 'INCOME');
    await postTransaction({
      type: 'INCOME',
      amount: '1000',
      occurredDate: dhakaDate(-10),
      accountId: cashId,
      categoryId: salaryId,
    });

    const query =
      `?type=EXPENSE&accountId=${cashId}&categoryId=${groceriesId}` +
      `&dateFrom=${dhakaDate(-10)}&dateTo=${dhakaDate(-10)}` +
      '&timezone=Asia%2FDhaka&minAmount=20&maxAmount=50&limit=1&offset=1';
    const response = await download(user, query);
    const lines = response.text.replace(HEADER, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"40.00"');

    const list = await authed(testApp.baseUrl, user, {
      path: `/api/v1/transactions${query}`,
    });
    expect((list.body as { total: number }).total).toBe(1);

    const other = await signUpUser(testApp.baseUrl, 'export-filter-foreign');
    const foreignAccount = await createAccount(other, 'Foreign');
    const foreign = await download(user, `?accountId=${foreignAccount}`);
    expect(foreign.text).toBe(HEADER);
  });

  it('limits each user to five exports per hour and audits only accepted requests', async () => {
    const other = await signUpUser(testApp.baseUrl, 'export-limit-other');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await download(user)).status).toBe(200);
    }
    const limited = await download(user);
    expect(limited.status).toBe(429);
    expect(JSON.parse(limited.text)).toMatchObject({
      message: 'Too many export requests. Try again later.',
    });
    expect(await prisma.auditEvent.count({ where: { userId: user.userId } })).toBe(5);

    expect((await download(other)).status).toBe(200);
  });

  it('rejects invalid filters before writing an audit event', async () => {
    const response = await download(user, '?dateFrom=2026-13-01');
    expect(response.status).toBe(400);
    expect(await prisma.auditEvent.count()).toBe(0);
  });
});
