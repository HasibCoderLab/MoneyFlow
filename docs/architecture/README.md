# Architecture

> Source of truth for product behavior: [`requirements.md`](../../requirements.md)
> (especially §8 Technical Architecture, §9 Data Model, §10 Security).

## Style: modular monolith

One Next.js web app, one NestJS API, one PostgreSQL database — a single
deployable backend with clear internal module boundaries
(`requirements.md` §8.1). No microservices, message queues, or
Kubernetes without a concrete, recorded requirement (ADR-0001).

## Workspace layout

```text
apps/
  web/                 Next.js App Router (strict TypeScript)
  api/                 NestJS REST API (strict TypeScript), owns Prisma
packages/
  contracts/           Shared API request/response types (never ORM entities)
  config/              Shared tsconfig base + ESLint flat config
  test-utils/          Runner-agnostic test helpers
docs/                  architecture / decisions / product / runbooks
infrastructure/docker/ Local PostgreSQL for development
.github/workflows/     CI (lint → typecheck → test → build)
```

## Boundaries

- `apps/api` is the only package that talks to the database. The web app
  consumes the HTTP API only.
- `packages/contracts` describes public API shapes
  (`/api/v1`, error envelope). Database models never leak into it.
- Financial business logic lives in domain services under
  `apps/api/src/modules/*`, never in controllers or UI components.
- New domains become modules: `auth`, `users`, `accounts`, `transactions`,
  `categories`, `budgets`, `goals`, `dashboard`, `reports`, `preferences`
  (see `requirements.md` §8.4). Each module owns its controllers,
  services, and persistence access.

## API conventions (`requirements.md` §8.5)

- Base path `/api/v1`; RESTful resource naming.
- Validate all input at the boundary; consistent error envelope with a
  safe message and trace/request ID.
- ISO 8601 timestamps; documented timezone behavior; pagination with a
  stable sort tie-breaker.
- Decimal-safe money representation at the boundary — decided in
  `requirements.md` §18.5/§9.3 before transaction endpoints are built.

## Phase 1 design documents (proposed)

- [`domain-model.md`](./domain-model.md) — entities, fields, constraints,
  relationships, and delete/archive behavior for the MVP schema.
- [`accounting-rules.md`](./accounting-rules.md) — canonical balance,
  summary, period, budget, goal, and rounding specifications plus a worked
  test fixture.
- [`auth-sessions.md`](./auth-sessions.md) — authentication/session
  architecture proposal (Better Auth, cookies, revocation, isolation,
  deferred recovery).
- [`database-and-testing.md`](./database-and-testing.md) — Neon + Prisma 7
  connection design, migration workflow, and local/CI test strategy.

These are proposals tied to the `docs/decisions/decision-register.md`; none
is approved or implemented yet.

## Current state

Foundation plus a labelled UI preview: `HealthModule`
(`GET /api/v1/health`), environment validation, Prisma CLI configuration
without a schema model, and a sample-data dashboard preview under `/app/*`
(not approved, not committed at the time of writing). The financial schema
is deferred until the Phase 1 decisions (see `docs/decisions/`) are
approved — planned sequence in
[`docs/product/implementation-plan.md`](../product/implementation-plan.md).
