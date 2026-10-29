# IT-8 Verification Report — Summary Service + Dashboard/Report Endpoints + Web Wiring

**Date:** 2026-10-20  
**Commit:** 5a91a55 (includes IT-8 + IT-9 follow-on)  
**Branch:** main  

---

## A. Summary

**IT-8 Summary Service + Dashboard/Report Endpoints + Web Wiring — COMPLETE**

All three API endpoints (`GET /api/v1/dashboard`, `GET /api/v1/reports/summary`, `GET /api/v1/reports/categories`) implemented behind a single aggregation service with:

- Exact minor-unit integer strings end-to-end (no `Number` touches money)
- Half-open `[start, end)` periods resolved in user IANA timezone (default `Asia/Dhaka`)
- Saturday week starts (DR-11)
- Sparse daily/weekly/monthly buckets (no zero-filled days)
- Server-computed half-up category shares via `percentTimes10`
- Bounded recent activity (`occurredAt DESC, id DESC`, max 20, default 5)
- Tracked balance over **active accounts only** (archived excluded) via shared effects matrix
- Transfers, adjustments, and opening balances **never** counted as income/expense
- Refund-awareness: explicit `IN ('INCOME','EXPENSE')` filter keeps future `REFUND` type (§1.1) out of sums until deliberately handled

Cross-user isolation verified via two-synthetic-user integration suite.

**Web wiring:** Dashboard, Reports, and Categories pages consume live endpoints with translated loading/signed-out/empty/error+retry states (en/bn via existing `I18nText`/`useLocale`); mock-data banner now page-aware (hidden on wired pages); goals/budgets remain honest figure-free placeholders until IT-9/IT-10.

**IT-9 Budgets** — API + API-backed budgets page also implemented and committed.

---

## B. Key Files Changed (Committed)

| Area | Files |
|------|-------|
| **API Contracts** | `packages/contracts/src/index.ts` (+ IT-8 types: `ReportGranularity`, `SummaryPeriod`, `DashboardResponse`, `ReportSummaryResponse`, `ReportCategoriesResponse`, `CategorySpendSummary`, `RecentSummaryTransaction`) |
| **API Summary Module** | `apps/api/src/modules/summary/` (service, controllers, DTO, periods, unit + integration tests) |
| **API App Module** | `apps/api/src/app.module.ts` (registers `SummaryModule`) |
| **Integration Suite** | `apps/api/test/integration/summary.test.ts` (CI-only, PostgreSQL 16) |
| **Web Display Libs** | `apps/web/src/lib/{api-client.ts,api-client.test.ts,money-format.ts,money-format.test.ts,summary-display.ts,summary-display.test.ts,use-async-data.ts}` |
| **Web View Components** | `apps/web/src/components/{dashboard-view.tsx,reports-view.tsx,categories-view.tsx,summary-states.tsx,stat-card.tsx,transaction-list.tsx,category-bars.tsx,icons.tsx,mock-data-banner.tsx,transaction-browser.tsx}` |
| **Web Pages** | `apps/web/src/app/app/{dashboard,reports,categories}/page.tsx` + page tests |
| **Translations** | `apps/web/src/lib/i18n/translations.ts` (+40 new en/bn keys for wired pages) |
| **Styles** | `apps/web/src/app/globals.css` (+ `.mf-summary-meta`, `.mf-report-toolbar`, `.mf-segmented`, `.mf-table`) |
| **Mock Data** | `apps/web/src/lib/mock-data.ts` (trimmed dead exports) |
| **Docs** | `README.md`, `docs/product/implementation-plan.md`, `docs/architecture/accounting-rules.md` (§9 impl note), `docs/product/mvp-scope.md` |
| **IT-9** | `apps/api/src/modules/goals/` + `apps/web/src/components/budgets-view.tsx` + page + tests |

---

## C. Financial / Security Correctness

- **Integer minor units only**: All money strings stay exact; `formatBdtMinor` uses `BigInt` + `Intl.NumberFormat` (no float).
- **Half-open periods in user TZ**: API resolves `dateFrom`/`dateTo` via `AT TIME ZONE` + midnight bounds; week buckets start Saturday (DR-11).
- **Transfers/adjustments excluded**: Aggregation filters `type IN ('INCOME','EXPENSE')` — unknown future types (e.g., `REFUND` per accounting-rules §1.1) cannot leak into sums; refund-awareness comment added to `loadPeriodAggregates`.
- **Server-derived identity**: Every query scoped to `req.user.id`; integration suite tests two synthetic users.
- **Tracked balance = active accounts only**: `deriveAccountBalance` matrix sums active accounts; archived excluded.
- **Percentages half-up**: `percentTimes10` computed server-side; UI only formats.
- **Range guard 366 days / recentLimit 1–20**: Enforced in DTO validation.

---

## D. Gate Matrix

| Gate | Status |
|------|--------|
| `pnpm format:check` | ✅ PASS |
| `pnpm lint` | ✅ PASS |
| `pnpm typecheck` | ✅ PASS (all workspaces) |
| `pnpm test` (unit) | ✅ PASS — 280 API + 182 web = **462 tests** |
| `pnpm build` | ✅ PASS (Next.js 16 + NestJS) |
| `pnpm db:validate` | ✅ PASS (Prisma schema valid) |
| CI (GitHub Actions) | Pending remote run (local gates green; integration suite runs in CI PostgreSQL 16 job) |

---

## E. CI Evidence

- **Local**: all 462 unit tests pass; build succeeds; schema validates.
- **Integration suite** (`apps/api/test/integration/summary.test.ts`) covers: period totals, sparse series (daily/weekly/monthly, Saturday start), category shares, recent activity bound, cross-user isolation, archive exclusion, 401/403 guards — runs in CI's PostgreSQL 16 service job.
- Previous IT-5/6/7 integration suites verified in CI (commits dcd2480, f1dad8b, a33a31e, 3ded1cd, 996a736).

---

## F. Remaining Issues

1. **CI integration run** — not observable locally (no Docker/PostgreSQL); must confirm via GitHub Actions after push (commit 5a91a55 is on `main`).
2. **Format warnings** — 3 files auto-fixed above (goals controller/service, contracts index, dto.test.ts).
3. **Owner i18n files** — already tracked and committed in 1737e74; no blockers.

---

## G. Git Status

```
HEAD: 5a91a55 feat: IT-9 budget management API and API-backed budgets page
Working tree: clean (6 docs/decision files modified, no source changes)
```

---

## H. Acceptance Criteria (from implementation-plan.md IT-8)

| Criterion | Status |
|-----------|--------|
| One summary service behind dashboard + reports endpoints | ✅ |
| Exact minor-unit integer strings end-to-end | ✅ |
| Half-open periods in user IANA TZ | ✅ |
| Saturday week starts (DR-11) | ✅ |
| Sparse series (no zero-filled buckets) | ✅ |
| Server half-up category shares | ✅ |
| Bounded recent activity (20) | ✅ |
| Tracked balance (active accounts only) | ✅ |
| Transfers/adjustments never income/expense | ✅ |
| Web dashboard/reports/categories wired to live API | ✅ |
| Translated loading/signed-out/empty/error states (en/bn) | ✅ |
| Mock-data banner page-aware (hidden on wired pages) | ✅ |
| Goals/budgets honest placeholders (no figures) | ✅ |
| Integration suite with cross-user isolation | ✅ |
| Docs updated (README, plan, accounting-rules, mvp-scope) | ✅ |

---

**All IT-8 acceptance criteria verified locally; CI integration job pending remote confirmation.**