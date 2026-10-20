# ADR-0005: Savings goals — virtual contribution ledger

**Status:** Accepted (2026-10-20) — approved by the product owner, including the
emergency-fund template preset recorded below.

**Date:** 2026-10-16 (approved 2026-10-20)

## Context

`requirements.md` §18.6 asks whether savings goals are virtual allocations,
account-linked balances, or a defined combination, and §5.8 requires one
explicit source for a goal's current amount and no silent mixing of methods.
`docs/architecture/accounting-rules.md` defines the full calculation rules.

## Decision

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
6. **The emergency-fund template is a UI preset on the same mechanism**, not
   a separate goal type implementation: creating a goal offers an
   `EMERGENCY_FUND` preset that pre-fills the name and type and suggests a
   target amount. **The suggested target is editable:** the user can change it
   before saving and can edit the saved target later through normal goal
   editing. The preset never locks the target, never overwrites a target the
   user has already entered, and never saves a goal without the user's
   explicit confirmation. Copy labels the amount as a suggestion, not
   universal financial advice (`requirements.md` §5.8), and the target is the
   ordinary `Goal.targetMinor` field — no template-only column, no second
   source of truth.

## Approval record

Approved by the product owner on 2026-10-20 (DR-03), together with the
goal-tracking method above and the emergency-fund template preset in item 6.
IT-10 was unblocked by this approval and is now implemented (see the
implementation note below).

## Implementation note (2026-10-20)

IT-10 implements this decision: `Goal`/`GoalContribution` with derived
progress (`Σ amountMinor`), immutable contributions with linked negative
reversals (UNIQUE `reversesContributionId`, sign and self-reversal CHECKs),
explicit lifecycle endpoints, and the API-backed goals list/detail UI.
Integration tests assert that contributions and reversals leave account
balances, period totals, and budget utilization unchanged.

The emergency-fund preset is a UI preset: choosing it pre-fills the type, the
name, and an example target of ৳30,000 that the user can change before saving
and afterwards. The amount source remains **unconfirmed** — a fixed
illustrative example pending the owner's decision, never presented as a
recommendation or a formula (the open item below).

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
- Emergency-fund template is a goal `type` plus a UI preset, not a separate
  mechanism; because the suggested target is pre-filled but editable, no goal
  data depends on the preset and a changed or removed preset cannot corrupt
  existing goals.
- **Preset amount source (open, non-blocking):** the suggested target is
  currently a fixed illustrative ৳30,000 example in the goal form, labelled as
  a suggestion and freely editable. Neither the figure nor a formula has owner
  approval, so it must not be described as a recommendation. Replacing it with
  a data-derived suggestion (or an owner-chosen figure) needs the owner's
  decision and must stay deterministic and honestly labelled either way (never
  an LLM calculation, AGENTS.md rule 8). This does not block the goal schema,
  contribution ledger, API, or the rest of the UI, which are implemented.
