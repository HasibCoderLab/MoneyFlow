# IT-11 Verification Report — Preferences, Profile, and Dashboard Customization

**Date:** 2026-10-20  
**Branch:** main  
**Baseline:** `1fb9a7c` (IT-10); this report ships with the IT-11 commit

---

## A. Summary

**IT-11 Profile/Preferences Persistence + Dashboard Customization — COMPLETE**

Implemented server-backed display preferences and a single validated dashboard
layout, plus the authenticated profile form and preference-aware web display:

- `GET/PATCH /api/v1/preferences` — per-user theme, locale, timezone, week
  start, date/number formats, reduced motion, and explicit BDT-only currency.
- `GET/PUT /api/v1/dashboard/layout`, `POST /api/v1/dashboard/layout/reset` —
  one ordered, show/hide layout per user with strict write validation, defensive
  read normalization, and reset-to-default.
- `/app/settings/profile`, `/app/settings/preferences`, and `/app/customize`
  wired to those APIs; `/app/dashboard` renders the saved widget order and
  visibility with a default fallback, an all-hidden recovery link, and the
  existing responsive mobile layout.
- Preferences affect reporting boundaries deterministically (saved timezone for
  dashboard/report/budget periods, saved week start for weekly buckets) while
  never creating or mutating financial records.
- Guest theme/language choices remain browser-local and reconcile with the
  signed-in account; server values win after authentication.

No financial calculation, balance, transaction, budget, or goal value was
changed by this work.

---

## B. Routes and Behavior

| Route / API                           | Behavior                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/preferences`             | Returns the session user's row, or documented defaults without writing a row.                                                                                  |
| `PATCH /api/v1/preferences`           | Partial upsert; omitted fields are preserved. Rejects unknown fields, empty updates, invalid enums, invalid IANA timezones, and any currency other than `BDT`. |
| `GET /api/v1/dashboard/layout`        | Returns the saved order/visibility, or the documented default. Stale/unknown/duplicate entries are dropped and missing supported widgets appended.             |
| `PUT /api/v1/dashboard/layout`        | Requires all seven supported widgets exactly once with boolean visibility; rejects partial, duplicate, unknown, and malformed payloads.                        |
| `POST /api/v1/dashboard/layout/reset` | Deletes the saved row and returns the default layout.                                                                                                          |
| `/app/settings/profile`               | Loads and saves the display name through `GET/PATCH /api/v1/me`.                                                                                               |
| `/app/settings/preferences`           | Real form for theme, language, timezone, week start, date/number formats, and reduced motion; currency is read-only BDT; live preview.                         |
| `/app/customize`                      | Show/hide and reorder widgets, save, reset, signed-out and API-error states.                                                                                   |
| `/app/dashboard`                      | Renders saved widget order/visibility; default fallback; all-hidden message with recovery link; mobile single-column behavior.                                 |

Supported widget ids, in documented default order: `totalBalance`, `income`,
`expense`, `recentTransactions`, `spendingByCategory`, `goals`, `budgets`.

Defaults: locale `en`, timezone `Asia/Dhaka`, currency `BDT`, theme `LIGHT`,
week start `SATURDAY`, date format `DMY`, numerals `LOCALE`, reduced motion
`SYSTEM` (ADR-0010).

---

## C. Key Files

| Area                           | Files                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contracts                      | `packages/contracts/src/index.ts` (preferences, layout, widget ids, defaults)                                                                                      |
| Preferences API                | `apps/api/src/modules/preferences/` (DTO, service, controller, module, unit tests)                                                                                 |
| Layout API                     | `apps/api/src/modules/dashboard-layout/` (validation/normalization, service, controller, module, unit tests)                                                       |
| Schema / migration             | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261020190000_add_preferences_and_layout/migration.sql`                                              |
| Reporting integration          | `apps/api/src/modules/summary/`, `apps/api/src/modules/budgets/`, `apps/api/src/modules/transactions/occurrence.ts` (UTC aliases)                                  |
| Integration tests              | `apps/api/test/integration/preferences.test.ts`, `apps/api/test/integration/dashboard-layout.test.ts`, shared harness support                                      |
| Web API client                 | `apps/web/src/lib/api-client.ts` (`/me`, preferences, layout)                                                                                                      |
| Preference provider/formatting | `apps/web/src/lib/i18n/locale-context.tsx`, `apps/web/src/lib/display-format.ts`, `apps/web/src/lib/money-format.ts`, `apps/web/src/lib/summary-display.ts`        |
| Web screens                    | `apps/web/src/components/preferences-form.tsx`, `profile-form.tsx`, `dashboard-customizer.tsx`, `dashboard-view.tsx`, `theme-toggle.tsx`, settings/customize pages |
| Styling                        | `apps/web/src/app/globals.css` (widget grid, customizer, preferences form, reduced-motion attribute, mobile breakpoints)                                           |
| Decisions/docs                 | `docs/decisions/0010-preferences-and-dashboard-layout.md`, decision register/index, domain model, implementation plan, README                                      |

---

## D. Financial and Security Correctness

- **Session-derived identity only.** Every controller passes `user.id` from the
  verified session; no request body/query `userId` is read. A body-supplied
  `userId` is rejected as an unknown field.
- **Strict server validation.** Unknown fields, empty PATCH bodies, invalid
  enums, non-IANA timezones, and non-BDT currencies are rejected with 400
  responses. `UTC`/`Etc/UTC` are explicitly accepted aliases.
- **Per-user isolation.** Real-PostgreSQL suites prove that one user cannot read
  or overwrite another user's preferences or layout, and that reset only deletes
  the caller's row.
- **Financial invariance.** Integration coverage asserts that saving
  preferences or layouts creates/changes no transactions, accounts, budgets,
  goals, or totals.
- **Deterministic reporting effects only.** The saved timezone supplies default
  period boundaries for dashboard/report/budget queries; an explicit query
  `timezone` still wins. The saved week start drives weekly report buckets only.
  Money math remains server-side and exact in minor units.
- **Layout data is inert.** Persisted JSON is a validated `{ version, widgets }`
  structure, never executable JSON/CSS/HTML. Writes require every supported
  widget exactly once; reads normalize legacy/stale data instead of trusting it.
- **No silent preference merge.** A signed-in response replaces cached guest
  display choices; a 401 is treated as a normal guest state.
- **No secrets introduced.** No credentials, tokens, or financial records were
  added to source, tests, logs, or docs.

---

## E. Database Evidence

Verified against a disposable **native PostgreSQL 16.10** cluster on
`127.0.0.1:55432` (no Docker/Docker Desktop anywhere in the workflow), with the
full committed migration history applied.

- Migration `20261020190000_add_preferences_and_layout` is recorded as finished
  in `_prisma_migrations`.
- `userPreference`:
  - unique `userPreference_userId_key` (`userId`);
  - FK `userPreference_userId_fkey` → `user(id)` with `ON DELETE CASCADE`;
  - CHECK `userPreference_currency_code_check` (`^[A-Z]{3}$`);
  - CHECK `userPreference_timezone_not_empty_check`;
  - documented database defaults for every preference field.
- `dashboardLayout`:
  - unique `dashboardLayout_userId_key` (`userId`);
  - FK `dashboardLayout_userId_fkey` → `user(id)` with `ON DELETE CASCADE`;
  - CHECK `dashboardLayout_layout_object_check` (`jsonb_typeof(layout) = 'object'`);
  - `layout` is JSONB.
- No existing financial table was altered; the migration only adds the two new
  tables and their enums/indexes.

`pnpm db:validate` also reports the Prisma schema valid.

---

## F. Gate Results (actually run)

| Gate                    | Result                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:validate`      | **PASS** — Prisma schema valid                                                                                                                                                                                       |
| `pnpm lint`             | **PASS** — all workspaces                                                                                                                                                                                            |
| `pnpm typecheck`        | **PASS** — packages, API, and web                                                                                                                                                                                    |
| `pnpm test`             | **PASS** — API **397/397** (35 files), web **222/222** (36 files)                                                                                                                                                    |
| `pnpm test:integration` | **PASS** — **134/134** (11 files) against native PostgreSQL 16.10                                                                                                                                                    |
| `pnpm build`            | **PASS** — NestJS API + Next.js 16 production build (19 routes, including `/app/customize`)                                                                                                                          |
| `git diff --check`      | **PASS** — exit 0 (CRLF conversion warnings only)                                                                                                                                                                    |
| `pnpm format:check`     | **PASS for every intended IT-11 file.** The full-tree command still reports only the pre-existing untracked `docs/reports/2026-10-20-it8-verification-report.md`, which was deliberately preserved and not modified. |

The integration suites cover preference defaults, partial update persistence,
strict rejection, cross-user isolation, timezone/week-start reporting effects,
explicit-timezone precedence, layout persistence/replacement/reset, malformed
data rejection, stale-layout repair, and financial invariance.

Two web tests initially timed out/failed only under full-suite CPU contention.
The customizer was fixed to remove a state-seeding effect that could race an
immediate reorder/save (a real UI bug), and the web test timeout was raised to
15s for full-repo parallel runs. Both files and then the complete suite were
re-run successfully.

---

## G. CI Evidence

Local verification is complete. The repository workflow is configured to run
unit tests, the PostgreSQL 16 integration job, lint/typecheck/build, and schema
validation. The exact-commit GitHub Actions run is checked after pushing the
IT-11 commit; if `gh` is unavailable locally, the run is inspected through the
public GitHub API/UI instead. This report does not claim a CI result that was
not observed.

---

## H. Limitations and Scope Decisions

1. **Single layout only.** Multiple named layouts remain DR-12 (V1); the UI does
   not promise them. Adding them later is additive.
2. **BDT only.** Currency is stored explicitly but read-only in the UI; no
   conversion or currency picker exists (ADR-0003/DR-08).
3. **Avatar upload and notification preferences** are not implemented; they
   remain future work (notifications arrive with V1 notifications).
4. **Security and data settings** remain labelled previews (IT-12/IT-13).
5. **Settings/customizer copy** is still English until those strings are added
   to the reviewed translation dictionary (ADR-0009's stated limitation). The
   app shell and wired data pages continue to follow the locale preference.
6. **No quick-actions widget.** The existing dashboard never had one; IT-11
   customizes the widgets that actually exist rather than inventing a new
   feature.
7. **Mobile layout** is preserved through responsive grid spans; it is not
   independently customizable per device.

---

## I. Preserved Work

The untracked `docs/reports/2026-10-20-it8-verification-report.md` was left
untouched. No unrelated files were staged or committed. No Docker-based
commands were used.

---

**IT-11 is implemented, locally verified, and ready for owner review.**
