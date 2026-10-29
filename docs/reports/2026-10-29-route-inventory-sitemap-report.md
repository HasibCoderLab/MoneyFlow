# Route Inventory, Public Pages, and 2D Sitemap — Verification Report

**Date:** 2026-10-29  
**Baseline:** `f7fb33d` (`docs: allow the local 3001 web origin in CORS examples`)  
**Scope:** Phase 1 Step B1 + approved public-page subset. No schema, API, or financial-calculation changes.

## Completed

- Central typed route catalogue at `apps/web/src/lib/routes.ts` covering public, auth, onboarding, app, and settings routes, with access (`public` / `authenticated`) and honest status (`implemented` / `planned` / `deferred`).
- Primary navigation (`app-shell.tsx`) and public footer now derive their destinations from the catalogue. Icons remain a presentation concern.
- New public pages: `/features` (only shipped capabilities, plus a "not built yet" list), `/about` (accurate product and PaathAI relationship), `/contact` (the real GitHub issue tracker; no invented email or form).
- New `/site-map`: grouped 2D tree, search, area filter, reset, status/access badges, detail panel with parent and availability note, links only for implemented non-parameterized routes, and a plain-text list alternative. Responsive at 55.99rem.
- Privacy, terms, and pricing remain absent and are marked `deferred` with the open decision cited; no placeholder legal text or invented plans.
- Protected-route access:
  - `middleware.ts` redirects `/app/*` and `/onboarding` to `/sign-in?next=…` when no session cookie is present and forwards the requested path to the layout.
  - `apps/web/src/app/app/layout.tsx` verifies the cookie with `GET /api/v1/me` (401 → sign-in redirect).
  - `safeRedirectPath` accepts only internal paths; `auth-form.tsx` honours `?next=` after sign-in and rejects external/protocol-relative/auth-loop destinations.
- Tests: catalogue-vs-filesystem validation, safe redirect/path rules, session check states, sitemap interactions, updated footer tests, and two form return-path tests.

## Files changed

**Created**

- `apps/web/src/lib/routes.ts`, `routes.test.ts`
- `apps/web/src/lib/route-access.ts`, `route-access.test.ts`
- `apps/web/src/lib/server-session.ts`, `server-session.test.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/app/app/layout.tsx`
- `apps/web/src/app/features/page.tsx`, `apps/web/src/app/about/page.tsx`, `apps/web/src/app/contact/page.tsx`, `apps/web/src/app/site-map/page.tsx`
- `apps/web/src/components/marketing-page.tsx`, `sitemap-view.tsx`, `sitemap-view.test.tsx`
- This report

**Modified**

- `apps/web/package.json` (web build compiles the contracts package first)
- `apps/web/src/components/app-shell.tsx` (catalogue-driven nav, nested active state)
- `apps/web/src/components/site-footer.tsx`, `site-footer.test.tsx`
- `apps/web/src/components/auth-form.tsx`, `auth-form.test.tsx`
- `apps/web/src/app/(auth)/sign-in/page.tsx` (comment only; the form reads and validates `?next=`)
- `apps/web/src/lib/i18n/translations.ts` (four footer link keys, English + Bangla)
- `apps/web/src/app/globals.css` (public document + sitemap styles)
- `README.md`, `docs/product/README.md`, `docs/product/implementation-plan.md`

**Concurrent, not authored here:** the language-switcher rename (`language-toggle` → `language-switcher`, ADR-0012 working copy) and the `lang` pre-paint script appeared in the working tree during this task. They were preserved; only the shared `app-shell.tsx` import merge touched the same file.

## Database / API changes

None. No migration, endpoint, contract, or financial calculation changed. The layout only consumes the existing `GET /api/v1/me`.

## Verification (commands actually run)

| Command                                      | Result                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                             | **PASS** — packages, API, web                                                                              |
| `pnpm lint`                                  | **PASS** — web + API + packages                                                                            |
| `pnpm test` (root)                           | **PASS** — API 39 files / 435 tests; web 42 files / 278 tests                                              |
| `pnpm --filter @moneyflow/web build`         | **PASS** — 24 routes incl. `/about`, `/features`, `/contact`, `/site-map`; middleware compiled             |
| `pnpm exec prettier --check <changed files>` | **PASS** — all intended files formatted                                                                    |
| `git diff --check`                           | **PASS**                                                                                                   |
| `pnpm test:integration`                      | **FAIL (blocked)** — `TEST_DATABASE_URL is not set. Integration tests require a local PostgreSQL database` |     | `pnpm format:check` (full tree) | **FAIL** — pre-existing untracked `docs/reports/2026-10-20-it8-verification-report.md` plus `apps/web/src/components/language-switcher.tsx` from the concurrent language-switcher work; both preserved untouched |

A full `pnpm test` run reported one timed-out `goal-detail-view.test.tsx` case under parallel load (5.4s of a 15s budget); it passed alone (8/8) and on the rerun of the full web suite (278/278). Recorded as an intermittent contention failure, not a code change in this increment.

### HTTP acceptance against the production build

Started `apps/web` with `next start` on port 3005 and used `curl`:

- `GET /app/dashboard` → `307` with `location: /sign-in?next=%2Fapp%2Fdashboard`
- `GET /app/dashboard` with a fake session cookie → `200` (layout treats the unreachable API as `unknown` and does not lock the user out; the page's own 401 state applies)
- `GET /site-map` → `200`, content includes `Deferred`, `Sign-in required`, `Privacy policy`
- `GET /features` → `200`, contains “What MoneyFlow does today”
- `GET /contact` → `200`
- `GET /does-not-exist` → `404`

## Security / data isolation

- The middleware is a UX guard only; the real boundary is unchanged: every API query is scoped to the session-derived user, and the layout adds a verified `GET /me` check.
- Return paths are validated against protocol-relative URLs, absolute URLs, backslashes, control characters, and auth loops. No token is read by JavaScript or placed in a URL.
- The sitemap exposes only route metadata — no accounts, balances, transactions, or user data.
- No secrets, real credentials, or new environment variables were added.

## Known limitations / outstanding issues

- Full session verification depends on the API being reachable; when it is not, the app degrades to its existing client-side signed-out state rather than blocking the page.
- Privacy, terms, and pricing pages remain deliberately unpublished (DR-17 / requirements.md §18.12–18.13).
- Onboarding is not implemented; the progress-persistence migration is approved for the next increment.
- No browser E2E harness exists in the repository; this increment validates through unit tests, the production build, and HTTP checks.
- The whole-tree `format:check` still reports the pre-existing untracked IT-8 report and the concurrently edited `language-switcher.tsx`; neither belongs to this increment.

## Deployment follow-up (same day)

A Vercel build whose project root is `apps/web` failed with
`Module not found: Can't resolve '@moneyflow/contracts'`. Cause: Vercel ran the
web package's `build` script (`next build`) directly, while the contracts
package's `dist/` is generated and gitignored.

Fix: `apps/web` now compiles `@moneyflow/contracts` in its own `build`,
`vercel-build`, and `predev` scripts. Verified locally by deleting
`packages/contracts/dist` and rebuilding only the web package:

| Command                                                                | Result                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `rm -rf packages/contracts/dist && pnpm --filter @moneyflow/web build` | **PASS** — contracts rebuilt, Next compiled, 23 static pages generated |
| `pnpm --filter @moneyflow/web dev --help` on a clean `dist/`           | **PASS** — `predev` rebuilt contracts first                            |
| `pnpm --filter @moneyflow/web lint`                                    | **PASS**                                                               |

Still required outside the repository: set `NEXT_PUBLIC_API_URL` (and the API's
`CORS_ORIGINS`) in the deployment environment. The build warns when the browser
API URL is unset; it does not invent one.

## Next step

Onboarding: add the approved `UserPreference` onboarding-state migration, the six-step flow with skip/resume, idempotent first-account creation, and dashboard checklist. Then the transaction text search (`q`) increment.
