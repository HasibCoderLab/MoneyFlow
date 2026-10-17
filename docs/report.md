# MoneyFlow — Progress & Audit Report

> **Audit date:** 2026-10-16
> **Audited revision:** `4c3bfba` (branch `main`) **plus an uncommitted working tree**
> (18 modified tracked files + 2 untracked pre-audit files + this report; see §9 for the
> mid-audit reformat note).
> **Method:** every claim below cites a file path or a command actually run. Nothing is
> inferred from intentions; where verification was impossible in this environment it is
> explicitly marked **Unverified**.
> **Environment limitation:** this machine has no Docker and no local PostgreSQL
> (`docker: command not found`, no listener on 5432), so the real-PostgreSQL integration
> suite could not be executed here. Unit/lint/typecheck/build/format/db-validate were run.

---

## 1. Project Overview

| Item                    | Value                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                    | **MoneyFlow (working title)** — final name is an open decision (`requirements.md` §18.1)                                                                                                                               |
| Purpose                 | Personal finance SaaS for students, beginner savers, and young earners under the PaathAI umbrella: record money movements, understand summaries, set savings goals, customize a dashboard (`requirements.md` §1, §3.1) |
| Product source of truth | `requirements.md` v1.0.0 (1,397 lines) + accepted ADRs in `docs/decisions/`                                                                                                                                            |
| Architecture            | **Modular monolith** (ADR-0001): one Next.js web app, one NestJS API, one PostgreSQL database. No Redis/workers/K8s/Kafka (deliberate exclusion)                                                                       |
| Web                     | Next.js 16 (App Router), React 19.3, strict TypeScript ~6.0 (`apps/web/package.json`)                                                                                                                                  |
| API                     | NestJS 12, strict TypeScript ~6.0 (`apps/api/package.json`)                                                                                                                                                            |
| Database                | PostgreSQL 16, Prisma 7.10 (driver adapter `@prisma/adapter-pg`), Neon planned (ADR-0007)                                                                                                                              |
| Auth                    | **Better Auth 1.7.10** (self-hosted, email/password, Argon2id via `@node-rs/argon2`), database sessions, global fail-closed Nest guard                                                                                 |
| Monorepo                | pnpm 12.11.2 workspaces (`pnpm-workspace.yaml`), apps/\* + packages/\*                                                                                                                                                 |
| Quality tooling         | ESLint 10 flat config, Prettier 3, Vitest 5, `tsc --noEmit`; CI on GitHub Actions (Node 24)                                                                                                                            |
| Third-party APIs        | **None active.** No AI provider, no email provider, no bank integrations. Google Sign-In code path prepared but credentials not configured                                                                             |
| Localization            | Bangladesh / BDT-first (design decision DR-08, not finally approved)                                                                                                                                                   |

**Architecture summary:** `apps/api` is the only package that talks to the database.
The web app is meant to consume the HTTP API only — currently it makes **zero API calls**
(verified: no `fetch(` anywhere under `apps/web/src`). Financial business logic is meant to
live in `apps/api/src/domain/` + domain services; controllers stay thin. Money is integer
minor units (`bigint`), serialized as decimal-safe strings on the wire (ADR-0003).

---

## 2. Executive Summary

**Overall completion: ≈ 43 %** (weighted model over all planned scope — foundations,
MVP, V1 heads-up, design/V1 stubs; see §5 for the formula).

**Important distinction:** of that 43 %, almost all is foundation, tooling, security
scaffolding, documentation, and **labelled** UI preview. Strictly by requirements §3.1
MVP feature items, completion is **≈ 10–15 %** — there is **no financial persistence of
any kind** (accounts, transactions, categories, budgets, goals all return nothing and are
not implemented server-side).

**Five-line status:**

1. The engineering foundation is genuinely solid: strict TS monorepo, verified green unit
   suites (API 115/115, web 112/112), lint/typecheck/build/db-validate pass.
2. The money domain (IT-1), the Prisma schema + migration (IT-2), and the auth backend
   (IT-3) are implemented; IT-3 verification (integration tests) cannot run locally and
   the related work is **uncommitted**.
3. The web app is a high-quality **UI preview**: 17 statically built routes, all figures
   explicitly labelled sample data, no fake "saving" controls.
4. “IT-4…IT-13” — accounts, transactions, transfers, summaries, budgets, goals,
   preferences, export/deletion, hardening — are **not started**.
5. Deployment does not exist yet: no hosting decision (DR-14), no backups (DR-15), no
   monitoring, no e-mail provider (DR-06).

**Health score: 6 / 10.** Justification: very high marks for structure, documentation,
security posture, and honesty discipline; heavy deductions for product functionality
(≈ 0 % financial features), unverified database-level claims in this environment, an
uncommitted in-flight changeset, and the complete absence of a deployment path.

---

## 3. Project Structure

Verified tree (excludes `node_modules`, `.next`, `dist`, generated Prisma client):

```text
MoneyFlow/
├─ apps/
│  ├─ web/                    Next.js App Router app (@moneyflow/web)
│  │  ├─ src/app/             Route pages:
│  │  │  ├─ page.tsx          Landing page (motion polish, honest roadmap copy)
│  │  │  ├─ (auth)/sign-in, sign-up         Auth UI shells (submit disabled)
│  │  │  ├─ app/              dashboard, accounts, categories, transactions(+new),
│  │  │  │                    budgets, goals, reports, settings/{profile,preferences,
│  │  │  │                    security,data}  — all sample-data previews
│  │  │  ├─ error.tsx, loading.tsx, not-found.tsx   Global boundaries
│  │  │  └─ globals.css       Design tokens, light/dark, reduced-motion
│  │  ├─ src/components/      app-shell, auth-form, transaction-browser/-form,
│  │  │                       profile-form, category-bars, progress-bar, cards,
│  │  │                       theme-toggle, reveal, ui/{button,dialog}, icons…
│  │  └─ src/lib/             format.ts (display strings only), mock-data.ts (sample data)
│  └─ api/                    NestJS API (@moneyflow/api), owns Prisma
│     ├─ src/bootstrap.ts     App wiring: /api/v1 prefix, opt-in CORS, Better Auth mount
│     ├─ src/config/          env validation, .env loading, CORS parsing (+tests)
│     ├─ src/common/filters/  API error envelope (+tests)
│     ├─ src/domain/money/    IT-1 money module: amount, arithmetic, currency,
│     │                       effects, percentage, errors (+tests)
│     ├─ src/modules/auth/    IT-3: options factory, Argon2id hooks, global guard,
│     │                       /me controller, profile validation (+tests)
│     ├─ src/modules/health/  Public GET /api/v1/health (+tests)
│     ├─ src/prisma/          PrismaService (driver adapter, lazy connect) (+tests)
│     ├─ src/generated/       Prisma client output (gitignored, regenerated)
│     ├─ src/auth.ts          Better Auth CLI input (same options factory as runtime)
│     ├─ prisma/              schema.prisma (7 models) + 1 committed migration
│     └─ test/                Integration suites (auth, schema, constraints) + harness
├─ packages/
│  ├─ contracts/              Public API shapes: paths, health, error envelope, /me
│  ├─ config/                 Shared tsconfig base + ESLint flat config
│  └─ test-utils/             Runner-agnostic test helper (expectShape)
├─ docs/
│  ├─ architecture/           domain-model, accounting-rules, auth-sessions,
│  │                          database-and-testing (design docs)
│  ├─ decisions/              ADRs 0001–0008 + decision register DR-01…DR-17
│  ├─ product/                MVP scope, implementation plan IT-1…IT-13, status
│  └─ runbooks/               local-development.md
├─ infrastructure/docker/     docker-compose.yml (PostgreSQL 16) + test-db init SQL
├─ .github/workflows/ci.yml   CI: checks job + PostgreSQL-16 integration job
├─ requirements.md            PRD + architecture + rules (do not rewrite)
├─ AGENTS.md                  Mandatory operating rules
├─ README.md / OldREADME.md   (OldREADME.md is stale — see §8)
└─ .env.example               Placeholders only; real .env is gitignored
```

---

## 4. Feature Status Table

Status legend: ✅ Done · 🟡 Partial · ❌ Not started · 🐞 Broken (none found in shipped code).

| Feature                                       | Status | Evidence (file)                                                                                                                                                      | Remaining Work                                                                                                            |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Monorepo + toolchain                          | ✅     | `pnpm-workspace.yaml`, root `package.json`; `pnpm lint/typecheck/build` pass (run today)                                                                             | —                                                                                                                         |
| Money domain (IT-1)                           | ✅     | `apps/api/src/domain/money/{amount,arithmetic,currency,effects,percentage,errors}.ts` + 6 test files                                                                 | None for MVP scope; `REFUND` deliberately deferred (ADR-0004)                                                             |
| DB schema v1 + migration (IT-2)               | ✅     | `apps/api/prisma/schema.prisma` (7 models), `prisma/migrations/20261016032732_initial/migration.sql` (incl. hand-written CHECK constraints)                          | Goal/Budget/Preference/Audit tables land with IT-9/10/11/12                                                               |
| Auth backend (IT-3)                           | ✅     | `apps/api/src/modules/auth/*`, mounted in `src/bootstrap.ts`; 8 auth unit test files pass                                                                            | Owner review; run integration suite (uncommitted, unverified locally); email verification + recovery deferred by decision |
| Health endpoint                               | ✅     | `apps/api/src/modules/health/health.controller.ts`, `health.service.ts`                                                                                              | —                                                                                                                         |
| API error envelope                            | ✅     | `apps/api/src/common/filters/api-exception.filter.ts` + tests                                                                                                        | `traceId` field declared in `packages/contracts` but never populated (Low)                                                |
| Env validation + CORS posture                 | ✅     | `apps/api/src/config/env.ts`, `cors.ts` + tests                                                                                                                      | —                                                                                                                         |
| Rate limiting                                 | ✅     | `auth-options.ts` (`rateLimit: { enabled: true, storage: 'memory' }`)                                                                                                | Shared store when scaled beyond one instance                                                                              |
| Accounts (IT-4)                               | ❌     | No `apps/api/src/modules/accounts`; no pages consuming data (UI preview only)                                                                                        | Full CRUD + archive + opening-balance rules + derived balance + web wiring                                                |
| Categories (IT-5)                             | ❌     | Schema exists (`Category` model); no module/routes                                                                                                                   | CRUD, default-category clone, archive rules, web wiring                                                                   |
| Transactions income/expense (IT-6)            | ❌     | Schema exists (`Transaction`); no module; web `transaction-form.tsx` submit disabled (`TODO(IT-6)`)                                                                  | CRUD, filters, pagination, idempotency, balance consistency, web wiring                                                   |
| Transfers (IT-7)                              | ❌     | Effect matrix supports it (`effects.ts`); no API                                                                                                                     | Single-row transfer CRUD + atomicity tests                                                                                |
| Summaries / dashboard / reports (IT-8)        | ❌     | Dashboard renders literals from `apps/web/src/lib/mock-data.ts` only                                                                                                 | One summary service, dashboard/report endpoints, widget-by-widget wiring, delete mock data                                |
| Budgets (IT-9)                                | ❌     | UI preview page only (`app/app/budgets/page.tsx`)                                                                                                                    | Budget + per-category limits CRUD, spent/remaining math, period rules                                                     |
| Goals + contributions (IT-10)                 | ❌     | UI preview only; ADR-0005 proposed, DR-03 not approved                                                                                                               | Depends on DR-03 decision, then schema + CRUD + contributions + tests                                                     |
| Preferences + dashboard customization (IT-11) | 🟡     | Theme toggle works locally (`theme-toggle.tsx`, `localStorage` only); preferences page lists honest states                                                           | Server-side preferences, dashboard layout persistence, reset-to-default                                                   |
| CSV export (IT-12)                            | ❌     | Settings data page states nothing exists to export                                                                                                                   | Export endpoint + UI                                                                                                      |
| Account deletion (IT-12)                      | ❌     | Settings security/data pages are statements only                                                                                                                     | Deletion workflow + confirmation + retention rules (DR-16)                                                                |
| Web auth wiring                               | ❌     | `apps/web/src/components/auth-form.tsx` — submit `disabled`, `TODO(auth)`; **zero** `fetch()` calls in web; no middleware/route protection                           | Connect sign-in/sign-up to `/api/v1/auth/*`, session handling, guard `/app/*`                                             |
| Responsive UI + states                        | 🟡     | `app-shell.tsx` responsive nav, skip link; `error.tsx`, `loading.tsx`, `not-found.tsx`                                                                               | Per-feature empty/loading/error states once data exists                                                                   |
| Web UI preview (17 routes)                    | ✅     | Build output lists all routes as static; labelled sample data (`mock-data.ts`, `mock-data-banner.tsx`)                                                               | Replace with real data (planned in IT-8+)                                                                                 |
| Docs (ADRs, register, runbooks)               | ✅     | `docs/decisions/0001–0008`, `decision-register.md` (DR-01…DR-17), `docs/architecture/*`, `docs/runbooks/*`                                                           | Update as features land                                                                                                   |
| CI pipeline                                   | ✅     | `.github/workflows/ci.yml` (checks + PostgreSQL 16 integration jobs)                                                                                                 | Confirm current run status on GitHub (**Unverified** here)                                                                |
| Integration test harness                      | 🟡     | `apps/api/test/integration/{harness,http-test-app,global-setup}.ts`; suites `auth.test.ts` (new, untracked), `schema.test.ts`, `constraints.test.ts` (12+12+5 cases) | Execute on a machine with Docker/PostgreSQL; commit; keep green in CI                                                     |
| AI money assistant (V1)                       | ❌     | Deliberately deferred (DR-13); no AI code anywhere                                                                                                                   | V1 scope                                                                                                                  |
| Recurring rules (V1)                          | ❌     | —                                                                                                                                                                    | V1 scope                                                                                                                  |
| Notifications (V1)                            | ❌     | —                                                                                                                                                                    | V1 scope                                                                                                                  |
| Email verification / password recovery        | ❌     | `auth-options.ts`: `requireEmailVerification: false` ("explicit launch gate"); UIs absent                                                                            | Email provider decision (DR-06) + flows                                                                                   |
| Google Sign-In                                | 🟡     | `auth-options.ts` includes Google only when credentials exist; `env.ts` rejects half-configured pairs                                                                | Owner supplies credentials; enable + test                                                                                 |
| Deployment (staging/prod)                     | ❌     | No Dockerfile, no hosting config; DR-14/DR-15 unresolved                                                                                                             | Hosting, secrets management, monitoring, backups, TLS/domain                                                              |

---

## 5. Progress Breakdown

### 5.1 Method and formula

This is a **rubric-based estimate, not a measured fact**. Reproducing it:

1. Every feature/obligation from `requirements.md`, `docs/product/implementation-plan.md`
   (IT-1…IT-13) and the README/TODOs was listed.
2. Weights: **Core = 3**, **Important = 2**, **Nice-to-have = 1**.
3. Each item scored 0–100 % against its written acceptance criteria, from code and test
   evidence only (completed items with in-environment verification gaps scored 90–95).
4. `% = Σ(weight × completion) / Σ(weight)`, computed per layer and overall (deduplicated).

Bands: 0 = no code, 5–30 = scaffold/preview only, 40–60 = implemented but unverified or
partially wired, 85–95 = complete except environmental verification, 100 = verified done.

### 5.2 Layer summary

| Layer                       | Completion | Notes                                                                                    |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| **Backend (API logic)**     | **≈ 39 %** | Auth + money + health + config done; all financial modules missing                       |
| **Frontend (web)**          | **≈ 35 %** | Preview shells everywhere; zero real data wiring                                         |
| **Database**                | **≈ 58 %** | Auth + financial core tables done; goal/budget/preference/audit tables not designed      |
| **Auth**                    | **≈ 54 %** | Backend strong; frontend wiring, recovery, verification, Google absent                   |
| **Testing**                 | **≈ 53 %** | Existing code well tested; the planned financial/E2E slate is 0 %                        |
| **Deployment**              | **≈ 45 %** | CI + local env + builds exist; hosting/monitoring/backup/staging = none                  |
| **Overall (deduped model)** | **≈ 43 %** | Core tier 13.05/51 = 25.6 %; Important tier 21.3/24 = 88.8 %; Nice tier 2.05/10 = 20.5 % |

Cross-checks (same evidence, different lens):

| Lens                                       | Result                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Implementation-plan tasks implemented      | **3 / 13** (IT-1, IT-2, IT-3) = **23 %**                                                                                            |
| Strict requirements §3.1 MVP feature items | **≈ 10–15 %** (auth backend ≈ 60 %, theme ≈ 10 %, responsive ≈ 40 %, states ≈ 30 %, tests ≈ 30 % of slate; all financial items 0 %) |
| Test counts actually executed today        | API **115/115**, web **112/112** pass                                                                                               |

### 5.3 Backend layer (Σweight 42 → Σscore 16.4 = 39 %)

| Item                                   | W   | Done  | Score |
| -------------------------------------- | --- | ----- | ----- |
| Health + readiness                     | 2   | 100 % | 2.0   |
| Env validation / boot config           | 2   | 100 % | 2.0   |
| Money domain (IT-1)                    | 3   | 100 % | 3.0   |
| Auth backend email/password + sessions | 3   | 90 %  | 2.7   |
| Global guard + isolation pattern       | 3   | 90 %  | 2.7   |
| Rate limiting + CSRF origins           | 2   | 100 % | 2.0   |
| Error envelope                         | 2   | 100 % | 2.0   |
| Accounts API                           | 3   | 0 %   | 0     |
| Categories API                         | 3   | 0 %   | 0     |
| Transactions API                       | 3   | 0 %   | 0     |
| Transfers API                          | 3   | 0 %   | 0     |
| Summary/reports API                    | 3   | 0 %   | 0     |
| Budgets API                            | 2   | 0 %   | 0     |
| Goals API                              | 2   | 0 %   | 0     |
| Preferences API                        | 2   | 0 %   | 0     |
| Export/deletion API                    | 2   | 0 %   | 0     |
| AI assistant (V1)                      | 1   | 0 %   | 0     |
| Recurring/notifications (V1)           | 1   | 0 %   | 0     |

### 5.4 Frontend layer (Σweight 26 → Σscore 9.05 = 35 %)

| Item                                                                   | W   | Done  | Score |
| ---------------------------------------------------------------------- | --- | ----- | ----- |
| Landing page                                                           | 2   | 100 % | 2.0   |
| Auth pages (shells)                                                    | 3   | 40 %  | 1.2   |
| App chrome / 404 / error / loading                                     | 2   | 95 %  | 1.9   |
| Dashboard (preview)                                                    | 3   | 30 %  | 0.9   |
| Financial screens (preview)                                            | 3   | 25 %  | 0.75  |
| Settings previews                                                      | 2   | 30 %  | 0.6   |
| Theme (works locally)                                                  | 1   | 60 %  | 0.6   |
| Profile form (validation only)                                         | 1   | 30 %  | 0.3   |
| Widget customization (hide/reorder/persist)                            | 2   | 0 %   | 0     |
| CSV export UI                                                          | 1   | 0 %   | 0     |
| Deletion UX                                                            | 1   | 0 %   | 0     |
| Responsive + a11y pass                                                 | 2   | 40 %  | 0.8   |
| Public pages (/features, /pricing, /about, /contact, /privacy, /terms) | 1   | 0 %   | 0     |
| Recovery / verify-email / onboarding pages                             | 1   | 0 %   | 0     |
| V1 screens (assistant, recurring, notifications)                       | 1   | 0 %   | 0     |

### 5.5 Database layer (Σweight 17 → Σscore 9.9 = 58 %)

| Item                                                                 | W   | Done  | Score |
| -------------------------------------------------------------------- | --- | ----- | ----- |
| Better Auth tables (User/Session/AuthAccount/Verification)           | 3   | 100 % | 3.0   |
| Financial core (Account/Category/Transaction + enums)                | 3   | 100 % | 3.0   |
| CHECK constraints + indexes (raw SQL)                                | 2   | 100 % | 2.0   |
| Migration workflow (Prisma 7 config, committed migration, CI deploy) | 2   | 95 %  | 1.9   |
| Goal / GoalContribution tables (DR-03 pending)                       | 2   | 0 %   | 0     |
| Budget / BudgetCategoryLimit tables                                  | 2   | 0 %   | 0     |
| DashboardLayout / UserPreference tables                              | 1   | 0 %   | 0     |
| AuditEvent table                                                     | 1   | 0 %   | 0     |
| Default-category seed                                                | 1   | 0 %   | 0     |

### 5.6 Auth layer (Σweight 21 → Σscore 11.25 = 54 %)

| Item                                         | W   | Done  | Score |
| -------------------------------------------- | --- | ----- | ----- |
| Email/password sign-up/in/out + DB sessions  | 3   | 90 %  | 2.7   |
| Fail-closed global guard + isolation pattern | 3   | 90 %  | 2.7   |
| Rate limiting                                | 2   | 100 % | 2.0   |
| `/me` read + display-name update             | 2   | 95 %  | 1.9   |
| Cookie/CSRF/origin posture                   | 2   | 95 %  | 1.9   |
| Google Sign-In                               | 1   | 5 %   | 0.05  |
| Email verification                           | 2   | 0 %   | 0     |
| Password recovery                            | 2   | 0 %   | 0     |
| Web auth wiring + route protection           | 3   | 0 %   | 0     |
| Session/security management UI               | 1   | 0 %   | 0     |

### 5.7 Testing layer (Σweight 21 → Σscore 11.1 = 53 %)

| Item                                                                 | W   | Done  | Score |
| -------------------------------------------------------------------- | --- | ----- | ----- |
| Test tooling/infrastructure (vitest configs, harness, CI)            | 2   | 95 %  | 1.9   |
| Money-domain tests                                                   | 3   | 100 % | 3.0   |
| Auth unit tests                                                      | 2   | 90 %  | 1.8   |
| DB integration tests (schema/constraints) — written, unexecuted here | 2   | 70 %  | 1.4   |
| Auth HTTP integration tests — written, unexecuted here               | 2   | 70 %  | 1.4   |
| Web UI tests (preview behaviours)                                    | 2   | 80 %  | 1.6   |
| Financial feature tests (IT-4…IT-12 slate)                           | 3   | 0 %   | 0     |
| Financial cross-user isolation tests                                 | 2   | 0 %   | 0     |
| End-to-end flow suite (§12 E2E)                                      | 3   | 0 %   | 0     |

### 5.8 Deployment layer (Σweight 25 → Σscore 11.25 = 45 %)

| Item                                                                  | W   | Done  | Score |
| --------------------------------------------------------------------- | --- | ----- | ----- |
| CI checks job (format/lint/typecheck/test/build/db-validate)          | 3   | 95 %  | 2.85  |
| CI integration job (PostgreSQL 16) — configured, status unverified    | 2   | 80 %  | 1.6   |
| Local Docker compose environment                                      | 2   | 100 % | 2.0   |
| Env/secrets handling (.env ignored, placeholders, startup validation) | 2   | 90 %  | 1.8   |
| Production build outputs (`pnpm build`)                               | 2   | 100 % | 2.0   |
| Hosting decision (DR-14)                                              | 3   | 0 %   | 0     |
| Deployed staging/production environments                              | 3   | 0 %   | 0     |
| Production migration process                                          | 2   | 50 %  | 1.0   |
| Logging/monitoring/alerting                                           | 2   | 0 %   | 0     |
| Backups + tested restore (DR-15)                                      | 2   | 0 %   | 0     |
| TLS / domain / transactional e-mail                                   | 2   | 0 %   | 0     |

---

## 6. What Is Working (with proof)

- **Install / lint / typecheck / build all pass** — executed today on this machine:
  `pnpm lint`, `pnpm typecheck`, `pnpm build` all exited successfully; the web build emits
  17 static routes (`/`, `/sign-in`, `/sign-up`, `/app/*`).
- **Unit test suites pass** — executed today: API **115 tests / 17 files**, web
  **112 tests / 25 files**, zero failures (`pnpm test`).
- **Prisma schema validates** — `pnpm db:validate` → “The schema at prisma\schema.prisma
  is valid”.
- **Exact money arithmetic** — `apps/api/src/domain/money/amount.ts` parses strict decimal
  strings to `bigint` minor units (rejects whitespace, over-precision, non-strings; cap
  10¹¹ minor units), `arithmetic.ts` adds/sums without `number`, `effects.ts` enforces the
  INCOME/EXPENSE/TRANSFER/ADJUSTMENT matrix with the transfer-nets-to-zero invariant and
  `TRANSFER_ACCOUNTS_MUST_DIFFER`; the whole suite is covered by 6 test files beside the
  code.
- **Auth backend is real** — Better Auth mounted under `/api/v1/auth` in
  `bootstrap.ts` (in front of Nest routing by design), Argon2id parameters pinned to
  OWASP minimums (`password.ts`), HttpOnly + SameSite=Lax cookies with `Secure` derived
  from an https `BETTER_AUTH_URL` (`auth-options.ts`), 30-day DB sessions with daily
  refresh, per-IP rate limits enabled in every environment.
- **Fail-closed authorization** — `auth.guard.ts` protects every Nest route by default;
  only `@Public()` (the health endpoint) is allowlisted; database failure during session
  lookup returns 503, never a bypass; `@CurrentUser()` throws if a session is missing.
- **Server-side input rules** — `PATCH /api/v1/me` validation (type, trim, length,
  control characters) lives in `profile.ts` with unit tests; identity always comes from
  the verified session — an integration test asserts a client-supplied `userId` is
  ignored (written; unexecuted locally).
- **Database invariants in SQL** — the initial migration adds a case-insensitive
  per-user account-name unique index and a `transaction_type_shape_check` + positive
  amount CHECK (invalid rows are rejected by PostgreSQL itself, not just services).
- **Honest UI preview discipline** — `apps/web/src/lib/mock-data.ts` is explicitly
  labelled sample data; a banner is rendered app-wide (`mock-data-banner.tsx`); submit
  buttons on auth/profile/transaction forms are visibly disabled with reasons instead of
  fake success; there are exactly 3 TODO comments in the whole web app, each naming its
  owning implementation task.
- **Working theme** — `theme-toggle.tsx` (System → Light → Dark) stores only a theme
  choice in `localStorage`, applied by a pre-paint script to avoid flashing.
- **Documentation depth unusual for this stage** — 8 ADRs, a 17-item decision register
  with priorities/status, domain model, accounting rules, auth/database strategies,
  13-task implementation plan with acceptance criteria, runbook, and an MVP "mock-data
  exit plan".
- **CI configured** — `.github/workflows/ci.yml`: a database-free checks job (format,
  lint, typecheck, unit tests, build, `db:validate` with a placeholder URL) and a
  PostgreSQL-16 service-container integration job applying committed migrations.
- **No secrets in the repository** — `.gitignore` excludes `.env*` (last line
  `!.env.example` excepted); `.env.example` contains only placeholders/instructions;
  the working-tree diff contains no credentials.

---

## 7. What Is Incomplete / Broken

Nothing currently _shipped_ is broken (no failing unit suites, no build errors). What is
missing is most of the product:

- **No financial persistence or API.** There is no accounts, categories, transactions,
  budgets, goals, summaries, preferences, export, or deletion module under
  `apps/api/src/modules/` — only `auth` and `health` exist.
- **The web app is entirely disconnected.** No `fetch` exists in `apps/web/src`; no API
  client module; no route protection (`middleware.ts` absent; `/app/*` pages are public
  static previews); auth forms cannot submit (`auth-form.tsx` submit `disabled`).
- **Every financial figure on screen is a hand-written literal** from
  `mock-data.ts` (dashboard balance, income/spent, category shares, budgets, goals).
  Intentionally labelled, but zero computation exists.
- **IT-3 verification is incomplete and uncommitted** (working tree): 15 pre-audit
  modified files (18 total after a mid-audit reformat, see §9) + 2 untracked files,
  notably the new HTTP integration suite `apps/api/test/integration/auth.test.ts`
  (12 cases) and its harness `http-test-app.ts`. These were **not executed here** (no
  Docker/PostgreSQL) and are not on `main`.
- **Integration suites unverified in this environment** — `constraints.test.ts` (12
  cases) and `schema.test.ts` (5 cases) also require real PostgreSQL; CI status on GitHub
  could not be checked (**Unverified**).
- **`pnpm format:check` fails locally** — 20 files reported at audit time (down from 23
  after the mid-audit reformat, see §9); all are files whose content matches HEAD and the
  failure is a Windows `core.autocrlf=true` CRLF artifact against Prettier
  `endOfLine: "lf"`. CI on Linux is expected to pass, but that was **not verified** here,
  and a Windows contributor cannot currently run the exact CI format gate without
  changing git config.
- **No deployment path** — no Dockerfile, no platform config, DR-14 (hosting) and DR-15
  (backups/RPO/RTO) unresolved, no monitoring/alerting, no transactional e-mail.
- **Requirements §4 pages absent** — `/features`, `/pricing`, `/about`, `/contact`,
  `/privacy`, `/terms`; `/forgot-password`, `/reset-password`, `/verify-email`,
  `/onboarding`; `/app/goals/[goalId]`, `/app/customize`, `/app/assistant` (V1),
  `/app/recurring` (V1), `/app/notifications` (V1).
- **Mock search divergence** — `transaction-browser.tsx` search works only over the
  visible sample rows (explicitly stated in the UI), it is not a server query.
- **`OldREADME.md` is stale** — describes an earlier state (“Not implemented… authentication”
  etc.) that contradicts the current README; a maintenance trap.

---

## 8. Code Quality & Security Findings

| #   | Severity     | Finding                                                                                                                                                                                                                                                                                                                                                             | Evidence                                                                              | Recommendation                                                                                                                                                  |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Medium**   | **Rate-limit keying trusts the `X-Forwarded-For` header.** Better Auth derives the client IP from request headers; the integration test harness itself spoofs `x-forwarded-for` to separate rate-limit buckets (`http-test-app.ts` `nextClientIp`). Nothing configures a trusted proxy. Directly exposed, an attacker can rotate the header to evade per-IP limits. | `apps/api/test/integration/http-test-app.ts`, `auth-options.ts` (`storage: 'memory'`) | Deploy behind a trusted proxy and configure the IP source/`trust proxy` explicitly (or add `advanced`/proxy options when production hosting is chosen — DR-14). |
| 2   | **Medium**   | **In-memory rate-limit store is single-instance only.** Documented in code, but horizontal scaling silently disables effective limits.                                                                                                                                                                                                                              | `auth-options.ts` comment + `storage: 'memory'`                                       | Shared store (e.g. DB/Redis) before multi-instance deployment; revisit with DR-14.                                                                              |
| 3   | **Medium**   | **No global input-validation pipe or shared validation strategy.** Only `PATCH /me` parses its body (ad-hoc, well-tested); future financial endpoints have no framework-level pattern yet, raising the risk of inconsistent validation as modules land.                                                                                                             | `profile.ts`; no `ValidationPipe`/zod/class-validator anywhere                        | Decide a validation approach in IT-4 before writing multiple controllers (requirements §8.5).                                                                   |
| 4   | **Medium**   | **Uncommitted, unverified auth-verification work in the working tree** (2 new integration files + 15 pre-audit modified files). The repo's own rule is “small, reviewable changes”; a large uncommitted changeset risks drift and accidental loss.                                                                                                                  | `git status` / `git diff --stat`                                                      | Commit in reviewable slices; run the integration suite where Docker exists; report real results (AGENTS.md rule 11).                                            |
| 5   | **Low**      | `ApiErrorResponse.traceId` is declared but never populated; errors carry no request/trace ID, making production triage harder.                                                                                                                                                                                                                                      | `packages/contracts/src/index.ts`; `api-exception.filter.ts`                          | Add a request-ID middleware when logging lands (IT-13).                                                                                                         |
| 6   | **Low**      | Public health endpoint reveals database status (`up/down/not_configured`) without auth.                                                                                                                                                                                                                                                                             | `health.controller.ts`                                                                | Acceptable for MVP; restrict detail if exposed publicly.                                                                                                        |
| 7   | **Low**      | Client/server limit mismatch: profile form caps display name at 50 chars while the server allows 100.                                                                                                                                                                                                                                                               | `profile-form.tsx` vs `profile.ts` `MAX_DISPLAY_NAME_LENGTH`                          | Align when IT-11 wires the form.                                                                                                                                |
| 8   | **Low**      | `formatSignedBdt` renders transfers with a minus sign like expenses; semantics are saved by the type label but could mislead.                                                                                                                                                                                                                                       | `apps/web/src/lib/format.ts` (`transaction-list` usage)                               | Use a neutral arrow style for transfers when real data lands.                                                                                                   |
| 9   | **Low**      | `OldREADME.md` duplicates a stale snapshot of the README at the repo root; `format:check` also flags it on Windows.                                                                                                                                                                                                                                                 | `OldREADME.md`                                                                        | Delete or move to a docs archive with a “historical” note (ask owner first).                                                                                    |
| 10  | **Low**      | Untracked `.freebuff/project-id` tool artifact sits in the workspace root.                                                                                                                                                                                                                                                                                          | `.freebuff/project-id` (untracked, 37 bytes)                                          | Add to `.gitignore` or remove locally.                                                                                                                          |
| 11  | **Low**      | No dependency vulnerability scanning or update automation in CI (`pnpm audit`, Dependabot/Renovate absent).                                                                                                                                                                                                                                                         | `.github/workflows/ci.yml`                                                            | Add `pnpm audit` (non-blocking) + Dependabot; review per requirements §13.2.                                                                                    |
| 12  | **Positive** | No secrets committed; `.env` ignored; production requires real `BETTER_AUTH_SECRET` (≥ 32 chars) and https `BETTER_AUTH_URL`, validated at boot; half-configured Google credentials rejected.                                                                                                                                                                       | `.gitignore`, `env.ts` + tests                                                        | Keep as-is.                                                                                                                                                     |

Structured code-quality notes:

- Folder structure follows requirements §8 consistently (domain vs modules vs common); naming
  is descriptive and stable.
- Duplication is minimal; the two chart components compute only presentation geometry
  (`category-bars.tsx` — “only their stroke geometry is computed here”).
- Error handling is deliberate: typed money errors with stable codes, fail-closed guard,
  no stack traces/SQL leaked to clients; the filter logs only unexpected 5xx server-side.
- Dead code: none found in `src`; `packages/test-utils` has a single consumer
  (`health.controller.test.ts`) — small but intentional.
- Logging: Nest `Logger` only; no request logging, no structured logs, no monitoring
  decisions recorded yet (IT-13/DR-14 pending).
- Comments are unusually informative and honest (trade-offs, deferrals, limitations);
  this is a real asset for auditing.

---

## 9. Tech Debt & Risks

**Working-tree risk (immediate):** `git status` shows 18 modified tracked files and 2
untracked pre-audit files (plus this report) since `4c3bfba` — the IT-3 follow-up (auth
option hardening, docs, runbook updates) plus the new HTTP integration suite. Until
committed and executed, the “IT-3 verified” claim in docs rests on unit tests only in this
environment.

**Mid-audit reformat note:** during this audit (2026-10-16 15:41), three already-modified
files — `apps/web/src/app/page.tsx`, `apps/web/src/app/app/not-found.tsx`,
`apps/web/src/components/not-found-view.tsx` — were rewritten by a process outside this
audit (formatting/wrapping only; no logic change), bringing the modified-file count from
15 to 18. This audit did not run that formatter and did not revert it. The origin is
**Unverified** (most likely a concurrent editor or formatter run).

**Verification debt:** three integration suites (auth 12 cases, constraints 12, schema 5)
have never demonstrably run on this machine; CI's integration job status was not
checkable here. The assertions are well-written (cookie flags, Argon2id prefix stored,
revocation, expiry, isolation, CSRF 403, 429 + `X-Retry-After`), so risk is medium, not
high — but it is unproven.

**Scope-vs-pace risk (highest product risk):** the MVP (§3.1) requires 18 feature areas;
0 of the 8 financial ones exist. The implementation plan estimates 13 tasks; 3 are done.
Sequencing (IT-4 accounts next) is sound, but this is a multi-month build at current
granularity.

**Launch blockers (owner decisions required):** DR-03 (goal method — blocks IT-10),
DR-06 (e-mail provider — blocks verification/recovery), DR-07 (MVP interpretation),
DR-14 (hosting), DR-15 (backups/RPO/RTO), DR-16 (retention/audit). DR-09 (name/domain)
and DR-17 (pricing/legal) are intentionally later.

**Scalability limits (by design, documented):** single-instance in-memory rate limits;
derived-balance aggregation chosen over cached balances (correct for MVP; needs query
indexes — already present on `transaction`).

**Environment friction:** Windows CRLF vs Prettier `endOfLine: lf` makes the exact CI
format gate fail locally on unmodified files; a Windows-aware setup note (or
`core.autocrlf=input`) belongs in the runbook.

**Documentation drift risk:** README test counts and status blocks are updated manually;
`OldREADME.md` already drifted. Consider a generated status block or stricter “update in
the same commit” habit.

---

## 10. API / Route Inventory

Implemented base path: `/api/v1` (`apps/api/src/main.ts` global prefix).

### Implemented

| Method | Endpoint                     | Auth                          | Status                                        |
| ------ | ---------------------------- | ----------------------------- | --------------------------------------------- |
| GET    | `/api/v1/health`             | Public (`@Public()`)          | ✅ Implemented — liveness + DB status         |
| GET    | `/api/v1/me`                 | Session cookie (global guard) | ✅ Implemented — contract projection          |
| PATCH  | `/api/v1/me`                 | Session cookie                | ✅ Implemented — display-name only, validated |
| POST   | `/api/v1/auth/sign-up/email` | Public (Better Auth)          | ✅ Implemented — Argon2id, rate-limited       |
| POST   | `/api/v1/auth/sign-in/email` | Public (Better Auth)          | ✅ Implemented — generic errors, rate-limited |
| POST   | `/api/v1/auth/sign-out`      | Public (Better Auth)          | ✅ Implemented — revokes DB session           |
| GET    | `/api/v1/auth/get-session`   | Public (Better Auth)          | ✅ Implemented — returns session or null      |

(Better Auth may expose further documented sub-paths under `/api/v1/auth`; only the
email/password + session features are enabled. Not independently verified: **Unverified**.)

### Planned — from `requirements.md` §8.6 and `docs/product/implementation-plan.md` — all ❌ Not started

| Method           | Endpoint                                                        | Auth    | Status                        |
| ---------------- | --------------------------------------------------------------- | ------- | ----------------------------- |
| DELETE           | `/api/v1/me`                                                    | Session | ❌ (IT-12, with confirmation) |
| GET/POST         | `/api/v1/accounts`                                              | Session | ❌ IT-4                       |
| GET/PATCH        | `/api/v1/accounts/:id`                                          | Session | ❌ IT-4                       |
| POST             | `/api/v1/accounts/:id/archive`                                  | Session | ❌ IT-4                       |
| GET/POST         | `/api/v1/transactions`                                          | Session | ❌ IT-6                       |
| GET/PATCH/DELETE | `/api/v1/transactions/:id`                                      | Session | ❌ IT-6                       |
| GET              | `/api/v1/transactions/export`                                   | Session | ❌ IT-12                      |
| GET/POST         | `/api/v1/categories`                                            | Session | ❌ IT-5                       |
| PATCH/DELETE     | `/api/v1/categories/:id`                                        | Session | ❌ IT-5                       |
| GET/POST         | `/api/v1/budgets`, PATCH/DELETE `/budgets/:id`                  | Session | ❌ IT-9                       |
| GET/POST         | `/api/v1/goals`, GET/PATCH `/goals/:id`                         | Session | ❌ IT-10                      |
| POST/GET         | `/api/v1/goals/:id/contributions`                               | Session | ❌ IT-10                      |
| GET              | `/api/v1/dashboard`                                             | Session | ❌ IT-8                       |
| GET/PUT          | `/api/v1/dashboard/layout`                                      | Session | ❌ IT-11                      |
| GET              | `/api/v1/reports/summary`, `/reports/categories`                | Session | ❌ IT-8                       |
| GET/PATCH        | `/api/v1/preferences`                                           | Session | ❌ IT-11                      |
| POST             | `/api/v1/auth/forgot-password` / `reset-password`               | Public  | ❌ (DR-06, IT-13)             |
| POST             | `/api/v1/ai/chat` (V1), recurring + notification endpoints (V1) | Session | ❌ V1                         |

**Web routes** (all build statically; all data is sample): `/`, `/sign-in`, `/sign-up`,
`/app/dashboard`, `/app/accounts`, `/app/categories`, `/app/transactions`,
`/app/transactions/new`, `/app/budgets`, `/app/goals`, `/app/reports`, `/app/settings`,
`/app/settings/{profile,preferences,security,data}` + branded 404s.

---

## 11. Database Schema Summary

`apps/api/prisma/schema.prisma` — 7 models, verified valid; one committed migration
(`20261016032732_initial`).

| Model          | Table          | Key fields                                                                                                                                                                                                          | Relations / rules                                                                                                         |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `User`         | `user`         | id (text, Better Auth), name, email unique, emailVerified, image, timestamps (timestamptz(3))                                                                                                                       | 1—n sessions, authaccounts, accounts, categories, transactions                                                            |
| `Session`      | `session`      | id, token unique, expiresAt, ipAddress, userAgent                                                                                                                                                                   | n—1 User, cascade delete                                                                                                  |
| `AuthAccount`  | `authAccount`  | id, accountId, providerId, password hash (nullable), token fields                                                                                                                                                   | n—1 User, cascade; renamed to avoid colliding with financial `Account` (ADR-0006 dec. 10)                                 |
| `Verification` | `verification` | identifier (indexed), value, expiresAt                                                                                                                                                                              | Standalone (Better Auth use)                                                                                              |
| `Account`      | `account`      | uuid id, userId, name ≤80, `AccountType` enum, currency ≤3, **openingBalanceMinor BigInt**, `AccountStatus` enum, archivedAt                                                                                        | n—1 User cascade; unique `(userId, lower(name))` raw index; transactions NoAction (history never silently lost)           |
| `Category`     | `category`     | uuid id, userId, name ≤60, nameKey (service-maintained), `CategoryType` INCOME/EXPENSE, color, `CategoryStatus`                                                                                                     | n—1 User; unique `(userId, nameKey, type)`                                                                                |
| `Transaction`  | `transaction`  | uuid id, userId, `TransactionType` (INCOME/EXPENSE/TRANSFER/ADJUSTMENT), **amountMinor BigInt > 0**, currency, occurredAt, accountId?, from/toAccountId?, categoryId?, adjustmentSign ±1, note ≤500, idempotencyKey | n—1 User cascade; account/from/to/category NoAction; unique `(userId, idempotencyKey)`; 4 query indexes + occurredAt DESC |

Enforced database invariants (raw SQL in the migration):

- `transaction_amount_positive_check` — `amountMinor > 0` always.
- `transaction_type_shape_check` — per-type shape: INCOME/EXPENSE require account +
  category and forbid transfer/adjustment fields; TRANSFER requires distinct from/to and
  forbids account/category; ADJUSTMENT requires account + ±1 sign + note; `ELSE FALSE`
  guards future enum additions.
- Case-insensitive per-user account-name uniqueness.

Not yet designed: `Goal`, `GoalContribution` (DR-03 pending), `Budget`,
`BudgetCategoryLimit`, `DashboardLayout`, `UserPreference`, `AuditEvent`, plus V1
`RecurringRule`/AI tables (`requirements.md` §9.1).

---

## 12. Testing & Deployment Status

### Testing — what exists and was verified today

| Suite                                                   | Scope                                                                                 | Result (this machine, 2026-10-16)                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| API unit (`apps/api/src/**/*.test.ts` + `test/support`) | money domain, env, health, auth options/guard/service/profile, filter, Prisma service | ✅ **115/115 pass** (17 files)                                                                        |
| Web unit (`apps/web/src/**/*.test.tsx`)                 | sample-data labelling, disabled control honesty, 404s, landing links, theme, forms    | ✅ **112/112 pass** (25 files)                                                                        |
| API integration (`apps/api/test/integration/*`)         | real PostgreSQL: full auth HTTP flow, schema/constraints, isolation, CSRF, rate-limit | ⚠️ **Not executed here** — no Docker/PostgreSQL; 12 + 12 + 5 cases written; auth suite is uncommitted |
| E2E (§12 flow: signup → … → deletion)                   | —                                                                                     | ❌ Not started                                                                                        |

Gates run today: `pnpm test` ✅, `pnpm lint` ✅, `pnpm typecheck` ✅, `pnpm build` ✅,
`pnpm db:validate` ✅, `pnpm format:check` ❌ (20 files — Windows CRLF artifact against
`endOfLine: lf`; contents match HEAD). No coverage tooling/thresholds exist.

### Deployment — current state

| Item                         | Status                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI (GitHub Actions, Node 24) | ✅ Configured: checks job (format/lint/typecheck/test/build/db-validate) + PostgreSQL-16 integration job (`ci.yml`). Current run state on GitHub: **Unverified** here |
| Local database               | ✅ `infrastructure/docker/docker-compose.yml` (PostgreSQL 16-alpine, no credentials embedded) + `moneyflow_test` init script                                          |
| Migrations                   | ✅ One committed migration; `prisma migrate deploy` path used by CI; `pnpm db:migrate` needs a reachable DB                                                           |
| Production build             | ✅ `pnpm build` succeeds (web static routes + Nest build)                                                                                                             |
| Staging/production           | ❌ No deployment exists; no Dockerfile; hosting undecided (DR-14)                                                                                                     |
| Observability                | ❌ No request logging/trace IDs, no error monitoring, no uptime checks                                                                                                |
| Backups/restore              | ❌ Not implemented or tested (DR-15)                                                                                                                                  |
| Secrets management           | 🟡 Startup validation + ignored `.env`; production platform/secrets store not chosen                                                                                  |
| TLS/domain/e-mail            | ❌ Domain undecided (DR-09); no transactional e-mail provider (DR-06)                                                                                                 |

---

## 13. Roadmap

> Effort is engineering time in ideal focus-days for one developer; multiply for review,
> context switching, and owner decision latency. Sequence follows
> `docs/product/implementation-plan.md` (financial rules before UI wiring).

### P0 — critical path (do next)

| #    | Task                                                                                                                                                                                                                | Why                                                                                                                                    | Effort                    | Files affected                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P0.1 | **Commit and verify the IT-3 in-flight work**: run `pnpm test:integration` on a Docker-capable machine (or confirm the CI integration job), then commit in reviewable slices; get owner review sign-off on IT-1/2/3 | Uncommitted work + unexecuted integration suites are the loudest verification gap; the CI gate should be trusted before building on it | 0.5–1 day (+ review wait) | `apps/api/test/integration/*`, modified auth/config/docs files, `.env.example`, `README.md`                        |
| P0.2 | **Wire the web auth flow to the API**: real sign-in/sign-up (credentials include, generic errors), session fetch, protected `/app/*` (middleware or layout check), sign-out                                         | Converts the biggest existing surface from preview to real; a signed-in user is a prerequisite for every later feature                 | 2–4 days                  | `apps/web/src/components/auth-form.tsx`, new `src/lib/api-client.ts`, `(auth)/sign-in                              | sign-up/page.tsx`, new `middleware.ts`, `app/layout.tsx` |
| P0.3 | **IT-4 — Accounts (API + web)**: CRUD, archive (history preserved), opening-balance rules, derived balance endpoint; replace the accounts preview                                                                   | First financial persistence; validates the whole stack (Prisma service → service layer → contracts → web) on a small slice             | 3–5 days                  | new `apps/api/src/modules/accounts/*`, `packages/contracts/src/index.ts`, `apps/web/src/app/app/accounts/page.tsx` |
| P0.4 | **Windows/CI format parity note + stale-file cleanup** (with owner OK): document `core.autocrlf=input` (or add `endOfLine` handling) in the runbook; retire `OldREADME.md`; ignore `.freebuff/`                     | CI's exact format gate must be reproducible locally; small drift items accumulate                                                      | 2–3 h                     | `docs/runbooks/local-development.md`, `.gitignore`, `OldREADME.md`                                                 |

### P1 — MVP feature build-out

| #    | Task                                                                                                                                                                                 | Why                                                                                    | Effort                                | Files affected                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P1.1 | **IT-5 Categories**: defaults cloned at first sign-in, CRUD, case-insensitive uniqueness, archive vs delete rules                                                                    | Prerequisite for transactions and reports                                              | 2–3 days                              | new `apps/api/src/modules/categories/*`, contracts, `app/app/categories/page.tsx`              |
| P1.2 | **IT-6 Transactions (income/expense)**: CRUD + filters + stable pagination + idempotency; server-side validation per accounting rules; balance/summary consistency after edit/delete | The core product loop; consumes IT-1 money domain end-to-end                           | 4–6 days                              | `modules/transactions/*`, `transaction-form.tsx`, `transaction-browser.tsx`, contracts         |
| P1.3 | **IT-7 Transfers**: single-row transfer CRUD, distinct-account/same-currency/active-account invariants, atomicity tests                                                              | Required by MVP §3.1 item 4; invariant already proven in `effects.ts`                  | 1–2 days                              | `modules/transactions/*`                                                                       |
| P1.4 | **IT-8 Summary service + dashboard/report endpoints + widget-by-widget dashboard wiring**, then delete `mock-data.ts` + banner                                                       | Turns the preview into a real dashboard; enforces “all totals from one tested service” | 3–5 days                              | new `modules/summary/*` (or reports), `app/app/dashboard/page.tsx`, `app/app/reports/page.tsx` |
| P1.5 | **Owner decisions needed for P1/P2**: DR-03 (goal method), DR-07 (MVP interpretation confirm), DR-16 (retention/audit confirm)                                                       | Blocks IT-10 and IT-12 design; resolving ADRs first is the repo's own rule             | Owner time, then 2–4 h to record ADRs | `docs/decisions/*`                                                                             |

### P2 — finish MVP and approach launch

| #    | Task                                                                                                                                                                                                                                                                                               | Why                                                             | Effort                  | Files affected                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| P2.1 | **IT-9 Budgets**: monthly CRUD, per-category limits, spent/remaining/percent, neutral overspend copy, timezone boundary tests                                                                                                                                                                      | Last major MVP data feature                                     | 3–4 days                | new `modules/budgets/*`, schema + migration, `app/app/budgets/page.tsx`        |
| P2.2 | **IT-10 Goals + contributions** (after DR-03): goal CRUD, contribution add/reverse, overfunding rules, emergency-fund template, double-counting tests                                                                                                                                              | MVP §3.1 items 7–8; needs the approved ADR-0005                 | 3–4 days                | schema + migration, `modules/goals/*`, `app/app/goals/*`                       |
| P2.3 | **IT-11 Preferences & customization**: server-side preferences (theme, locale, timezone, week start, reduced motion), dashboard layout persistence + reset, contract validation                                                                                                                    | MVP §3.1 items 10–11                                            | 3–4 days                | schema + migration, `modules/preferences/*`, settings pages, dashboard         |
| P2.4 | **IT-12 Export, deletion, audit**: scoped CSV export, account deletion workflow per DR-16, audit events, confirmation UX                                                                                                                                                                           | MVP §3.1 items 14–15; compliance-sensitive                      | 3–5 days                | `modules/export/*`, `modules/account-deletion/*`, settings data/security pages |
| P2.5 | **IT-13 Hardening & launch gates**: e-mail verification + recovery (DR-06), rate-limit review (incl. finding #1/#2), logging/monitoring baseline + trace IDs, tested backup/restore runbook (DR-15), accessibility & performance pass, privacy text matching implementation, final mock-data sweep | Requirement §3.4: nothing is “production-ready” before these    | 1.5–3 weeks             | repo-wide + `docs/runbooks/*`, CI, hosting config                              |
| P2.6 | **Deployment (DR-14)**: pick hosting, add deploy configs, staging environment, production migration path, TLS/domain, secrets store                                                                                                                                                                | No deployable artifact exists today                             | 3–5 days after decision | new `infrastructure/*`, CI workflow, runbook                                   |
| P2.7 | Google Sign-In enablement (owner credentials), then E2E suite (signup → account → transactions → transfer → goal → budget → export → isolation-denied → deletion, requirements §12)                                                                                                                | Completes the auth story and installs the acceptance safety net | 3–5 days                | `auth-options.ts`, `.env.example`, new `e2e/*`                                 |

---

## 14. Recommended Next 7 Days

| Day | Focus                                                                                                                                                                                      | Concrete outcome                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1   | **Verify + commit IT-3 in-flight work.** Run `pnpm test:integration` on a Docker-capable machine (or read the CI integration job result); fix anything red; commit in ≤3 reviewable slices | `main` contains the auth integration suite; a real, non-fabricated pass result is reported                   |
| 2   | **Owner review checkpoint.** Walk the owner through IT-1/2/3 evidence and the decision register; request DR-03, DR-07, DR-14, DR-15, DR-16 answers (or at least DR-03/07)                  | Written approvals/unblocks; ADRs updated if decisions change                                                 |
| 3–4 | **Start IT-4 Accounts API** (schema is already done): service + controller + contracts + unit tests + integration tests                                                                    | `GET/POST /accounts`, `GET/PATCH /accounts/:id`, archive endpoint, derived balance — green suites            |
| 5   | **Wire accounts UI** to the real API; retire the accounts preview values                                                                                                                   | `/app/accounts` shows the signed-in user’s real (initially empty) accounts with honest empty state           |
| 6   | **Wire web auth (P0.2)** — smallest honest slice: real sign-up/sign-in with generic errors + `/app/*` protection + sign-out                                                                | A user can create an account and reach a protected page; `auth-form.tsx` submit enabled against the real API |
| 7   | **Housekeeping + status**: run all gates, update README/implementation-plan status, document the Windows format workaround, clear `OldREADME.md`/`.freebuff` with owner consent            | Clean `git status`, green gates, honest docs, next week planned from a stable base                           |

---

## 15. Appendix

### Commands to run the project

```bash
# Setup (Node ≥ 20.11, pnpm 12 via corepack)
pnpm install
cp .env.example .env            # placeholders only; adjust if ports differ

# Development
pnpm dev:web                    # Next.js  → http://localhost:3000
pnpm dev:api                    # NestJS   → http://localhost:4000/api/v1/health
pnpm dev                        # both in parallel

# Local PostgreSQL (needs Docker) + database commands
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d
pnpm db:validate                # prisma validate (works without a connection)
pnpm db:migrate                 # prisma migrate dev (needs reachable PostgreSQL)
pnpm db:deploy                  # prisma migrate deploy

# Quality gates (what CI runs)
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test                       # unit only, database-free
pnpm test:integration           # real PostgreSQL 16; needs TEST_DATABASE_URL on localhost
pnpm build
```

### Environment variables (from `.env.example` — placeholders only)

| Variable                                                                | Used by           | Purpose                                                                                 |
| ----------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `PORT`                                                                  | api               | API port (default 4000)                                                                 |
| `CORS_ORIGINS`                                                          | api               | Allowed browser origins; empty = CORS off; doubles as Better Auth trusted-origin list   |
| `BETTER_AUTH_SECRET`                                                    | api               | Session-cookie signing secret (≥ 32 chars; required in production)                      |
| `BETTER_AUTH_URL`                                                       | api               | Public API base URL; must be https in production                                        |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                             | api               | Optional Google Sign-In; both or neither                                                |
| `DATABASE_URL`                                                          | api / Prisma      | Pooled PostgreSQL connection; required in production and for DB commands                |
| `DIRECT_URL`                                                            | Prisma CLI        | Unpooled connection for migrations; falls back to `DATABASE_URL` locally                |
| `TEST_DATABASE_URL`                                                     | integration tests | Throwaway DB; harness refuses non-localhost hosts                                       |
| `API_URL`                                                               | web (server)      | Server-side API base (declared, **not yet consumed** — README notes “not yet consumed”) |
| `NEXT_PUBLIC_API_URL`                                                   | web (browser)     | Browser API base; never secrets                                                         |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | docker compose    | Local DB name/credentials                                                               |

### Assumptions made in this report

1. Completion percentages are **rubric estimates** from requirement/plan acceptance
   criteria and code evidence, not measured coverage; the method and per-item scores are
   shown in §5 so they can be contested item by item.
2. “Done” for IT-2/IT-3 accepts the committed artifacts as implemented; database-level
   verification (migration replay, integration suites) was **not reproducible in this
   environment** and is marked Unverified rather than failed.
3. GitHub Actions run status was not checkable (no `gh` CLI / network tooling here);
   CI claims are assessed from `.github/workflows/ci.yml` only.
4. The working tree (uncommitted changes) was audited alongside `4c3bfba`; commits may
   land between this audit and the reader’s checkout.
5. `requirements.md` and accepted ADRs were treated as the scope baseline; proposed
   decisions (DR-03, DR-06, DR-08, DR-10–DR-16) were treated as open blockers, not done.
6. No source code was modified during this audit; this file (`docs/report.md`) is the only
   artifact created.

### Verification log (commands actually run during this audit)

| Command                          | Result                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                      | ✅ API 115/115 (17 files); web 112/112 (25 files)                                                                                 |
| `pnpm lint`                      | ✅ All packages pass                                                                                                              |
| `pnpm typecheck`                 | ✅ All packages pass                                                                                                              |
| `pnpm build`                     | ✅ contracts, test-utils, web (17 static routes), api                                                                             |
| `pnpm db:validate`               | ✅ “The schema at prisma\schema.prisma is valid”                                                                                  |
| `pnpm format:check`              | ❌ 20 files flagged — Windows CRLF artifact vs `endOfLine: lf` (contents match HEAD); CI (Linux) expected green, **unverified**   |
| `pnpm test:integration`          | ⛔ Not run — Docker/PostgreSQL unavailable on this machine                                                                        |
| `git status` / `git diff --stat` | 18 modified files, 2 untracked pre-audit files (+ this report); 3 web files reformatted mid-audit by an external process (see §9) |
