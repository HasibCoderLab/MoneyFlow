# ADR-0009: UI language toggle — Bangla/English labels

**Status:** Superseded by ADR-0012 for the switcher interaction and UI
coverage; the default locale still awaits DR-08/DR-11 sign-off
**Date:** 2026-10-17

## Context

`requirements.md` §7.4 requires that "For Bangladeshi users, support Bangla
and English labels where appropriate", and §5.2 lists the preferred locale as
a user preference that is stored per account and reconciled with the saved
profile. There is no signed-in user in the current preview, so no
server-side preference exists yet. The launch-geography decision (DR-08) and
the locale/week-start defaults (DR-11) remain Proposed — this ADR does not
resolve either.

## Decision

1. **Two UI languages now: English (default) and Bangla.** The dictionary in
   `apps/web/src/lib/i18n/translations.ts` covers the shared chrome (app
   shell, landing navigation, footer), the auth shells, and the dashboard
   headings. Only strings whose Bangla text has been reviewed get keys; `bn`
   is typed against the English key set, so a missing or extra key fails
   `tsc`.
2. **The choice is a browser-local display preference** (localStorage key
   `mf-locale`, applied by a client provider in the root layout). It is
   display-only: it contains no financial or personal data and is treated
   like the existing theme preference. When authentication lands, the
   preference moves to the signed-in user's profile (§5.2) and the local
   value reconciles with it.
3. **Money is untouched by the locale switch.** The toggle changes labels
   and `<html lang>` only. Currency amounts keep flowing through the
   deterministic `formatBdt` layer (ADR-0003); Bangla digit formatting
   (`৳৩,৫০০` per §7.4) is a formatting-layer decision that is deliberately
   deferred until the format preference (DR-11-adjacent) is settled — no
   half-localised numbers are produced here.
4. **English strings during transition:** pages and data strings not in the
   dictionary (mock-data labels, legal pages, forms deeper than the shells)
   render English until they are localised. This is a stated limitation, not
   silent partial coverage.

## Consequences

- `useLocale` resolves to English outside the provider instead of throwing,
  so page-level tests and isolated renders cannot crash on a missing
  provider.
- Untranslated strings stay in English in both modes until added to the
  dictionary with reviewed Bangla text.
- The default locale (English until the user picks Bangla) must be revisited
  together with DR-08/DR-11; if the owner later decides the launch default,
  only `DEFAULT_LOCALE` and the pre-paint behavior change.
- Server-side persistence of the preference is additive (UserPreference
  table already models `locale`, §12).
