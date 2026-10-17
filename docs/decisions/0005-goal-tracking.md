# ADR-0005: Savings goals — virtual contribution ledger

**Status:** Proposed (awaiting product-owner approval)  
**Date:** 2026-10-16

## Context

`requirements.md` §18.6 asks whether savings goals are virtual allocations,
account-linked balances, or a defined combination, and §5.8 requires one
explicit source for a goal's current amount and no silent mixing of methods.
`docs/architecture/accounting-rules.md` defines the full calculation rules.

## Decision (proposed)

1. **MVP: goals are virtual allocations, tracked by a contribution ledger.**
   `GoalContribution` rows are the single source of truth:
   `goal progress = Σ contribution amounts (contributions minus reversals)`.
   No goal balance is stored on the goal row.
2. **Contributions do not move money and are not transactions.** Adding a
   contribution does not change any account balance, does not count as
   income, and does not count as budget spending. The UI labels goal progress
   as "tracking" and never implies the money was moved into a separate pot.
3. **No account link in MVP.** Linking goals to accounts is deferred; when it
   arrives (V1 or later), funding a goal will create a **TRANSFER between the
   user's accounts plus a ledger entry that references that transfer** — the
   ledger stays the single source of truth for progress, the transfer is the
   only thing that moves balances, and transfers remain excluded from
   income/expense/budgets. This is the "clearly defined combination" path and
   prevents double counting by construction.
4. **Reversals keep history:** contributions are immutable; removing one
   creates a linked negative-amount reversal row (`reversesContributionId`).
   Both rows appear in the goal history.
5. **Overfunding is allowed and displayed accurately** (e.g. "120% of
   target"); the progress bar caps visually at 100% and a text label marks
   the over-target state. Percent is always computed from minor units.

## Consequences

- No double-counting risk in MVP: the dashboard shows tracked account balance
  and goal progress as separate, clearly labelled figures; neither is added
  to the other.
- Goal progress is derivable with a single indexed aggregate over
  contributions; tests cover contributions, reversals, overfunding, and the
  "no effect on balances/budgets/income" invariant.
- If goals are found to be confusing without account linkage during user
  validation (requirements.md §16.2), the V1 path above is additive: no MVP
  data must be rewritten, because the ledger remains authoritative.
- Emergency-fund template is a goal `type`, not a separate mechanism.
