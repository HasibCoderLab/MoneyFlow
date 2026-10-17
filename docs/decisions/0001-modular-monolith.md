# ADR-0001: Modular monolith on pnpm workspaces

**Status:** Accepted  
**Date:** 2026-10-15

## Context

MoneyFlow starts as a small product with one web app, one API, and one
database (`requirements.md` §8.1). A distributed system would add
operational cost without a current requirement.

## Decision

- Build a **modular monolith**: a single NestJS API deployable as one
  unit, organized into domain modules
  (`auth`, `accounts`, `transactions`, …) with strict internal boundaries.
- Use a **pnpm workspace monorepo** with `apps/web` (Next.js App Router),
  `apps/api` (NestJS), and small shared packages (`contracts`, `config`,
  `test-utils`).
- All REST endpoints are versioned under `/api/v1` in the single API.
- PostgreSQL with Prisma is the only datastore; Prisma lives in `apps/api`
  because the API owns persistence.

## Consequences

- No Redis, Kafka, Kubernetes, or microservices until a concrete need is
  recorded as a new ADR.
- Cross-module calls go through service interfaces, not HTTP between
  modules; splitting a module out later requires an explicit extraction
  decision.
- Shared packages must not couple frontend to database models: contracts
  describe API shapes only.
