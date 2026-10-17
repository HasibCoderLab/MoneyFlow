import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiClientError,
  fetchCategories,
  fetchDashboard,
  fetchReportCategories,
  fetchReportSummary,
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
