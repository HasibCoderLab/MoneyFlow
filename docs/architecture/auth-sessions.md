# Authentication and session architecture

> Design artifact for ADR-0006 (Accepted 2026-10-16). **Implemented** in IT-3
> (email/password, sessions, global guard, `/me`); Google Sign-In, email
> verification, and password recovery remain deferred and are labeled below.
> Requirements: `requirements.md` §5.1, §10.1, §10.2.

## Summary

Better Auth (self-hosted) runs inside the NestJS API and stores users,
credential/OAuth identities, and revocable sessions in the same PostgreSQL
database (Prisma adapter). Email/password ships first; Google Sign-In
follows once owner-provided OAuth credentials exist. The web app only ever
holds an opaque session cookie — no session data in `localStorage`, no JWTs.

## Components

| Component             | Responsibility                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth instance  | Sign-up/in/out, password hashing (Argon2id), session lifecycle, rate limiting; built by `createAuthOptions` (`apps/api/src/modules/auth/auth-options.ts`) on the shared `PrismaService` |
| NestJS route mounting | `toNodeHandler(auth)` mounted at `/api/v1/auth` **ahead of** Nest's body parsers and routing (`apps/api/src/bootstrap.ts`); auth endpoints are the public authentication surface itself |
| Session guard         | Global `AuthGuard` (`APP_GUARD`): every Nest route requires a verified session unless marked `@Public()`; resolves the user per request and never trusts client-supplied ids            |
| Domain services       | Receive `userId` from the guard only; never from request payloads                                                                                                                       |
| Web app               | Sends cookies (`credentials: 'include'`), renders auth pages, redirects                                                                                                                 |

### Implemented endpoint surface (IT-3)

| Route                             | Purpose                                      | Protection                                |
| --------------------------------- | -------------------------------------------- | ----------------------------------------- |
| `POST /api/v1/auth/sign-up/email` | Register with email + password               | Public, rate-limited (3/10 s per IP+path) |
| `POST /api/v1/auth/sign-in/email` | Sign in, issues the session cookie           | Public, rate-limited (3/10 s per IP+path) |
| `POST /api/v1/auth/sign-out`      | Revoke the current session (deletes the row) | Session cookie + trusted Origin           |
| `GET /api/v1/auth/get-session`    | Raw session payload (Better Auth shape)      | Session cookie                            |
| `GET /api/v1/me`                  | Caller's identity (`MeResponse` contract)    | Global guard                              |
| `PATCH /api/v1/me`                | Update display name only                     | Global guard                              |
| `DELETE /api/v1/me`               | Delete the user and every owned live row     | Global guard + password + `DELETE` phrase |
| `GET /api/v1/health`              | Readiness probe                              | `@Public()`                               |

## Session policy (implemented values)

| Setting               | Value                                                    | Notes                                            |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| Session lifetime      | 30 days                                                  | Refresh on activity (`updateAge` 1 day)          |
| Cookie                | `HttpOnly; Secure (https origins); SameSite=Lax; Path=/` | Host-only; `Max-Age` matches the 30-day lifetime |
| Sign-out              | Deletes the current session row                          | Immediate revocation                             |
| Sign out everywhere   | Deletes all sessions for the user                        | Requires re-authentication to trigger            |
| Account deletion      | Deletes every session row in the deletion transaction    | Stale cookies fail; implemented in IT-12         |
| Password change/reset | Revokes all sessions except the current                  | Deferred with password recovery                  |
| Concurrent devices    | Allowed                                                  | Session list UI is a later enhancement           |

Opaque tokens: session values are random, validated server-side per request,
and revoked by row deletion. No cryptographic material is invented by this
project (§5.1).

## Flows

### Email/password

1. **Sign-up:** validate email format + password policy (min 12 chars, max
   128, no forced composition), Argon2id hash (OWASP minimum parameters
   m=19456, t=2, p=1 via `@node-rs/argon2`), create `User`. Email
   verification is disabled everywhere by configuration
   (`requireEmailVerification: false`) until the email provider is wired
   (Phase D, ADR-0008); enabling it is an explicit launch gate, never a
   silent default change.
2. **Sign-in:** generic failure message (better-auth's "Invalid email or
   password" for both unknown accounts and wrong passwords — no account
   enumeration), rate-limited per IP and path (requirements.md §4.2,
   §10.1).
3. **Session issuance:** server creates the session row and sets the cookie;
   the web app stores nothing in JavaScript-accessible storage.
4. **Sign-out:** revokes the session row; cookie cleared.

### Google Sign-In (second, deferred)

- OAuth 2.0 authorization code flow with PKCE handled by Better Auth;
  requires owner-provided `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and
  registered redirect URIs (development + production). The provider is
  configured **only when both values exist**; startup validation
  (`validateEnv`) rejects half-configured pairs so a typo cannot silently
  disable or half-enable the flow.
- Account linking (ADR-0006): automatic only when the existing account's
  email is verified and Google reports `email_verified`; otherwise explicit
  connect from settings after signing in with the existing method.
- Google identities are separate `AuthAccount` rows; the user table stays the
  single owner of financial data.

### Self-service account deletion (implemented, IT-12)

`DELETE /api/v1/me` acts only on the session-derived user; the body has no
identity field. It requires the current password (verified with the existing
Argon2id hasher) and the exact confirmation phrase `DELETE`. Failed attempts
are limited in memory to five per user per 15 minutes for the single API
instance. Deletion removes goal contributions, goals, budget category limits,
budgets, transactions, categories, financial accounts, preferences, dashboard
layout, verification rows, all sessions, auth accounts, and finally the user
inside one database transaction; the `USER_ACCOUNT_DELETED` audit row is
written in that same transaction. Because sessions are deleted, a copied
cookie no longer authenticates. Backups are not claimed to be erased (DR-15).

### Password recovery (deferred, launch-gated)

- Future flow: `forgot-password` always returns the same generic response;
  a single-use, hashed, time-limited token (≤ 30 minutes) is emailed via the
  email provider (ADR-0008); resetting revokes other sessions.
- This is the flow requirements.md §5.1 refers to; it must be implemented
  before a public launch even though it is deferred now.

## Authorization and user isolation

- A global **session guard** (`APP_GUARD`) protects every Nest route by
  default; the only public allowlist entry is health (`@Public()`), and
  Better Auth's own endpoints are served by the pre-router mount. Session
  lookups that fail (database down) answer **503**, never a bypass and never
  a misleading 401 — fail closed.
- Controllers/services take `userId` from the verified session, never from
  path/query/body values. Requests for another user's resource return
  **404** (not 403) to avoid existence leaks. `/me` is addressed by session
  only, so id-addressed resources adopt the same rule as they ship.
- Tests must attempt cross-user reads, updates, deletes, exports, and nested
  resources (transactions under accounts, contributions under goals) and
  assert denial (§10.2). This is an acceptance requirement, not a nice-to-have.
  For IT-3, `test/integration/auth.test.ts` establishes the pattern: two
  users, either session resolves only its own identity, and a client-supplied
  `userId` in a `PATCH /me` body is ignored.

## Web ↔ API request security

- CORS stays **opt-in** via the existing `CORS_ORIGINS` allowlist; when
  enabled, credentials are allowed only for explicit origins. Entries must
  be exact origins — wildcards (`*`, `?`) are rejected at startup, because
  the CORS middleware only exact-matches while Better Auth treats them as
  patterns; accepting one would widen the trusted-origin check without
  enabling CORS for anyone.
- Recommended production topology: web and API on the same registrable
  domain (e.g. `app.` and `api.` subdomains, or a reverse proxy so the
  browser sees one origin). This keeps `SameSite=Lax` cookies effective and
  removes most CSRF surface.
- CSRF: `SameSite=Lax` cookies plus `Origin` verification on state-changing
  requests. Better Auth validates `Origin`/`Referer` against `trustedOrigins`
  (the `CORS_ORIGINS` list plus the API's own origin) whenever a session
  cookie or Fetch-Metadata is present; browsers always send `Origin` on
  non-GET requests, so the web app works as configured. The gate is pinned
  on in every environment (`advanced.disableOriginCheck: false`) — Better
  Auth otherwise skips origin checks whenever `NODE_ENV=test`, which is
  exactly what the integration suite runs under. Non-browser clients
  (curl, scripts) must send a trusted `Origin` header when they present a
  cookie; cookie-less sign-up/sign-in calls pass without one. Custom request
  headers for JSON APIs are expected by the web client's own fetch wrapper,
  never as security-through-obscurity.
- Rate limits apply to sign-in, sign-up, verification resend, and recovery —
  implemented by Better Auth so no Redis is needed in MVP (in-memory limits
  are acceptable for a single API instance; a persistent store is a later
  separate decision if the API scales out).

## Environment configuration

| Variable                                    | Purpose                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                        | ≥ 32-character random secret; required in production; blank means unset locally  |
| `BETTER_AUTH_URL`                           | Public API base URL used for callbacks/cookies; required and https in production |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional; set both or neither)                                     |
| `EMAIL_API_KEY` / `EMAIL_FROM`              | Email provider (Phase D, ADR-0008)                                               |

Placeholders live in `.env.example`; real values exist only in deployment
secrets (requirements.md §14, AGENTS.md rule 9). Locally, `.env` files are
loaded only outside production (`apps/api/src/config/load-env.ts`).

## Threat model (MVP scope)

| Threat                       | Mitigation (proposed)                                                          |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Credential stuffing          | Rate limiting, generic errors, strong Argon2id parameters, no user enumeration |
| Session theft (XSS)          | HttpOnly cookies, no token in JS storage, React output encoding, CSP later     |
| CSRF                         | SameSite=Lax + Origin checks + same-site deployment                            |
| Session fixation/guessing    | High-entropy server-generated tokens; rotation on sign-in                      |
| Cross-user data access       | Guard-derived `userId`; scoped queries; mandatory isolation tests              |
| Brute-force on recovery      | Deferred flow designed with hashed single-use tokens + rate limits             |
| Password database compromise | Argon2id + salting; pepper considered later (needs secret storage decision)    |

No claim of being "secure" is made until the implementation and its tests
exist (§13.2).

## Implementation status (IT-3, 2026-10-16)

Implemented on the backend:

- Email/password sign-up, sign-in, sign-out, and `GET /get-session` served
  by Better Auth 1.7 under `/api/v1/auth` (`toNodeHandler` mount in
  `apps/api/src/bootstrap.ts`, ahead of Nest's body parsers).
- Argon2id password hooks with the reviewed parameters; length policy
  12–128 enforced server-side; generic credential errors.
- Database-backed, revocable sessions; HttpOnly/SameSite=Lax cookies,
  `Secure` whenever `BETTER_AUTH_URL` is https.
- Global fail-closed `AuthGuard` with a `@Public()` allowlist (health only).
- Thin `GET/PATCH /api/v1/me` (identity from the session; display name
  update only).
- Rate limiting enabled in every environment (Better Auth built-in rules:
  sign-in/sign-up 3 per 10 s per IP+path; 429 with `{ message }` and
  `X-Retry-After`).
- Integration coverage against real PostgreSQL:
  `apps/api/test/integration/auth.test.ts`.

IT-12 added password-confirmed self-service deletion (`DELETE /api/v1/me`) and
server-side revocation of every session in the same transaction. The web
sign-in/sign-up forms are live; the data settings screen calls the real
deletion endpoint and shows success only after the API confirms it.

Deferred, with launch gates recorded: email verification, password recovery,
Google Sign-In (needs owner credentials), session-list UI, password change,
and backup-erasure claims. These remain previews or absent, never simulated.
