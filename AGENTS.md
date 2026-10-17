# AGENTS.md — Rules for AI coding agents (and contributors)

These rules are mandatory. `requirements.md` at the repository root is the
primary source of truth for product scope, architecture, financial
correctness, security, and testing.

## Before every task

1. **Read `requirements.md` before every task.** Never invent product
   requirements. If a requirement is ambiguous, document the ambiguity and
   ask the product owner instead of guessing.
2. **Inspect before editing.** Read the relevant code and run
   `git status` / `git diff` first. Preserve existing work; never overwrite
   or delete files blindly.
3. **Plan before implementing.** Write a short plan listing the files and
   modules affected, plus migration, security, and testing risks.
4. **Make small, reviewable changes.** Build incrementally; never dump an
   entire application in one unreviewable change.

## Engineering rules

5. **Keep financial business logic out of UI components and controllers.**
   Business rules live in the domain/service layer; controllers stay thin.
6. **Validate input and enforce authorization on the server.** Never rely
   on hiding UI elements; every private resource is checked server-side.
7. **Keep private financial data isolated by authenticated user.** Scope
   every query to the identity from the verified session — never trust a
   `userId` supplied by the browser.
8. **Never use an LLM as the source of truth for financial calculations.**
   Balances, totals, and percentages come from deterministic, tested code.
9. **Never expose secrets** in frontend code, logs, screenshots, or source
   control. Environment files hold placeholders only.
10. **Add tests for meaningful behavior changes.** Financial rules,
    authorization, and user isolation need coverage before they are done.
11. **Never fabricate test results.** Only report a command as passing if
    you ran it and checked its output. If a check cannot run, say exactly
    why.
12. **Do not add placeholder functionality that appears real.** No fake
    buttons, fake data, fake metrics, or demo numbers presented as real.
13. **Update documentation when architecture or behavior changes.** Record
    consequential choices as ADRs in `docs/decisions/`.
14. **Ask before consequential or destructive changes** (schema rewrites,
    data deletion, dependency overhaul, architecture shifts).

## Scope guards

- Do not implement auth, transaction CRUD, financial calculations,
  budgets, goals, AI chat, or a full dashboard outside their assigned task.
- Do not add Redis, Kubernetes, Kafka, microservices, or dependencies
  without a reasoned, documented need.
- Do not resolve open decisions by guessing — see `requirements.md` §18.
  Record each resolution as an ADR first.
- Keep `requirements.md` at the repository root and never rewrite it to
  match the code; the code and docs follow the requirements.

## Before finishing

Run what the environment supports: install, lint, type-check, tests,
production builds. Inspect the final diff for secrets and unrelated
changes. Report what changed, what was tested with actual results,
known limitations, and the next step.
