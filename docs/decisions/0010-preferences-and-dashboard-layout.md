# ADR-0010: User preferences and dashboard customization

**Status:** Accepted (2026-10-20) for the IT-11 implementation. This ADR does
not resolve DR-08 (launch geography) or DR-12 (multiple layouts); see the
open items below.

**Date:** 2026-10-20

## Context

`requirements.md` §5.2 asks for per-account display preferences (theme,
locale, timezone, week start, date/number formats, reduced motion), §5.7 asks
for a dashboard the user can customize (show/hide/reorder) with those choices
persisted, and §4.3 names `/app/settings/profile`, `/app/settings/preferences`,
and `/app/customize`. IT-3 already stores the session-derived user and display
name; IT-8/IT-9/IT-10 already compute dashboard, report, budget, and goal
figures deterministically.

The remaining questions were how to persist preferences safely, how to model
a single dashboard layout, which defaults apply before a user saves anything,
and how a browser cache (theme/language) interacts with the server value.
DR-12 (multiple named layouts) is still an open product decision; DR-11
already accepted Saturday as the week-start default. Currency remains
BDT-only for the MVP (ADR-0003, DR-08 recommendation), so this ADR does not
introduce conversion or a currency picker.

## Decision

1. **One `UserPreference` row per user, with deterministic defaults.** A
   missing row is valid and returns the documented defaults; `PATCH` performs
   a partial upsert. The defaults are:
   - locale `en` (existing UI default; DR-08/DR-11 locale sign-off unchanged),
   - timezone `Asia/Dhaka`,
   - currency `BDT`,
   - theme `LIGHT`,
   - week start `SATURDAY` (accepted DR-11),
   - date format `DMY`,
   - number format `LOCALE` (numerals follow the selected language),
   - reduced motion `SYSTEM`.
2. **Validation is strict and server-side.** `PATCH /api/v1/preferences`
   rejects unknown fields and empty updates, validates enum values, validates
   the IANA timezone (including the `UTC`/`Etc/UTC` aliases), and rejects every
   currency except `BDT`. The user id always comes from the verified session;
   a body-supplied `userId` is rejected as an unknown field. A unique-race is
   retried as a conflict-safe upsert.
3. **Display preferences are presentation-only, with two deliberate
   reporting effects.** None of these fields read or write transactions,
   accounts, budgets, goals, or balances. The saved timezone is used as the
   default boundary timezone for dashboard/report/budget periods (an explicit
   query `timezone` still wins), and the saved week start is used for weekly
   report buckets. Dates, numbers, money glyphs, and currency prefixes are
   formatted deterministically; no calculation moves into the browser.
4. **One validated dashboard layout per user.** `DashboardLayout.layout` is
   exactly `{ version: 1, widgets: [{ id, visible }] }`. `PUT` requires every
   supported widget exactly once, rejects unknown ids/fields and non-boolean
   visibility, and persists the order. `GET` returns the saved order or the
   documented default; reads defensively drop stale/unknown/duplicate entries
   and append any missing supported widget, so removing a widget in a later
   release cannot break a saved dashboard. `POST .../reset` deletes the row
   and returns the default. The supported ids are `totalBalance`, `income`,
   `expense`, `recentTransactions`, `spendingByCategory`, `goals`, and
   `budgets`.
5. **Server values win for signed-in users; the cache is a guest fallback.**
   The web provider restores cached `mf-locale`/`mf-theme` display choices
   before paint, then reconciles with `GET /api/v1/preferences`. A 401 marks
   the session as a guest and keeps the cached display choice; a signed-in
   response replaces it. Header theme/language changes and the preferences
   form save through the API once the provider is ready. The browser cache
   contains display choices only, never financial or personal data.
6. **Theme and motion semantics.** Theme is `LIGHT`/`DARK`/`SYSTEM`; `SYSTEM`
   follows `prefers-color-scheme` live. Reduced motion is `SYSTEM`/`REDUCE`
   and sets `data-reduced-motion` so CSS can disable transitions without
   hiding content. Both are visual preferences, not financial settings.
7. **One layout, not multiple.** IT-11 deliberately implements the
   conservative single-layout option. Named/multiple layouts remain DR-12 and
   must not be presented as available; adding them later is additive.

## Consequences

- Preferences and layouts are additive schema changes with per-user unique
  keys and cascade deletes; no existing financial table is altered.
- Cross-user isolation is enforced by session-derived queries and covered by
  real-PostgreSQL integration tests for reads, writes, resets, and defaults.
- A stale saved widget never produces an invalid dashboard: reads normalize
  instead of trusting stored JSON.
- Settings/customizer copy may remain English until the remaining strings are
  added to the reviewed translation dictionary (ADR-0009's stated
  limitation). The app shell and wired data pages continue to follow the
  locale preference.
- BDT is shown read-only with an explicit explanation. Multi-currency and
  conversion remain out of scope; `currency` is stored so a future opt-in is
  additive.
- Guest theme/language choices remain browser-local; signing in replaces
  them with the account values rather than silently merging the two.
- DR-12 remains open. Multiple named layouts are not implemented or promised
  by this ADR.
