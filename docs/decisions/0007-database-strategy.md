# ADR-0007: Database platform and Prisma 7 connection strategy

**Status:** Accepted (2026-10-16) — approved by the product owner; implemented by the IT-2 schema/migration task  
**Date:** 2026-10-16

## Context

The repository already has a Prisma 7 datasource-only setup
(`apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`), a local
PostgreSQL 16 Docker compose file, and environment validation. The financial
schema is intentionally deferred. Requirements to satisfy: PostgreSQL with
committed migrations (§9.2, §15.3), no guesswork about pooling/SSL, a working
local development and test database strategy, and eventual hosted deployment.
The detailed setup spec lives in
[`docs/architecture/database-and-testing.md`](../architecture/database-and-testing.md).

## Decision (proposed)

1. **Hosted database: Neon PostgreSQL** (serverless Postgres) for deployed
   environments, in the AWS Asia Pacific (Singapore) region for Bangladesh
   latency. Neon provides branching (useful for staging/dev), PgBouncer
   connection pooling, and a free tier adequate for development and early
   validation. Alternatives (Supabase, Railway/Render Postgres, RDS) are
   documented in the database-and-testing spec; none is required by the
   product.
2. **Prisma 7 with the `@prisma/adapter-pg` driver adapter** (node-postgres)
   for the long-running NestJS API. The Neon serverless adapter
   (`@prisma/adapter-neon`) is the documented alternative; it is optimised for
   serverless/edge runtimes and is not needed for a long-lived Node server.
   One adapter keeps local Docker and production Neon on the same code path.
3. **Two connection URLs:**
   - `DATABASE_URL` — pooled connection (Neon `-pooler` host) used by the API
     at runtime.
   - `DIRECT_URL` — unpooled connection used by Prisma CLI (migrations,
     introspection) via `prisma.config.ts`, because PgBouncer transaction
     pooling is not suitable for schema operations.
     Locally both point at the Docker database (documented fallback:
     `DIRECT_URL ?? DATABASE_URL`).
4. **SSL is required for all remote connections** (`sslmode=require`);
   `disable` is acceptable only for localhost. Secrets live in environment
   variables (placeholders in `.env.example`, real values only in
   deployment-platform secrets).
5. **Migrations:** `prisma migrate dev` locally to author and commit migrations
   under `apps/api/prisma/migrations/`; `prisma migrate deploy` in CI test
   databases and in every deployed environment before the app starts. `db push`
   is allowed only on throwaway local databases, never on shared environments.
   Generated SQL is reviewed for destructive statements before merging (§15.3).
6. **Local development:** the existing Docker compose PostgreSQL 16 instance,
   with two databases (`moneyflow_dev`, `moneyflow_test`).
7. **CI/integration tests:** a PostgreSQL 16 service container in GitHub
   Actions; tests run migrations against a fresh database
   (`TEST_DATABASE_URL`) and guard against running against non-local hosts.
   Unit tests (money, balance rules) must never require a database.
8. **Backups, RPO/RTO, and retention remain an owner decision** (decision
   register DR-15). Neon plan capabilities differ (free tier has limited
   history; paid plans provide point-in-time restore). This ADR records the
   platform; it does not claim a backup guarantee.

## Consequences

- `.env.example` gains `DIRECT_URL` with the schema task (IT-2); no
  environment files change before it.
- The API's `PrismaModule` owns the adapter, client lifecycle, and pool
  settings (e.g. modest pool size per instance, `connect_timeout=15` to
  tolerate Neon scale-to-zero cold starts).
- Prisma 7 generates its client into an explicit output path
  (`apps/api/src/generated/prisma`); the import path changes from
  `@prisma/client` and the folder is git-ignored and regenerated.
- CI grows the database-backed integration job with IT-2; the existing
  checks job stays database-free.
- Neon's free tier is suitable for development/early users, but production
  arm is revisited (plan, backups) before public launch.

## Acceptance notes (2026-10-16)

Approved as proposed. Implementation confirmations recorded with the
approval (decision register DR-05):

- Prisma stays on the stable 7.10.x line; the Prisma 8 release candidate is
  explicitly out of scope. `@prisma/client` and `@prisma/adapter-pg` are
  installed together at matching versions after the version review
  (requirements.md §13.2).
- The PostgreSQL 16 CI integration-test job lands in IT-2; the existing CI
  checks job stays database-free.
- Local development and integration testing use Docker Desktop with the
  existing `infrastructure/docker/docker-compose.yml` PostgreSQL 16 setup.
  Required database acceptance checks run against real PostgreSQL, never
  mocks.

## Status update (2026-10-19): UTC session pinning

Running the IT-8 integration suite against a non-UTC local PostgreSQL
(UTC+6) exposed a financial-correctness defect the UTC CI containers
masked: the Prisma driver adapter serializes `DateTime` values as
timezone-naive text that PostgreSQL interprets in the _session_ timezone,
so every stored `occurredAt` was shifted by the server's default offset,
while Prisma's symmetric read path hid the shift from round-trip
assertions. Fix: `buildPrismaClientOptions` pins every pooled connection
with `options: '-c TimeZone=UTC'` — the documented convention (exact UTC
instants, explicit IANA local-day math in the query layer,
`accounting-rules.md` §6) now holds regardless of host or server defaults.
Covered by a new integration guard in `schema.test.ts` (session timezone
plus a server-rendered stored instant) that runs on any host.
