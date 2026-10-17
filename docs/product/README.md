# Product documentation

**The single source of truth for product scope is
[`requirements.md`](../../requirements.md) at the repository root.** This
folder never redefines requirements; it only points to them and tracks
where the implementation currently stands.

## Scope levels (summary — see requirements.md §3)

| Level | Contents                                                        | Status in this repo      |
| ----- | --------------------------------------------------------------- | ------------------------ |
| MVP   | Auth, accounts, transactions, goals, budgets, dashboard, export | Not started (foundation) |
| V1    | AI assistant, recurring rules, notifications, advanced reports  | Not started              |
| Later | Bank integrations, households, multi-currency, mobile apps      | Research only            |

## Current implementation status

- ✅ Repository foundation: monorepo, web/API apps, lint, type-check,
  tests, CI baseline, health endpoint.
- 📋 Phase 1 design (proposed): decision register, domain model, accounting
  rules, auth/session architecture, database/testing strategy,
  MVP scope, and implementation plan — see
  [`mvp-scope.md`](./mvp-scope.md) and
  [`implementation-plan.md`](./implementation-plan.md).
- ⬜ Everything in requirements.md §3.1 (MVP features) — each gets its own
  task in the recommended order of §19.

## Rules

- Do not add pages, features, or claims (pricing, testimonials, security
  certifications) that requirements.md does not authorize.
- Do not present demo data as real (`requirements.md` §13.5).
- Open product decisions live in requirements.md §18 — resolve them with
  the product owner before building the related feature.
