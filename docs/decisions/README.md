# Architecture Decision Records

Consequential technical choices are recorded here as ADRs so that neither
humans nor AI agents have to guess why the code looks the way it does.

## Format

One markdown file: `NNNN-<slug>.md` with **Status** (Proposed / Accepted /
Superseded), **Context**, **Decision**, **Consequences**.

## Index

| ADR  | Title                                 | Status             |
| ---- | ------------------------------------- | ------------------ |
| 0001 | Modular monolith on pnpm workspaces   | Accepted           |
| 0002 | Tooling and version pinning           | Accepted           |
| 0003 | Money representation                  | Accepted           |
| 0004 | Accounting model                      | Accepted           |
| 0005 | Savings goals — virtual ledger        | Accepted           |
| 0006 | Authentication and session strategy   | Accepted           |
| 0007 | Database platform and Prisma 7        | Accepted           |
| 0008 | Transactional email provider          | Proposed           |
| 0009 | UI language toggle                    | Superseded by 0012 |
| 0010 | Preferences and dashboard layout      | Accepted           |
| 0011 | Export, deletion, and audit events    | Accepted           |
| 0012 | Language switcher and UI localization | Accepted           |

## Decision register

[`decision-register.md`](./decision-register.md) is the prioritized tracker
for every Phase 1 open decision (status, options, recommendation, impact,
and whether owner approval is required). Approving a register item means
marking the matching ADR `Accepted` (or amending the row) — nothing is
implemented on a Proposed decision.

## Open decisions — do not guess

Product-level open decisions (name, auth provider, accounting rules,
goal tracking method, AI provider, hosting, pricing, …) are listed in
`requirements.md` §18. They must be resolved by the product owner and
recorded as new ADRs here **before** the related feature is implemented.
If a decision is not blocking, document a conservative default in the ADR
and proceed without pretending it is confirmed.
