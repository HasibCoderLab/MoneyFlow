# Product documentation

**The single source of truth for product scope is
[`requirements.md`](../../requirements.md) at the repository root.** This
folder never redefines requirements; it only points to them and tracks
where the implementation currently stands.

## Scope levels (summary — see requirements.md §3)

| Level | Contents                                                        | Status in this repo                             |
| ----- | --------------------------------------------------------------- | ----------------------------------------------- |
| MVP   | Auth, accounts, transactions, goals, budgets, dashboard, export | IT-1…IT-12 implemented; IT-13 hardening remains |
| V1    | AI assistant, recurring rules, notifications, advanced reports  | Not started                                     |
| Later | Bank integrations, households, multi-currency, mobile apps      | Research only                                   |

## Current implementation status

- ✅ Repository foundation: monorepo, web/API apps, lint, type-check,
  tests, CI baseline, health endpoint.
- ✅ Phase 1 decisions for the implemented features: accepted ADRs
  0001–0007 and 0009–0011, with DR-12/DR-15 still open; see the
  [decision register](../decisions/decision-register.md).
- ✅ IT-1 money domain, IT-2 schema/migrations, IT-3 auth/sessions, IT-4
  accounts + ledger, IT-5 categories, IT-6/IT-7 transaction acceptance and
  transfers, IT-8 summaries/dashboard/reports, IT-9 budgets, IT-10
  goals/contributions, IT-11 profile/preferences/customization, and IT-12
  CSV export/account deletion/audit events.
- ✅ IT-14 route inventory, public `/features` `/about` `/contact` pages,
  interactive 2D `/site-map`, and a server-verified `/app` sign-in redirect.
- ⬜ IT-13 hardening and launch gates: email verification/recovery,
  backup/restore runbook, session/password management, accessibility and
  performance baselines, privacy text, and the final mock-data sweep.
- ⬜ Onboarding (approved; needs the server-persisted progress migration).

Task detail and acceptance evidence live in
[`implementation-plan.md`](./implementation-plan.md).

## Rules

- Do not add pages, features, or claims (pricing, testimonials, security
  certifications) that requirements.md does not authorize.
- Do not present demo data as real (`requirements.md` §13.5).
- Open product decisions live in requirements.md §18 — resolve them with
  the product owner before building the related feature.
