# Runbook: Local development

## Prerequisites

| Tool       | Version        | Notes                                                              |
| ---------- | -------------- | ------------------------------------------------------------------ |
| Node.js    | ≥ 20.11 (24.x) | Verified locally on v24.12.0                                       |
| pnpm       | 12.x           | `corepack enable` or `npm i -g pnpm` — pinned via `packageManager` |
| Docker     | optional       | One way to run PostgreSQL locally; a native install works too      |
| PostgreSQL | optional       | 16, native or containerised                                        |

> PostgreSQL is **not required** for install, lint, type-check, the unit
> tests, or builds. It is required for database commands (`db:migrate`,
> `db:deploy`) and the integration tests (`test:integration`). A native
> PostgreSQL 16 install is sufficient; Docker is optional.

## First-time setup

```bash
pnpm install          # installs workspace dependencies
cp .env.example .env  # placeholders; adjust if your ports differ
```

## Running the apps

```bash
pnpm dev:web          # Next.js → http://localhost:3000
pnpm dev:api          # NestJS watch mode → http://localhost:4000/api/v1/health
pnpm dev              # both in parallel
```

## Quality checks (same commands CI runs)

```bash
pnpm format:check     # Prettier
pnpm lint             # ESLint across all workspace packages
pnpm typecheck        # builds shared packages, then tsc per package
pnpm test             # builds shared packages, then vitest per package (database-free)
pnpm test:integration # real-PostgreSQL suite — needs a local PostgreSQL database
pnpm build            # production builds: contracts, test-utils, web, api
```

## Authentication (Better Auth, IT-3)

Email/password auth is served by Better Auth under
`http://localhost:4000/api/v1/auth` (`sign-up/email`, `sign-in/email`,
`sign-out`, `get-session`), and the caller's identity under `/api/v1/me`.
Relevant environment variables (see `.env.example`):

- `BETTER_AUTH_SECRET` — signs session cookies; blank locally means the
  library's development default, required (≥ 32 chars) in production.
- `BETTER_AUTH_URL` — public API base URL; https required in production
  (cookies only get `Secure` when it is https).
- `CORS_ORIGINS` — doubles as Better Auth's trusted-origin (CSRF) list;
  exact origins only — wildcards are rejected at startup.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional; set both or
  neither (startup validation rejects half-configured pairs).

Smoke test with `curl` (keep the cookie jar; values are throwaways):

```bash
curl -i -c mf-cookies.txt -H 'content-type: application/json' \
  -d '{"name":"Local User","email":"local@example.test","password":"local-password-12"}' \
  http://localhost:4000/api/v1/auth/sign-up/email

curl -i -b mf-cookies.txt http://localhost:4000/api/v1/me

# Cookie-authenticated state-changing requests must carry a trusted Origin
# header, exactly like a browser sends one:
curl -i -b mf-cookies.txt -H 'origin: http://localhost:3000' \
  -X POST http://localhost:4000/api/v1/auth/sign-out
```

Notes:

- Password policy: 12–128 characters, no forced composition rules.
- Sign-in/sign-up are rate-limited (3 attempts per 10 s per IP); the 429
  response carries `X-Retry-After`.
- Without a reachable database, `/api/v1/health` reports `degraded` and
  protected routes answer 503 (fail closed) — never a bypass.
- Email verification, password recovery, and Google Sign-In are deferred
  launch gates (ADR-0006). The web app's sign-in/sign-up forms post to this
  API and rely on the API's HttpOnly session cookie; set
  `NEXT_PUBLIC_API_URL` in the repository-root `.env` so the browser bundle
  targets the same API origin allowed by `CORS_ORIGINS`.
- `apps/web/next.config.ts` loads the repository-root `.env` explicitly
  because Next only reads `apps/web/.env*` by default. Shell, CI, and
  deployment environment values still take precedence.

## Local PostgreSQL

```bash
# From the repository root; uses placeholders from .env
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d

# Verify
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml ps
```

The compose file contains **no credentials** — every value comes from
`.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). Replace
`CHANGE_ME` in your local `.env`; never commit it.

On a **fresh data volume**, `infrastructure/docker/initdb/` additionally
creates the throwaway `moneyflow_test` database used by integration tests.
If your volume already existed before IT-2, create it once by hand:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml \
  exec postgres createdb -U "$POSTGRES_USER" moneyflow_test
```

## Database commands (Prisma)

The schema (`apps/api/prisma/schema.prisma`) holds the Better Auth tables
plus the financial models; migrations live in `apps/api/prisma/migrations/`
and are committed. `apps/api/prisma.config.ts` resolves the CLI connection
URL: `DIRECT_URL` when set (unpooled endpoint on Neon), otherwise
`DATABASE_URL`.

```bash
pnpm db:validate      # validates the schema (no connection needed)
pnpm db:generate      # regenerates the Prisma client into src/generated/prisma
pnpm db:migrate       # creates/updates migrations — requires a reachable DB
pnpm db:deploy        # applies committed migrations (CI, deploys, fresh clones)
```

Notes:

- `db:generate` runs automatically before `dev`, `build`, `typecheck`, and
  the test commands (package pre-scripts); run it manually after schema edits.
- Prisma 7 does not load `.env` implicitly; `prisma.config.ts` loads it
  explicitly (repo-root `.env`, then `apps/api/.env`). If the URL resolves
  nowhere, commands fail fast with `PrismaConfigEnvError` — a missing
  prerequisite, not a broken script.
- `migrate reset` is only ever allowed against throwaway local databases.

## Integration tests (real PostgreSQL)

```bash
pnpm test:integration  # needs a local PostgreSQL + TEST_DATABASE_URL
```

`TEST_DATABASE_URL` (see `.env.example`) must point at `localhost` — the
harness refuses any other host. The suite applies committed migrations
(`prisma migrate deploy`) and runs against `moneyflow_test` only; it never
touches `moneyflow_dev`. CI runs the same suite against a `postgres:16`
service container.

## Better Auth schema generation

Auth tables are owned by Better Auth. After auth configuration changes,
regenerate them and review the diff:

```bash
pnpm --filter @moneyflow/api auth:generate  # rewrites the auth models in schema.prisma
pnpm --filter @moneyflow/api auth:check     # verifies the schema satisfies Better Auth
```

Re-apply the deliberate manual annotations (UTC `timestamptz` columns, the
`AuthAccount` rename) if the generator ever overwrites them.

## Ports

| Service       | Port | Override          |
| ------------- | ---- | ----------------- |
| Web (Next.js) | 3000 | `next dev --port` |
| API (NestJS)  | 4000 | `PORT` env var    |

## Troubleshooting

- **`pnpm typecheck` fails on a fresh clone:** shared packages must be
  built first — always use the root script (`pnpm typecheck`), which runs
  `build:packages` automatically.
- **API test DI errors ("can't resolve dependencies"):** tests must run
  through the configured SWC transform (`apps/api/vitest.config.ts`);
  do not bypass it.
- **CORS errors later on:** API CORS is opt-in via `CORS_ORIGINS` in
  `.env`; empty means disabled. The browser origin and
  `NEXT_PUBLIC_API_URL` must match the configured values exactly, including
  the port (for example web `http://localhost:3000` and API
  `http://localhost:4000`).
