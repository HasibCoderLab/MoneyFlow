import type {
  BudgetResponse,
  CategoryResponse,
  CreateBudgetRequest,
  CreateGoalContributionRequest,
  CreateGoalRequest,
  DashboardLayoutResponse,
  DashboardResponse,
  GoalContributionResponse,
  GoalDetailResponse,
  GoalResponse,
  GoalStatusAction,
  MeResponse,
  ReportCategoriesResponse,
  ReportGranularity,
  ReportSummaryResponse,
  UpdateBudgetRequest,
  UpdateDashboardLayoutRequest,
  UpdateGoalRequest,
  UpdateMeRequest,
  UpdateUserPreferencesRequest,
  UserPreferencesResponse,
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

/** Body helper shared by the budget mutations. */
async function sendJson<T>(path: string, method: string, body: unknown): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiClientError(UNAVAILABLE_MESSAGE, 0);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(UNAVAILABLE_MESSAGE, 0);
  }
  const parsed: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(readMessage(parsed), response.status);
  }
  return parsed as T;
}

/** `GET /api/v1/budgets` — the caller's budgets with utilization (IT-9). */
export function fetchBudgets(includeArchived = false): Promise<BudgetResponse[]> {
  return getJson<BudgetResponse[]>(`/api/v1/budgets?includeArchived=${includeArchived}`);
}

/** `POST /api/v1/budgets` — creates a monthly budget. */
export function createBudget(body: CreateBudgetRequest): Promise<BudgetResponse> {
  return sendJson<BudgetResponse>('/api/v1/budgets', 'POST', body);
}

/** `PATCH /api/v1/budgets/:id` — renames, re-anchors, replaces the limit set. */
export function updateBudget(id: string, body: UpdateBudgetRequest): Promise<BudgetResponse> {
  return sendJson<BudgetResponse>(`/api/v1/budgets/${id}`, 'PATCH', body);
}

/** `POST /api/v1/budgets/:id/{pause,resume,archive,unarchive}` — status moves. */
export function moveBudget(
  id: string,
  action: 'pause' | 'resume' | 'archive' | 'unarchive',
): Promise<BudgetResponse> {
  return sendJson<BudgetResponse>(`/api/v1/budgets/${id}/${action}`, 'POST', {});
}

/** `DELETE /api/v1/budgets/:id` — hard delete (limits cascade). */
export function deleteBudget(id: string): Promise<void> {
  return sendJson<void>(`/api/v1/budgets/${id}`, 'DELETE', {});
}

/**
 * `GET /api/v1/goals` — the caller's goals with server-derived progress
 * (IT-10, ADR-0005). `includeArchived=true` keeps archived goals visible with
 * their chip; nothing here is computed in the browser.
 */
export function fetchGoals(includeArchived = true): Promise<GoalResponse[]> {
  const flag = includeArchived ? 'true' : 'false';
  return getJson<GoalResponse[]>(`/api/v1/goals?includeArchived=${flag}`);
}

/** `GET /api/v1/goals/:id` — the goal plus its ledger history. */
export function fetchGoal(id: string): Promise<GoalDetailResponse> {
  return getJson<GoalDetailResponse>(`/api/v1/goals/${id}`);
}

/** `POST /api/v1/goals` — creates a goal (progress starts at zero). */
export function createGoal(body: CreateGoalRequest): Promise<GoalResponse> {
  return sendJson<GoalResponse>('/api/v1/goals', 'POST', body);
}

/** `PATCH /api/v1/goals/:id` — edits plan fields (never status). */
export function updateGoal(id: string, body: UpdateGoalRequest): Promise<GoalResponse> {
  return sendJson<GoalResponse>(`/api/v1/goals/${id}`, 'PATCH', body);
}

/** `DELETE /api/v1/goals/:id` — hard delete (ledger rows cascade). */
export function deleteGoal(id: string): Promise<void> {
  return sendJson<void>(`/api/v1/goals/${id}`, 'DELETE', {});
}

/** `POST /api/v1/goals/:id/{pause,resume,complete,archive,unarchive}`. */
export function moveGoal(id: string, action: GoalStatusAction): Promise<GoalResponse> {
  return sendJson<GoalResponse>(`/api/v1/goals/${id}/${action}`, 'POST', {});
}

/** `POST /api/v1/goals/:id/contributions` — appends an immutable ledger row. */
export function addGoalContribution(
  id: string,
  body: CreateGoalContributionRequest,
): Promise<GoalContributionResponse> {
  return sendJson<GoalContributionResponse>(`/api/v1/goals/${id}/contributions`, 'POST', body);
}

/**
 * `POST /api/v1/goals/:id/contributions/:contributionId/reverse` — appends
 * the linked negative reversal (the only way to remove a contribution).
 */
export function reverseGoalContribution(
  goalId: string,
  contributionId: string,
): Promise<GoalContributionResponse> {
  return sendJson<GoalContributionResponse>(
    `/api/v1/goals/${goalId}/contributions/${contributionId}/reverse`,
    'POST',
    {},
  );
}

// ── IT-11: profile, preferences, and dashboard customization ──────────────

/** `GET /api/v1/me` — the signed-in user's own safe profile projection. */
export function fetchMe(): Promise<MeResponse> {
  return getJson<MeResponse>('/api/v1/me');
}

/** `PATCH /api/v1/me` — updates only the display name (session-derived id). */
export function updateMe(body: UpdateMeRequest): Promise<MeResponse> {
  return sendJson<MeResponse>('/api/v1/me', 'PATCH', body);
}

/** `GET /api/v1/preferences` — saved values or documented server defaults. */
export function fetchPreferences(): Promise<UserPreferencesResponse> {
  return getJson<UserPreferencesResponse>('/api/v1/preferences');
}

/** `PATCH /api/v1/preferences` — partial update; omitted values are kept. */
export function updatePreferences(
  body: UpdateUserPreferencesRequest,
): Promise<UserPreferencesResponse> {
  return sendJson<UserPreferencesResponse>('/api/v1/preferences', 'PATCH', body);
}

/** `GET /api/v1/dashboard/layout` — saved layout or the default. */
export function fetchDashboardLayout(): Promise<DashboardLayoutResponse> {
  return getJson<DashboardLayoutResponse>('/api/v1/dashboard/layout');
}

/** `PUT /api/v1/dashboard/layout` — replaces the single saved layout. */
export function saveDashboardLayout(
  body: UpdateDashboardLayoutRequest,
): Promise<DashboardLayoutResponse> {
  return sendJson<DashboardLayoutResponse>('/api/v1/dashboard/layout', 'PUT', body);
}

/** `POST /api/v1/dashboard/layout/reset` — deletes the saved layout. */
export function resetDashboardLayout(): Promise<DashboardLayoutResponse> {
  return sendJson<DashboardLayoutResponse>('/api/v1/dashboard/layout/reset', 'POST', {});
}
