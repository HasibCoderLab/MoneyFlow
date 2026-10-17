# MoneyFlow — IT-4 Verification, Auth Integration Review & IT-5 Readiness

> **Report date:** 2026-10-17
> **Revision reviewed:** `acdf258a08cf5f8fe585616815185103ebca50d3` (branch `main`) **plus the uncommitted working tree**
> **Reviewer roles:** Principal Backend Engineer · QA Architect · Application Security Reviewer
> **Method:** every claim below cites a file path or a command actually run. Nothing is inferred from intentions;
> where verification was impossible in this environment it is explicitly marked **Not verified**.
> **Host limitation:** this machine has **no Docker and no local PostgreSQL** (no listener on 5432 or 5433,
> `docker: command not found`), so the real-PostgreSQL integration suites could not be executed.
>
> **Headline:** IT-4 **cannot be proven yet** — the real-PostgreSQL suites **could not run on this machine**.
> Every database-free gate passes. No files were modified, staged, or deleted during this review.

---

## Table of contents

1. [Exact Git state and changes by category](#1-exact-git-state-and-changes-by-category)
2. [`acdf258` contents and scaffold disposition](#2-acdf258-contents-and-scaffold-disposition)
3. [IT-4 PostgreSQL verification](#3-it-4-postgresql-verification--blocked)
4. [IT-4 acceptance verdict](#4-it-4-acceptance-review)
5. [Frontend authentication verification](#5-frontend-authentication-review)
6. [Port 4000 diagnosis](#6-port-4000--empty-http-500-diagnosis)
7. [IT-5 scope and readiness decision](#7-it-5-readiness--scope-and-decision)
8. [Owner-approval checklist](#8-owner-approval-checklist)
9. [Bottom line](#bottom-line)

---

## 1. Exact Git state and changes by category

**Branch:** `main` @ `acdf258a08cf5f8fe585616815185103ebca50d3`, identical to `origin/main`
(in sync, no divergence). Nothing staged, no stashes, no worktrees.

| Category                | Count | Files                                                                                                                                                                                               |
| ----------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Staged**              | 0     | —                                                                                                                                                                                                   |
| **Modified (unstaged)** | 6     | `apps/web/src/app/(auth)/sign-in/page.tsx`, `sign-in/page.test.tsx`, `sign-up/page.tsx`, `sign-up/page.test.tsx`, `apps/web/src/components/auth-form.tsx`, `apps/web/src/components/auth-shell.tsx` |
| **Untracked**           | 4     | `.gitattributes`, `apps/web/src/components/auth-form.test.tsx`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/lib/auth-client.test.ts`                                                           |
| **Committed (recent)**  | —     | `acdf258` (scaffold preserve) → `969e9f8` (IT-4 backend) → `609b1ee` (theme switcher)                                                                                                               |

The 9 web files under review are exactly: **6 modified + 3 untracked** (`auth-client.ts`,
`auth-client.test.ts`, `auth-form.test.tsx`). This confirms the "latest nine web-file changes" scope.

### Ownership notes (untouched, as instructed)

- **`.gitattributes`** — user-authored, pins LF for 20 paths; line-ending hygiene only, no code impact.
- **`.freebuff/project-id`** — present but excluded via `.git/info/exclude` (`/.freebuff/`); local tooling
  artifact, not git-tracked, no action needed.
- **`.env`** — gitignored, holds **live Neon credentials** (see §6). Not modified.

### Secret scan

`git diff` and all untracked files were scanned for `secret|password|token|api_key|private key|sk-|ghp_`.
Matches were only field names and test fixtures (`'x'.repeat(12)`, `local-password-12`).
**No secrets in the diff.**

---

## 2. `acdf258` contents and scaffold disposition

**Yes — `acdf258` contains the previously reported `api/` scaffold.**

- **Message:** `chore: preserve untracked api scaffold (12 files, ownership review pending)`
- **Size:** 12 files, **+429 insertions, 0 deletions**, all newly created (`create mode 100644`)
- **Path:** top-level **`api/`** — _not_ `apps/api/`

**Files:**

- `api/src/app.module.ts`
- `api/src/modules/accounts/{account.controller,account.entity,account.repository,account.service,accounts.module,account-status.enum,account-type.enum}.ts`
- `api/src/modules/prisma/{prisma.module,prisma.service}.ts`
- `api/src/modules/transactions/{transaction.repository,transactions.module}.ts`

### Disposition assessment (evidence-based)

| Finding                         | Evidence                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Not a workspace package**     | `pnpm-workspace.yaml` globs only `apps/*` and `packages/*` → `api/` is outside lint/typecheck/test/build entirely                                                                                 |
| **Does not compile standalone** | `api/src/app.module.ts` imports `./modules/auth/auth.module` and `./modules/categories/categories.module` — **both files are missing**; there is no `api/package.json` and no `api/tsconfig.json` |
| **Unreferenced dead code**      | Nothing under `apps/`, `packages/`, or `.github/` imports it                                                                                                                                      |
| **Duplicates delivered work**   | An entity/repository sketch for accounts+transactions, while `969e9f8` already implemented them in `apps/api/` with ADR-0001/0004-compliant layering                                              |
| **Stale dependency**            | Imports `@prisma/client`, inconsistent with the ADR-0007 generated-client path                                                                                                                    |

**Verdict:** safe-to-remove candidate, but **owner-owned** — it was **not** deleted. Its own commit message
already flags the conflict; the only cost of keeping it is confusion risk for future contributors and agents.

---

## 3. IT-4 PostgreSQL verification — **BLOCKED**

### 3.1 Is the PostgreSQL instance available?

| Probe                                                                 | Result                                  |
| --------------------------------------------------------------------- | --------------------------------------- |
| `netstat -ano \| grep LISTENING` for 4000 / 5432 / **5433**           | **No listener**                         |
| Direct TCP connect → `127.0.0.1:5433`                                 | `ECONNREFUSED`                          |
| Direct TCP connect → `127.0.0.1:5432`                                 | `ECONNREFUSED`                          |
| `tasklist` grep `postgres` / `pg_`                                    | **No process**                          |
| `sc query type= service state= all` grep `postgres`                   | **No service**                          |
| `C:\Program Files\PostgreSQL`                                         | **Does not exist**                      |
| `which psql pg_isready pg_ctl`                                        | Not found on PATH                       |
| `docker`                                                              | **`command not found`** (not installed) |
| `5433` anywhere in the repo (`.md`, `.ts`, `.yml`, `.prisma`, `.sql`) | **Zero matches**                        |

**Conclusion:** there is **no PostgreSQL 16.14 on port 5433** — and no PostgreSQL at all on this machine.
Port 5433 is not a documented repository configuration; the repo specifies **5432**
(`POSTGRES_PORT=5432` in `.env`; `infrastructure/docker/docker-compose.yml` maps `${POSTGRES_PORT:-5432}:5432`).

### 3.2 Localhost-only guard (verified by inspection)

`apps/api/test/support/local-database.ts` enforces
`LOCAL_HOSTNAMES = {localhost, 127.0.0.1, ::1, [::1]}` and rejects any non-`postgres://` URL.
Error messages never echo the URL (no credential leak). `harness.ts` loads the repo-root `.env` and then
re-asserts the guard; `http-test-app.ts` repoints `DATABASE_URL` at the guarded URL **before** the Nest
container is built, so the app can never reach the Neon URL from `.env` during tests.

The guard was **not weakened**, and no non-local test target was configured. **No connection to Neon was made.**

### 3.3 Command actually run and its real result

```text
$ pnpm test:integration
$ vitest run --config vitest.integration.config.mts
Error: TEST_DATABASE_URL is not set. Integration tests require a local PostgreSQL
database (see docs/runbooks/local-development.md).
 ❯ assertLocalDatabaseUrl test/support/local-database.ts:31:11
 ❯ getTestDatabaseUrl test/integration/harness.ts:23:10
 ❯ Object.globalSetup [as setup] test/integration/global-setup.ts:13:15
No test files found, exiting with code 1
EXIT_CODE=1
```

The guard **fired exactly as designed** — no migration ran, no query was issued. Two independent blockers
exist, so the review stopped rather than forcing an unsafe path:

1. **`TEST_DATABASE_URL` is absent from `.env`.** Present keys: `API_URL`, `CORS_ORIGINS`, `DATABASE_URL`,
   `DIRECT_URL`, `NEXT_PUBLIC_API_URL`, `PORT`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`,
   `POSTGRES_USER`.
2. **No local PostgreSQL server exists** on 5432 or 5433 to point it at.

### 3.4 Suite results

| Suite                | File                                            | Result                     | Exit code        |
| -------------------- | ----------------------------------------------- | -------------------------- | ---------------- |
| auth-session         | `test/integration/auth.test.ts`                 | **NOT RUN** — not verified | 1 (global setup) |
| accounts             | `test/integration/accounts.test.ts`             | **NOT RUN** — not verified | 1 (global setup) |
| transactions         | `test/integration/transactions.test.ts`         | **NOT RUN** — not verified | 1 (global setup) |
| schema / constraints | `test/integration/{schema,constraints}.test.ts` | **NOT RUN** — not verified | 1 (global setup) |

### 3.5 What did run — database-free gates (all real, all green)

| Command                 | Exit  | Real result                                                                      |
| ----------------------- | ----- | -------------------------------------------------------------------------------- |
| `pnpm format:check`     | **0** | `All matched files use Prettier code style!`                                     |
| `pnpm lint`             | **0** | ESLint clean across config, contracts, test-utils, web, api                      |
| `pnpm typecheck`        | **0** | `tsc` clean, including `prisma generate` (7.10.1)                                |
| `pnpm test`             | **0** | **API 189 passed / 189 (23 files)** · **Web 128 passed / 128 (28 files)**        |
| `pnpm build`            | **0** | API built; Next.js compiled, 18 static routes (including `/sign-in`, `/sign-up`) |
| `pnpm test:integration` | **1** | Blocked — see §3.3                                                               |

> Note: the previously reported "185 unit tests" is now **189** (API) plus **128** (web) = **317 total**.

---

## 4. IT-4 acceptance review

### Verified

| Requirement                                                | Evidence                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Derived, never stored, balances                            | `modules/accounts/balance.ts` — `opening + Σ signedEffect`; requirements §9.2 "never stored"                                                                       |
| Money precision — no float authoring                       | `BIGINT` column + `parseAmountToMinor`/`toContractString`; every response money field is a **minor-unit string**; `packages/contracts` types `amountMinor: string` |
| Accounts CRUD + archive/unarchive                          | `accounts.service.ts` (create/list/get/update/archive/setArchived); `PATCH` allows only `name`/`openingBalance`                                                    |
| Opening-balance freeze                                     | `updateAccount` counts legs and throws `OPENING_BALANCE_FROZEN` (400) once referenced                                                                              |
| Archive preserves history                                  | `status`/`archivedAt` only; **no account delete exists**                                                                                                           |
| Case-insensitive name uniqueness                           | DB index `account_userId_name_lower_key` (hand-written in migration) mapped to **409**                                                                             |
| Transaction types INCOME / EXPENSE / TRANSFER / ADJUSTMENT | `transactions.service.ts` `prepareWrite` switch; `ADJUSTMENT` uses `adjustmentSign ±1` + required note                                                             |
| Amount strictly positive; direction from type              | `parsePositiveAmountToMinor` + DB `CHECK ("amountMinor" > 0)`                                                                                                      |
| Transfer atomicity, distinct + same-currency accounts      | Single row with both legs in one `$transaction`; same-account and cross-currency rejected; DB CHECK `fromAccountId <> toAccountId`                                 |
| Idempotency                                                | `Idempotency-Key` header pre-check inside the tx, plus unique `(userId, idempotencyKey)` and **lost-race recovery** returning the winner (200 replay)              |
| Ownership isolation                                        | Every query scoped to the session `userId`; foreign/malformed ids → **404** (never 403, never distinguishing the two)                                              |
| Auth enforced server-side                                  | Global fail-closed `AuthGuard`; `@Public()` opt-in allowlist; DB outage → **503**, never a bypass                                                                  |
| Stable pagination                                          | `orderBy [occurredAt desc, id desc]`, `take: limit + 1` → `nextOffset`, `total`                                                                                    |
| Atomicity of multi-write paths                             | Every create/update/delete wrapped in `prisma.$transaction`                                                                                                        |
| Type immutability on edit                                  | `parseUpdateTransactionInput(body, currentType)`; a `type` change → 400                                                                                            |
| Future-dated occurrence rejected                           | `occurrence.ts` + integration case (MVP rule, ADR-0004)                                                                                                            |
| Type-shape integrity enforced **by the database**          | Migration `transaction_type_shape_check` with `ELSE FALSE`, exercised by `constraints.test.ts`                                                                     |
| Contract / route surface                                   | §8.6 shapes implemented: accounts + archive/unarchive, transactions list/get/post/patch/delete                                                                     |

### Not verified (infrastructure-blocked — this is the gap)

All real-PostgreSQL behaviour: **migration replay on an empty database**, CHECK-constraint enforcement, the
§8 worked example (`Cash 2275000` / `Bank 200000`), idempotency replay, edit/delete re-derivation, listing,
and **cross-user isolation**. The test _code_ exists and is well-formed, but **has never executed on this
machine**. CI (`ci.yml` `integration` job, `postgres:16` service) is configured to run them; its current
status on GitHub is **unverified from here**.

### Failed

**None observed.** No counter-evidence was found in the code or in the database-free suites.

### Deferred by design

- Audit trail for deletes — `AuditEvent` lands with **IT-12**; documented as a known gap in
  `transactions.service.ts`.
- CSV export (`/transactions/export`) — **IT-12**.
- Email verification / password recovery — **IT-13** launch gate.
- Category reassignment on delete — deferred with a clear error (IT-5).
- Multi-currency — BDT-only by ADR-0003 / DR-08.
- Period and summary math — IT-8.

### Scope observation

`docs/product/implementation-plan.md` splits **IT-4 (Accounts)**, **IT-6 (Transactions)** and
**IT-7 (Transfers)**. Commit `969e9f8` delivered all three together under an "IT-4" label. This is not a rule
violation, but acceptance for IT-6/IT-7 is now bundled into an unverified suite — worth acknowledging so
"IT-5 can start" is not inferred from IT-4 alone.

### IT-4 verdict

> **Not accepted. Conditionally sound, evidence incomplete.**
> Implementation quality and static/unit evidence are strong (189 unit tests, clean build, correct constraints
> and isolation patterns). **The required acceptance evidence — a real-PostgreSQL run — is missing.**
> Per AGENTS.md rule 11, no pass may be claimed.

---

## 5. Frontend authentication review

| Check                                  | Verdict          | Evidence                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `credentials: 'include'` on every call | ✅               | `auth-client.ts` lines 84, 126, 147 — sign-in, sign-up, sign-out, get-session                                                                                                                                                                                                                         |
| **No token in browser storage**        | ✅               | `localStorage` used **only** for `mf-theme` (`theme-toggle.tsx`, `layout.tsx`); no `sessionStorage`, no `document.cookie`, no `Bearer`, no `access_token`/`refresh_token` anywhere in `apps/web`                                                                                                      |
| HttpOnly cookie model                  | ✅               | The session cookie is never read by JavaScript; rationale documented in `auth-form.tsx`                                                                                                                                                                                                               |
| Sign-up / sign-in flows                | ✅               | `AuthForm` → `signUp`/`signIn` → `POST /api/v1/auth/{sign-up,sign-in}/email` with correct payloads                                                                                                                                                                                                    |
| **Sign-out flow**                      | ❌ **Not wired** | `signOut()` is implemented and unit-tested but **imported by no component**; no sign-out control exists in `app-shell.tsx` or anywhere else                                                                                                                                                           |
| **`/me` session retrieval**            | ❌ **Not wired** | `getSession()` exists (calls Better Auth `GET /get-session`) but **is unused**; no component reads the session; the thin Nest `GET /api/v1/me` is never called from the web app                                                                                                                       |
| Error states                           | ✅               | Safe API message via `readErrorMessage`, generic fallback, `role="alert"`, generic copy (never reveals whether an email is registered)                                                                                                                                                                |
| Loading states                         | ✅               | `pending` disables the submit button and swaps copy to "Signing in…" / "Creating account…"                                                                                                                                                                                                            |
| Redirect behaviour                     | ✅ (scoped)      | `window.location.assign('/app/dashboard')` — deliberate full-page navigation to pick up the HttpOnly cookie; destination route exists                                                                                                                                                                 |
| **Route protection**                   | ⚠️ Absent        | No `middleware.ts`; all `/app/*` routes build as **static (○)** previews. `mvp-scope.md` expects "protected routes redirect to sign-in" — belongs with IT-8 wiring                                                                                                                                    |
| API URL configuration                  | ✅               | `NEXT_PUBLIC_API_URL=http://localhost:4000`; trailing slashes trimmed; `null` when unset → honest "unavailable" error. No secret exposed (`NEXT_PUBLIC_` only). `BETTER_AUTH_URL`/`BETTER_AUTH_SECRET` are absent from `.env` (local dev defaults apply — correct for dev, must be set in production) |
| Tests                                  | ✅               | `auth-client.test.ts` (5 cases: base-URL handling, success, 401 message, network failure, 401 → `null` session) + `auth-form.test.tsx` (4 cases: validation blocks fetch, success navigates, failure re-enables + alerts, sign-up payload) — **all passing**                                          |
| Production build                       | ✅               | `pnpm build` exit **0**; web compiled, 18 routes prerendered                                                                                                                                                                                                                                          |

**Minor finding:** `serverErrorId` is generated in `auth-form.tsx` (line 149) but never referenced by any
`aria-describedby`. `role="alert"` makes it announced, so impact is low — a cosmetic accessibility cleanup.

### Frontend verdict

The **sign-in/sign-up path is genuinely connected and safe** (credentials-include, HttpOnly, no token storage,
generic errors, real tests). It is **not complete**: **sign-out and session retrieval are unbuilt** — the
client functions exist but no UI consumes them. Treat the auth wiring as **~70% done**, not finished.

---

## 6. Port 4000 — "empty HTTP 500" diagnosis

**Cannot reproduce; no live process to inspect.**

| Probe                        | Result              |
| ---------------------------- | ------------------- |
| `netstat -ano` on 4000       | **No listener**     |
| TCP connect `127.0.0.1:4000` | `ECONNREFUSED`      |
| `tasklist` grep `node`       | **No node process** |

Nothing is running on port 4000, so no process was killed, restarted, or modified (as instructed).

### Most likely cause, by inspection

The `.env` on this machine points the database at **Neon**, not at a local PostgreSQL:

```text
DATABASE_URL      : postgresql://neondb_owner:<redacted>@ep-summer-frog-…-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL        : postgresql://neondb_owner:<redacted>@ep-summer-frog-….c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
TEST_DATABASE_URL : <absent>
POSTGRES_PORT     : 5432      (local Docker would be 5432 — unused)
```

This is the key finding. Ranked hypotheses for an **empty** 500:

1. **Non-Nest error path on `/api/v1/auth/*`.** Better Auth is mounted with
   `app.use(AUTH_BASE_PATH, toNodeHandler(auth))` **in front of** Nest's router (`bootstrap.ts`). Its errors
   bypass `ApiExceptionFilter`, which otherwise **always** writes JSON `{ message }`. A database-level failure
   inside the session or sign-up path is therefore the most plausible way to get a 500 that does **not** carry
   the API error envelope — matching "empty 500", whereas any Nest-routed failure would have produced
   `{"message":"Internal server error."}`.
2. **Remote/Neon schema drift or unreachable compute.** If the Neon `neondb` schema has not received this
   migration set, or compute is cold/credentials are stale, database-backed auth calls fail. `PrismaService`
   deliberately does **not** connect eagerly, so the process stays up and only DB-touching routes break —
   consistent with a live port 4000 failing per-request.
3. **Proxy or leftover listener.** A stale or foreign listener on 4000 would also yield a body-less 500.
   Ruled out _now_ (nothing listening), but not at the time of the original report.

**Relevance to current code:** the port-4000 behaviour is a **local environment/database-wiring issue**, not a
code defect in the verified build. The current revision builds and its unit suites pass. Protected Nest routes
cannot produce an empty-body 500 while the guard is in place (they answer 503 when the database is unreachable).

### Safe next action (no destructive step)

1. Confirm whether the Neon `neondb` database has the committed migrations applied — check via the Neon
   console/SQL editor **only if the owner approves a remote read**; do not run `db:migrate` against it from a
   development machine.
2. Start the API in the **foreground** on a spare port (e.g. `PORT=4100 pnpm dev:api`) with logs visible, then
   `curl -i http://localhost:4100/api/v1/health` and a `sign-in/email` call. Capture the actual body and stack.
3. Independently, restore the documented local path: run PostgreSQL 16 via the compose file (or install it) on
   **5432**, then set `TEST_DATABASE_URL` to the local `moneyflow_test` database.
4. Read the **CI integration job** result — it is the fastest existing source of real-PostgreSQL evidence.

> **Risk flag for the owner:** the local `.env` pointing development at a shared Neon database risks
> accidental migrations or experiments against shared data. It was **not** modified here; it should be
> corrected with an explicit owner decision.

---

## 7. IT-5 readiness — scope and decision

### Exact scope

From requirements §5.5, `implementation-plan.md` IT-5, `domain-model.md`, and ADR-0004 §10:

- **Default categories cloned per user at first sign-in** (no nullable/system owner; every category is owned).
- **CRUD:** `GET/POST /api/v1/categories`, `PATCH/DELETE /api/v1/categories/:id`.
- **Case-insensitive uniqueness** via a service-maintained `nameKey` plus `@@unique([userId, nameKey, type])`.
- **Rename** and optional **recolor**; colour must never be the only signal.
- **Archive vs delete:** delete only when unreferenced by any transaction; otherwise archive (409 + message).
  **Reassignment explicitly deferred with a clear error.**
- Archived categories keep historical reports readable.
- Category **type must match** transaction type (already enforced server-side in IT-4).
- Contracts in `packages/contracts`; web page `apps/web/src/app/app/categories/page.tsx` (currently a mock preview).

### Dependencies

| Dependency                                                              | Status                                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Category` table + `CategoryType`/`CategoryStatus` enums + unique index | ✅ Already in the initial migration                                  |
| `category_userId_fkey` (user-owned records scoped to user)              | ✅ Present                                                           |
| Transactions requiring a matching-type category                         | ✅ Enforced in `transactions.service.ts`                             |
| IT-4 accounts/transactions API                                          | ✅ Committed (`969e9f8`) — **integration evidence pending**          |
| `apps/api/src/modules/categories/*`                                     | ❌ Does not exist (modules are auth, health, accounts, transactions) |

### Unresolved decisions (must be settled before coding — AGENTS.md)

1. **Where the clone happens:** Better Auth sign-up hook vs lazy `ensureDefaults` on first category read.
   Not decided in any ADR.
2. **Which hook mechanism** is safe with the current `createAuthOptions` design (needs a database hook; must be
   transactional with sign-up and must not double-clone on retry).
3. **Exact default list and colours** (`domain-model.md` suggests Salary, Other income, Groceries, Utilities,
   Transport, Other expense).
4. **Delete-when-referenced response shape** — 409 vs 400, and the message copy (DR-16-adjacent).
5. **Rename collision behaviour** (409) and whether `nameKey` is recomputed on rename (it must be).

### Readiness decision

> ### ⛔ HOLD — do not start IT-5 yet.

The instruction _"Do not start IT-5 while required IT-4 acceptance evidence remains missing"_ is decisive:
the IT-4 integration suites have **never run**, and this session could not run them. The prerequisites are
otherwise excellent (schema, enums, unique index, contracts pattern, and the category-type rule all already
exist), so IT-5 can start **immediately after** the integration gate is satisfied — one successful
`pnpm test:integration` run (locally with Docker, or a green CI integration job) plus an owner ruling on the
decision points above.

---

## 8. Owner-approval checklist

Approve these in order. **Nothing below has been done; no changes were made, nothing was staged, and nothing
was committed.**

### Gate 1 — establish IT-4 evidence (blocking)

- [ ] **A1.** Authorise a PostgreSQL 16 instance for this machine — either Docker
      (`docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d`) or a local install
      on **5432** (the documented port; 5433 is not in the repo).
- [ ] **A2.** Approve adding a **local-only**
      `TEST_DATABASE_URL=postgresql://…@localhost:5432/moneyflow_test?schema=public` to `.env`, or provide it
      as an environment variable for one run. (Guard stays intact; no Neon access.)
- [ ] **A3.** Authorise running `pnpm test:integration` and reporting the real per-suite results and exit code.
- [ ] **A4.** Alternatively/additionally: authorise reading the **CI integration job** result on GitHub as
      substitute evidence — and state whether CI counts as acceptance evidence.
- [ ] **A5.** Confirm the **IT-4 vs IT-6/IT-7** bundling in `969e9f8` is acceptable, or split the acceptance record.

### Gate 2 — IT-4 web wiring (scope decision)

- [ ] **B1.** Decide whether IT-4 acceptance requires the `/app/accounts` and `/app/transactions` pages to
      consume the real API, or whether the backend-only commit is the intended IT-4 deliverable (the pages are
      still mock previews).

### Gate 3 — frontend auth completion

- [ ] **C1.** Approve building the **sign-out control** (wire the already-tested `signOut()`), and where it lives.
- [ ] **C2.** Approve **session retrieval** wiring (`getSession()` / `GET /api/v1/me`) and whether route
      protection should live in `middleware.ts` (IT-8) or be deferred.
- [ ] **C3.** Approve committing the 9 web files (+ optional `.gitattributes`) as one reviewed slice, and the
      optional `aria-describedby` fix.

### Gate 4 — environment hygiene

- [ ] **D1.** Decide on the local `.env` pointing development at **Neon** (`neondb`) while the docs specify local
      Docker on 5432. Recommendation: repoint development to local and keep Neon for staging/production only.
- [ ] **D2.** Decide the disposition of the `api/` scaffold at `acdf258`
      (recommendation: removal — non-compiling, unreferenced, outside the workspace).
- [ ] **D3.** Decide whether to investigate port 4000 via a foreground run on a spare port (safe, non-destructive).

### Gate 5 — IT-5 authorisation (only after Gate 1)

- [ ] **E1.** Rule on the five IT-5 decision points in §7 (clone timing/mechanism, default list and colours,
      delete-conflict response, rename behaviour), and whether an ADR is required first.
- [ ] **E2.** Then authorise `apps/api/src/modules/categories/*` + contracts + integration suite.

---

## Bottom line

- **Repository state:** preserved exactly; `HEAD` = `acdf258`; nothing staged, committed, or deleted.
- **`acdf258`:** does contain the `api/` scaffold — 12 non-compiling, unreferenced files outside the pnpm workspace.
- **IT-4:** implementation and unit evidence look correct and complete; **integration proof is still missing
  because no PostgreSQL exists on this machine**. The reported port-4000 errors were a missing process plus a
  Neon-pointing `.env`, not a code bug.
- **Frontend auth:** sign-in/sign-up are honestly and safely wired; **sign-out and session retrieval are not built**.
- **IT-5:** scope is clear and prerequisites are in place, but **hold until Gate 1 produces real IT-4 evidence**.

---

### Evidence index — commands run during this review

```text
git status / git branch -v / git log --oneline -20 --decorate
git show --stat --summary acdf258
git show --stat --summary 969e9f8
git diff --stat / git diff -- apps/web
git status --porcelain --untracked-files=all
git check-ignore -v .freebuff/project-id

netstat -ano | grep LISTENING | grep -E ':(4000|5432|5433)'
node -e "net.connect(...)"            # TCP probe of 4000 / 5432 / 5433
tasklist | grep -iE 'postgres|pg_|docker|node'
sc query type= service state= all | grep -iE 'postgres|docker'
which psql pg_isready pg_ctl ; ls "/c/Program Files/PostgreSQL"
docker version ; docker ps

pnpm format:check       # exit 0
pnpm lint               # exit 0
pnpm typecheck          # exit 0
pnpm test               # exit 0  (API 189, web 128)
pnpm build              # exit 0
pnpm test:integration   # exit 1  (TEST_DATABASE_URL is not set)
```
