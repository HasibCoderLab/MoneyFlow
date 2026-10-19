# MoneyFlow (working title)

**Know your money. Build better habits. Reach your goals.**

MoneyFlow is a Personal Finance SaaS for students, beginner savers, and young earners — an AI-first finance companion under the PaathAI umbrella. It is a separate product from the PaathAI education platform: no education features belong here.

> **Source of truth:** [`requirements.md`](./requirements.md) (v1.0.0) defines product scope, architecture, financial correctness, security, and engineering standards. This README describes the repository as it is. If they conflict, `requirements.md` plus accepted ADRs in [`docs/decisions/`](./docs/decisions/README.md) win.
>
> `MoneyFlow` is a working repository/package name. The final product name is an open decision (`requirements.md` §18.1).

## Contents

- [Status](#status)
- [Planned product scope](#planned-product-scope)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Web app](#web-app)
- [API](#api)
- [Money domain](#money-domain)
- [Database](#database)
- [Quality gates and CI](#quality-gates-and-ci)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security and privacy](#security-and-privacy)
- [Roadmap](#roadmap)
- [License](#license)

## Status

**Foundation + Phase A and the summaries step (IT-1…IT-8) implemented on `main`, awaiting owner review. The dashboard, reports, and categories pages render recorded data from the live API; the remaining preview screens (accounts, transactions, budgets, goals, settings) are still labelled sample data, and the web sign-in/sign-up shells are not wired to the auth API yet.**

Committed (`origin/main`):

- pnpm monorepo (`apps/*`, `packages/*`), strict TypeScript, ESLint + Prettier, Vitest baselines
- NestJS API: `GET /api/v1/health` (liveness + database status), env validation, opt-in CORS, Better Auth email/password endpoints under `/api/v1/auth` + thin `/api/v1/me` behind a global fail-closed session guard (IT-3 per ADR-0006)
- Money domain IT-1 (`apps/api/src/domain/money/`): strict parsing, exact arithmetic, effect matrix (see [Money domain](#money-domain))
- Prisma schema v1 + initial migration: `User`, `Session`, `AuthAccount`, `Verification`, `Account`, `Category`, `Transaction` (IT-2, see [Database](#database))
- Shared `@moneyflow/contracts` (public API shapes, never ORM entities), `@moneyflow/config`, `@moneyflow/test-utils`
- Local PostgreSQL compose file, Docker test database, CI with unit + PostgreSQL-16 integration jobs
- Phase 1 design docs: decision register (DR-01–DR-17), ADRs 0001–0008, domain model, accounting rules, auth/database strategies, MVP scope, implementation plan
- Web app: landing with motion polish; API-backed **dashboard, reports, and categories** pages (IT-8) with translated loading/signed-out/empty/error states; labelled sample-data previews (see `apps/web/src/lib/mock-data.ts`) for accounts, transaction browser + entry form shell, budgets, goals, and settings section pages; sign-in/sign-up preview pages (split trust-panel layout, local-only validation, submit disabled and unconnected); site + app 404 pages; global error/loading boundaries; theme toggle; English/Bangla toggle

Not started (on purpose — see [`docs/product/README.md`](./docs/product/README.md)):

- API wiring for the remaining preview screens (accounts, transactions, budgets, goals), CSV export, account deletion, AI assistant, recurring rules, notifications, billing, bank integrations; wiring the web auth shells to the live auth API

The pages that still show sample data label it with a sample-data banner that renders only on those pages; every other figure the app displays is computed by the API from recorded data, and no preview screen performs financial calculations.

## Planned product scope

Summary of `requirements.md` §3. `requirements.md` is normative; this table is an index.

| Level                 | Contents                                                                                                                                                                                                                                                                                                                                                                                                                  | State                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP                   | Auth/sessions, profile + preferences, accounts/wallets, income/expense/transfer, categories, daily/weekly/monthly summaries, savings goals + contributions (incl. emergency-fund template), budgets, customizable dashboard (show/hide/reorder, persisted), theme + currency/date prefs, search/filter/pagination, CSV export, account deletion, responsive UI, correctness + isolation tests, logging/backup/deploy docs | Foundations + IT-4…IT-8 done (money, schema, auth, accounts/transactions/transfers, categories, summaries with API-backed dashboard/reports/categories); remaining screens still sample-data shells |
| V1                    | AI Money Assistant (server-side, grounded in recorded data), smart insights, goal deadline planning, recurring rules, budget alerts/notifications, advanced reports, richer customization, export improvements, AI limits/cost monitoring, onboarding + labelled demo data, a11y + perf pass                                                                                                                              | Not started                                                                                                                                                                                         |
| Later / research only | Bank/open-banking, wallet imports, shared household finances, multi-currency conversion, receipt OCR, forecasting, native mobile apps, coaching marketplace                                                                                                                                                                                                                                                               | Out of scope until validated                                                                                                                                                                        |

MVP explicitly excludes AI chat (unless core correctness is already reliable), bank integrations, payments/subscriptions, investments/tax/credit advice, shared accounts, FX automation, and microservices/K8s/Kafka.

## Tech stack

| Layer          | Choice                                                    |
| -------------- | --------------------------------------------------------- |
| Web            | Next.js 16 (App Router), React 19, strict TypeScript ~6.0 |
| API            | NestJS 12, strict TypeScript ~6.0                         |
| DB             | PostgreSQL 16, Prisma 7 (CLI config only for now)         |
| Monorepo       | pnpm 12 workspaces (pinned via `packageManager`)          |
| Quality        | ESLint 10, Prettier 3, Vitest 5, `tsc --noEmit`           |
| CI             | GitHub Actions on `main` push + PRs (Node 24)             |
| Initial locale | Bangladesh; BDT first, other currencies designed in later |

See [`docs/architecture/README.md`](./docs/architecture/README.md) for boundaries and conventions.

## Architecture

Modular monolith (`requirements.md` §8.1, ADR-0001):

- One Next.js web app, one NestJS API, one PostgreSQL database.
- No Redis/worker, microservices, Kubernetes, or Kafka without a concrete, recorded requirement.
- `apps/api` is the only package that talks to the database. The web app consumes the HTTP API only.
- `packages/contracts` describes public request/response shapes (`/api/v1`, error envelope). Database models never leak into it.
- Financial business logic lives in the domain layer (`apps/api/src/domain/`) and domain services under `apps/api/src/modules/*`, never in controllers or UI components.
- Money uses integer minor units (`bigint`) with a BDT-only currency registry and string contract fields — DR-01 accepted 2026-10-16 (ADR-0003). JavaScript `number` is never the source of truth for currency arithmetic.

## Repository structure

```text
apps/
  web/                  Next.js App Router (@moneyflow/web)
    src/app/            landing (motion polish) + (auth) sign-in/sign-up shells
                        + (app) dashboard, accounts, categories, transactions,
                          budgets, goals, reports, settings/* + not-found,
                          error, loading boundaries
    src/components/     app-shell, auth-form, reveal, not-found-view,
                        transaction-browser, transaction-form, profile-form,
                        category-bars, cards, theme-toggle, site-footer, ui/*
    src/lib/            format.ts, mock-data.ts (preview only, deleted when real API lands)
  api/                  NestJS REST API (@moneyflow/api), owns Prisma
    src/auth.ts         Better Auth CLI input — same options factory as runtime
    src/bootstrap.ts    app wiring: prefix, CORS, Better Auth mount at /api/v1/auth
    src/config/         env validation + dev .env loading
    src/common/         API error-envelope filter
    src/domain/money/   IT-1 money module: parse, arithmetic, effects, tests
    src/modules/auth/         IT-3: options factory, Argon2id hooks, global
                              session guard, thin /me endpoints, sign-up
                              default-category clone hook (IT-5)
    src/modules/health/       health controller/service
    src/modules/accounts/     IT-4: CRUD + archive, derived balances
    src/modules/categories/   IT-5: default clone + backfill, CRUD,
                              archive/unarchive, unreferenced-delete rules
    src/modules/transactions/ IT-4/IT-6/IT-7: ledger rows, filters, stable
                              pagination, idempotent creates, transfers
    src/prisma/               Prisma client service + unit tests
    prisma/             schema.prisma (7 models) + initial migration
packages/
  contracts/            API_BASE_PATH + health/auth/account/category/transaction request + response types
  config/               Shared tsconfig base + ESLint flat config
  test-utils/           Runner-agnostic test helpers (expectShape)
docs/
  architecture/         System design; proposals: `domain-model.md`, `accounting-rules.md`, `auth-sessions.md`, `database-and-testing.md`
  decisions/            ADRs 0001–0004, 0006–0007 Accepted; 0005, 0008 Proposed + decision-register.md (DR-01–DR-17 tracker)
  product/              MVP scope, implementation plan (IT-1…IT-13), status
  runbooks/             Local development, setup & troubleshooting
infrastructure/docker/  Local PostgreSQL 16-alpine (docker-compose.yml, no credentials inside)
.github/workflows/      ci.yml (Node 24: unit job + PostgreSQL 16 integration job)
requirements.md         PRD + scope + architecture + agent rules (do not rewrite)
AGENTS.md               Operating rules for AI agents and contributors
.env.example            Placeholder env vars only
```

## Prerequisites

| Tool       | Version                    | Notes                                                             |
| ---------- | -------------------------- | ----------------------------------------------------------------- |
| Node.js    | ≥ 20.11 (24.x recommended) | Verified on v24.12.0                                              |
| pnpm       | 12.x                       | Pinned via `packageManager`; `corepack enable` or `npm i -g pnpm` |
| Docker     | optional                   | Only for local PostgreSQL                                         |
| PostgreSQL | optional (16)              | Via Docker compose, or a local install                            |

Docker/PostgreSQL are **not** needed for install, lint, typecheck, tests, or builds — only for database commands.

## Quick start

```bash
pnpm install          # install workspace dependencies
cp .env.example .env  # placeholders only — never commit .env

pnpm dev:web          # Next.js → http://localhost:3000
pnpm dev:api          # NestJS watch mode → http://localhost:4000/api/v1/health
pnpm dev              # both in parallel
```

Local database (optional, requires Docker):

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml ps
```

Full setup, ports, and troubleshooting: [`docs/runbooks/local-development.md`](./docs/runbooks/local-development.md).

## Scripts

Root scripts delegate with pnpm workspace filters to `@moneyflow/web`, `@moneyflow/api`, `@moneyflow/contracts`, `@moneyflow/test-utils`.

| Script                  | What it does                                                                 |
| ----------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`              | Run web + API in parallel                                                    |
| `pnpm dev:web`          | Next.js dev server only                                                      |
| `pnpm dev:api`          | NestJS watch mode only                                                       |
| `pnpm lint`             | ESLint in every workspace package                                            |
| `pnpm typecheck`        | Builds shared packages, then `tsc --noEmit` per package                      |
| `pnpm test`             | Builds shared packages, then Vitest per package                              |
| `pnpm test:integration` | API integration suite against real PostgreSQL 16 (needs `TEST_DATABASE_URL`) |
| `pnpm build`            | Production builds: contracts, test-utils, web, api                           |
| `pnpm format`           | Prettier write                                                               |
| `pnpm format:check`     | Prettier check (CI)                                                          |
| `pnpm db:validate`      | `prisma validate` (needs `DATABASE_URL`)                                     |
| `pnpm db:migrate`       | `prisma migrate dev` (needs a reachable PostgreSQL)                          |

Always use the root scripts for `typecheck`/`test`/`build` — they build shared packages first.

## Environment variables

All values are placeholders. See [`.env.example`](./.env.example). **Never commit real credentials.** Never prefix a private secret with `NEXT_PUBLIC_`.

| Variable                                                                | Used by        | Purpose                                                                                                                                          |
| ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                                                                  | api            | API port (default 4000)                                                                                                                          |
| `CORS_ORIGINS`                                                          | api            | Comma-separated allowed origins (exact origins only — wildcards rejected at startup); empty = CORS disabled; doubles as auth trusted-origin list |
| `BETTER_AUTH_SECRET`                                                    | api            | Session-cookie signing secret (≥ 32 chars); required in production, blank = library dev default locally                                          |
| `BETTER_AUTH_URL`                                                       | api            | Public API base URL for callbacks/origin checks; must be https in production                                                                     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                             | api            | Optional Google Sign-In; set both or neither                                                                                                     |
| `DATABASE_URL`                                                          | api / Prisma   | PostgreSQL connection string; required in production and for all DB commands                                                                     |
| `DIRECT_URL`                                                            | Prisma CLI     | Unpooled connection for migrations/schema tooling (ADR-0007); falls back to `DATABASE_URL` locally                                               |
| `TEST_DATABASE_URL`                                                     | api tests      | Throwaway database for integration tests (localhost only — harness refuses anything else)                                                        |
| `API_URL`                                                               | web (server)   | Server-side API base URL (not yet consumed)                                                                                                      |
| `NEXT_PUBLIC_API_URL`                                                   | web (browser)  | Browser API base URL; never put secrets here                                                                                                     |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | docker compose | Local database name/credentials                                                                                                                  |

Prisma 7 does not load `.env` implicitly; `apps/api/prisma.config.ts` loads it explicitly. Precedence: shell env → `apps/api/.env` → repo-root `.env`.

## Web app

- `/` — landing page (animated hero, capabilities, trust principles, honest roadmap) linking to the UI preview and the auth shells.
- `/sign-in`, `/sign-up` — auth UI shells: local validation, submit disabled, nothing sent or stored until the frontend wiring task connects them to the live API (IT-3 back end is implemented). No recovery or third-party buttons yet.
- `/app/dashboard` — recorded figures from `GET /api/v1/dashboard` (tracked balance, income/spent for the current month, recent activity, spending by category); goals and budgets show honest figure-free placeholders until IT-9/IT-10. Loading, signed-out, empty, and error states included; the sample-data banner does not appear here.
- `/app/reports` — recorded totals, a sparse daily/weekly/monthly series (weeks start Saturday), and the category breakdown from the IT-8 report endpoints, with a text table alternative; CSV export stays disabled.
- `/app/categories` — the real taxonomy from `GET /api/v1/categories?includeArchived=true`, grouped income/expense/archived and read-only (creation disabled until the CRUD UI work).
- `/app/accounts`, `/app/transactions` (+ `/new` entry-form shell), `/app/budgets`, `/app/goals` — labelled sample-data screens (browse/filter/validate locally; saving unconnected). The sample-data banner renders only on these pages.
- `/app/settings` (+ `profile`, `preferences`, `security`, `data`) — settings index with honest per-section states; profile form validates locally, saving unconnected.
- Unknown routes render branded 404 pages (site + app variants, motion-safe); route errors and loading states have global boundaries.
- Remaining `requirements.md` §4.3 routes (`/app/goals/[goalId]`, `/app/customize`, `/app/assistant` in V1, …) do not exist yet. Route names stay stable once introduced.

Design tokens (`requirements.md` §7.2, full light/dark sets in `globals.css`): primary blue `#2563EB`, AI purple `#7C3AED`, cyan `#06B6D4`, warm accent `#F59E0B`, surface `#F8FAFC`, text `#0F172A` — every rule resolves through tokens, including the SVG chart. Target WCAG 2.2 AA; never color alone for income/expense meaning; animation gated behind `prefers-reduced-motion`.

## API

Base path: `/api/v1` (global prefix in `apps/api/src/main.ts`).

| Endpoint                                                                                                                                                                       | State                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`                                                                                                                                                           | Implemented (liveness + database status)                                                                                          |
| `POST /api/v1/auth/sign-up/email`, `POST /api/v1/auth/sign-in/email`                                                                                                           | Implemented (IT-3; Better Auth, Argon2id, rate-limited)                                                                           |
| `POST /api/v1/auth/sign-out`, `GET /api/v1/auth/get-session`                                                                                                                   | Implemented (sessions are revocable database rows; HttpOnly cookies)                                                              |
| `GET /api/v1/me`, `PATCH /api/v1/me`                                                                                                                                           | Implemented (session-derived identity; display-name update only)                                                                  |
| `GET/POST /api/v1/accounts`, `GET/PATCH /api/v1/accounts/:id`, `POST /api/v1/accounts/:id/archive`, `POST /api/v1/accounts/:id/unarchive`                                      | Implemented (IT-4; derived balances, opening-balance freeze, archive semantics)                                                   |
| `GET/POST /api/v1/categories`, `PATCH /api/v1/categories/:id`, `DELETE /api/v1/categories/:id`, `POST /api/v1/categories/:id/archive`, `POST /api/v1/categories/:id/unarchive` | Implemented (IT-5; default clone + backfill, case-insensitive uniqueness, delete only while unreferenced)                         |
| `GET/POST /api/v1/transactions`, `GET/PATCH/DELETE /api/v1/transactions/:id`                                                                                                   | Implemented (IT-4 base; filters, idempotency, transfers, adjustments — IT-6/IT-7 review in the implementation plan)               |
| `GET /api/v1/dashboard`, `GET /api/v1/reports/summary`, `GET /api/v1/reports/categories`                                                                                       | Implemented (IT-8; one summary service, exact minor-unit strings, half-open periods in the user's timezone, Saturday week starts) |
| Budgets, goals, preferences, CSV export, AI, recurring, notifications (`requirements.md` §8.6)                                                                                 | Not served yet — build in `docs/product/implementation-plan.md` order                                                             |

Conventions for future endpoints (`requirements.md` §8.5): RESTful naming, input validation at the boundary, consistent error envelope with safe message + trace/request ID, pagination with stable sort tie-breaker, ISO 8601 timestamps, decimal-safe amount representation (amounts as strings, never silently rounded), idempotency where retries could duplicate, no stack traces/SQL/secrets in production responses.

## Money domain

Implemented IT-1 work in `apps/api/src/domain/money/` (per ADR-0003/ADR-0004 and `docs/architecture/accounting-rules.md`). No Prisma, no HTTP, no timezone logic:

- `amount.ts` — strict parsing to minor-unit `bigint`: unsigned user input (`parseAmountToMinor`), strictly-positive transaction input (`parsePositiveAmountToMinor`), signed opening balances (`parseOpeningBalanceToMinor`), contract strings (`fromContractString` / `toContractString`). Rejects whitespace, over-precision, negatives (except opening balances), non-strings; ৳1B (`10^11` minor units) input cap.
- `currency.ts` — BDT-only registry (exponent 2); anything else throws `UNSUPPORTED_CURRENCY`.
- `arithmetic.ts` — exact `bigint` add/sum/compare; derived totals are never capped.
- `percentage.ts` — display-only half-up percentages as `percentTimes10` strings; zero denominator returns `null`.
- `effects.ts` — pure transaction effect matrix for `INCOME` / `EXPENSE` / `TRANSFER` / `ADJUSTMENT` (direction from type, never from a typed sign; transfers net to zero). `REFUND` is deferred by decision.
- `errors.ts` — typed `MoneyDomainError` with stable machine-readable codes.

Test state (actually run on 2026-10-17, `pnpm test`): **API unit 280 of 280 pass** (29 files: money domain, env validation, health, auth, accounts, categories, transactions, summary periods/query/service, exception filter, Prisma service); **web 174 of 174 pass** (33 files). The integration suites (`pnpm test:integration`: auth/accounts/transactions/categories/summary + schema/constraints against real PostgreSQL) need a reachable PostgreSQL 16 and run in CI's PostgreSQL 16 job.

## Database

- `apps/api/prisma/schema.prisma` (IT-2, implemented — awaiting owner review): `User`, `Session`, `AuthAccount`, `Verification` (Better Auth tables per ADR-0006) plus `Account`, `Category`, `Transaction` per `requirements.md` §9.1 and the money/accounting decisions. Initial migration is committed (`prisma/migrations/20261016032732_initial`).
- Financial invariants land with the schema: user-scoped records, decimal-safe minor-unit amounts, single-row transfers, immutable opening balances + adjustments (ADR-0004).
- `pnpm db:migrate` requires a reachable PostgreSQL; without one it fails with a connection error (missing prerequisite, not a broken script). `migrate deploy` on a clean database is verified in CI's PostgreSQL 16 job.

## Quality gates and CI

`.github/workflows/ci.yml` runs on `main` pushes and PRs with two jobs: unit (`install --frozen-lockfile` → `format:check` → `lint` → `typecheck` → `test` → `build` → `db:validate` with a placeholder `DATABASE_URL`, no connection opened) and integration (real PostgreSQL 16 service → `test:integration` → `migrate deploy` path).

Locally (same commands CI runs):

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration  # needs local PostgreSQL, see runbook
pnpm build
```

Testing strategy when features land (`requirements.md` §12): unit tests for money arithmetic, balances, transfers, summaries, goal progress, budget utilization, schema validation; integration tests for transfers, contributions, isolation, pagination, constraints; E2E for signup → account → transactions → transfer → goal → budget → customization → export → isolation-denied → deletion. Deterministic synthetic fixtures only — never real financial records.

Existing coverage: money-domain unit tests live beside the code (`apps/api/src/domain/money/*.test.ts`); summary period/query/percentage units live in `apps/api/src/modules/summary/`; API env/health/Prisma-service units beside theirs; web tests cover the API-backed dashboard, reports, and categories pages (rendered values, loading skeleton, signed-out 401, error + retry, empty states) with the API client mocked, plus labelled sample-data banners on the remaining preview pages, form validation with honestly disabled submits, 404/app-chrome behavior, and landing links. Integration tests (auth, accounts, transactions, categories, and the IT-8 summary/report endpoints with cross-user isolation) run against real PostgreSQL (harness refuses non-localhost hosts).

## Documentation

| Doc                                                                            | What it is                                                                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`requirements.md`](./requirements.md)                                         | PRD, MVP/V1 scope, architecture, data model, AI rules, testing, open decisions §18, implementation order §19                            |
| [`docs/architecture/`](./docs/architecture/README.md)                          | System design; proposals: `domain-model.md`, `accounting-rules.md`, `auth-sessions.md`, `database-and-testing.md`                       |
| [`docs/decisions/`](./docs/decisions/README.md)                                | ADRs 0001–0004, 0006–0007 Accepted; 0005, 0008 Proposed; `decision-register.md` tracks DR-01–DR-17 (DR-01/02/04/05 approved 2026-10-16) |
| [`docs/product/`](./docs/product/README.md)                                    | Scope summary + implementation status                                                                                                   |
| [`docs/product/mvp-scope.md`](./docs/product/mvp-scope.md)                     | MVP feature map + 12 interpretation calls needing owner confirmation + mock-data exit plan                                              |
| [`docs/product/implementation-plan.md`](./docs/product/implementation-plan.md) | Phased tasks IT-1…IT-13 with acceptance criteria; IT-1…IT-8 implemented, IT-9 next                                                      |
| [`docs/runbooks/local-development.md`](./docs/runbooks/local-development.md)   | Setup, quality checks, DB commands, ports, troubleshooting                                                                              |
| [`AGENTS.md`](./AGENTS.md)                                                     | Mandatory operating rules for AI agents and contributors                                                                                |

## Contributing

1. Read `requirements.md`, this README, relevant ADRs, and the existing code before changing anything.
2. Check `git status` / `git diff` first; preserve existing work.
3. Write a short plan (files/modules affected + migration, security, testing risks) for anything beyond a trivial edit.
4. Keep changes small and reviewable. Business logic goes in the domain/service layer — controllers stay thin, UI components render only.
5. Validate input and enforce authorization server-side; scope every query to the verified session identity, never a browser-supplied `userId`.
6. Never let an LLM compute balances/totals/percentages; deterministic tested code only.
7. Add/update tests with every behavior change. Report only results you actually ran — never fabricate passes.
8. No placeholder buttons, fake data presented as real, fake testimonials/metrics, or secrets in code/logs/bundles.
9. Record consequential choices as ADRs in `docs/decisions/`; never rewrite `requirements.md` to match code.
10. Ask before destructive changes (schema rewrites, data deletion, dependency overhauls, architecture shifts).

## Security and privacy

Financial data is sensitive by default (`requirements.md` §10):

- TLS in production, secure revocable sessions, server-side authorization on every private resource, input validation, rate limits, least-privilege DB credentials, backups with tested restores.
- Multi-tenant isolation: every user-owned query scoped to the authenticated user; cross-user access tests required for reads, writes, deletes, exports, nested resources.
- No bank credentials collected; no bank integrations without separate security + legal review.
- No secrets, tokens, or full financial records in logs, URLs, analytics, or screenshots.
- Privacy/retention policy (what is collected, AI provider data sharing, retention, export/deletion, minors handling) must match the implementation before launch. No compliance claims without real review.

## Roadmap

`requirements.md` §19 order: brief + accounting decisions → monorepo/tooling (done) → schema/auth/isolation → accounts + transactions with tested calculations → categories/dashboard/reports → goals/budgets → customization/preferences → export/deletion/audit/ops → MVP usability testing → V1 (recurring, notifications, AI assistant) → hardening + limited beta → subscriptions/integrations only after validated demand.

The implementation plan (`docs/product/implementation-plan.md`) is the
source of truth for status: IT-1 (money module), IT-2 (schema + migration +
test harness), IT-3 (auth + sessions), IT-4 (accounts + transaction ledger
backend), IT-5 (categories), IT-6 (transaction filters/pagination/idempotency
acceptance), and IT-7 (transfers) are implemented and verified against the
CI PostgreSQL 16 job; IT-8 (summary service + dashboard/report endpoints +
API-backed dashboard, reports, and categories pages) is implemented and its
integration suite runs in the same CI job; IT-9 (budgets) is next.
See [`docs/decisions/decision-register.md`](./docs/decisions/decision-register.md).

## License

Not yet decided — open decision. Do not invent one.
