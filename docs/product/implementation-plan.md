# Implementation plan (proposed)

> Phase 1 design artifact — **proposal**. Each task below is a candidate
> follow-up task, deliberately small enough to review, with its own
> acceptance criteria and tests. Nothing here is authorized yet; the owner
> approves the decision register and ADRs first (see
> [`docs/decisions/decision-register.md`](../decisions/decision-register.md)).

## Principles

- One task = one reviewable increment with tests and a verification plan
  (AGENTS.md rule 4).
- Financial rules and schema come first (requirements.md §19–20); UI wiring
  follows real APIs, never the other way round.
- Every task ships behind the standard gates: `format:check`, `lint`,
  `typecheck`, `test`, `build`, plus integration tests once the test database
  exists. Results are reported only when actually run (AGENTS.md rule 11).
- No mock/sample data may remain inside a shipped feature; the dashboard
  mock module is deleted only when fully replaced (§13.5).

## Decision dependencies (what must be settled before what)

| Decision (register)                 | Blocks                                                   | Can wait?                |
| ----------------------------------- | -------------------------------------------------------- | ------------------------ |
| DR-01 money representation          | IT-1 (money module), IT-2 (schema)                       | **No**                   |
| DR-02 accounting semantics          | IT-1, IT-2, IT-6, IT-7                                   | **No**                   |
| DR-04 auth/session strategy         | IT-2 (auth tables), IT-3                                 | **No**                   |
| DR-05 database/Prisma strategy      | IT-2 (migration + adapter)                               | **No**                   |
| DR-03 savings-goal method           | IT-10 (schema lands later; document rule now)            | No — accepted 2026-10-20 |
| DR-06 email provider                | IT-13 (verification/recovery), not IT-3 development path | Yes, before launch       |
| DR-07 MVP scope confirmation        | Sequencing/deadline expectations generally               | Recommended before IT-1  |
| DR-08/09/10 launch assumptions      | Public pages, legal text, age gate                       | Yes until launch         |
| DR-11 locale defaults (week start)  | IT-11 (preference default only)                          | Yes until IT-11          |
| DR-12 multiple layouts              | IT-11 scope                                              | Yes until IT-11          |
| DR-13 AI timing                     | V1 planning                                              | Yes                      |
| DR-14/15/16 ops, backups, retention | IT-13, production deployment                             | Yes until launch         |
| DR-17 pricing/legal                 | Marketing/subscription work                              | Yes                      |

**DR-01, DR-02, DR-04, and DR-05 are accepted (2026-10-16)** after the
clarification round (ADR-0003/ADR-0004, `accounting-rules.md` §11) and the
ADR-0006/ADR-0007 review; **IT-1 is implemented**; **IT-2 is implemented and
awaiting owner review** — the real-PostgreSQL acceptance checks run in CI's
PostgreSQL 16 job, while machines without Docker/PostgreSQL cannot run them
locally. **DR-03 is accepted (2026-10-20)** — ADR-0005 is `Accepted`, which
unblocked IT-10; **IT-10 is now implemented and awaiting owner review**, and
IT-11 is the next task. Everything else can proceed incrementally.

## Phase A — foundations (the first implementation phase)

### IT-1 — Money module (no database, no HTTP)

**Status:** Implemented 2026-10-16 — awaiting owner review.

**Scope:** `apps/api/src/domain/money/`: minor-unit arithmetic helpers
(strict parse for unsigned amounts and the signed opening-balance variant,
contract-string formatting, add/sum, compare, percentage with half-up),
currency registry (`BDT` exponent 2, per-currency exponent), typed validation
error codes, and the pure effect-matrix functions (§2: signed effect per type
and account, income/expense/budget flags). No Prisma, no HTTP, no timezone or
period code — occurrence validation and period math are implemented later
(IT-6+) once the timezone-conversion approach is chosen (§11.5 note).

**Decisions required:** DR-01, DR-02 (effect/sign semantics).

**Acceptance criteria**

- `parseAmountToMinor("3500.00") → 350_000n` (and `"3500.5" → 350_050n`);
  the full malformed-input matrix in `accounting-rules.md` §11.2 passes,
  with stable codes `AMOUNT_INVALID_FORMAT`, `AMOUNT_TOO_LARGE`,
  `AMOUNT_NOT_POSITIVE`.
- Signed opening-balance parsing accepts the optional leading `-` (and only
  that grammar) and stays within the ±10^11 service cap.
- `toContractString(350_000n) → "350000"`; never emits JSON `number` for
  money; a serializer test proves `JSON.stringify` of a contract object keeps
  amounts as strings.
- Sums are exact for values beyond `Number.MAX_SAFE_INTEGER` (e.g.
  `9_007_199_254_740_993n`), and those values serialize exactly.
- Percentage helper matches `accounting-rules.md` §7 including
  `denominator = 0` and half-up boundaries; returns display strings, not
  floats used for further math.
- Currency registry rejects unsupported currencies (`USD` before multi-
  currency is approved).
- The effect-matrix functions return the correct signed effect,
  income/expense flags, and budget flag for every type; a transfer changes
  the total tracked balance by exactly zero (invariant test).

**Tests:** table-driven unit tests for every rule above, including the
`accounting-rules.md` §11.2 malformed matrix, §8 worked-example effects, and
the §2 effect matrix encoded as pure functions for reuse in IT-6; no database
and no network access.

**Verification:** `pnpm lint && pnpm typecheck && pnpm test` (all packages);
no database required.

### IT-2 — Prisma schema v1, migration, and test harness

**Status:** Implemented 2026-10-16 — awaiting owner review. All
database-free checks pass locally; `migrate deploy` on a clean database and
the integration suite need a machine with Docker/PostgreSQL (blocked on the
author's machine at implementation time; CI runs them in the PostgreSQL 16
job).

**Scope:** Better Auth generator output + financial schema for
user/session/authAccount, accounts, categories, transactions (per
`docs/architecture/domain-model.md`); CHECK constraints via migration SQL;
`PrismaModule`/`PrismaService` with `@prisma/adapter-pg` and the
`DIRECT_URL`/`DATABASE_URL` split (ADR-0007); local `moneyflow_test`
database setup; integration-test harness with the non-local-host safety
guard; `.env.example` placeholder updates; health endpoint gains a
readiness check.

**Decisions required:** DR-01, DR-02 (core), DR-04, DR-05.

**Acceptance criteria**

- `pnpm db:validate` passes; `prisma migrate deploy` succeeds on a clean
  test database; exactly one reviewed initial migration is committed.
- Type-specific CHECK constraints exist and are exercised by integration
  tests (invalid rows rejected by the database, not only by services).
- Prisma client is generated into the documented output path and the API
  starts with a database ready-check; missing `DATABASE_URL` fails fast in
  production only.
- The test harness refuses non-local `TEST_DATABASE_URL` values.
- Unit tests remain database-free.

**Tests:** integration smoke (create user/account/category/transaction via
Prisma on the test database, constraint violations rejected), migration
replay on empty database, CI database-free job still green.

**Verification:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm build`, plus `pnpm db:validate` and a local
`db:migrate deploy` against Docker PostgreSQL.

### IT-3 — Authentication and sessions

**Status:** Implemented 2026-10-16 — awaiting owner review. Backend-only:
email/password sign-up/sign-in/sign-out, `GET /get-session`, thin
`GET/PATCH /api/v1/me`, global fail-closed session guard, Argon2id hashing,
per-IP rate limits, generic errors, and the cross-user isolation test pattern.
All database-free checks pass locally; the real-PostgreSQL integration suite
(`apps/api/test/integration/auth.test.ts`) needs a machine with
Docker/PostgreSQL (blocked on the author's machine at implementation time —
Docker declined for now; CI runs it in the PostgreSQL 16 job). The web app's
sign-in/sign-up shells remain intentionally unconnected (next frontend task).

**Scope:** Better Auth mounted in the API (official core; community NestJS
bridge only if reviewed and necessary), email/password flows, session guard,
`GET/PATCH /api/v1/me` (thin), auth rate limits, generic error messages,
session revocation, cross-user isolation test suite pattern, `authAccount`
model rename. Google Sign-In is prepared but not enabled until credentials
exist.

**Decisions required:** DR-04.

**Acceptance criteria**

- Sign-up → sign-in → authenticated request → sign-out flow works through
  the API with HttpOnly cookie sessions; sessions are revocable.
- All private routes are protected by default; public allowlist is explicit
  (health, auth endpoints).
- Password policy enforced; hashes are Argon2id (test asserts hash format,
  never plaintext); no secrets or hashes ever logged.
- Cross-user access attempts return 404 for every implemented resource.
- Rate limits respond with the standard error envelope and safe messages.

**Tests:** integration tests for the full flow, expired/revoked session
rejection, cookie flags, isolation attempts, rate-limit behavior; DTO
validation tests.

**Verification:** as IT-2 + an HTTP smoke script (`curl`/supertest) executed
and its output reported.

**Phase A exit gate:** money rules and effect matrix tested; one reviewed
migration; auth flow working with isolation tests; CI green including the
new database job. No financial feature ships publicly before this gate.

## Phase B — accounts, categories, transactions

Each task: scope → acceptance criteria → tests → verification, following the
same pattern; all depend on the approved accounting rules.

- **IT-4 Accounts:** CRUD, archive (history preserved), opening-balance
  rules, per-account derived balance endpoint; tests for archive semantics,
  opening-balance immutability, adjustment recording.
- **IT-5 Categories:** default-category clone at first sign-in, CRUD,
  case-insensitive uniqueness, archive vs delete rules, archived categories
  keep reports readable; reassignment explicitly deferred with a clear error.
  **Status (2026-10-17): Implemented** — `apps/api/src/modules/categories/`
  (`GET`/`POST /api/v1/categories`, `PATCH /:id`, `POST /:id/archive`,
  `POST /:id/unarchive`, `DELETE /:id` only while unreferenced), shared
  contracts, the sign-up clone hook plus the idempotent lazy backfill, and
  unit + real-PostgreSQL integration suites. Owner rulings (same date): the
  8-category seed list with hex colours (`category-defaults.ts`); rename
  collisions and referenced deletes answer 409; archived categories stay
  renameable; `type` stays immutable; category UI wiring deferred to IT-8.
  Database-free gates pass locally; the integration suite runs in the CI
  PostgreSQL 16 job.
- **IT-6 Transactions (income/expense):** create/list/get/edit/delete,
  filters (date range, type, account, category, amount), stable pagination,
  idempotency replay, server-side validation per accounting-rules §3,
  balance/summary consistency after edit/delete, isolation tests.
  **Status (2026-10-17): Implemented and verified** — audit found the
  backend complete; the missing acceptance evidence was added: unit coverage
  for the account/filter clauses, amount ranges and impossible-combination
  rejections, plus integration coverage for the category, amount-range and
  account (both transfer sides) filters over real PostgreSQL. Database-free
  gates pass locally; the integration suite runs in the CI PostgreSQL 16 job.
- **IT-7 Transfers:** single-row transfer create/edit/delete, invariants
  (distinct accounts, same currency, active accounts), exclusion from
  income/expense/budget, atomicity tests.
  **Status (2026-10-17): Implemented and verified** — audit confirmed the
  single-row model and its invariants; missing evidence was added: unit
  coverage for the same-currency rule (unreachable over HTTP while accounts
  are BDT-only) and integration coverage for transfer edit (both balances
  re-derive), delete (both balances revert), the archived-account edit rules
  (already-referenced accounts stay editable; moving onto an archived account
  is refused with no partial write), and transfers staying out of
  income/expense listings. The same rule is re-tested where totals first
  exist (summary service in IT-8, budgets in IT-9). Database-free gates pass
  locally; the integration suite runs in the CI PostgreSQL 16 job.

## Phase C — summaries, budgets, goals

- **IT-8 Summary service + dashboard/report endpoints + dashboard wiring:**
  one summary service used by dashboard and reports (period totals, category
  breakdown, recent transactions); the dashboard UI consumes real API data
  widget-by-widget; mock data and banner removed when the last widget is
  real; empty/loading/error states reviewed.
  **Status (2026-10-17): Implemented** — `apps/api/src/modules/summary/`
  (one service behind `GET /api/v1/dashboard`, `GET /api/v1/reports/summary`,
  `GET /api/v1/reports/categories`: period totals, sparse daily/weekly/monthly
  series with Saturday week starts (DR-11), period-clipped buckets, category
  breakdown with server half-up shares, bounded recent activity, and the
  Σ-active-account tracked balance via `deriveAccountBalance`), shared
  contracts, unit + real-PostgreSQL integration suites. Web wiring: the
  dashboard, reports, and categories pages consume the live endpoints through
  `apps/web/src/lib/api-client.ts` with translated loading / signed-out /
  empty / error+retry states (en + bn). The fake hero sparkline was removed,
  goals/budgets stay honest figure-free placeholders until IT-9/IT-10, and
  the sample-data banner now renders only on the pages that still use mock
  data (accounts, transactions, goals — budgets were wired in IT-9). Categories wiring follows
  decision D5: real taxonomy via the IT-5 list API (`includeArchived=true`),
  read-only, creation disabled with accurate copy. Database-free gates pass
  locally; the integration suite runs in the CI PostgreSQL 16 job.
- **IT-9 Budgets:** monthly budget CRUD, per-category limits, spent/
  remaining/percent per accounting rules, neutral overspend copy, edit/
  archive behavior, boundary tests (month edges, timezone).
  **Status (2026-10-20): Implemented** — `apps/api/src/modules/budgets/`
  (schema `Budget`/`BudgetCategoryLimit` + migration
  `20261019173444_add_budgets`, DTOs, service, controller): create/list/
  update/delete plus pause/resume/archive/unarchive moves; optional total and
  1–50 ACTIVE expense-category limits, one ACTIVE limit per category per
  month; utilization computed per request from `EXPENSE` transactions in the
  half-open local-month boundaries (default `Asia/Dhaka` until IT-11), summed
  by PostgreSQL as exact `::text` bigints; remaining amounts never clamped.
  Shared contracts + unit tests (DTO, service, percentage boundaries,
  > 2^53-safe amounts) + a real-PostgreSQL integration suite (categorization,
  > transfers/income excluded, month edges, isolation, overlap rule, status
  > transitions). Web wiring: the budgets page lists server-computed figures,
  > shows overspend truthfully (bar capped, text exact), and provides create/
  > edit (local validation + server rejection), delete confirmation, and
  > pause/archive actions in English and Bangla; the sample-data banner no
  > longer renders there.
- **IT-10 Goals + contributions:** goal CRUD with statuses, contribution
  add/reverse, progress/overfunding rules (ADR-0005), deadline display,
  emergency-fund template, double-counting tests (balances, budgets, income
  unaffected).
  **Status (2026-10-20): implemented — awaiting owner review.**
  ADR-0005 (accepted) is implemented end to end:
  `Goal`/`GoalContribution` models + migration `20261020163000_add_goals`
  (CHECKs for positive targets, deadline ≥ start, contribution/reversal sign,
  no self-reversal; UNIQUE `reversesContributionId`), shared contracts,
  `apps/api/src/modules/goals/` (CRUD, pause/resume/complete/archive/unarchive,
  contribution add/list, linked reversal inside a locked transaction, progress
  as `Σ amountMinor` with unclamped remainder and exact percentage,
  session-scoped 404s), and the API-backed `/app/goals` + `/app/goals/[goalId]`
  pages with the emergency-fund preset, contribution add/reverse, delete
  confirmation, and en/bn states. Unit tests (`dto.test.ts`,
  `goals.service.test.ts`), web tests (list + detail + dashboard card), and a
  new real-PostgreSQL suite (`test/integration/goals.test.ts`: CRUD,
  transitions, isolation, exactness beyond `Number.MAX_SAFE_INTEGER`, reversal
  rules, cascade, database guards, and the no-effect-on-balances/totals/
  budgets invariant) are committed. Verified locally on 2026-10-20: API unit
  377/377, web 197/197, and integration 117/117 all pass; format/lint/
  typecheck/build pass. The integration run used a disposable native
  PostgreSQL 16.10 cluster on localhost (no Docker), applied the committed
  migration history from scratch, and confirmed the goal constraints/indexes;
  CI's PostgreSQL 16 job re-runs the same suite.
  **Open detail carried forward (not blocking):** the preset's suggested target
  is a fixed illustrative ৳30,000 example, clearly labelled as a suggestion and
  fully editable; a data-derived suggestion (or an owner-chosen figure) still
  needs the owner's decision before it is presented as anything more than an
  example (`requirements.md` §5.8, ADR-0005).

## Phase D — customization, data rights, hardening

- **IT-11 Preferences & customization:** profile/preferences persistence
  (theme, locale, timezone, week start, reduced motion), dashboard layout
  persistence with validated schema + reset-to-default, preference/layout
  tests, mobile behavior preserved.
- **IT-12 Export, deletion, audit:** CSV export of the user's transactions
  (scoped, tested); account deletion workflow honoring the retention policy
  (DR-16); audit events for destructive/security actions; confirmation UX.
- **IT-13 Hardening & launch gates:** email verification + password recovery
  (DR-06/DR-08), rate-limit review, logging/monitoring baseline, backup and
  restore runbook actually tested (DR-15), accessibility pass, performance
  baseline, privacy text matching implementation, final mock-data sweep.

## Deliverable format for every implementation task

1. Understanding and scope (this plan + requirements references).
2. Files/modules affected and migration/security/testing risks.
3. Implementation.
4. Commands actually run with real results (no fabricated passes).
5. Known limitations and next task.
