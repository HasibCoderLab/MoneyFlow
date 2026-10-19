# MoneyFlow — IT-4 Verification, Auth Integration Review & IT-5 Readiness

> **Report date:** 2026-10-17
> **Revision reviewed:** `acdf258a08cf5f8fe585616815185103ebca50d3` (branch `main`) **plus the uncommitted working tree**
> **Reviewer roles:** Principal Backend Engineer · QA Architect · Application Security Reviewer
> **Method:** every claim below cites a file path or a command actually run. Nothing is inferred from intentions;
> where verification was impossible in this environment it is explicitly marked **Not verified**.
> **Host limitation:** this machine has **no Docker and no local PostgreSQL** (no listener on 5432 or 5433,
> `docker: command not found`), so the real-PostgreSQL integration suites could not be executed **locally**;
> the equivalent CI runs are recorded in §3.6.
>
> **Headline:** IT-4 is **CI-VERIFIED** — the real-PostgreSQL 16 integration suites **PASSED in CI** on the
> exact commits that contain them (`969e9f8`, `acdf258`). They remain **unverified locally** on this laptop,
> which has no PostgreSQL installation. Every database-free gate passes.
> Apart from this report file itself, no repository file was modified, staged, or deleted during this work.
>
> **Revision note (2026-10-17, post-review addendum):** after the initial review, CI run metadata was read
> from GitHub (see §3.6). The original "not verified" verdict applied **only to this local machine** and has
> been superseded for the committed code. §3.4, §3.5, §4, §7, §8 and the bottom line were updated accordingly.
> **CI-verified is not the same as locally verified** — both statuses are stated separately throughout.
>
> **Repository reset (owner-performed, 2026-10-17 20:02–20:04 +0600):** the GitHub repository was replaced
> with a new one (id `1423388832`) and local git was re-initialised; the whole tree was pushed as the single
> commit **`ada3082` "first commit"** (226 files). The reviewed code survived, but the old commit SHAs are
> now unreachable, the old CI run records return 404, and the new commit **contains no `.github/` directory —
> the CI workflow is gone**. Details and impact: §3.8.

---

## Table of contents

1. [Exact Git state and changes by category](#1-exact-git-state-and-changes-by-category)
2. [`acdf258` contents and scaffold disposition](#2-acdf258-contents-and-scaffold-disposition)
3. [IT-4 PostgreSQL verification](#3-it-4-postgresql-verification--ci-verified-locally-blocked)
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

> **Post-reset note (2026-10-17 20:04 +0600):** the table below records the state **at review time**. The
> owner has since replaced the repository and pushed everything as a single commit **`ada3082`** ("first
> commit"); the current tree is clean except this report. See §3.8.

| Category                | Count | Files                                                                                                                                                                                               |
| ----------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Staged**              | 0     | —                                                                                                                                                                                                   |
| **Modified (unstaged)** | 6     | `apps/web/src/app/(auth)/sign-in/page.tsx`, `sign-in/page.test.tsx`, `sign-up/page.tsx`, `sign-up/page.test.tsx`, `apps/web/src/components/auth-form.tsx`, `apps/web/src/components/auth-shell.tsx` |
| **Untracked**           | 4     | `.gitattributes`, `apps/web/src/components/auth-form.test.tsx`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/lib/auth-client.test.ts`                                                           |
| **Committed (recent)**  | —     | `acdf258` (scaffold preserve) → `969e9f8` (IT-4 backend) → `609b1ee` (theme switcher)                                                                                                               |

The 9 web files under review are exactly: **6 modified + 3 untracked** (`auth-client.ts`,
`auth-client.test.ts`, `auth-form.test.tsx`). This confirms the "latest nine web-file changes" scope.
After the reset these 9 files (plus `.gitattributes`) are **committed** in `ada3082`, so they are no longer
uncommitted — but they still have **no CI coverage**, because the new commit contains no workflow (§3.8).

### Ownership notes (untouched, as instructed)

- **`.gitattributes`** — user-authored, pins LF for 20 paths; line-ending hygiene only, no code impact.
  Now committed in `ada3082`.
- **`.freebuff/project-id`** — present at review time, excluded via `.git/info/exclude` (`/.freebuff/`); local
  tooling artifact. It **no longer exists after the repository reset** (§3.8) — nothing to track, no action.
- **`.env`** — gitignored, holds **live Neon credentials** (see §6). Not modified.

### Secret scan

`git diff` and all untracked files were scanned for `secret|password|token|api_key|private key|sk-|ghp_`.
Matches were only field names and test fixtures (`'x'.repeat(12)`, `local-password-12`).
**No secrets in the diff.**

---

## 2. `acdf258` contents and scaffold disposition

**Yes — `acdf258` contained the previously reported `api/` scaffold.**

> **Post-reset note:** `acdf258` no longer exists in the replaced repository; the same `api/` scaffold is now
> tracked inside `ada3082` (§3.8), still outside the pnpm workspace and still unreferenced.

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

## 3. IT-4 PostgreSQL verification — **CI-VERIFIED, LOCALLY BLOCKED**

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

The two columns are deliberately separate: **CI** is the only environment where any of these suites has ever
executed; **local** is this laptop.

| Suite                | File                                            | CI (PostgreSQL 16)           | Local (this laptop)                            |
| -------------------- | ----------------------------------------------- | ---------------------------- | ---------------------------------------------- |
| auth-session         | `test/integration/auth.test.ts`                 | ✅ **PASSED** (run #14, #15) | ⚠️ NOT RUN — no PostgreSQL                     |
| accounts             | `test/integration/accounts.test.ts`             | ✅ **PASSED** (run #14, #15) | ⚠️ NOT RUN — no PostgreSQL                     |
| transactions         | `test/integration/transactions.test.ts`         | ✅ **PASSED** (run #14, #15) | ⚠️ NOT RUN — no PostgreSQL                     |
| schema / constraints | `test/integration/{schema,constraints}.test.ts` | ✅ **PASSED** (run #14, #15) | ⚠️ NOT RUN — no PostgreSQL                     |
| _local attempt_      | `pnpm test:integration`                         | — (guarded, N/A)             | ❌ exit **1** — `TEST_DATABASE_URL` is not set |

### 3.5 What did run locally — database-free gates (all real, all green)

| Command                 | Exit  | Real result                                                                      |
| ----------------------- | ----- | -------------------------------------------------------------------------------- |
| `pnpm format:check`     | **0** | `All matched files use Prettier code style!`                                     |
| `pnpm lint`             | **0** | ESLint clean across config, contracts, test-utils, web, api                      |
| `pnpm typecheck`        | **0** | `tsc` clean, including `prisma generate` (7.10.1)                                |
| `pnpm test`             | **0** | **API 189 passed / 189 (23 files)** · **Web 128 passed / 128 (28 files)**        |
| `pnpm build`            | **0** | API built; Next.js compiled, 18 static routes (including `/sign-in`, `/sign-up`) |
| `pnpm test:integration` | **1** | Blocked locally — see §3.3                                                       |

> Note: the previously reported "185 unit tests" is now **189** (API) plus **128** (web) = **317 total**.

### 3.6 CI-verified integration runs (added post-review)

The repository is **public**, so run metadata was read directly from the GitHub API — no `gh` CLI (not
installed), no push, no local install, no Neon access.

| Run                     | Commit                                                              | Job                                 | Conclusion           | Step "Integration tests (real PostgreSQL 16)"                        |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------- | -------------------- | -------------------------------------------------------------------- |
| **#14** (`38917977860`) | **`969e9f8`** — "feat(api): IT-4 accounts and transactions backend" | `Integration tests (PostgreSQL 16)` | ✅ **success** (50s) | ✅ **success** (10s)                                                 |
| #14                     | `969e9f8`                                                           | `checks`                            | ✅ success (1m 7s)   | format · lint · typecheck · unit · build · db:validate — all success |
| **#15** (`38918458712`) | **`acdf258`** — current `HEAD`                                      | `Integration tests (PostgreSQL 16)` | ✅ **success** (50s) | ✅ **success** (12s)                                                 |
| #15                     | `acdf258`                                                           | `checks`                            | ✅ success (1m 7s)   | all steps success                                                    |

Relevant sub-steps in both runs: `Initialize containers` → **success** (the `postgres:16` service container
starts), `Build shared packages` → **success**, `Integration tests (real PostgreSQL 16)` → **success**.
The job runs exactly the local command, `pnpm test:integration`, with
`TEST_DATABASE_URL=postgresql://moneyflow:moneyflow@localhost:5432/moneyflow_test`; `globalSetup` applies the
committed migrations via `prisma migrate deploy` against that container.

**A vacuous pass is ruled out.** `vitest run` exits **1** with `No test files found` when nothing matches
(reproduced locally, §3.3). Since the step concluded _success_, the suites genuinely executed and passed.

**Limitation of this evidence:** CI job **logs** require a signed-in session, so pass/fail, timings and
step-level conclusions are verified, but **the exact test counts per suite could not be read** from here. No
test count is claimed.

**Evidence status after the repository reset.** The runs above were observed **before** the owner replaced the
repository (§3.8), and the owner has confirmed the CI verification. They are **no longer re-inspectable**:
API lookups for runs `38917977860` / `38918458712` now return **404**, and the commit SHAs `969e9f8` /
`acdf258` no longer resolve (**422**). The pass therefore stands as **historical, owner-confirmed evidence**
— quoted exactly as observed — and remains the documented IT-4 acceptance basis.

### 3.7 Why local execution remains impossible (added post-review)

A follow-up read-only inspection of this laptop found **no PostgreSQL at all**:

| Check                                                                                                         | Result                    |
| ------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Listener on 5433 / 5432 / 4000                                                                                | **none** (`netstat -ano`) |
| TCP `127.0.0.1:5433`, `:5432`, `:4000`                                                                        | **`ECONNREFUSED`**        |
| `postgres` / `pg_ctl` / `pgadmin` / `docker`                                                                  | **no process running**    |
| PostgreSQL Windows service                                                                                    | **no such service**       |
| `psql`, `pg_ctl`, `pg_isready`, `initdb`, `postgres`, `docker` on PATH                                        | **all NOT FOUND**         |
| Install roots (`C:\Program Files\PostgreSQL`, `C:\PostgreSQL`, `C:\pgsql`, `~\PostgreSQL`, `~\scoop\apps`, …) | **all absent**            |
| `postgres.exe` / `pg_ctl.exe` / `psql.exe` (depth 4–6 search)                                                 | **zero results**          |
| `*postgres*.zip` / `*.tar*` / `*.exe` / `*.msi` archives                                                      | **zero results**          |
| `pgdata` / `PG_VERSION` data directory                                                                        | **zero results**          |

The previously attempted PostgreSQL download **persisted nothing**: no installation, no extracted archive, no
partial package. `5433` is not a repository-documented port either — `grep 5433` across all
`.md`/`.ts`/`.yml`/`.prisma`/`.sql` returns **zero matches**; the documented local port is **5432**.

### 3.8 Repository reset and loss of the CI workflow (added post-review)

At **2026-10-17 20:02:56 +0600** the owner created a **new GitHub repository**
(`HasibCoderLab/MoneyFlow`, id `1423388832`, public) and re-initialised local git. At **20:03:50–20:03:56**
the whole working tree was committed and pushed as a single commit — **`ada3082` "first commit"**
(226 files, +31,123 lines). Verified consequences (local git + read-only GitHub API):

| Check                                      | Result                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Remote `main`                              | `ada3082…` — the only commit; local and remote in sync                                                          |
| Old commits (`969e9f8`, `acdf258`)         | **unresolvable (422)** — orphaned by the reset                                                                  |
| Old CI runs (`38917977860`, `38918458712`) | **404** — the repository object was replaced                                                                    |
| Workflows on the new repository            | **zero** (`actions/workflows` → empty)                                                                          |
| `.github/` in `ada3082` **and on disk**    | **absent** — `ci.yml` no longer exists, while `README.md` and `docs/report.md` still describe it                |
| Previously-uncommitted files               | **now committed**: `auth-client.ts`, `auth-client.test.ts`, `auth-form.test.tsx`, `.gitattributes`, this report |

**Impact.** The project currently has **no CI at all**: pushes run no checks and cannot re-run the PostgreSQL
16 integration suite, so the historical IT-4 evidence cannot be regenerated on the new head until the
workflow is restored. The IT-4 code itself survived — `apps/api/test/integration/*.test.ts` and the backend
modules are all present in `ada3082`.

**Recommendation (not actioned).** Restore a reviewed `.github/workflows/ci.yml` with the same two jobs as
before (database-free `checks` + `postgres:16` integration) and re-run IT-4 acceptance on the new head.
Tracked as approval item **H4** in §8. The reviewer modified **no** repository file except this report.

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

### Verified in CI (real PostgreSQL 16)

All real-PostgreSQL behaviour on the **committed** code was CI-verified for `969e9f8` and `acdf258` **before
the repository reset** (§3.6, §3.8), and the owner has confirmed that verification:
**migration replay on an empty database**, CHECK-constraint enforcement, the §8 worked example
(`Cash 2275000` / `Bank 200000`), idempotency replay, edit/delete re-derivation, listing, and
**cross-user isolation**. Evidence: CI runs #14/#15, job _Integration tests (PostgreSQL 16)_ → **success**
(§3.6). Exact per-suite test counts could not be read (logs require sign-in) and are **not** claimed.

### Not verified locally on this machine

The same suites have **never executed on this laptop** — it has no PostgreSQL installation, no Docker and no
`TEST_DATABASE_URL` (§3.1–§3.3, §3.7). This is an environment limitation, not a code finding. A local run
remains a **recommended** (not blocking) follow-up so that debugging does not depend on pushing.

### Verified statically only (not executed anywhere)

The **9 web auth files** (`auth-client.ts`, `auth-client.test.ts`, `auth-form.test.tsx` + the 6 modified
files) are covered by local unit tests and the local production build. They are now **committed** in
`ada3082`, but their integration behaviour against a live API remains **unverified**, and they have **no CI
coverage** — the new repository has no workflow (§3.8).

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
violation — and all three were covered by the same CI integration suite before the reset — but the acceptance
record bundles them, so "IT-6/IT-7 done" should not be inferred silently. Owner confirmation requested
(checklist item **A5**).

### IT-4 verdict

> **ACCEPTED for the committed backend — on historical, owner-confirmed CI evidence.**
> Implementation quality, static/unit evidence (317 unit tests, clean build) and the real-PostgreSQL 16
> integration run were all green on `969e9f8` and `acdf258`.
>
> **Caveats that keep this qualified, not unconditional:**
>
> 1. Integration evidence comes from **CI only** — never reproduced on this laptop (no PostgreSQL), and the
>    run records now return **404** after the owner replaced the repository (§3.8). The evidence is exactly as
>    observed before the reset and owner-confirmed, but it is no longer re-inspectable.
> 2. The new head `ada3082` has **no CI workflow**, so re-verification requires first restoring `ci.yml`
>    (approval item **H4**).
> 3. The **9 web auth files** are now committed but still have **no CI coverage**.
> 4. Exact per-suite test counts were never readable (logs require sign-in).
> 5. The IT-4/IT-6/IT-7 scope bundling needs owner acknowledgement (**A5**), and the web wiring question
>    (**B1**) is still open.
>
> Per AGENTS.md rule 11, every claim above is tied to a command, a CI job, or an API read that actually ran.

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
| IT-4 accounts/transactions API                                          | ✅ Committed (`969e9f8`) — **CI-verified** (§3.6)                    |
| `apps/api/src/modules/categories/*`                                     | ❌ Does not exist (modules are auth, health, accounts, transactions) |

### Decisions awaiting owner approval (do not guess — AGENTS.md)

Each row states what the documentation **already fixes** versus what is **genuinely open**, so no product rule
is invented. Options and a recommendation per decision follow in §7.1.

| #   | Decision                     | Already fixed by docs                                                                                                                                                  | Genuinely open                                                                                                                                                                                              |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Clone timing / mechanism** | "cloned per user **at first sign-in**" — ADR-0004 §10, `domain-model.md`, `mvp-scope.md` §10                                                                           | The **mechanism** (Better Auth `databaseHooks.user.create.after` vs lazy ensure-on-read), and the **backfill** for users created before IT-5 ships                                                          |
| D2  | **Default list (+ colours)** | Examples only: "Salary", "Other income", "Groceries", "Other expense" (ADR-0004 §10); `domain-model.md` says the recommended list "lives with the implementation task" | Exact names, count, income/expense split, and whether colours ship at all                                                                                                                                   |
| D3  | **Delete-conflict response** | "Delete only when unreferenced (**else 409 with message**)" — `domain-model.md` §Delete/archive; reassignment deferred (`implementation-plan.md` IT-5)                 | The **message copy**, and whether a stable machine-readable code accompanies it                                                                                                                             |
| D4  | **Rename behaviour**         | `nameKey` is service-maintained; uniqueness is `@@unique([userId, nameKey, type])`                                                                                     | Rename **collision → 409?**, whether `nameKey` is always recomputed, and whether an **archived** category may be renamed                                                                                    |
| D5  | **Scope / acceptance**       | Endpoints per §8.6: `GET/POST /api/v1/categories`, `PATCH/DELETE /api/v1/categories/:id`                                                                               | Archive **transport** (no `/archive` endpoint is listed for categories, unlike accounts), colour **format/validation**, list **ordering** and archived **filtering**, and whether **web wiring** is in IT-5 |

Verified facts that constrain D1 and D5 (checked, not assumed):

- The installed **`better-auth@1.7.10` supports** `databaseHooks: { user: { create: { before, after } } }` —
  the library's own bundled plugins use that exact shape
  (`dist/plugins/last-login-method`, `dist/plugins/test-utils`). The hook-based clone is therefore real, not
  hypothetical.
- Better Auth writes users through the **same Prisma client** the app already uses, so a hook can share the
  app's connection path.
- `apps/api/src/modules/categories/*` does not exist, and **no category endpoint is registered today**.
- Category **type** is part of the uniqueness key, so "Groceries" may legally exist once as `EXPENSE` **and**
  once as `INCOME`. Confirmation requested (D5).

### 7.1 Options and recommendations (for approval)

**D1 — Clone timing / mechanism.** _Options:_ **(a)** clone inside Better Auth `user.create.after`, so every
new user has defaults immediately and atomically with sign-up; **(b)** lazy `ensureDefaults` on first
`GET /categories`, which also self-heals any user who somehow has none; **(c)** both — hook for new users plus
lazy guard as a safety net. **_Recommendation: (c)_**, because it satisfies "at first sign-in" (ADR-0004 §10)
while remaining idempotent and covering the users that already exist in the database from IT-3 testing.
Requires a decision on the backfill for those pre-existing users.

**D2 — Default list (+ colours).** _Options:_ **(a)** the four names in ADR-0004 §10 (Salary, Other income,
Groceries, Other expense); **(b)** a richer set (~6–8) aligned with the current mock screen — Salary,
Freelance, Gifts / Groceries, Transport, Food & dining, Utilities, Other expense; **(c)** owner-supplied list.
_Colours:_ ship them on defaults, or leave `color` null and let the UI derive display colours. **_Recommendation:
(b) with colours on defaults_**, matching the mock UI users have already seen, while keeping the name as the
only way meaning is conveyed (§5.5). **You must supply or confirm the final names — this is a product rule.**

**D3 — Delete-conflict response.** **_Recommendation: `409 Conflict`_** (already specified in
`domain-model.md`), with a message such as "This category is used by existing transactions. Archive it
instead." and the existing `{ message }` error envelope. Treat reassignment as explicitly deferred; do not
silently reassign anything.

**D4 — Rename behaviour.** **_Recommendation:_** allow rename on **active and archived** categories (archived
categories still need fixing up), always recompute `trim`-normalised `nameKey`, and return **409** on a
collision within the same `(userId, type)` — consistent with the account-name conflict already shipped in
IT-4. **Type stays immutable** (changing it would orphan existing transactions' type-matching rule); a type
change means create-new + re-point, which is deferred.

**D5 — Scope / acceptance.** Sub-decisions: **(i)** archive transport — reuse `PATCH {status}` or add
`POST /:id/archive` + `/unarchive` mirroring accounts; **(ii)** colour validation — hex-only, optional;
**(iii)** list ordering (name ascending, archived last) and whether archived rows are filtered by a query
flag; **(iv)** whether `apps/web/src/app/app/categories/page.tsx` moves from mock data to the real API inside
IT-5 or in the later IT-8 wiring pass. **_Recommendation:_** mirror accounts exactly (`POST /:id/archive` +
`/:id/unarchive`) for consistency, hex-or-null colours, `name ASC` with archived excluded by default and
available via a flag, and **UI wiring deferred to the IT-8 pass** so IT-5 stays a small, reviewable backend
increment (matching how IT-4 shipped).

### Readiness decision

> ### ⛔ HOLD on implementation — but the IT-4 evidence gate is CLEARED.
>
> The original blocker was missing IT-4 acceptance evidence. That evidence now exists: the real-PostgreSQL 16
> integration suites **passed in CI** on both the IT-4 commit and current `HEAD` (§3.6).
>
> IT-5 still must not start automatically, because four product decisions (**D1–D4**) and one scope decision
> (**D5**) are unapproved, and AGENTS.md forbids resolving open decisions by guessing. Once D1–D5 are ruled on
> — and an ADR is recorded if the owner wants the clone mechanism and default list fixed in writing — IT-5 can
> begin immediately: the schema, enums, unique index and the category-type rule are already in place.

---

## 8. Owner-approval checklist

Approve these in order. **Nothing below has been done; no changes were made, nothing was staged, and nothing
was committed.**

### Gate 1 — IT-4 evidence ✅ SATISFIED via CI (2026-10-17)

- [x] **A4.** CI integration job read as evidence — **run #14 (`969e9f8`) and run #15 (`acdf258`) both PASSED**
      on real PostgreSQL 16 (§3.6), and the owner has confirmed this CI verification for both commits.
      (**Historical evidence** — the run records now return 404 after the repository reset, §3.8.)
- [ ] **A5.** Confirm the **IT-4 vs IT-6/IT-7** bundling in `969e9f8` is acceptable, or split the acceptance
      record. ← **still open (non-blocking for IT-5 once D1–D5 are ruled on)**
- [ ] **A1–A3 (optional, non-blocking).** Stand up a local PostgreSQL 16 on **5432**, add a local-only
      `TEST_DATABASE_URL`, and run `pnpm test:integration` locally — recommended so future debugging does not
      depend on pushing.

### Gate 2 — IT-4 web wiring (scope decision)

- [ ] **B1.** Decide whether IT-4 acceptance requires the `/app/accounts` and `/app/transactions` pages to
      consume the real API, or whether the backend-only commit is the intended IT-4 deliverable (the pages are
      still mock previews).

### Gate 3 — frontend auth completion

- [ ] **C1.** Approve building the **sign-out control** (wire the already-tested `signOut()`), and where it lives.
- [ ] **C2.** Approve **session retrieval** wiring (`getSession()` / `GET /api/v1/me`) and whether route
      protection should live in `middleware.ts` (IT-8) or be deferred.
- [x] **C3.** The 9 web files (+ `.gitattributes`) are **already committed** by the owner in `ada3082`
      (§3.8). The only part still open is the optional `aria-describedby` fix.

### Gate 4 — environment hygiene

- [ ] **H1.** Decide on the local `.env` pointing development at **Neon** (`neondb`) while the docs specify local
      Docker on 5432. Recommendation: repoint development to local and keep Neon for staging/production only.
- [ ] **H2.** Decide the disposition of the `api/` scaffold at `acdf258`
      (recommendation: removal — non-compiling, unreferenced, outside the workspace).
- [ ] **H3.** Decide whether to investigate port 4000 via a foreground run on a spare port (safe, non-destructive).
- [ ] **H4.** **Restore CI** — re-create the reviewed `.github/workflows/ci.yml` (checks + PostgreSQL 16
      integration jobs) and re-run the IT-4 acceptance on `ada3082`. The new repository currently has **no
      workflows at all** (§3.8), so nothing runs on future pushes. Approval needed before adding the file.

### Gate 5 — IT-5 authorisation (after D1–D5 are ruled on)

- [ ] **E1.** Rule on the five IT-5 decisions **D1–D5** in §7 (clone timing/mechanism, default list and colours,
      delete-conflict response, rename behaviour, scope/acceptance), and whether an ADR is required first.
- [ ] **E2.** Then authorise `apps/api/src/modules/categories/*` + contracts + integration suite.

---

## Bottom line

- **Repository state:** the owner **replaced the repository and re-initialised git** at 2026-10-17 20:03;
  everything (including the reviewed 9 web files) is now one pushed commit **`ada3082` "first commit"**;
  working tree clean except this report. The reviewer staged, committed, and pushed nothing.
- **CI status now:** the new repository has **no `.github/` directory and zero workflows** — checks and the
  PostgreSQL 16 integration job cannot run until a `ci.yml` is restored (**H4**); the old run records 404.
- **`ada3082`:** still contains the `api/` scaffold — 12 non-compiling, unreferenced files outside the pnpm
  workspace — now tracked rather than untracked.
- **IT-4:** **accepted for the committed backend on historical, owner-confirmed CI evidence** — the
  real-PostgreSQL 16 integration suites passed in CI on `969e9f8` **and** `acdf258` (§3.6), observed before the
  repository reset. Remaining caveats: never reproduced on this laptop (no PostgreSQL), per-suite counts
  unreadable (CI logs require sign-in), the 9 web files are committed but have no CI coverage, and the
  IT-4/IT-6/IT-7 bundling still needs owner acknowledgement (**A5**). The reported port-4000 errors were a
  missing process plus a Neon-pointing `.env`, not a code bug.
- **Frontend auth:** sign-in/sign-up are honestly and safely wired; **sign-out and session retrieval are not built**.
- **IT-5:** evidence gate **CLEARED** (IT-4 is CI-verified) and prerequisites are in place, but implementation
  stays on **HOLD** until the owner rules on **D1–D5** (§7) — no product rule may be guessed.

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
node -e "net.connect(...)"            # TCP probe of 4000 / 5432 / 5433  -> ECONNREFUSED x3
tasklist | grep -iE 'postgres|pg_|docker|node'
sc query type= service state= all | grep -iE 'postgres|docker'
which psql pg_isready pg_ctl initdb postgres docker   # all NOT FOUND
find / -name 'postgres.exe' -o -name 'pg_ctl.exe' ... # zero results (depth 4-6)
ls "$LOCALAPPDATA/Temp" | grep -iE 'postgres|\.zip|\.exe|\.msi|pgdata'
grep -r 5433 **/*.{md,ts,yml,prisma,sql}              # zero matches
cat .env | grep -E 'TEST_DATABASE_URL|DATABASE_URL|PORT'  # TEST_DATABASE_URL absent
grep -rn 'databaseHooks' node_modules/.pnpm/better-auth@1.7.10*/...   # supported (plugins use it)

pnpm format:check       # exit 0
pnpm lint               # exit 0
pnpm typecheck          # exit 0
pnpm test               # exit 0  (API 189, web 128)
pnpm build              # exit 0
pnpm test:integration   # exit 1  (TEST_DATABASE_URL is not set)

# CI evidence (GitHub REST API read; repo is public; no gh CLI, no push):
#   run 38917977860  commit 969e9f8  jobs total_count=2  -> both conclusion "success"
#   run 38918458712  commit acdf258  jobs total_count=2  -> both conclusion "success"
#   step "Integration tests (real PostgreSQL 16)" -> success (10s / 12s)

# Repository-reset verification (read-only GitHub API + local git, 2026-10-17 ~20:04 +0600):
#   GET /repos/HasibCoderLab/MoneyFlow            -> id 1423388832, created_at 2026-10-17T14:02:56Z (new repo)
#   GET .../git/trees/ada3082...?recursive=1      -> 226 blobs, .github absent
#   GET .../git/trees/acdf258...?recursive=1      -> 422 (commit unreachable)
#   GET .../actions/runs/38917977860              -> 404
#   GET .../actions/runs/38918458712              -> 404
#   GET .../actions/workflows                     -> [] (none)
#   GET /users/HasibCoderLab/repos                -> single MoneyFlow repo (id 1423388832)
#   git log/reflog, .git/logs/*                   -> init commit + push at 20:03:50 / 20:03:56 +0600
#   git ls-files                                  -> 226 files; IT-4 integration tests + web auth files present
```
