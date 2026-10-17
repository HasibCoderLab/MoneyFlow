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
