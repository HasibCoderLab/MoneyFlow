# Accounting rules and transaction lifecycle (proposed)

> Phase 1 design artifact — **proposal**. Companion documents:
> [`domain-model.md`](./domain-model.md) (schema), ADR-0003 (money
> representation), ADR-0004 (accounting model), ADR-0005 (goals).
> Approval is tracked in
> [`docs/decisions/decision-register.md`](../decisions/decision-register.md).

This is the single spec a later implementation task follows for balances,
summaries, budgets, and goals. Every rule here is deterministic and must be
covered by unit tests (requirements.md §12.1) before or with the code.

## 1. Terminology and definitions

All amounts below are integer minor units (ADR-0003). "Signed effect" means
the amount added to an account balance, where a negative effect reduces the
balance.

| Concept                   | Definition                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Account balance**       | `openingBalanceMinor + Σ signedEffect(transactions)` for that account (§9.4)                                               |
| **Total tracked balance** | Sum of balances of all **active** accounts (one currency in MVP); clearly labelled as "tracked", never "net worth"         |
| **Income total**          | Σ `INCOME` amounts in the selected period, in the user's timezone; transfers and adjustments excluded                      |
| **Expense total**         | Σ `EXPENSE` amounts in the period, minus refund effects (§1.1 below); transfers and adjustments excluded                   |
| **Budget spent**          | Expense transactions whose category matches the budget limit, in the budget period and user timezone, minus refund effects |
| **Goal progress**         | Σ `GoalContribution.amountMinor` for the goal (ADR-0005); derived, never stored                                            |
| **Percentage**            | Display-only value computed from integers with documented half-up rounding (§7); never persisted                           |

### 1.1 Refunds (rule fixed now, implementation deferred)

A future `REFUND` transaction is stored as a positive amount linked to the
original expense (`refundOfTransactionId`) and behaves as a **negative
expense in its own period**: it increases the account balance, reduces the
expense total and budget spent for the original category, and is never
income. If no `REFUND` type exists yet at implementation time, refunds remain
unsupported and the UI must not offer them. This rule is fixed now so
aggregation code is written refund-aware from the start (ADR-0004).

Review clarification (2026-10-16) — the rule above is unchanged; these
details make it implementable (full future effects: §11.6):

- **Link:** `refundOfTransactionId` must reference an `EXPENSE` owned by the
  same user; the refund credits the original expense's account (changing the
  credit-account rule requires an ADR update).
- **Partial refunds:** multiple refunds per expense are allowed; the sum of
  active refunds must never exceed the original `amountMinor` (service-level
  check, integration-tested once refunds exist).
- **Attribution:** a refund carries no category of its own; category and
  budget attribution is derived from the linked original expense and applied
  to the refund's own period (no retroactive restatement).
- **Guards:** the original expense cannot be deleted while refunds exist, nor
  edited below the refunded sum.
- **Negative net:** a refund period/category can net negative when a refund
  exceeds that period's spending; values are computed as net (never clamped)
  and displayed as an explicit "net refund" state.

## 2. Signed effect matrix (MVP types)

| Type         | `accountId` | `fromAccountId` | `toAccountId` | Counts as income | Counts as expense | Budget effect   |
| ------------ | ----------- | --------------- | ------------- | ---------------- | ----------------- | --------------- |
| `INCOME`     | `+amount`   | —               | —             | ✅               | ❌                | none            |
| `EXPENSE`    | `−amount`   | —               | —             | ❌               | ✅                | increases spent |
| `TRANSFER`   | —           | `−amount`       | `+amount`     | ❌               | ❌                | none            |
| `ADJUSTMENT` | `±amount`   | —               | —             | ❌               | ❌                | none            |
| `REFUND`*    | `+amount`   | —               | —             | ❌               | negative          | decreases spent |

\* Deferred implementation; behavior documented for design consistency.

Invariant: every transaction has exactly one economic effect; direction is
always derived from `type` (and `adjustmentSign` for adjustments), never from
the sign the user typed. Stored `amountMinor` is always positive in MVP.

## 3. Validation rules (server-side, at the API boundary)

1. **Amount grammar (canonical).** The raw input string must match
   `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$` exactly for BDT — surrounding
   whitespace is **rejected**, never trimmed or normalized; no grouping
   separators,
   currency symbols/codes, `+`, internal whitespace, scientific notation,
   leading zeros (`00.50`), or non-ASCII digits at the API layer. `"3500.5"`
   parses as 350,050 minor units; extra decimals (`"1.234"`) are
   **rejected**, never silently rounded. Input longer than 20 characters is
   rejected before parsing. Opening balances use the same grammar with one
   optional leading `-`; transaction and adjustment amounts are unsigned
   (`amountMinor > 0`). Full malformed-input matrix: §11.2.
2. **Amount range.** Service cap: reject amounts above **10^11 minor units**
   (৳1,000,000,000) as likely data-entry errors; this is a service-layer
   rule, not a DB CHECK, so the cap can change without a migration (owner
   may adjust the default; see register). BIGINT storage range and safe
   aggregate/display conversion: §11.1.
3. **Occurrence input semantics.** Clients send a local calendar date
   (`occurredDate`, `YYYY-MM-DD`) and an optional local time (`occurredTime`,
   `HH:mm`); the server resolves both in the user's IANA timezone. Date-only
   entries are canonicalized to **12:00 local (noon)** and validated by local
   date: `occurredDate ≤ today in the user's timezone`. Time-bearing entries
   are validated as instants: `occurredAt ≤ now + 5 minutes` (clock-skew
   tolerance), so same-day future times are rejected. Rationale and boundary
   cases: §11.5.
4. **Sanity floor.** The resolved instant must be on/after `1970-01-01` UTC.
5. `INCOME`/`EXPENSE` require `accountId` + `categoryId`; the category type
   must match (`INCOME` tx → `INCOME` category).
6. `TRANSFER` requires both accounts, `from ≠ to`, equal currencies, both
   accounts `ACTIVE` at creation time; no category.
7. `ADJUSTMENT` requires `accountId`, `adjustmentSign ∈ {−1, +1}`, and a
   non-empty `note` (why the balance changed); no category.
8. New transactions may only be created on `ACTIVE` accounts; edits may keep
   an already-archived account but cannot move a transaction onto an archived
   account.
9. `note` ≤ 500 characters.
10. If an `Idempotency-Key` header is provided, a replay returns the stored
    transaction (HTTP 200/201 semantics chosen once) instead of creating a
    duplicate; keys are unique per user.

## 4. Transaction lifecycle

### 4.1 Create

- Validate per §3; write one row inside a database transaction (single-row
  operations still use the same transaction boundary as multi-row ones for
  consistency, §5.4).
- Record `Idempotency-Key` when supplied.
- Balances and summaries change automatically because nothing is cached.

### 4.2 Edit

- In-place update with full re-validation; the previous values are not kept
  as history in MVP (audit events record destructive actions, not field-level
  diffs — see DR-16).
- Editing a transfer edits both sides atomically (it is one row).
- **Transaction `type` is immutable after creation** (changing type means
  delete + recreate); this keeps budget, refund, and transfer attribution
  unambiguous.
- Every edit re-validates fully, including §3 occurrence semantics.
- Concurrency model: last write wins; the UI must reload after conflicts.
  Optimistic locking is out of scope for MVP.

### 4.3 Delete

- Hard delete after explicit user confirmation (§5.4 "clear confirmation for
  destructive actions"), recorded as an `AuditEvent`
  (`TRANSACTION_DELETED`).
- Deletion re-derives balances, summaries, and budget utilization; a deleted
  expense stops counting toward a budget immediately.
- Goal contributions are not transactions and are unaffected; removing a
  contribution uses reversal (ADR-0005).

## 5. Opening balances, adjustments, and corrections

- `openingBalanceMinor` is set when the account is created and becomes
  immutable once the account has at least one transaction **of any type**
  (including adjustments). Before that, the user may correct it (no
  adjustment noise for a typo on an empty account); afterward the API
  rejects changes with `OPENING_BALANCE_FROZEN` and the UI offers "Adjust
  balance" instead (§11.4).
- Afterward, corrections are `ADJUSTMENT` transactions with a required note
  (e.g. "Cash count correction"), so the change is visible in history (§5.3,
  §9.4).
- Adjustments never affect income, expense, budgets, or goal progress.

## 6. Periods and timezone

- All occurrence timestamps are stored in UTC (`timestamptz`).
- A "day", "week", "month", or budget period is computed in the user's
  configured IANA timezone using IANA rules (no fixed UTC offsets).
- **Day:** local midnight to next local midnight.
- **Week:** starts on the user's `weekStartsOn` preference (proposed default
  Saturday for `bn-BD`; pending DR-11).
- **Month:** local first day 00:00 to the first day of the next month 00:00.
- **Budget period (monthly):** derived from `Budget.startDate` (a local date);
  utilization for month N covers that month's local boundaries.
- Changing the timezone preference changes future period computations; the
  product documents this (historical `occurredAt` values never change).
- DST edges (for users abroad later) are covered by IANA rules and tested
  with boundary fixtures.
- Date-only entries are anchored at local noon and validated by local date
  rather than by instant (§3 rule 3, §11.5).

## 7. Percentages and rounding

- Money is never rounded in storage, aggregation, or comparison.
- Displayed percentages are computed from minor units as
  `percentTimes10 = roundHalfUp(numerator × 1000, denominator)` and shown as
  `percentTimes10 / 10` with at most one decimal (e.g. 26.7%).
- Rounding is half-up, applied only at the last display step.
- Handles: `denominator = 0` (no budget/target) → show "not set", never
  `Infinity`/`NaN`.
- Goal progress may exceed 100%; the number is shown truthfully ("120% of
  target") while the progress bar caps visually at 100% and adds an
  "over target" label. Budget utilization also shows values > 100% plainly
  and neutrally (no shaming copy, §5.9).

## 8. Deterministic worked example (test fixture)

Fixture: user timezone `Asia/Dhaka`, week start Saturday, month = October 2026.

| #   | Record                    | Amount (BDT)     | Effect                                           |
| --- | ------------------------- | ---------------- | ------------------------------------------------ |
| 1   | Opening: Cash             | 10,000.00        | Cash +1,000,000 minor                            |
| 2   | Opening: Bank             | 0.00             | Bank 0                                           |
| 3   | Income: Salary → Cash     | 18,000.00        | Cash +1,800,000                                  |
| 4   | Expense: Groceries → Cash | 3,200.00         | Cash −320,000, expense total +320,000            |
| 5   | Transfer: Cash → Bank     | 2,000.00         | Cash −200,000, Bank +200,000 (no income/expense) |
| 6   | Adjustment: Cash −50.00   | 50.00            | Cash −5,000 (note required)                      |
| 7   | Goal "Emergency fund"     | target 30,000.00 | contribution 8,000.00 (no account effect)        |

Expected results:

- Cash balance = 1,000,000 + 1,800,000 − 320,000 − 200,000 − 5,000 =
  **2,275,000** = ৳22,750.00.
- Bank balance = **200,000** = ৳2,000.00.
- Total tracked balance = **2,475,000** = ৳24,750.00.
- October income = 1,800,000 = ৳18,000.00; October expense = 320,000 =
  ৳3,200.00; neither includes records #5/#6.
- Groceries budget limit 5,000.00 → spent 3,200.00 → **64.0%** used.
- Goal progress = 800,000 = ৳8,000.00 → **26.7%** (8,000.00 / 30,000.00,
  half-up).
- Deleting record #4 changes Cash to ৳26,000.00 and the budget to 0% —
  used as the edit/delete consistency test.

## 9. Dashboard and report definitions (MVP)

| Widget / report        | Definition                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Total tracked balance  | Σ active account balances, single currency; archived accounts excluded but viewable in Accounts     |
| Income / expense cards | §1 totals for the selected period, labelled with range and timezone; "actual recorded" wording only |
| Savings goal progress  | Per-goal progress + remaining; explicitly "tracking, not moved money" (ADR-0005)                    |
| Budget status          | Spent/limit/percentage per active budget, neutral wording, overspend shown accurately               |
| Recent transactions    | Latest by `occurredAt DESC, id DESC` tie-break; transfers labelled as transfers                     |
| Spending by category   | Σ expenses per category in the period, refund-aware when refunds exist; percent of total expense    |

Rules: all figures come from the same summary service (no per-widget SQL
duplication); zero-data periods render honest empty states, not zero trends;
charts keep a text/table alternative (§5.10).

**Implementation note (IT-8, 2026-10-17):** §9 is realized by the summary
service (`apps/api/src/modules/summary/`) behind `GET /api/v1/dashboard`,
`GET /api/v1/reports/summary` (sparse daily/weekly/monthly buckets, weeks
starting Saturday per DR-11, clipped to the requested period), and
`GET /api/v1/reports/categories`. Totals filter on explicit
`INCOME`/`EXPENSE` types only, so transfers, adjustments, and any future
`REFUND` rows (§1.1) can never leak into income or expense sums — refund
effects must be subtracted in that aggregation if the type is added. Shares
are half-up at the last display step via `percentTimes10`. Period boundaries
are half-open `[start, end)` in the resolved IANA timezone (default
`Asia/Dhaka` until IT-11 preferences exist). The total tracked balance sums
the same `deriveAccountBalance` effects matrix used by Accounts, over active
accounts only.

## 10. Edge cases that must be tested

- Zero, 1 minor unit (0.01), maximum-allowed, and over-max amounts; extra
  decimal digits rejected.
- Month/year boundary in `Asia/Dhaka`; week boundary with Saturday start;
  transaction at local midnight.
- Transfer between two accounts with identical names; `from = to` rejected.
- Editing an expense's amount/category; deleting an expense inside an active
  budget period; deleting the only transaction of an account.
- Archived account: cannot receive new transactions; historical ones still
  render.
- Idempotent retry of the same create request produces one row.
- Adjustment with empty note rejected.
- Goal overfunding (>100%) and full reversal of a contribution.
- Percent helper: `denominator = 0`, rounding boundary (e.g. x.x5).
- See §11.2 and §11.5 for the expanded malformed-input and occurrence-date
  matrices, and §11.3/§11.4 for transfer and adjustment edge cases.

## 11. Clarifications from the 2026-10-16 review

Added after the product owner approved the core direction of ADR-0003 and
ADR-0004 in principle, to close implementation ambiguities before IT-1.
These notes refine detail; no approved decision changes. Inline edits live in
§1.1, §3, §4.2, §5, and §6.

### 11.1 BIGINT range, aggregates, and safe conversion

- **Storage range:** PostgreSQL `BIGINT` is signed 64-bit
  (−9,223,372,036,854,775,808 … 9,223,372,036,854,775,807 minor units). The
  §3 rule 2 service cap (10^11 minor units per entered amount) keeps every
  user input far inside that range. The cap is deliberately a service-layer
  rule, not a DB CHECK, so the policy can change without a migration; DB
  CHECKs cover structural invariants only.
- **No computed writes:** balances and totals are always derived, never
  stored, so there is no code path where a computed value could overflow a
  column.
- **Aggregates:** PostgreSQL `SUM(bigint)` returns `numeric`, which is exact
  and can exceed `BIGINT` range. App code maps aggregate results to
  `BigInt`/contract strings, never to `number`. Implementation note: verify
  Prisma's `_sum` result type for `BigInt` fields (an engine-side cast could
  lose exactness); if it is not exact, aggregate via `SUM(...)::text` with
  `$queryRaw`.
- **Serialization:** contract conversion is `BigInt → .toString()` only.
  Tests must cover values above `Number.MAX_SAFE_INTEGER`
  (9,007,199,254,740,991) round-tripping exactly.
- **Display conversion (web):** format the major-unit integer part with
  `Intl.NumberFormat` (BigInt input — locale grouping and currency symbol)
  and append exponent-aware fraction digits in the locale's numbering
  system, so no `number` touches money at all. If a `number` is ever used,
  it must stay within `Number.MAX_SAFE_INTEGER` and be display-only — never
  arithmetic or a write. Snapshot tests cover `en-BD`/`bn-BD` and one value
  above `Number.MAX_SAFE_INTEGER`.

### 11.2 Amount parsing: canonical grammar and malformed-input matrix

Canonical grammar (matched against the raw input string; surrounding
whitespace is rejected, never trimmed):

- **Unsigned** (transaction, adjustment, goal, budget amounts; BDT exponent
  2): `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`. `"3500.5"` parses as 350,050
  minor units (implicit trailing zero); `"1.234"` is rejected, never
  rounded.
- **Signed opening balance:** the same grammar with one optional leading
  `-`; used only where a negative opening balance is meaningful. `-0` and
  `-0.00` are rejected (zero has one canonical spelling).
- **Contract fields** (`amountMinor` in API payloads) carry minor-unit
  integer strings — `^-?(0|[1-9][0-9]*)$`, no decimals, no `+`, no leading
  zeros, no `-0` — with the same length and cap rules.
- Length guard: input longer than 20 characters is rejected before parsing.
- No grouping separators, `+`, internal whitespace, scientific notation,
  currency symbols/codes, or non-ASCII digits at the API layer. The web form
  normalizes Bangla digits (`০`–`৯`) to ASCII before sending; the API
  contract stays canonical ASCII.
- Stable error codes: `AMOUNT_INVALID_FORMAT`, `AMOUNT_TOO_LARGE`,
  `AMOUNT_NOT_POSITIVE`; user-facing wording comes from a UI message map.
  The money module reuses the same typed error class for its documented
  guards: `UNSUPPORTED_CURRENCY` (currency outside the registry),
  `TRANSFER_ACCOUNTS_MUST_DIFFER`, `PERCENT_INVALID_DENOMINATOR`, and
  `UNSUPPORTED_TRANSACTION_TYPE` (defensive guard for values that bypass
  TypeScript).

Required table-driven tests (expected result in minor units or error code):

| Input                                                 | Result                                 |
| ----------------------------------------------------- | -------------------------------------- |
| `"0"` / `"0.00"`                                      | `0` (valid only where zero is allowed) |
| `"0.01"` / `"1"` / `"1.2"` / `"1.20"`                 | `1` / `100` / `120` / `120`            |
| `"3500.00"`                                           | `350000`                               |
| `"1000000000.00"`                                     | `100000000000` (cap boundary)          |
| `"1000000000.01"` / `"9223372036854775808"`           | `AMOUNT_TOO_LARGE`                     |
| `""` / `"   "` / `"3500 "` / `" 3500"`                | `AMOUNT_INVALID_FORMAT`                |
| `"abc"` / `"NaN"` / `"Infinity"` / `"1e3"` / `"0x10"` | `AMOUNT_INVALID_FORMAT`                |
| `"1,000"` / `"3 500"` / `"৳3500"` / `"BDT 3500"`      | `AMOUNT_INVALID_FORMAT`                |
| `"-100"` / `"+100"` (unsigned fields)                 | `AMOUNT_INVALID_FORMAT`                |
| `"-0"` / `"-0.00"` (signed opening balance)           | `AMOUNT_INVALID_FORMAT`                |
| `".5"` / `"5."` / `"1..2"` / `"00.50"` / `"0001"`     | `AMOUNT_INVALID_FORMAT`                |
| `"1.234"`                                             | `AMOUNT_INVALID_FORMAT` (no rounding)  |
| `"৩৫০০"` / `"٣٥٠"` (at the API layer)                 | `AMOUNT_INVALID_FORMAT`                |
| 21+ character digit string                            | `AMOUNT_INVALID_FORMAT` (length guard) |
| `"0"` as a transaction amount                         | `AMOUNT_NOT_POSITIVE`                  |
| `"-50.25"` (signed opening balance only)              | `-5025`                                |

### 11.3 Transfer effects (explicit)

- Effect formula for account `X` on a `TRANSFER` row: `−amountMinor` when
  `X = fromAccountId`, `+amountMinor` when `X = toAccountId`, `0` otherwise
  (`from ≠ to` guarantees exactly one match).
- **The total tracked balance is unchanged by a transfer** — invariant test:
  sum of all account balances before equals after.
- One row means both sides always change atomically; edits and deletes
  adjust both accounts together; no orphaned leg can exist.
- Creation requires both accounts owned by the user, `ACTIVE`, equal
  currency, and distinct (§3 rule 6). On edit, unchanged sides may already
  be archived; any account newly involved in the edit must be `ACTIVE`
  (§3 rule 8).
- Excluded from income/expense totals, budgets, and category reports; shown
  in recent activity labelled as a transfer; appears in both accounts'
  histories. Worked example: §8 record #5.

### 11.4 Adjustment semantics (explicit)

- API input: unsigned `amountMinor` plus
  `direction: "INCREASE" | "DECREASE"`; stored as `adjustmentSign: 1 | −1`;
  the signed effect is `adjustmentSign × amountMinor`. Stored amounts remain
  positive everywhere.
- The `note` (1–500 characters after trim) is required and explains why the
  balance changed; adjustments have no category.
- Adjustments affect the account balance only — never income, expense,
  budgets, or goal progress.
- Opening-balance corrections: `openingBalanceMinor` is editable only while
  the account has zero transactions of any type (including adjustments);
  afterward the API returns `OPENING_BALANCE_FROZEN` and the UI offers
  "Adjust balance" instead. Worked example: §8 record #6.
- **Negative derived balances are allowed** for every type (late data entry
  can make a balance negative). The product displays them truthfully and
  does not model overdrafts or block entries based on available balance in
  MVP.

### 11.5 Occurrence semantics and future-date validation

- API input is a local calendar date (`occurredDate`, `YYYY-MM-DD`) plus an
  optional local time (`occurredTime`, `HH:mm`). The server resolves them in
  the user's IANA timezone — clients never perform timezone math.
- **Date-only entries** are canonicalized to **12:00 local (noon)**, which
  keeps the calendar date stable across realistic timezone-preference
  changes, and are validated by local date:
  `occurredDate ≤ today in the user's timezone`. A date-only "today" entry
  is accepted even when its canonical noon lies later than the current time;
  the occurrence is date-granular, not instant-granular.
- **Time-bearing entries** are validated as instants:
  `occurredAt ≤ now + 5 minutes` (clock-skew tolerance). Same-day future
  times are rejected — planned entries belong to V1 recurring/planned
  features, not to actuals.
- Sanity floor: the resolved instant must be on/after 1970-01-01 UTC.
- DST behavior for the converter: nonexistent local times (spring-forward
  gap) shift forward by the gap; ambiguous times (fall-back overlap) use the
  earlier offset. Tested against a DST-observing fixture
  (`America/New_York`), even though `Asia/Dhaka` has no DST today.
- Known MVP limitation: if the user later moves their timezone preference
  far west (roughly 12+ hours), a date-only entry can display one calendar
  day earlier. Storing a second "local date at entry" column is deliberately
  deferred until user research justifies it.
- Boundary tests: date-only today/tomorrow; `now + 5 min` accepted vs
  `now + 6 min` rejected; local-midnight crossings; month/year and leap-day
  boundaries; all worked-example cases in `Asia/Dhaka` (+06:00).
- Implementation note: resolving an IANA local date-time to UTC needs a
  converter; the choice (Node `Intl`-based helper vs one small date library)
  is made in the task that implements occurrence validation (IT-6) with a
  dependency review (AGENTS.md). It does not block IT-1.

### 11.6 Refund rule: confirmed future effects

The §1.1 rule is unchanged; these effects must be reflected when refunds are
implemented (see also the §1.1 clarification):

- **Budgets:** a refund reduces `Budget spent` in the refund's own period,
  attributed to the original expense's category; total-budget spending nets
  the same way. Budgets are never retroactively restated.
- **Categories:** category reports show the refund as a negative
  contribution to the original category in the refund's period; net
  negatives display as an explicit "net refund" state, never clamped or
  hidden.
- **Reporting periods:** period `P` totals reflect only refunds occurring in
  `P`; the original expense's period is not restated.
- **Accounts:** `+amount` to the credited account in the refund's period.
- **Double-counting checklist (test matrix):** account `+`, expense `−`,
  budget `−`, category `−`, income `0`, goal progress `0`, transfer `0`.
- **Integrity guards:** refunds cannot exceed the original expense's
  remaining refundable amount; the original expense cannot be deleted while
  refunds exist, nor edited below the refunded sum (§1.1).
