import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiClientError,
  createAccount,
  createBudget,
  createTransaction,
  deleteBudget,
  deleteTransaction,
  fetchAccounts,
  fetchBudgets,
  fetchCategories,
  fetchDashboard,
  fetchDashboardLayout,
  fetchMe,
  fetchPreferences,
  fetchReportCategories,
  fetchReportSummary,
  fetchTransactions,
  moveAccount,
  moveBudget,
  resetDashboardLayout,
  saveDashboardLayout,
  updateAccount,
  updateBudget,
  updateMe,
  updatePreferences,
  updateTransaction,
} from './api-client';

const BASE_URL = 'http://localhost:4000';

function mockFetchOnce(response: { ok?: boolean; status?: number; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json:
      response.body === undefined
        ? () => Promise.reject(new Error('empty'))
        : () => Promise.resolve(response.body),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function catchApiError(task: Promise<unknown>): Promise<ApiClientError> {
  try {
    await task;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiClientError);
    return error as ApiClientError;
  }
  throw new Error('Expected the API call to fail.');
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
  vi.unstubAllGlobals();
});

describe('fetchDashboard', () => {
  it('requests the dashboard with the session cookie and no default query', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { totalTrackedBalanceMinor: '0' } });

    const body = await fetchDashboard();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/v1/dashboard`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    expect(body).toEqual({ totalTrackedBalanceMinor: '0' });
  });

  it('serializes explicit period overrides', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: {} });

    await fetchDashboard({ dateFrom: '2026-02-01', dateTo: '2026-02-28', timezone: 'Asia/Dhaka' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/dashboard?dateFrom=2026-02-01&dateTo=2026-02-28&timezone=Asia%2FDhaka`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

describe('fetchReportSummary', () => {
  it('always sends an explicit granularity', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { series: [] } });

    await fetchReportSummary({}, 'weekly');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/reports/summary?granularity=weekly`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

describe('fetchReportCategories', () => {
  it('requests the category breakdown for the default period', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { categories: [] } });

    await fetchReportCategories();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/reports/categories`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

describe('fetchCategories', () => {
  it('requests the taxonomy with an explicit archived flag', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: [] });

    await fetchCategories(true);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/categories?includeArchived=true`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

describe('error handling', () => {
  it('surfaces the safe server message with its status', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    mockFetchOnce({ ok: false, status: 401, body: { message: 'Authentication required.' } });

    const error = await catchApiError(fetchDashboard());

    expect(error.status).toBe(401);
    expect(error.message).toBe('Authentication required.');
  });

  it('falls back to generic copy when the error body is missing or shapeless', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    mockFetchOnce({ ok: false, status: 500 });

    const error = await catchApiError(fetchReportSummary());

    expect(error.status).toBe(500);
    expect(error.message).toBe('Could not load your data. Please try again.');
  });

  it('reports a network failure as status 0 with retryable copy', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const error = await catchApiError(fetchDashboard());

    expect(error.status).toBe(0);
    expect(error.message).toContain('unavailable');
  });

  it('fails closed (status 0) when the API URL is not configured, without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const error = await catchApiError(fetchDashboard());

    expect(error.status).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('budget client (IT-9)', () => {
  it('fetches budgets with an explicit includeArchived flag and the session cookie', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: [] });

    await fetchBudgets();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/v1/budgets?includeArchived=false`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });

    await fetchBudgets(true);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/budgets?includeArchived=true`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('POSTs a create body as JSON and returns the created budget', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ status: 201, body: { id: 'b1' } });

    const body = await createBudget({
      name: 'October plan',
      startDate: '2026-10-01',
      totalLimit: '8000',
      categoryLimits: [{ categoryId: 'c1', limit: '5000' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/budgets`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          name: 'October plan',
          startDate: '2026-10-01',
          totalLimit: '8000',
          categoryLimits: [{ categoryId: 'c1', limit: '5000' }],
        }),
      }),
    );
    expect(body).toEqual({ id: 'b1' });
  });

  it('PATCHes edits, POSTs status moves, and DELETEs with the right verbs', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { id: 'b1' } });

    await updateBudget('b1', { name: 'Renamed', totalLimit: null });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/budgets/b1`,
      expect.objectContaining({ method: 'PATCH' }),
    );

    await moveBudget('b1', 'pause');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/budgets/b1/pause`,
      expect.objectContaining({ method: 'POST' }),
    );

    await deleteBudget('b1');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/budgets/b1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces the server message with its status on failure', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    mockFetchOnce({
      ok: false,
      status: 409,
      body: {
        message: 'Another active budget already limits one of these categories for this month.',
      },
    });

    const error = await catchApiError(
      createBudget({
        name: 'X',
        startDate: '2026-10-01',
        categoryLimits: [{ categoryId: 'c1', limit: '1' }],
      }),
    );

    expect(error.status).toBe(409);
    expect(error.message).toContain('already limits');
  });
});

describe('profile client (IT-3/IT-11)', () => {
  it('loads the caller profile with the session cookie', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { id: 'u1' } });

    const profile = await fetchMe();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/v1/me`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    expect(profile).toEqual({ id: 'u1' });
  });

  it('PATCHes only the display name', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { name: 'Hasib' } });

    await updateMe({ name: 'Hasib' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/me`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Hasib' }),
      }),
    );
  });
});

describe('preferences and layout client (IT-11)', () => {
  it('GETs preferences and PATCHes partial updates', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { locale: 'en' } });

    await fetchPreferences();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/preferences`,
      expect.objectContaining({ credentials: 'include' }),
    );

    await updatePreferences({ theme: 'DARK' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/preferences`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ theme: 'DARK' }),
      }),
    );
  });

  it('GETs, PUTs, and resets the dashboard layout with the right verbs', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { widgets: [] } });

    await fetchDashboardLayout();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/dashboard/layout`,
      expect.objectContaining({ credentials: 'include' }),
    );

    const body = { widgets: [{ id: 'income' as const, visible: true }] };
    await saveDashboardLayout(body);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/dashboard/layout`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    );

    await resetDashboardLayout();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/dashboard/layout/reset`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('accounts client (IT-4)', () => {
  it('lists accounts with the session cookie', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: [] });

    await fetchAccounts();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/v1/accounts`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('POSTs a create body and PATCHes renames', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ status: 201, body: { id: 'a1' } });

    await createAccount({
      name: 'Cash',
      type: 'CASH',
      currency: 'BDT',
      openingBalance: '1500.50',
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/accounts`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Cash',
          type: 'CASH',
          currency: 'BDT',
          openingBalance: '1500.50',
        }),
      }),
    );

    await updateAccount('a1', { name: 'Wallet cash' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/accounts/a1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Wallet cash' }),
      }),
    );
  });

  it('archives and unarchives through the status endpoints', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { id: 'a1' } });

    await moveAccount('a1', 'archive');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/accounts/a1/archive`,
      expect.objectContaining({ method: 'POST' }),
    );

    await moveAccount('a1', 'unarchive');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/accounts/a1/unarchive`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('transactions client (IT-4/IT-6/IT-7)', () => {
  it('serializes only the provided list filters and paging', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { items: [], nextOffset: null, total: 0 } });

    await fetchTransactions({
      type: 'EXPENSE',
      accountId: 'a1',
      dateFrom: '2026-10-01',
      timezone: 'Asia/Dhaka',
      limit: 20,
      offset: 40,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/transactions?type=EXPENSE&accountId=a1&dateFrom=2026-10-01&timezone=Asia%2FDhaka&limit=20&offset=40`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('POSTs a create body with an idempotency key', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ status: 201, body: { id: 't1' } });
    const body = {
      type: 'EXPENSE' as const,
      amount: '350.50',
      occurredDate: '2026-10-20',
      timezone: 'Asia/Dhaka',
      accountId: 'a1',
      categoryId: 'c1',
      note: 'Groceries',
    };

    await createTransaction(body, 'key-1');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/transactions`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': 'key-1',
        },
        body: JSON.stringify(body),
      }),
    );
  });

  it('PATCHes edits and DELETEs records', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({ body: { id: 't1' } });

    await updateTransaction('t1', { amount: '99', occurredDate: '2026-10-19' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/transactions/t1`,
      expect.objectContaining({ method: 'PATCH' }),
    );

    await deleteTransaction('t1');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/transactions/t1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
