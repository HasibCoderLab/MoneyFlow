import type {
  CategoryResponse,
  DashboardResponse,
  ReportCategoriesResponse,
  ReportGranularity,
  ReportSummaryResponse,
} from '@moneyflow/contracts';

import { getApiBaseUrl } from './auth-client';

/**
 * Browser-to-API client for the summary/dashboard/report endpoints (IT-8).
 *
 * Like the auth client, requests carry the `HttpOnly` session cookie
 * (`credentials: 'include'`); nothing token-like is stored or placed in a
 * URL. Response payloads are trusted as typed: the API lives in this same
 * repository, its contracts are shared, and behavior is covered by the
 * integration suite — this client never duplicates server validation.
 */

/** Thrown for every summary failure: safe message plus HTTP status (0 = network). */
export class ApiClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

const FALLBACK_MESSAGE = 'Could not load your data. Please try again.';
const UNAVAILABLE_MESSAGE = 'Your data is unavailable right now. Please try again later.';

/** Optional period overrides; omitted values default to the current month. */
export interface SummaryQuery {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  /** IANA timezone override; defaults to `Asia/Dhaka` until IT-11. */
  readonly timezone?: string;
}

function readMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const message = (body as Record<string, unknown>).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return FALLBACK_MESSAGE;
}

function queryString(params: {
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
  granularity?: ReportGranularity;
  recentLimit?: number;
}): string {
  const search = new URLSearchParams();
  if (params.dateFrom !== undefined) {
    search.set('dateFrom', params.dateFrom);
  }
  if (params.dateTo !== undefined) {
    search.set('dateTo', params.dateTo);
  }
  if (params.timezone !== undefined) {
    search.set('timezone', params.timezone);
  }
  if (params.granularity !== undefined) {
    search.set('granularity', params.granularity);
  }
  if (params.recentLimit !== undefined) {
    search.set('recentLimit', String(params.recentLimit));
  }
  const text = search.toString();
  return text.length > 0 ? `?${text}` : '';
}

async function getJson<T>(path: string): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiClientError(UNAVAILABLE_MESSAGE, 0);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new ApiClientError(UNAVAILABLE_MESSAGE, 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(readMessage(body), response.status);
  }
  return body as T;
}

/** `GET /api/v1/dashboard` — every figure the dashboard widgets render. */
export function fetchDashboard(query: SummaryQuery = {}): Promise<DashboardResponse> {
  return getJson<DashboardResponse>(`/api/v1/dashboard${queryString(query)}`);
}

/** `GET /api/v1/reports/summary` — period totals plus a bucketed series. */
export function fetchReportSummary(
  query: SummaryQuery = {},
  granularity: ReportGranularity = 'daily',
): Promise<ReportSummaryResponse> {
  return getJson<ReportSummaryResponse>(
    `/api/v1/reports/summary${queryString({ ...query, granularity })}`,
  );
}

/** `GET /api/v1/reports/categories` — period expenses by category. */
export function fetchReportCategories(query: SummaryQuery = {}): Promise<ReportCategoriesResponse> {
  return getJson<ReportCategoriesResponse>(`/api/v1/reports/categories${queryString(query)}`);
}

/**
 * `GET /api/v1/categories` — the caller's category taxonomy (IT-5 API),
 * including archived rows so the categories page can keep history visible.
 * The flag is sent explicitly: the API accepts only literal `true`/`false`.
 */
export function fetchCategories(includeArchived = true): Promise<CategoryResponse[]> {
  const flag = includeArchived ? 'true' : 'false';
  return getJson<CategoryResponse[]>(`/api/v1/categories?includeArchived=${flag}`);
}
