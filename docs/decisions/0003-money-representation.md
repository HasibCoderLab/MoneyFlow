# ADR-0003: Money representation — integer minor units

**Status:** Accepted (2026-10-16) — approved after the clarification round; clarifications retained below  
**Date:** 2026-10-16

## Context

`requirements.md` §9.3 requires one documented, decimal-safe money strategy
before transaction code is written. The candidate strategies are PostgreSQL
`NUMERIC` with a decimal library, or integer minor units with an explicit
currency precision. BDT is the initial currency (2 minor digits: poisha), but
future currencies may have different precision — the decision must not
hard-code "everything has 2 decimals". JavaScript binary floating point must
never be the authoritative representation (§5.4, §9.3).

The dashboard preview currently formats pre-formatted strings and performs no
arithmetic (`apps/web/src/lib/format.ts`); real amounts will arrive from the
API as part of the implementation phase.

## Decision (proposed)

1. **Store every monetary amount as an integer in minor units** in a
   PostgreSQL `BIGINT` column (`amountMinor`, `openingBalanceMinor`,
   `targetMinor`, `limitMinor`, …). No `NUMERIC`/`Decimal` money columns, no
   floats.
2. **Store the currency code explicitly** (ISO 4217) on every money-bearing
   record. A small server-side currency registry defines the minor-unit
   exponent per currency (`BDT → 2`). MVP accepts only currencies present in
   the registry, which initially contains **BDT only**.
3. **API contracts transport money as minor-unit integer strings**
   (`"amountMinor": "350000"`, `"currency": "BDT"`). The JSON `number` type
   is never used for money: it is a binary float, and `BigInt` cannot be
   serialized directly. User-entered amounts (`"3,500.00"`) are parsed to
   minor units at the API boundary with strict validation (reject more
   fractional digits than the currency allows instead of silently rounding;
   reject zero/negative amounts where the rule says so).
4. **All money arithmetic happens in the API domain layer** on integers:
   balances, totals, budget consumption, goal progress. Percentages are
   computed from minor units with integer math and rounded half-up **only for
   display**, never as input to further calculations.
5. **The web app never does money arithmetic.** It converts minor units to a
   display value only for `Intl.NumberFormat` (`bn-BD`/`en-BD`,
   `currency: "BDT"`), using the currency exponent; this display conversion is
   the only place a JavaScript `number` may touch money, and it never feeds a
   calculation or a write.

## Consequences

- No decimal arithmetic library is needed in the API or the web app; sums in
  SQL (`SUM(BIGINT)`) and in TypeScript (`BigInt`/integer) are exact.
- Prisma maps `BIGINT` to JavaScript `BigInt`, which cannot be serialized by
  `JSON.stringify` directly — contracts therefore use strings, and a single
  boundary mapper converts between `BigInt` and contract strings. This is
  enforced by tests, including a `JSON.stringify` regression test on money
  DTOs.
- Future multi-currency support is additive: add exponents to the registry
  and keep per-currency grouping instead of cross-currency sums (conversion
  remains a later, separately decided feature).
- Division-based features (splitting a transaction across categories) are not
  in MVP; if added, a documented remainder-allocation rule is required first.
- Display percentages (budget utilization, goal progress) use documented
  rounding (half-up to one decimal); the exact values are always computed
  from minor units.

## Clarifications (2026-10-16)

Added after the product owner approved the core direction in principle and
requested implementation details before IT-1. The decision above is
unchanged; full text lives in
[`accounting-rules.md`](../architecture/accounting-rules.md) §11.

- **BIGINT range:** stored amounts are capped by service validation
  (10^11 minor units = ৳1,000,000,000) while the column itself supports
  ±2^63−1; no computed money is ever written, so there is no
  computed-overflow path. Aggregates are computed by PostgreSQL `SUM(BIGINT)`
  (returns exact `numeric`) and mapped to `BigInt`/strings — never to
  JavaScript `number` (see §11.1).
- **Strict parsing:** one canonical grammar (no separators, symbols, signs,
  scientific notation, non-ASCII digits, or excessive precision); negative
  opening balances use a dedicated signed variant. The malformed-input
  matrix is `accounting-rules.md` §11.2.
- **Safe conversion and display:** contract serialization is
  `BigInt → .toString()`; the web formatter formats the integer part with
  `Intl.NumberFormat` using BigInt input and appends exponent-aware fraction
  digits, so no `number` touches money even for extremely large values
  (§11.1). If a `number` is ever used it must stay within
  `Number.MAX_SAFE_INTEGER` and be display-only.
