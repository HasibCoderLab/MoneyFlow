# IT-12 Verification Report — Export, Account Deletion, and Audit Events

**Date:** 2026-10-20
**Branch:** main
**Baseline:** `5467580` (integration-audit documentation); this report ships with the IT-12 commit
**Decision:** ADR-0011 / DR-16 (owner-approved 2026-10-20)

---

## A. Summary

**IT-12 CSV export, self-service account deletion, and minimal audit events — COMPLETE**

Implemented the owner-approved scope end to end:

- `GET /api/v1/transactions/export` — authenticated, session-scoped streaming
  CSV with the same filters as the transaction list, deterministic
  `occurredAt DESC, id DESC` ordering, keyset chunks of 500, UTF-8 BOM,
  CRLF records, RFC 4180 quoting, exact decimal amounts, UTC timestamps, no
  internal IDs, and spreadsheet-formula neutralization.
- `DELETE /api/v1/me` — current-password + exact `DELETE` phrase confirmation,
  failed-attempt rate limiting, one database transaction across every owned
  table, audit row in the same transaction, and deletion of all sessions.
- `AuditEvent` — additive migration with the seven approved event types;
  destructive deletes and exports write minimal, non-financial metadata.
  There is no public audit API.
- `/app/settings/data` — real CSV download (no fixture bytes), honest
  server-error handling, password + phrase deletion dialog, confirmed success
  state, automatic return to the public landing page, and explicit
  live-data/backup retention wording.

No financial rule or stored amount was changed. Financial accounts remain
archive-only; “delete account” means the MoneyFlow user, never an `Account`
row.

---

## B. Routes and Behavior

| Route / surface                   | Behavior                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/transactions/export` | Streams only the caller's rows; filters `type`, `accountId`, `categoryId`, `dateFrom`, `dateTo`, `minAmount`, `maxAmount`, `timezone`; pagination ignored; 5 requests/user/rolling hour in memory.           |
| Empty export                      | Header-only CSV (BOM + quoted header + CRLF), not an error.                                                                                                                                                  |
| `DELETE /api/v1/me`               | Requires the current password and exact phrase `DELETE`; 5 failed attempts/user/15 minutes in memory; deletes all owned rows and sessions in one transaction.                                                |
| Wrong password or phrase          | 400/401 with safe copy; no row is changed.                                                                                                                                                                   |
| `/app/settings/data`              | Real download with server filename and success/error feedback; deletion dialog disables submit until both inputs match; success message appears only after the API responds 204.                             |
| Post-deletion browser             | Stale session cookie answers 401; the deleted user sees the signed-out dashboard state; the page returns to `/` after a short confirmed-success pause.                                                       |
| Audit rows                        | `TRANSACTION_DELETED`, `CATEGORY_DELETED`, `BUDGET_DELETED`, `GOAL_DELETED`, `DATA_EXPORT_REQUESTED`, `DATA_EXPORT_FAILED`, `USER_ACCOUNT_DELETED`; no amounts, notes, tokens, passwords, or request bodies. |

CSV columns, exactly:
`occurred_at_utc,type,amount,currency,account,from_account,to_account,category,adjustment_direction,note`.
Every cell is quoted; quotes are doubled. The BOM is written once at the start
of the header.

---

## C. Key Files

| Area               | Files                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts          | `packages/contracts/src/index.ts` (`DELETE_ACCOUNT_CONFIRMATION`, `DeleteMeRequest`)                                                      |
| Export             | `apps/api/src/modules/transactions/transactions-export.service.ts`, `export-csv.ts`, `transaction-filters.ts`, controller route           |
| Deletion           | `apps/api/src/modules/auth/account-deletion.service.ts`, `deletion.ts`, `me.controller.ts`                                                |
| Audit              | `apps/api/src/modules/audit/audit.service.ts`, `audit.module.ts`                                                                          |
| Rate limiting      | `apps/api/src/common/rate-limit.ts`                                                                                                       |
| Delete hooks       | transactions, categories, budgets, and goals services (same-transaction audit writes)                                                     |
| Schema / migration | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261020203000_add_audit_events/migration.sql`                               |
| API unit tests     | `export-csv.test.ts`, `transactions-export.service.test.ts`, `deletion.test.ts`, `rate-limit.test.ts`, updated service tests              |
| Integration tests  | `transactions-export.test.ts`, `account-deletion.test.ts`, `audit.test.ts`, harness port fix                                              |
| Web client         | `apps/web/src/lib/api-client.ts` (`downloadTransactionsCsv`, `deleteMyAccount`)                                                           |
| Web UI             | `apps/web/src/components/data-controls.tsx`, `apps/web/src/app/app/settings/data/page.tsx`, settings index, danger button, mobile nav fix |
| Web tests          | `data-controls.test.tsx`, data/settings page tests, API-client tests                                                                      |
| Docs               | ADR-0011, decision register, README, implementation plan, architecture docs, this report                                                  |

---

## D. Financial and Security Correctness

- **Session-derived identity only.** Export and deletion accept no user id in
  path, query, or body. Integration tests attempt cross-user exports and
  deletions and prove isolation.
- **Exact money.** Amounts are formatted from stored minor units with the
  currency exponent; no JavaScript floating-point arithmetic is used.
- **Deterministic order and chunking.** Keyset pagination avoids duplicate or
  skipped rows at chunk boundaries and never buffers the whole ledger.
- **CSV injection defense.** A leading apostrophe is added when the first
  non-whitespace/control character is `=`, `+`, `-`, or `@`, and for values
  starting with control characters. Stored positive amounts are unaffected.
- **Atomic destructive writes.** Each delete and its audit row share one
  Prisma transaction. A forced audit failure in the deletion suite rolls back
  every deletion and the audit row.
- **Re-authentication before deletion.** The existing Argon2id credential is
  verified; no password or hash is logged. Wrong credentials change nothing.
- **Session revocation.** Every session row is deleted in the same transaction.
  A captured pre-deletion cookie was replayed against `GET /api/v1/me` and
  answered **401**.
- **No secret leakage.** Export filenames are server-generated; audit metadata
  is object-only and contains no financial content. No secrets were added.
- **Backup honesty.** The UI says live records are removed while infrastructure
  backups are not claimed to be erased (DR-15 remains open).

---

## E. Database Evidence

Verified against a disposable **native PostgreSQL 16.10** cluster on
`127.0.0.1:55432` (no Docker/Docker Desktop), with the full committed migration
history applied. Migration `20261020203000_add_audit_events` is recorded as
finished in `_prisma_migrations`.

`auditEvent` schema evidence:

- Primary key `auditEvent_pkey` on `id`.
- FK `auditEvent_userId_fkey` → `user(id)` with `ON DELETE SET NULL`.
- CHECK `auditEvent_metadata_object_check`
  (`metadata IS NULL OR jsonb_typeof(metadata) = 'object'`).
- Indexes `auditEvent_userId_createdAt_idx` and
  `auditEvent_type_createdAt_idx`.
- No financial table was altered; the migration only adds the enum/table,
  indexes, and FK.

After the browser acceptance user was deleted, direct SQL returned **0** rows
for that user in `user`, `session`, `authAccount`, `account`, `category`,
`transaction`, `budget`, `budgetCategoryLimit`, `goal`, `goalContribution`,
`userPreference`, and `dashboardLayout`; **0** audit rows retained a link to
the deleted id. Surviving `USER_ACCOUNT_DELETED` rows had `userId = NULL`,
`resourceType = user`, and metadata `{"reason": "self_service"}`. Export request
events also survived anonymized.

---

## F. Browser Acceptance

Run against the production Next.js build and the built NestJS API, using
headless Google Chrome via a temporary Playwright-core install outside the
repository. No E2E dependency was added to the project.

Desktop (1440 px) and mobile (375 px) checks passed:

| Check                                                                   | Result |
| ----------------------------------------------------------------------- | ------ |
| Sign-up, default categories, account + two transactions                 | PASS   |
| Data page renders at both widths, no document overflow                  | PASS   |
| Real CSV download triggered from the UI                                 | PASS   |
| UTF-8 BOM, quoted header, CRLF records                                  | PASS   |
| Exact `125.50` amount and account/category names                        | PASS   |
| Formula-like note `=SUM(1,2)` exported as `'=SUM(1,2)`                  | PASS   |
| Comma/quote note escaped as `"Salary, ""October"""`                     | PASS   |
| Server filename `moneyflow-transactions-2026-10-20.csv`                 | PASS   |
| Both desktop and mobile downloads contained the same rows               | PASS   |
| Wrong deletion password rejected; account remained                      | PASS   |
| Correct password + `DELETE` deleted the account                         | PASS   |
| Confirmed success state, then return to the landing page                | PASS   |
| Pre-deletion cookie replayed after deletion → 401                       | PASS   |
| Signed-out dashboard after deletion                                     | PASS   |
| No uncaught page errors; only expected signed-out 401/404 resource logs | PASS   |

The browser acceptance also exposed a pre-existing mobile app-shell problem:
the horizontal navigation's intrinsic width expanded the whole document to
1034 px at a 375 px viewport. Adding `min-width: 0` to `.mf-nav` constrained
the grid item; the navigation still scrolls inside its own row by design and
the document now measures exactly 375 px. No other layout rule was changed.

---

## G. Gate Results (actually run)

| Gate                    | Result                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:validate`      | **PASS** — Prisma schema valid                                                                                                                                                                                       |
| `pnpm lint`             | **PASS** — all workspaces                                                                                                                                                                                            |
| `pnpm typecheck`        | **PASS** — packages, API, and web                                                                                                                                                                                    |
| `pnpm test`             | **PASS** — API **435/435** (39 files), web **243/243** (38 files)                                                                                                                                                    |
| `pnpm test:integration` | **PASS** — **149/149** (14 files) against native PostgreSQL 16.10                                                                                                                                                    |
| `pnpm build`            | **PASS** — NestJS API + Next.js 16 production build (19 routes, including `/app/settings/data`)                                                                                                                      |
| Desktop/mobile browser  | **PASS** — see §F                                                                                                                                                                                                    |
| `git diff --check`      | **PASS** — exit 0 (CRLF conversion warnings only)                                                                                                                                                                    |
| `pnpm format:check`     | **PASS for every intended IT-12 file.** The full-tree command still reports only the pre-existing untracked `docs/reports/2026-10-20-it8-verification-report.md`, which was deliberately preserved and not modified. |

The integration run logs one intentional `Error: forced audit failure` from
the rollback scenario; that test asserts the deletion and audit rows were both
rolled back and the suite passes.

---

## H. CI Evidence

Local verification is complete. The repository workflow is configured to run
unit tests, the PostgreSQL 16 integration job, lint/typecheck/build, and schema
validation. The exact-commit GitHub Actions result is checked after pushing the
IT-12 commit; this report does not claim a CI result that was not observed.

---

## I. Limitations and Scope Decisions

1. **UI export is all-transactions.** The API accepts the full list filter set,
   but the data settings screen does not yet expose filter controls; a filtered
   export action from the transaction list remains future work.
2. **In-memory limits.** Export and failed-deletion limits are valid for the
   current single API instance; horizontal scaling needs a shared store.
3. **No export-completed event.** Auditing records request/failure, not a
   delivery acknowledgement, by design.
4. **Backups and audit retention.** Backups are not claimed to be erased and
   the anonymous audit retention period is undecided (DR-15). No legal
   compliance is claimed.
5. **Deferred controls.** Session listing/revocation, password change, and
   email recovery remain absent and are labelled as not built.
6. **No public audit UI/API.** Audit rows are internal accountability records.
7. **Browser automation is not committed.** It used a temporary Playwright-core
   install and headless Chrome; the project still has no E2E framework
   dependency, so CI does not run it.
8. **Financial-account hard deletion** is intentionally not offered; accounts
   are archive-only and disappear only with the whole user.

---

## J. Preserved Work

The untracked `docs/reports/2026-10-20-it8-verification-report.md` was left
untouched. No unrelated files were staged or committed. No Docker-based
commands were used.

---

**IT-12 is implemented, locally verified, and ready for owner review.**
