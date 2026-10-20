# ADR-0011: Data export, user-account deletion, and minimal audit events

**Status:** Accepted (2026-10-20) — owner approved the recommended IT-12 scope
**Date:** 2026-10-20

## Context

`requirements.md` §3.1 items 14–15 require CSV export of transactions and a
clearly explained account-deletion workflow. `docs/product/implementation-plan.md`
assigns those features, plus audit events for destructive/security actions, to
IT-12. The decision register entry DR-16 was `Proposed` and explicitly required
owner confirmation before implementation.

The existing architecture already has:

- session-derived user identity on every protected route (ADR-0006);
- financial records owned by `User` with `ON DELETE CASCADE`, but deliberate
  `NO ACTION` foreign keys from transactions to accounts/categories so history
  cannot be silently lost;
- hard deletes for transactions, budgets, and goals, and unreferenced-only
  deletion for categories;
- no export endpoint, no `DELETE /api/v1/me`, and no audit table.

The owner approved the recommended DR-16 scope on 2026-10-20: CSV export,
self-service deletion of the MoneyFlow user and all owned data, and minimal
audit events. Session listing/revocation, password change, and email recovery
remain deferred. Financial accounts remain archive-only; “account deletion” in
this ADR means the MoneyFlow user account, not a financial `Account` row.

## Decision

### 1. CSV export

- `GET /api/v1/transactions/export` is authenticated by the existing session
  guard and exports only rows where `transaction.userId = session user id`.
- The endpoint accepts the same filters as `GET /api/v1/transactions`
  (`type`, `accountId`, `categoryId`, `dateFrom`, `dateTo`, `minAmount`,
  `maxAmount`, `timezone`) and ignores pagination parameters.
- Ordering is deterministic: `occurredAt DESC, id DESC`.
- Rows are read in keyset-paginated chunks and streamed; the full result set is
  never loaded into memory.
- The CSV uses UTF-8 with a BOM, RFC 4180 quoting, CRLF record separators, and
  these columns:
  `occurred_at_utc,type,amount,currency,account,from_account,to_account,category,adjustment_direction,note`.
- `amount` is an unsigned exact decimal string in the transaction currency (two
  decimal places for BDT); direction comes from `type` and
  `adjustment_direction`. Internal IDs are not exported.
- Timestamps are ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`); the export does not
  reinterpret stored instants into a local timezone.
- Every cell is formula-injection neutralized: a leading `'` is added when the
  first non-whitespace/control character is `=`, `+`, `-`, or `@`, or when the
  value starts with a tab/CR/LF/control character. Quoting and quote doubling
  follow RFC 4180. The raw amount field is unaffected because stored amounts are
  positive; notes and names are protected.
- An empty result set returns a header-only CSV, not an error.
- Export requests are limited in memory to five per user per rolling hour for
  the single-instance MVP. The response is `429` with safe copy when exhausted.
- The browser downloads a real file; failures produce a safe error and no
  success message.

### 2. User-account deletion

- `DELETE /api/v1/me` deletes the authenticated user only; it never accepts a
  client-supplied user id.
- The request requires the current password and the exact confirmation phrase
  `DELETE`. A wrong password or phrase changes nothing.
- Password verification reuses the existing Argon2id implementation. Failed
  attempts are rate-limited in memory (five per user per 15 minutes).
- Deletion runs in one database transaction in dependency order: goal
  contributions, goals, budget category limits, budgets, transactions,
  categories, accounts, preferences, dashboard layout, verification rows for
  the email, sessions, auth accounts, and finally the user. The audit row is
  inserted in the same transaction.
- All sessions are invalidated by deleting their rows. The browser redirects to
  the public landing page after success; the stale cookie no longer
  authenticates.
- The live database rows are hard-deleted. Backups are **not** immediately
  purged because the backup/retention policy (DR-15/DR-16 privacy text) is not
  yet settled. The UI and documentation say this explicitly and do not claim
  permanent erasure from backups.
- Financial account rows are not individually deletable through this workflow;
  they disappear only as part of deleting the whole user.

### 3. Audit events

`AuditEvent` records the minimum needed for accountability:

| Field          | Rule                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `id`           | UUID primary key                                                           |
| `userId`       | Nullable; `ON DELETE SET NULL` after user deletion                         |
| `type`         | Approved enum below                                                        |
| `resourceType` | Optional short label (`transaction`, `category`, `budget`, `goal`, `user`) |
| `resourceId`   | Optional target id; never exposed through a public API in IT-12            |
| `metadata`     | Optional safe JSON; no amounts, notes, tokens, passwords, or bodies        |
| `createdAt`    | UTC timestamp                                                              |

Approved event types:

- `TRANSACTION_DELETED`
- `CATEGORY_DELETED`
- `BUDGET_DELETED`
- `GOAL_DELETED`
- `DATA_EXPORT_REQUESTED`
- `DATA_EXPORT_FAILED`
- `USER_ACCOUNT_DELETED`

Rules:

- Audit writes for destructive database operations occur in the same Prisma
  transaction as the delete. A rollback removes both.
- Export records a request event before streaming, and a failure event if the
  stream errors. It does not claim that a download completed.
- Actor identity always comes from the verified session.
- No public audit endpoint or UI is added in IT-12. Rows are internal
  accountability records, not a user-facing activity feed.
- Anonymous audit rows are retained because no shorter retention period has
  been approved. This is documented as an open privacy/retention limitation,
  not as irreversible erasure.

## Consequences

- IT-12 adds one additive migration (audit enum/table). No financial table is
  altered.
- The existing archive/unarchive lifecycle for financial accounts remains the
  only individual-account lifecycle; no hard-delete endpoint is added.
- Session listing/revocation, password change, email recovery, category CRUD
  UI, and financial-account deletion remain deferred and are not implied by
  this ADR.
- The in-memory rate limiter is valid for the current single API instance; a
  shared store is required before horizontal scaling.
- The privacy text must eventually describe backup retention and the anonymous
  audit retention period; this ADR does not claim legal compliance.
