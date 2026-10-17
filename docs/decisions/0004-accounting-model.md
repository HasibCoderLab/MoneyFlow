# ADR-0004: Accounting model — derived balances and explicit transaction types

**Status:** Accepted (2026-10-16) — approved after the clarification round; clarifications retained below  
**Date:** 2026-10-16

## Context

`requirements.md` §18.5/§18.6 keep opening balances, adjustments, refunds, and
goal allocation open, and §5.3–§5.4 require documented semantics before
transaction CRUD is implemented. The full rule set lives in
[`docs/architecture/accounting-rules.md`](../architecture/accounting-rules.md);
this ADR records the core choices.

## Decision (proposed)

1. **Balances are always derived, never stored.**
   `account.balance = openingBalanceMinor + Σ signedAmount(transactions)`.
   No cached balance columns in MVP (`requirements.md` §9.2). Indexed
   aggregation is sufficient at MVP scale; a measured need would be an ADR
   of its own.
2. **Transaction types:** `INCOME`, `EXPENSE`, `TRANSFER`, `ADJUSTMENT` in
   MVP. `REFUND` is deferred, but its accounting rule is fixed now (negative
   expense in the refund's own period, never income) so reports and budgets
   are designed for it.
3. **Transfers are one row** referencing `fromAccountId` and `toAccountId`
   (per §9.1), require equal currency, `from ≠ to`, no category, and never
   count as income, expense, or budget spending.
4. **Opening balances** are set at account creation and immutable afterwards.
   Corrections after creation are recorded as an `ADJUSTMENT` transaction with
   a required note — users never edit a computed balance directly (§5.3).
5. **Amounts are strictly positive** on write; direction is expressed by type
   (`ADJUSTMENT` carries an explicit signed delta internally). Sign is never
   inferred from input formatting.
6. **Editing** a transaction is in-place and balances re-derive from the
   ledger. **Deleting** is a hard delete guarded by a confirmation step and
   recorded as an `AuditEvent`; soft-delete is rejected for MVP because it
   complicates every query and conflicts with deletion expectations.
7. **Future-dated transactions are rejected in MVP** (occurrence date later
   than "now" in the user's timezone, with a small clock-skew tolerance).
   Planned/upcoming entries arrive with V1 recurring rules and must be stored
   and labelled separately from actuals (§5.4, §5.11).
8. **Time is stored as `timestamptz` (UTC).** Day/week/month boundaries for
   summaries, budgets, and reports are computed with the user's IANA timezone
   preference at query time; week start defaults to the locale default and is
   user-configurable (§5.2, §5.4).
9. **Idempotency:** mutating transaction posts accept an `Idempotency-Key`
   header; a unique `(userId, idempotencyKey)` constraint makes retries return
   the stored record instead of creating duplicates (§5.4).
10. **INCOME and EXPENSE require a category.** Default categories (e.g.
    "Salary", "Other income", "Groceries", "Other expense") are cloned to each
    user so every record stays explainable in reports. TRANSFER and
    ADJUSTMENT have no category.
11. **Income/expense summaries exclude transfers and adjustments**, so
    "earned/spent" never inflates from moving money between own accounts.

## Consequences

- One aggregation path (a shared balance/summary domain service) is used by
  accounts, dashboard, reports, budgets, and exports; correctness tests live
  with that service.
- Historical statements stay correct after edits/deletes because nothing is
  cached.
- Refunds, when implemented, slot in without schema rewrites: a new enum
  value, a nullable `refundOfTransactionId`, and the already-documented
  aggregation rule.
- Hard delete + audit events require a documented deletion policy (see the
  decision register, DR-16) and tests that deletion cannot orphan or
  double-count.
- Rejecting future dates is a deliberate MVP constraint; the V1 planned-
  transaction feature must not retrofit silently — it gets its own ADR and
  UI states.

## Clarifications (2026-10-16)

Added after the product owner approved the core direction in principle and
requested implementation details before IT-1. The decision above is
unchanged; full text lives in
[`accounting-rules.md`](../architecture/accounting-rules.md) §11.

- **Transaction `type` is immutable after creation.** Changing type means
  delete + recreate; this keeps budget, refund, and transfer attribution
  unambiguous.
- **Transfer effect (explicit):** one row contributes `−amountMinor` to
  `fromAccountId` and `+amountMinor` to `toAccountId`; the total tracked
  balance is unchanged (invariant test); both sides edit/delete atomically;
  historical transfers keep working after an account is archived — only
  newly created or moved transactions require an `ACTIVE` account (§11.3).
- **Adjustment sign (explicit):** API input is unsigned `amountMinor` +
  `direction: "INCREASE" | "DECREASE"`, stored as `adjustmentSign: ±1`;
  signed effect = `sign × amountMinor`; the required note and the
  opening-balance freeze rule (`OPENING_BALANCE_FROZEN` once any transaction
  exists) are specified in §11.4. Negative derived balances are allowed and
  displayed truthfully (no overdraft modeling).
- **Occurrence semantics (explicit):** clients send a local date
  (`occurredDate`) plus optional local time; the server resolves it in the
  user's timezone. Date-only entries canonicalize to 12:00 local and are
  validated by local date (`≤ today` in that timezone); time-bearing entries
  are validated as instants (`≤ now + 5 minutes`), so same-day future times
  are rejected (§11.5).
- **Refund rule refinement:** refunds link to the original expense, are
  capped at its remaining refundable amount, attribute to the original
  category in the refund's own period, and may net negative (displayed
  honestly); the original expense cannot be deleted while refunds exist or
  edited below the refunded sum (§1.1, §11.6).
