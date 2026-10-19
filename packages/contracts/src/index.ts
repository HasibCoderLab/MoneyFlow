/**
 * Shared API contract types for MoneyFlow.
 *
 * Rules (requirements.md §8.2, §9.3):
 * - Contracts describe public request/response shapes only.
 * - Never expose ORM entities or database internals through this package.
 * - Monetary values crossing the API boundary use the DR-01 representation:
 *   request inputs accept canonical decimal strings (accounting-rules.md §3
 *   rule 1); every persisted or derived figure is returned as a minor-unit
 *   integer string (`toContractString`), never a JSON number.
 */

/** Base path for every versioned REST endpoint (requirements.md §8.5). */
export const API_BASE_PATH = '/api/v1';

/** Readiness of the database connection as seen by the API process. */
export type DatabaseStatus = 'up' | 'down' | 'not_configured';

/** Successful response of `GET /api/v1/health`. */
export interface HealthResponse {
  /** `ok` when every checked dependency is ready; `degraded` otherwise. */
  status: 'ok' | 'degraded';
  service: string;
  database: DatabaseStatus;
}

/**
 * Consistent error payload for API failures (requirements.md §8.5):
 * a safe human-readable message plus an optional trace/request ID.
 * Stack traces, SQL details, and secrets must never appear here.
 */
export interface ApiErrorResponse {
  message: string;
  traceId?: string;
}

/**
 * Base path of the Better Auth HTTP handler mounted inside the API
 * (ADR-0006; docs/architecture/auth-sessions.md). Better Auth serves its
 * documented endpoints beneath this path, e.g.
 * `POST {AUTH_BASE_PATH}/sign-up/email`, `POST {AUTH_BASE_PATH}/sign-in/email`,
 * `POST {AUTH_BASE_PATH}/sign-out`, `GET {AUTH_BASE_PATH}/get-session`.
 */
export const AUTH_BASE_PATH = `${API_BASE_PATH}/auth`;

/**
 * Public identity of the authenticated user (`GET /api/v1/me`).
 * Never contains credentials, tokens, or session internals.
 */
export interface MeResponse {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/**
 * Body of `PATCH /api/v1/me`. Only the display name can be changed in
 * IT-3; the server ignores unknown fields and never accepts a user id
 * (identity always comes from the verified session).
 */
export interface UpdateMeRequest {
  /** Trimmed display name, 1–100 characters. */
  name: string;
}

// ── IT-4: accounts & transactions ─────────────────────────────────────────
// Request money arrives as canonical decimal strings (e.g. `"3500.00"`;
// opening balances may carry one leading `-`); every money figure in a
// response is a minor-unit integer string (e.g. `"350000"`, possibly
// negative for derived balances). See accounting-rules.md §3 rule 1, §11.2.

/** Account kinds (requirements.md §5.3). */
export type AccountType = 'CASH' | 'BANK' | 'MOBILE_WALLET' | 'SAVINGS' | 'OTHER';

/** Account lifecycle state: archiving preserves history (requirements.md §5.3). */
export type AccountStatus = 'ACTIVE' | 'ARCHIVED';

/** Transaction direction; derived from `type`, never from a typed sign. */
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT';

/** `POST /api/v1/accounts` body. */
export interface CreateAccountRequest {
  /** Trimmed display name, 1–80 characters, unique per user (case-insensitive). */
  name: string;
  type: AccountType;
  /** ISO 4217 code; BDT only in MVP (DR-01/DR-08). */
  currency: string;
  /** Signed decimal string; immutable once the account has transactions. */
  openingBalance: string;
}

/** `PATCH /api/v1/accounts/:id` body. All fields optional. */
export interface UpdateAccountRequest {
  name?: string;
  /** Only while the account has zero transactions; else `OPENING_BALANCE_FROZEN`. */
  openingBalance?: string;
}

/** An account with its derived balance (opening + signed effects). */
export interface AccountResponse {
  id: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  currency: string;
  /** Minor-unit contract strings; `balanceMinor` may be negative. */
  openingBalanceMinor: string;
  balanceMinor: string;
  /** ISO 8601 timestamp, or null while active. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Adjustment direction for `ADJUSTMENT` transactions (accounting-rules.md §11.4). */
export type AdjustmentDirection = 'INCREASE' | 'DECREASE';

/** `POST /api/v1/transactions` body. */
export interface CreateTransactionRequest {
  type: TransactionType;
  /** Unsigned decimal string, strictly greater than zero. */
  amount: string;
  /** Local calendar date `YYYY-MM-DD` in `timezone`. */
  occurredDate: string;
  /** Optional local time `HH:mm`; date-only entries anchor at local noon. */
  occurredTime?: string;
  /** IANA timezone; defaults to `Asia/Dhaka` until IT-11 preferences land. */
  timezone?: string;
  /** Required for INCOME/EXPENSE/ADJUSTMENT. */
  accountId?: string;
  /** Required for INCOME/EXPENSE (type must match); forbidden otherwise. */
  categoryId?: string;
  /** Required for TRANSFER (distinct, same currency, active accounts). */
  fromAccountId?: string;
  toAccountId?: string;
  /** Required for ADJUSTMENT. */
  direction?: AdjustmentDirection;
  /** Optional for INCOME/EXPENSE/TRANSFER (≤500 chars); required for ADJUSTMENT. */
  note?: string;
}

/**
 * `PATCH /api/v1/transactions/:id` body. Same shape as creation except
 * `type` is immutable — changing it means delete + recreate (§4.2).
 */
export type UpdateTransactionRequest = Omit<CreateTransactionRequest, 'type'>;

/** A persisted transaction; money as minor-unit contract strings. */
export interface TransactionResponse {
  id: string;
  type: TransactionType;
  amountMinor: string;
  currency: string;
  /** Resolved UTC instant, ISO 8601. */
  occurredAt: string;
  accountId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  /** `1` (increase) or `-1` (decrease) for ADJUSTMENT; null otherwise. */
  adjustmentSign: 1 | -1 | null;
  note: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /api/v1/transactions` response: stable order, offset page. */
export interface TransactionListResponse {
  /** `occurredAt DESC, id DESC` (accounting-rules.md §9). */
  items: TransactionResponse[];
  /** Pass as `offset` for the next page; null at the end. */
  nextOffset: number | null;
  /** Total rows matching the filters (for honest empty states). */
  total: number;
}

// ── IT-5: categories ──────────────────────────────────────────────────────
// Default categories are cloned per user at first sign-in from the
// owner-approved seed list (requirements.md §5.5, domain-model.md); users
// can create, rename, recolour, archive, and — only while unreferenced —
// delete their own categories.

/** Category kinds; a category applies to exactly one side of the ledger. */
export type CategoryType = 'INCOME' | 'EXPENSE';

/** Category lifecycle; archiving keeps historical reports readable (§5.5). */
export type CategoryStatus = 'ACTIVE' | 'ARCHIVED';

/** `POST /api/v1/categories` body. */
export interface CreateCategoryRequest {
  /** Trimmed display name, 1–60 characters, unique per user within the type. */
  name: string;
  type: CategoryType;
  /** Optional `#RRGGBB` UI hint; never the sole carrier of meaning (§5.5). */
  color?: string;
}

/** `PATCH /api/v1/categories/:id` body; `type` is immutable. */
export interface UpdateCategoryRequest {
  name?: string;
  /** `null` clears the colour; `#RRGGBB` sets it; omitted leaves it unchanged. */
  color?: string | null;
}

/** A category owned by the authenticated user. */
export interface CategoryResponse {
  id: string;
  name: string;
  type: CategoryType;
  /** `#RRGGBB`, or null when the user never picked one. */
  color: string | null;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

// ── IT-8: summaries, dashboard, reports ───────────────────────────────────
// All aggregates are computed from the caller's own completed records with
// the same accounting rules as balances (accounting-rules.md §9): transfers
// and adjustments are excluded from income/expense totals, opening balances
// never count as income, and period boundaries are half-open in the resolved
// IANA timezone (§6). Every money figure is a minor-unit integer string
// (§11.1), including values beyond `Number.MAX_SAFE_INTEGER`.

/** Aggregation granularity for report series (implementation-plan.md IT-8). */
export type ReportGranularity = 'daily' | 'weekly' | 'monthly';

/** Supported week starts; Saturday is the `bn-BD` default (DR-11). */
export type WeekStartsOn = 'SATURDAY';

/** The reporting period every summary figure is computed for. */
export interface SummaryPeriod {
  /** Local calendar date `YYYY-MM-DD`, inclusive. */
  dateFrom: string;
  /** Local calendar date `YYYY-MM-DD`, inclusive. */
  dateTo: string;
  /**
   * Resolved IANA timezone used for the boundaries (default `Asia/Dhaka`
   * until IT-11 preferences exist).
   */
  timezone: string;
  /** Single-currency MVP rule (ADR-0003/DR-08); never silently converted. */
  currency: string;
}

/**
 * Completed income/expense totals for the period. Transfers and adjustments
 * are excluded and opening balances never appear here (§9.4).
 */
export interface SummaryTotals {
  incomeMinor: string;
  expenseMinor: string;
  /**
   * Qualifying INCOME/EXPENSE rows in the period — distinguishes an empty
   * period from a real zero so the UI can render honest empty states (§5.10).
   */
  transactionCount: number;
}

/**
 * One expense category in a period. Archived categories stay readable in
 * historical totals (§5.5); colour is decoration only.
 */
export interface CategorySpendSummary {
  categoryId: string;
  name: string;
  /** `#RRGGBB` hint, or null; meaning is always carried by the name (§5.5). */
  color: string | null;
  status: CategoryStatus;
  expenseMinor: string;
  /**
   * Percentage ×10 (`"267"` displays as 26.7%), half-up at the last display
   * step (§7); null when the period total is zero ("not set").
   */
  percentTimes10: string | null;
}

/** Bounded recent-activity row enriched for display (IT-8). */
export interface RecentSummaryTransaction {
  id: string;
  type: TransactionType;
  amountMinor: string;
  currency: string;
  /** Resolved UTC instant, ISO 8601. */
  occurredAt: string;
  /** `1` (increase) or `-1` (decrease) for ADJUSTMENT; null otherwise. */
  adjustmentSign: 1 | -1 | null;
  note: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

/** `GET /api/v1/dashboard` response (requirements.md §5.6, §8.6). */
export interface DashboardResponse {
  period: SummaryPeriod;
  /**
   * Σ derived balances of ACTIVE accounts; archived accounts are excluded
   * but stay viewable in Accounts (§9.4).
   */
  totalTrackedBalanceMinor: string;
  /** Honest empty-state context; never a fabricated figure (§5.6). */
  activeAccountCount: number;
  totals: SummaryTotals;
  /**
   * Latest activity overall (not limited to `period`), ordered
   * `occurredAt DESC, id DESC` and bounded by `recentLimit` (default 5).
   */
  recentTransactions: RecentSummaryTransaction[];
  /** Period expenses by category, largest first (`amount DESC, categoryId ASC`). */
  spendingByCategory: CategorySpendSummary[];
}

/** One series bucket; sparse — only periods with qualifying activity appear. */
export interface ReportSeriesBucket {
  /** Local calendar dates `YYYY-MM-DD`, inclusive on both ends. */
  startDate: string;
  endDate: string;
  incomeMinor: string;
  expenseMinor: string;
}

/** `GET /api/v1/reports/summary` response (requirements.md §5.10). */
export interface ReportSummaryResponse {
  period: SummaryPeriod;
  totals: SummaryTotals;
  granularity: ReportGranularity;
  /** Present only for weekly series (DR-11 default, owner-confirmed). */
  weekStartsOn: WeekStartsOn | null;
  series: ReportSeriesBucket[];
}

/** `GET /api/v1/reports/categories` response (requirements.md §5.10). */
export interface ReportCategoriesResponse {
  period: SummaryPeriod;
  totalExpenseMinor: string;
  categories: CategorySpendSummary[];
}

// ── IT-9: budgets ──────────────────────────────────────────────────────────
// Budgets are monthly spending plans per the accepted model
// (requirements.md §5.9/§9.1, domain-model.md "Budget and
// BudgetCategoryLimit", accounting-rules.md §1.1/§6/§7/§9). Spent figures
// count qualifying EXPENSE transactions in the budget's local-month period
// only — transfers, income, and adjustments never count; refunds subtract
// when the REFUND type exists. Every money figure is a minor-unit integer
// string (§11.1); remaining amounts are never clamped, so an overspend is
// shown truthfully as a negative remainder and a percentage above 100%.

/** Budget period granularity; only monthly exists in the MVP (V1: weekly/yearly). */
export type BudgetPeriod = 'MONTHLY';

/** Budget lifecycle (domain-model.md). Paused budgets are on hold, archived budgets are history. */
export type BudgetStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

/**
 * Utilization figures for one limit (a budget's total or a category limit).
 * All money is minor-unit strings; percentages are display-only, half-up to
 * one decimal (§7). `percentTimes10` is a string because it is a bigint on
 * the server — it can exceed JSON's safe integer range only in theory, but
 * the contract keeps every derived number exact.
 */
export interface BudgetFigures {
  /** Planned limit in minor units (strictly > 0). */
  limitMinor: string;
  /** Qualifying recorded spending in the budget period (§9.4 "Budget spent"). */
  spentMinor: string;
  /** `limitMinor - spentMinor`; negative means over budget — never clamped. */
  remainingMinor: string;
  /** Percentage ×10 ("267" = 26.7%), half-up; null only when the limit is zero. */
  percentTimes10: string | null;
}

/** One per-category limit inside a budget, with its period utilization. */
export interface BudgetCategoryLimitResponse {
  id: string;
  categoryId: string;
  /** Denormalized for display; archived categories stay readable (§5.5). */
  categoryName: string;
  /** `#RRGGBB` hint or null; the name always carries the meaning (§5.5). */
  categoryColor: string | null;
  figures: BudgetFigures;
}

/** A monthly budget with its current-period utilization (requirements.md §5.9). */
export interface BudgetResponse {
  id: string;
  name: string;
  period: BudgetPeriod;
  /** Local date `YYYY-MM-DD`; always the first day of a month (§6). */
  startDate: string;
  status: BudgetStatus;
  /**
   * The optional total budget (§5.9 "set a total budget and optionally
   * category budgets"). `null` when the user never set one — the UI must
   * not render this as a zero budget.
   */
  totalFigures: BudgetFigures | null;
  /** Deterministic order: largest limit first, then categoryId ascending. */
  categoryLimits: BudgetCategoryLimitResponse[];
  /** Single-currency MVP (DR-08/ADR-0003); budgets never convert. */
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/** One category limit in create/update requests; `limit` is a canonical decimal string. */
export interface BudgetCategoryLimitInput {
  categoryId: string;
  limit: string;
}

/** `POST /api/v1/budgets` body (requirements.md §5.9/§8.6). */
export interface CreateBudgetRequest {
  name: string;
  /** Local month `YYYY-MM` (or a date whose day is 1); resolved server-side. */
  startDate: string;
  /** Optional total budget; omit for category limits only. */
  totalLimit?: string;
  categoryLimits: BudgetCategoryLimitInput[];
}

/** `PATCH /api/v1/budgets/:id` body; all fields optional, `categoryLimits` replaces the set. */
export interface UpdateBudgetRequest {
  name?: string;
  startDate?: string;
  /** `null` clears the total budget. */
  totalLimit?: string | null;
  categoryLimits?: BudgetCategoryLimitInput[];
}
