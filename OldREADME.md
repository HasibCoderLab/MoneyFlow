# MoneyFlow (working title)

**Know your money. Build better habits. Reach your goals.**

A Personal Finance SaaS for students, beginner savers, and young earners —
an AI-first finance companion under the PaathAI umbrella (a separate
product from the PaathAI education platform).

> **Source of truth:** [`requirements.md`](./requirements.md) defines
> product scope, architecture, financial correctness, security, and
> engineering standards. Read it before changing anything.
> "MoneyFlow" is a working repository/package name; the final product
> name is an open decision (`requirements.md` §18.1).

## Current status — foundation + UI preview

Implemented: pnpm monorepo, Next.js web app, NestJS API, shared
packages, ESLint + Prettier, strict TypeScript, Vitest baseline tests,
CI workflow, local PostgreSQL compose file, Prisma configuration
(datasource only).

**UI preview:** the web app includes a browser preview of the planned
dashboard at `/app/dashboard`, built from reusable components with
clearly labelled sample data, plus placeholder navigation pages for
Accounts, Transactions, Budgets, Savings goals, Reports, and Settings.
No real data, calculations, or accounts are connected.

**Not implemented (on purpose):** authentication, transactions,
financial calculations, budgets, goals, AI chat, and any real
dashboard functionality — see
[`docs/product/README.md`](./docs/product/README.md).

## Repository structure

```text
apps/web/                 Next.js App Router (React, strict TypeScript)
apps/api/                 NestJS REST API (/api/v1), owns Prisma
packages/contracts/       Shared API contract types
packages/config/          Shared tsconfig + ESLint flat config
packages/test-utils/      Shared test helpers
docs/architecture|decisions|product|runbooks
infrastructure/docker/    Local PostgreSQL (docker-compose.yml)
.github/workflows/        CI pipeline
requirements.md           Product requirements (do not rewrite)
AGENTS.md                 Operating rules for AI agents and contributors
```

## Prerequisites

- **Node.js ≥ 20.11** (verified on v24.12.0)
- **pnpm 12** (pinned via `packageManager`; `corepack enable`)
- **Docker or PostgreSQL 16** — optional; only needed for database
  commands once the schema exists

## Quick start

```bash
pnpm install          # install workspace dependencies
cp .env.example .env  # placeholders only — never commit .env
pnpm dev:web          # http://localhost:3000
pnpm dev:api          # http://localhost:4000/api/v1/health
pnpm dev              # both
```

Local database (optional, requires Docker):

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d
```

## Scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `pnpm dev`          | Run web + API in parallel (workspace `dev` scripts)     |
| `pnpm dev:web`      | Next.js dev server only                                 |
| `pnpm dev:api`      | NestJS watch mode only                                  |
| `pnpm lint`         | ESLint in every workspace package                       |
| `pnpm typecheck`    | Builds shared packages, then `tsc --noEmit` per package |
| `pnpm test`         | Builds shared packages, then Vitest per package         |
| `pnpm build`        | Production builds: contracts, test-utils, web, api      |
| `pnpm format`       | Prettier write                                          |
| `pnpm format:check` | Prettier check (CI)                                     |
| `pnpm db:validate`  | `prisma validate` (needs `DATABASE_URL`)                |
| `pnpm db:migrate`   | `prisma migrate dev` (needs a reachable PostgreSQL)     |

Scripts delegate with pnpm workspace filters to package names
(`@moneyflow/web`, `@moneyflow/api`, `@moneyflow/contracts`,
`@moneyflow/test-utils`).

## Environment variables

All values are placeholders — see [`.env.example`](./.env.example) for
details. **Never commit real credentials.**

| Variable              | Used by        | Purpose                                              |
| --------------------- | -------------- | ---------------------------------------------------- |
| `PORT`                | api            | API port (default 4000)                              |
| `CORS_ORIGINS`        | api            | Comma-separated allowed origins; empty = disabled    |
| `DATABASE_URL`        | api / Prisma   | PostgreSQL connection string; required in production |
| `API_URL`             | web (server)   | Server-side API base URL (not yet consumed)          |
| `NEXT_PUBLIC_API_URL` | web (browser)  | Browser API base URL; never put secrets here         |
| `POSTGRES_*`          | docker compose | Local database name/credentials                      |

## Documentation

- [`requirements.md`](./requirements.md) — PRD, scope, architecture, rules
- [`docs/architecture/`](./docs/architecture/README.md) — system design
- [`docs/decisions/`](./docs/decisions/README.md) — ADRs and open decisions
- [`docs/runbooks/local-development.md`](./docs/runbooks/local-development.md) — setup & troubleshooting
- [`AGENTS.md`](./AGENTS.md) — rules for AI coding agents

## License

Not yet decided (open decision — do not invent one).
