# MVP scope — Phase 1 interpretation (proposed)

> **`requirements.md` is the source of truth.** This document only turns its
> §3.1 MVP list into a buildable scope for this repository and records the
> interpretation calls that need the product owner's confirmation. It adds no
> new requirements and removes none.

## What "MVP" means here

One authenticated user can: create an account (financial), record income,
expenses, and transfers, see trustworthy summaries, set savings goals with
contributions, set monthly budgets, customize the dashboard layout and
theme, export their transactions, and delete their account. Every figure is
computed by tested server-side code from the user's own records
(`requirements.md` §3.1, §9.4).

## In scope (mapped to implementation tasks)

| # (req. §3.1) | Feature                               | Task (see implementation-plan.md) |
| ------------- | ------------------------------------- | --------------------------------- |
| 1             | Sign up / in / out, sessions          | IT-3                              |
| 2             | Profile and preferences               | IT-11                             |
| 3             | Accounts with opening balances        | IT-4                              |
| 4             | Income / expense / transfer           | IT-6, IT-7                        |
| 5             | Categories (defaults + custom)        | IT-5                              |
| 6             | Daily/weekly/monthly summaries        | IT-8                              |
| 7–8           | Savings goals + contributions         | IT-10                             |
| 9             | Budgets by period/category            | IT-9                              |
| 10            | Widget show/hide/reorder + persist    | IT-11                             |
| 11            | Theme + currency/date preferences     | IT-11                             |
| 12            | Search/filter/pagination/edits        | IT-6                              |
| 13            | Empty/loading/error states            | every task (reviewed in IT-13)    |
| 14            | CSV export                            | IT-12                             |
| 15            | Account deletion workflow             | IT-12                             |
| 16            | Responsive mobile-first UI            | every task                        |
| 17            | Automated correctness tests           | every task (gates in IT-1/IT-2)   |
| 18            | Logging/monitoring/backup/deploy docs | IT-13 (with owner decisions)      |

## Interpretation calls needing confirmation (no new requirements)

1. **AI chat is not in the MVP.** Requirements.md §3.1/§6.2 makes AI optional
   for MVP; recommendation: defer to V1 so correctness and security come
   first (register DR-13).
2. **Google Sign-In is in MVP but scheduled second**, after email/password,
   because it depends on owner-provided Google OAuth credentials (ADR-0006).
3. **Tags are V1.** §5.4 lists an optional tags field while §3.2 puts
   user-defined tags in V1; MVP ships `note`/description only.
4. **Refunds are deferred**, with the accounting rule fixed now
   (accounting-rules.md §1.1). MVP's three user-facing types are income,
   expense, transfer; adjustment exists as the documented correction
   mechanism.
5. **Future-dated/planned transactions are excluded**; they belong to V1
   recurring rules and must never be silently shown as actuals (§5.4, §5.11).
6. **One persisted dashboard layout** (show/hide/reorder/reset) in MVP;
   multiple named layouts are V1 and need user validation (§18.7, DR-12).
7. **Goals are virtual progress tracking** (contribution ledger), not linked
   account balances, in MVP (ADR-0005, §18.6).
8. **BDT-only MVP** with explicit currency storage and server-side
   enforcement (ADR-0003; register DR-08). No conversion, no cross-currency
   transfers.
9. **No pricing/subscriptions** in MVP; §3.1 excludes payment processing
   (§18.12).
10. **Onboarding is minimal**: after sign-up the user creates a first
    account, adds a first transaction, and lands on the dashboard. Default
    categories are cloned at first sign-in. No multi-step wizard in MVP.
11. **Category deletion** is allowed only when unreferenced; otherwise the
    UI offers archive (plus a safe reassignment flow as a later
    enhancement). §5.5 allows either once documented.
12. **Week start default** proposed as Saturday for `bn-BD`, user-
    configurable (register DR-11).

## Core user flows (product-level acceptance)

1. **Sign up / in / out:** clear pages, generic auth errors, secure session
   cookie, sign-out revokes the session, protected routes redirect to
   sign-in.
2. **Create a first account:** name, type, optional opening balance; the
   dashboard immediately reflects the opening balance as "tracked balance".
3. **Record income / expense:** amount, account, category, date; invalid or
   future dates and over-precision amounts are rejected with clear messages;
   balance and summaries update.
4. **Move money between accounts (transfer):** one action, both accounts
   updated, never counted as income/expense/budget spending.
5. **Manage transactions:** list with search/filter (date range, type,
   account, category), stable pagination, edit, delete with confirmation.
6. **Savings goal:** create (incl. emergency-fund template), add
   contributions, reverse one, see saved/remaining/percent; explanation that
   progress is tracking, not moved money.
7. **Budget:** monthly budget with optional per-category limits; see
   spent/remaining/percent, neutral overspend copy.
8. **Customize:** theme, hide/reorder dashboard widgets, persisted layout,
   reset to default, other preferences saved server-side.
9. **Export:** download the user's transactions as CSV (their records only).
10. **Delete account:** clearly explained workflow with confirmation; all
    owned data removed per the retention policy (DR-16).

## Explicitly out of scope for MVP

Bank/mobile-wallet integrations, payment processing and subscriptions,
investments/tax/credit, shared or household accounts, multi-currency
conversion, microservices/Redis/Kafka, native mobile apps, OCR/receipt
scanning, admin console, analogue marketing claims (§3.1 "MVP does not
require", §3.3).

## Definition of success for MVP (draft, needs owner sign-off)

- Activation: a new user can record a first transaction within minutes of
  sign-up (§16.1).
- Correctness: zero known defects in balance/summary calculations; all
  accounting-rule tests green.
- Trust: every displayed figure is labelled (actual/tracked), no fabricated
  or silently-rounded numbers, no mock data in shipped features.
- Security: sessions revocable, server-side authorization, cross-user
  isolation tests green, secrets out of the repo.
- Usability: the ten flows above work on mobile widths with empty, loading,
  and error states.

These are proposed acceptance gates for the MVP milestone, not industry
benchmarks; the owner may adjust them.

## Mock-data exit plan

The dashboard preview intentionally uses labelled sample data
(`apps/web/src/lib/mock-data.ts`). During implementation the dashboard is
wired widget-by-widget to real API data (IT-8); the mock module and banner
are removed only when every widget renders real data, so the app never mixes
sample and real figures (§13.5).
