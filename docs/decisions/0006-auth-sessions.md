# ADR-0006: Authentication and session strategy

**Status:** Accepted (2026-10-16) — approved by the product owner; implementation starts with the IT-2 auth tables  
**Date:** 2026-10-16

## Context

`requirements.md` §18.4 lists the auth provider/session strategy as an open
decision; §5.1 requires server-enforced auth, revocable sessions, secure
cookie handling, and no custom cryptography. The API (NestJS) owns Prisma and
the database (ADR-0001); the web app talks to it over `/api/v1`. Google
Sign-In, email/password, secure server-managed sessions, revocation, user
isolation, and an eventual password-recovery flow were requested for
evaluation. The architecture detail lives in
[`docs/architecture/auth-sessions.md`](../architecture/auth-sessions.md).

## Decision (proposed)

1. **Use [Better Auth](https://www.better-auth.com) (self-hosted library)
   inside the NestJS API** as the session/auth implementation, with the
   official Prisma adapter (`better-auth/adapters/prisma`, shipped in the
   core package) against the same PostgreSQL database. Rationale: an established session implementation instead of
   hand-rolled auth (§5.1), TypeScript-native, data stays in our Neon
   database, no per-user vendor cost or lock-in, and built-in support for
   email/password (Argon2id via the library's password hash/verify hooks),
   OAuth providers, session revocation, and later email
   verification/recovery flows.
2. **Email/password first, Google Sign-In second** (same module, once Google
   Cloud OAuth credentials exist). Both issue the same server-managed
   session.
3. **Server-managed opaque session cookies**: HttpOnly, `Secure` in
   production, `SameSite=Lax`, no tokens in `localStorage`. Sessions live in
   a `session` table and are revoked by deleting the row; "sign out
   everywhere" is a supported action. Proposed lifetime: 30 days absolute
   with refresh on activity; exact values are configurable and recorded in
   the auth architecture doc.
4. **Password hashing is Argon2id** at OWASP-recommended minimum parameters
   (m=19456 KiB, t=2, p=1) with the library's defaults reviewed at
   implementation time; minimum password length 12 characters, no forced
   composition rules (§5.1).
5. **Authorization is derived only from the verified session identity.**
   Every domain query/service takes `userId` from the session guard — never
   from the request body/query. Cross-user access tests are mandatory
   (§10.2, AGENTS.md rules 6–7).
6. **CSRF posture:** `SameSite=Lax` cookies + server-side `Origin` checks for
   state-changing requests (Better Auth includes origin validation). The
   recommended production deployment keeps web and API on the same
   registrable domain (subdomains or reverse proxy) so cookies and CORS stay
   simple.
7. **Auth endpoints are rate-limited** (Better Auth built-in rate limiting;
   storage backend decided at implementation — no Redis unless an ADR
   justifies it).
8. **Password recovery and email verification are deferred**, but **public
   launch is gated on them** (together with the email provider decision,
   ADR-0008): shipping a paid-less MVP without account recovery would create
   lockout risk and support burden. Local development may run without email
   verification while the email provider is not yet configured.
9. **Account linking policy (proposed):** linking a Google identity to an
   existing email/password account happens automatically only when the
   existing account's email is verified and Google reports the email as
   verified; otherwise the user must sign in with the existing method and
   connect Google explicitly from settings.
10. **Naming pitfall recorded:** Better Auth's credential/OAuth table is named
    `Account`; the financial accounts table is also `Account`
    (requirements.md §9.1). Better Auth's model must be renamed (e.g.
    `authAccount`) via its `modelName` option so the financial `Account`
    keeps the product's name.

## Alternatives considered

- **Custom NestJS auth module** (Argon2id + opaque tokens + session table,
  hand-written): full control, no library integration risk, but more
  security-critical code to write and review than the requirements'
  "prefer an established implementation" guidance allows without strong
  reason.
- **Managed auth providers** (Clerk, Supabase Auth, …): fastest to wire, but
  recurring cost, vendor lock-in, user PII at a third party, and a second
  user store to reconcile — rejected for an MVP whose data must stay in one
  PostgreSQL database.
- **Auth.js/NextAuth in the web app:** Next-centric; the API would still need
  its own session-verification path or JWT strategy, splitting the source of
  truth for identity. Rejected.

## Consequences

- New runtime dependencies in `apps/api` (`better-auth` — the Prisma
  adapter ships inside the core package — the `auth` CLI as a dev
  dependency, and future provider packages). Versions get a compatibility
  review before install (Prisma 7 / Node 24), per §13.2.
- Auth tables (user, session, verification, renamed `authAccount`) are
  generated by the Better Auth CLI into the Prisma schema and migrated with
  Prisma. App-owned extensions (preferences, financial data) reference
  `user.id`.
- The NestJS integration path must be verified at implementation time: the
  community bridge `@thallesp/nestjs-better-auth` is convenient but
  community-maintained; mounting Better Auth's route handler directly in a
  Nest controller with a session guard is the fallback that keeps the
  critical path on the official library. Mounting requires disabling Nest's
  JSON body parser for the auth routes.
- Google Sign-In requires owner-provided Google Cloud OAuth credentials
  (client ID/secret, redirect URIs); it does not block the email/password
  path or the financial-domain work.
- The dashboard preview's `/app/*` routes are public mock pages today; no
  authentication exists yet. Wiring the session guard and real data happens
  in the implementation phase (see `docs/product/implementation-plan.md`).

## Acceptance notes (2026-10-16)

Approved as proposed. Implementation confirmations recorded with the
approval (decision register DR-04):

- The auth tables (`User`, `Session`, `AuthAccount` renamed via `modelName`,
  `Verification`) land in IT-2; the auth flows themselves (email/password,
  session guard, `/me`, custom Argon2id hashing) land in IT-3.
- Schema generation uses the official `auth` CLI (the current successor of
  the deprecated `@better-auth/cli`); reviewed dependency versions are
  installed with the IT-2 task.
- The community NestJS bridge (`@thallesp/nestjs-better-auth`) remains an
  IT-3 option only after review; the fallback (mounting the official
  handler) keeps the critical path on the core library.

## Implementation notes (IT-3, 2026-10-16)

Implemented on the backend; verified against the local toolchain and pinned
in code/tests. Database-backed acceptance runs in CI's PostgreSQL job (no
local Docker at implementation time — see the IT-3 report).

- **Mounting:** the official `toNodeHandler(auth)` from `better-auth/node` is
  mounted at `/api/v1/auth` via `app.use()` before `app.listen()`
  (`apps/api/src/bootstrap.ts`). This registers ahead of Nest's body parsers
  and router, so Better Auth reads the raw request stream and its endpoints
  intentionally bypass Nest guards; every other route stays on the Nest error
  contract. The community bridge was not needed.
- **Single auth instance:** `createAuthOptions({ prisma, env })` is a pure
  factory shared by the runtime module (`AuthModule`, injecting the shared
  `PrismaService`) and `src/auth.ts` (for the official `auth` CLI), so CLI
  checks and runtime behavior cannot drift.
- **Password hashing:** `@node-rs/argon2` (prebuilt native, no install
  scripts) with m=19456 KiB, t=2, p=1; hooks wired via
  `emailAndPassword.password.hash/verify`. Hash format and malformed-hash
  fail-closed behavior are asserted in unit tests.
- **Rate limiting:** enabled in **every** environment (the library defaults
  to production-only) with in-memory storage; built-in rules for
  `/sign-in*` and `/sign-up*` are 3 requests per 10 s per IP+path, answering
  429 `{ message: 'Too many requests. Please try again later.' }` +
  `X-Retry-After`. A shared store is required before running more than one
  API instance and is a separate future decision.
- **Sessions:** 30-day absolute lifetime with 1-day `updateAge` refresh;
  cookie `HttpOnly; SameSite=Lax; Path=/`, `Secure` whenever the configured
  public URL is https (production requires https in `validateEnv`).
- **Guard:** global `APP_GUARD` — protected by default; `@Public()` is the
  explicit allowlist (health only today). Session-lookup infrastructure
  failures answer 503 fail-closed, never a 401/200 guess. Identity reaches
  controllers only from the verified session; a client-supplied `userId` is
  ignored (integration-tested).
- **Generic errors:** sign-in returns the library's "Invalid email or
  password" for unknown accounts and wrong passwords alike —
  indistinguishable to callers.
- **Deferrals kept explicit:** `requireEmailVerification: false` (verified
  nowhere by design until the email provider exists), no password-recovery
  endpoints, Google provider configured only when both credentials are
  present (half-configured pairs rejected at startup).
