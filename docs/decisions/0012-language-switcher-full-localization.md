# ADR-0012: Language switcher and complete UI localization

**Status:** Accepted
**Date:** 2026-10-31

## Context

ADR-0009 introduced a two-language dictionary (English/Bangla) and a
browser-local `mf-locale` preference, but deliberately limited coverage to
shared chrome and a handful of screens. Everything else stayed English in
both modes, and the original language control was a simple toggle.

Since then the persisted locale preference landed (`UserPreference.locale`
via `PATCH /api/v1/preferences`), every user-facing screen was wired to the
dictionary, and the control became a compact dropdown. The earlier ADR no
longer describes the shipped behaviour accurately.

## Decision

1. **The switcher is an accessible dropdown, not a toggle.** The trigger
   shows the current language; the menu lists English and বাংলা under their
   native names with `menuitemradio`/`aria-checked`. Arrow keys, Home/End,
   Escape, outside click, and Tab follow the expected menu behaviour, and a
   polite live region announces the change in the newly selected language.
2. **Switching is client state, not navigation.** The current path and query
   are preserved, no redirect surface exists, and `<html lang>` updates with
   the interface so screen readers change pronunciation. A pre-paint inline
   script applies a valid stored locale before first render; invalid or
   missing values fall back to English.
3. **The preference persists per account when signed in.** The provider
   writes `mf-locale` for guests and reconciles it with the server locale for
   authenticated users; changes send `PATCH /api/v1/preferences` and never
   trust a browser-supplied user id.
4. **All user-facing web surfaces are covered.** Marketing and auth pages,
   app chrome, dashboard, accounts, transactions, reports, categories,
   budgets, goals, settings, and their loading, signed-out, empty, and error
   states use the dictionary. `en` remains the source of truth and `bn` is
   typed as `Record<TranslationKey, string>`, so missing keys fail `tsc`.
   Metadata titles/descriptions and brand names remain English by design.
5. **Labels only; money stays deterministic.** Switching language never
   converts, recalculates, or reformats stored amounts. Currency and number
   formatting continue to follow the existing preferences and the
   deterministic money layer (ADR-0003, ADR-0010).
6. **English remains the default** until the product owner resolves the
   launch-locale decisions (DR-08/DR-11); this ADR does not settle them.

## Consequences

- ADR-0009 is superseded for the switcher interaction and coverage; its
  money and persistence principles carry forward unchanged.
- New UI strings require both dictionaries; the key-parity and placeholder
  tests fail if they are not kept in sync. Human-reviewed Bangla remains a
  review requirement.
- Metadata localization is a separate concern and is not promised here.
- Guests keep their language choice in the browser only; signing in replaces
  it with the account value. Clearing cookies/local storage falls back to
  English.
