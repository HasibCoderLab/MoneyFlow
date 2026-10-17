# Decision register — Phase 1

> Prioritized tracker for every open decision that affects MoneyFlow's MVP
> build. It extends `requirements.md` §18; it does not replace it. Nothing
> here is decided until the product owner says so — proposals are labelled
> **Proposed** and remain unapproved until this register or the matching ADR
> changes status.

## How to read and use this

- **Priority P0** blocks the first implementation task (schema and money
  foundations). **P1** blocks a specific MVP feature. **P2** blocks a later
  phase but not the foundations. **P3** is pre-launch/administrative.
- **Status:** `Requirements-defined` (already in requirements.md; only the
  interpretation is confirmed here) · `Proposed` (recommendation awaiting
  approval) · `Approved in principle` (owner approved the core direction;
  clarifications recorded 2026-10-16; final confirmation pending before the
  blocked task starts) · `Unresolved` (owner-only input; no responsible
  recommendation exists without it).
- To approve: mark the matching ADR `Accepted` (or edit a row here) and tell
  the implementation task to proceed. Until then, implementers must not
  build on an unapproved decision — but may not stall on P2/P3 items either.

## Summary

| ID    | Decision                          | Priority | Status                 | Recommendation                                                | Owner approval         |
| ----- | --------------------------------- | -------- | ---------------------- | ------------------------------------------------------------- | ---------------------- |
| DR-01 | Money representation              | P0       | Accepted               | Integer minor units, BDT registry, string contracts           | Approved 2026-10-16    |
| DR-02 | Accounting semantics              | P0       | Accepted               | Derived balances; 4 types; fixed refund/future-date rules     | Approved 2026-10-16    |
| DR-03 | Savings-goal method               | P1       | Proposed               | Virtual contribution ledger (no account link in MVP)          | **Required**           |
| DR-04 | Auth & session strategy           | P0       | Accepted               | Better Auth in API; email/password first, Google second       | Approved 2026-10-16    |
| DR-05 | Database & Prisma strategy        | P0       | Accepted               | Neon + `@prisma/adapter-pg` + direct CLI URL + Docker test DB | Approved 2026-10-16    |
| DR-06 | Email provider                    | P2       | Proposed               | Resend (deferred until verification/recovery task)            | Required, non-blocking |
| DR-07 | MVP scope interpretation          | P1       | Interpretation         | See `docs/product/mvp-scope.md`                               | **Confirm**            |
| DR-08 | Launch geography & BDT-only MVP   | P2       | Proposed               | Bangladesh, BDT-only, stored currency                         | **Confirm**            |
| DR-09 | Product name & domain             | P3       | Unresolved             | No recommendation possible (branding)                         | **Owner-only**         |
| DR-10 | Age policy for accounts           | P3       | Proposed               | 18+ for MVP (avoid minor-consent obligations)                 | **Confirm**            |
| DR-11 | Week-start / locale defaults      | P3       | Proposed               | Default Saturday for `bn-BD`, user-configurable               | Confirm                |
| DR-12 | Multiple dashboard layouts        | P3       | Proposed               | Single persisted layout in MVP, multiple in V1                | Confirm                |
| DR-13 | AI timing (MVP vs V1)             | P2       | Proposed               | Defer AI to V1                                                | Confirm                |
| DR-14 | Hosting / deployment              | P2       | Unresolved             | Options below; needs owner budget/accounts                    | **Owner**              |
| DR-15 | Backups, RPO/RTO                  | P3       | Unresolved             | Needs owner risk tolerance and Neon plan choice               | **Owner**              |
| DR-16 | Export/deletion/retention & audit | P2       | Proposed               | CSV export; hard delete; minimal audit events                 | **Required**           |
| DR-17 | Pricing, payments, legal review   | P3       | Out of scope (for now) | None — after validation (§3.2, §18.12/13)                     | Owner, later           |

---

## DR-01 — Money representation (P0, Accepted)

**Context:** `requirements.md` §9.3/§18 item: choose NUMERIC/decimal vs
integer minor units before any transaction code exists. Detail: ADR-0003.

| Option                                | Trade-offs                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Integer minor units (recommended)** | Exact end-to-end, trivial SQL sums, no decimal library; needs a currency exponent registry and string serialization for `BigInt` |
| `NUMERIC` + decimal library           | Human-readable DB values, flexible scale; adds decimal.js-style dependency at every boundary and scale configuration risk        |

**Recommendation:** integer minor units (`BIGINT`) + ISO 4217 currency code +
minor-unit **string** contract fields; display-only conversion in the web
app. Rationale: deterministic, testable, no binary-float surface (§9.3).

**Impact:** data model (all money columns), API contracts (`amountMinor`
strings), tests (exponent/parse/serialize), future multi-currency (registry
extends; no conversion in MVP).

**Approval required: yes** — blocks IT-1 and the first migration.

**Status update (2026-10-16):** accepted by the product owner after the
clarification round (ADR-0003 Clarifications; `accounting-rules.md` §11).
IT-1 implements this decision; the 10^11 minor-unit (৳1B) input cap is
re-affirmed in the IT-1 instruction.

## DR-02 — Accounting semantics (P0, Accepted)

**Context:** §18.5: opening balances, adjustments, refunds, goal allocation.
Detail: ADR-0004 + `docs/architecture/accounting-rules.md`.

| Option                                                                                          | Trade-offs                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Derived balances; types INCOME/EXPENSE/TRANSFER/ADJUSTMENT; refund rule fixed (recommended)** | One source of truth, no cache drift; every read aggregates; refund UI deferred but aggregation refund-aware |
| Stored/cached balances                                                                          | Faster reads; consistency/repair complexity with no measured need (§9.2 discourages it)                     |
| Negative-amount expenses for refunds                                                            | Violates "amount > 0" (§5.4); rejected                                                                      |

**Recommendation:** as in ADR-0004 (derived balances, single-row transfers,
immutable opening balance + adjustments with note, hard delete + audit,
future dates rejected, idempotency keys, timezone-aware periods). A minor
sanity default inside this decision: reject transaction amounts above
৳1,000,000,000 (likely data-entry errors) — confirm or adjust the cap.

**Impact:** schema (type-specific constraints), API (idempotency header,
validation), tests (effect matrix, edit/delete, boundaries), future
(planned transactions and refunds are additive, not retrofits).

**Approval required: yes** — blocks IT-1/IT-2/IT-6/IT-7.

**Status update (2026-10-16):** accepted by the product owner after the
clarification round (ADR-0004 Clarifications; `accounting-rules.md` §11).
IT-1 implements the pure effect matrix from this decision.

## DR-03 — Savings-goal method (P1, Proposed)

**Context:** §18.6: virtual allocations vs account-linked balances. Detail:
ADR-0005.

| Option                                        | Trade-offs                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Virtual contribution ledger (recommended)** | Simple, zero double-counting, works without forcing users to move money; progress can differ from actual account balances (UI must say so) |
| Account-linked goal balance                   | Progress always equals a real account; requires users to move money to track, one goal per account in the simple form                      |
| Hybrid from day one                           | Most flexible; two sources of truth to reconcile and explain — complexity for MVP                                                          |

**Recommendation:** virtual ledger now; hybrid path documented for V1
(transfer + linked ledger entry). Overfunding allowed and displayed
truthfully.

**Impact:** schema (`Goal`, `GoalContribution`), API (contribution/reversal
endpoints), tests (progress, reversal, no balance/budget effect), future
(additive V1 linking).

**Approval required: yes** — blocks IT-10; documented now so IT-2 needs no
goal table yet.

## DR-04 — Authentication & session strategy (P0, Accepted)

**Context:** §18.4; Google + email/password + revocable server sessions +
isolation + deferred recovery. Detail: ADR-0006 +
`docs/architecture/auth-sessions.md`.

| Option                                          | Trade-offs                                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Better Auth in the NestJS API (recommended)** | Established session implementation, DB sessions/revocation, email/password + Google, self-hosted data; NestJS integration is community-maintained (fallback: mount the official handler directly) |
| Custom NestJS auth module                       | Full control, no integration layer; most security-critical code to own and review                                                                                                                 |
| Managed provider (Clerk, Supabase…)             | Least code; recurring cost, vendor lock-in, PII off-platform, second user store                                                                                                                   |

**Recommendation:** Better Auth core with Prisma adapter; email/password
first; Google second once owner credentials exist; opaque HttpOnly sessions;
30-day lifetime; rate limits; recovery deferred but launch-gated.

**Impact:** schema (auth tables incl. `authAccount` rename), API (guards,
`/me`), security (cookie/CSRF posture, isolation tests), future
(verification/recovery flows).

**Approval required: yes** — blocks IT-3 and the auth tables in IT-2.

**Status update (2026-10-16):** accepted by the product owner; ADR-0006
marked Accepted. The auth tables (`User`/`Session`/`AuthAccount`/
`Verification`) land in IT-2; the auth flows land in IT-3. Schema generation
uses the official `auth` CLI; dependency versions were reviewed before
install (§13.2).

## DR-05 — Database & Prisma strategy (P0, Accepted)

**Context:** Neon + Prisma 7 driver-adapter compatibility, pooling, URLs,
SSL, migrations, local/test strategy. Detail: ADR-0007 +
`docs/architecture/database-and-testing.md`.

| Option                                        | Trade-offs                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Neon + `@prisma/adapter-pg` (recommended)** | Branching, pooling, free tier; long-running Node uses standard TCP driver; needs direct-URL split for CLI |
| Neon + `@prisma/adapter-neon`                 | Official Neon path for serverless/edge; WebSocket layer unnecessary for NestJS                            |
| Supabase / Railway / Render / RDS             | Alternatives without a needed differentiator (or more ops burden)                                         |
| Local-only for now                            | Zero setup; blocks any hosted preview and CI database tests                                               |

**Recommendation:** Neon (Singapore region), `adapter-pg`, pooled
`DATABASE_URL` runtime + unpooled `DIRECT_URL` for Prisma CLI,
`sslmode=require`, Docker PostgreSQL 16 for local dev/test, CI service
container.

**Impact:** config (future `.env.example` gains `DIRECT_URL`), CI (database
job), tests (harness guard), operations (plan-level backups pending DR-15).

**Approval required: yes** — blocks IT-2.

**Status update (2026-10-16):** accepted by the product owner; ADR-0007
marked Accepted. IT-2 implements it: `@prisma/client`/`@prisma/adapter-pg`
on the stable 7.10.x line (no 8.x release candidate), Docker PostgreSQL 16
(`moneyflow_dev` + `moneyflow_test`) for local development and tests, and
the PostgreSQL 16 CI integration-test job (the existing CI job stays
database-free).

## DR-06 — Email provider (P2, Proposed)

**Context:** §18.10. Detail: ADR-0008.

| Option                   | Trade-offs                                                   |
| ------------------------ | ------------------------------------------------------------ |
| **Resend (recommended)** | Free tier, API + SMTP, simple TS integration; younger vendor |
| Amazon SES               | Cheapest at scale; most setup, sandbox exit process          |
| Postmark                 | Strong deliverability; paid-only from the start              |
| Brevo                    | EU-based, free tier; broader marketing-suite product         |

**Recommendation:** Resend, used only for transactional auth email, wired in
Phase D; owner creates the account and verifies a sending domain (depends on
DR-09 for the domain).

**Impact:** no MVP-core impact; affects IT-13 and the launch gate; secrets
configuration later.

**Approval required: yes, but non-blocking** for all financial-domain tasks.

## DR-07 — MVP scope interpretation (P1, confirmation)

**Context:** `requirements.md` §3.1 is the source. The repository-level
interpretation (exclusions, sequencing, confirmation items) is in
`docs/product/mvp-scope.md` (§ "Interpretation calls").

**Recommendation:** confirm that document as the working interpretation,
especially: AI deferred (DR-13), Google second (DR-04), tags deferred,
refunds deferred with fixed rule, no future-dated entries, single layout,
virtual goals, BDT-only.

**Impact:** task sequencing and "done" expectations for every phase.

**Approval required: yes (confirm).**

## DR-08 — Launch geography & BDT-only MVP (P2, Proposed)

**Context:** §18.2/§18.3.

| Option                                 | Trade-offs                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Bangladesh, BDT-only (recommended)** | Matches the PRD's initial locale; single-currency sums stay well-defined; no FX risk/legal surface |
| BDT + other currencies in MVP          | Requires conversion/exchange-rate decisions and more UI; §3.1 excludes conversion                  |

**Recommendation:** Bangladesh launch; BDT-only enforced server-side;
currency stored explicitly everywhere so multi-currency is additive later.

**Impact:** locale defaults (DR-11), sums and reports, marketing language.

**Approval required: yes (confirm).**

## DR-09 — Product name & domain (P3, Unresolved — owner only)

**Context:** §18.1. The repository works as "MoneyFlow (working title)".
Name/domain affect: copy, logo, email sending domain, OAuth app name,
privacy/terms, deployment domains. No recommendation is possible for
branding; this cannot be invented by an agent.

**Impact when decided:** rename touchpoints, email setup (DR-06), hosting
(DR-14), legal pages.

**Approval required: owner-only, not blocking any implementation task.**

## DR-10 — Age policy (P3, Proposed)

**Context:** §10.3 requires documenting how minors are handled if they may
register; the target audience includes students, who can be minors.

| Option                            | Trade-offs                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **18+ for MVP (recommended)**     | Avoids parental-consent/child-data obligations in multiple jurisdictions while validating; expands later deliberately |
| Allow 16–17 with guardian consent | Serves the student segment earlier; needs real legal review and extra flows                                           |

**Recommendation:** 18+, documented in sign-up copy; revisit with legal
review (§18.13).

**Approval required: yes (confirm).**

## DR-11 — Week-start / locale defaults (P3, Proposed)

**Context:** §5.2 week-start preference; Bangladesh convention (weekend
Friday–Saturday) makes Saturday the natural default for `bn-BD`.

**Recommendation:** default `weekStartsOn = Saturday` for `bn-BD`, user-
configurable; day/month boundaries in `Asia/Dhaka` by default. Affects
summaries and budget periods only via the preference.

**Approval required: confirm (low impact).**

## DR-12 — Multiple dashboard layouts (P3, Proposed)

**Context:** §18.7.

**Recommendation:** one persisted layout per user in MVP (show/hide,
reorder, reset); multiple named layouts deferred to V1 pending user
validation (§3.2).

**Approval required: confirm (low impact).**

## DR-13 — AI timing (P2, Proposed)

**Context:** §18.8; §6.2 allows MVP without AI.

**Recommendation:** defer AI chat to V1; MVP ships deterministic summaries
and reports only. Rationale: correctness, security, and cost control first
(§6.4), and no LLM is the source of truth ever.

**Impact:** no MVP data-model impact; V1 adds AI tables/settings with their
own decisions (provider, budget, retention — §18.9).

**Approval required: confirm.**

## DR-14 — Hosting / deployment (P2, Unresolved — owner input)

**Context:** no hosting is chosen; requirements demand TLS, secrets
management, health checks, and a safe migration process (§10.1, §11.2,
§15). The database decision (Neon) is separate (DR-05).

| Option                                                                 | Trade-offs                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Web on Vercel + API on Render/Railway + Neon (recommended pattern)** | Fast setup, generous free tiers; three providers to manage      |
| Single PaaS for web+API (Render/Railway/Fly)                           | One dashboard; more Next.js operational responsibility          |
| Self-managed VPS                                                       | Full control, lowest long-run cost; highest ops/security burden |

**Recommendation:** the first option, with web+API under one registrable
domain (subdomains or reverse proxy) per ADR-0006. Needs the owner's
account/budget choices — cannot be decided by an agent.

**Impact:** environment variables, cookies/CORS topology, deployment docs,
CI/CD steps.

**Approval required: owner decision; not blocking local implementation.**

## DR-15 — Backups, RPO/RTO (P3, Unresolved — owner input)

**Context:** §10.1/§11.2 require backups with tested restores; Neon plan
capabilities differ (free tier limited history; paid plans offer
point-in-time restore).

**Options:** free-tier daily limits + manual `pg_dump` runbook or paid
PITR. **Recommendation (needs sign-off):** choose a paid Neon plan with PITR
before public launch and document/verify a restore runbook; meanwhile keep
manual dump instructions for development databases. RPO/RTO targets are a
business decision and must be set by the owner, not assumed.

**Approval required: owner decision before production launch.**

## DR-16 — Export, deletion, retention, audit (P2, Proposed)

**Context:** §18.14 + §5.1/§9.1/§10.3.

| Option                                                                                                                                                                              | Trade-offs                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **CSV export (own transactions, scoped); hard delete of user data with confirmation; minimal `AuditEvent` rows (no amounts/notes); anonymize audit rows on deletion (recommended)** | Matches MVP §3.1 items 14–15; simple mental model; audit keeps accountability without retaining sensitive content |
| Soft-delete accounts/records                                                                                                                                                        | Undo-friendly; complicates every query and conflicts with "delete my data" expectations                           |
| Full event-sourced audit trail                                                                                                                                                      | Strong accountability; disproportionate for MVP (cost/complexity)                                                 |

**Recommendation:** as recommended column; detail the exact retention rules
in the privacy text when DR-09/DR-13/DR-14 are decided (deletion must be
described before launch).

**Approval required: yes (confirm).**

## DR-17 — Pricing, payments, legal (P3, out of scope for now)

**Context:** §18.12/§18.13; §3.1 excludes payments from MVP. No action in
Phase 1; revisit only after validation (§16.2). Legal review of privacy/
terms for the launch jurisdiction is required before public launch — the
owner arranges it; this document does not claim any compliance.

**Approval required: no immediate action.**

---

## Recorded assumptions (verify, do not treat as decided)

1. The owner will create/host the Neon project and Google Cloud OAuth
   project when the related tasks arrive.
2. The uncommitted dashboard redesign at `/app/dashboard` is a UI preview
   under review; this phase neither approves nor changes it, and no feature
   work depends on its approval (the implementation tasks replace mock data
   progressively).
3. No second developer/ops budget assumptions are made; free tiers are
   assumed adequate for development and early validation until the owner
   decides otherwise (DR-14/DR-15).
4. `pnpm`, Node 24, and the current toolchain remain pinned as ADR-0002
   records; dependency additions (Better Auth, adapter packages) get a
   version review before install (§13.2).
