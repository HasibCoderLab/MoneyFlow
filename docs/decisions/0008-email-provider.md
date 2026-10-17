# ADR-0008: Transactional email provider

**Status:** Proposed (awaiting product-owner approval)  
**Date:** 2026-10-16

## Context

`requirements.md` §18.10 keeps the email/notification provider open. Email is
not needed for the financial domain itself, but email verification, password
recovery (deferred, but gated for public launch — ADR-0006), and later
notification features need a transactional provider and a verified sending
domain.

## Decision (proposed)

1. **Provider: Resend** for transactional email (auth verification, password
   recovery, later opt-in notifications). Reasons: API + SMTP, strong
   developer experience, free tier sufficient for MVP volumes, simple
   TypeScript integration, and no requirement for a full marketing suite.
   Alternatives if the owner prefers: Amazon SES (cheapest at scale, most
   setup), Postmark (deliverability-focused, paid), Brevo (EU-based, free
   tier).
2. **Usage scope:** transactional messages only; no marketing email without
   explicit opt-in and a separate decision. Messages must not contain
   sensitive financial details by default (`requirements.md` §5.12).
3. **Configuration:** `EMAIL_API_KEY` plus a verified `EMAIL_FROM`
   (subdomain such as `mail.<domain>` with SPF/DKIM). Placeholders only in
   `.env.example`; real values via deployment secrets.
4. **Timing:** the provider is wired when email verification/password
   recovery is implemented (Phase D). Until then, this decision is
   **non-blocking** for the financial domain and MVP core tasks.
5. **Owner actions required:** create the provider account, choose/confirm the
   sending domain, and complete domain verification. These depend on the
   product-name/domain decision (DR-09), so a temporary provider-owned test
   sender is used in development only.

## Consequences

- A dependency choice lands in `apps/api` only when the email task starts;
  no email code or environment keys are added in Phase 1.
- Handling provider failures gracefully (retry/timeout policy) becomes part
  of the auth notification task, not of this decision.
- If the owner selects a different provider, the integration surface is
  small (one mailer service behind an interface), so switching cost stays
  low; the architecture doc records the interface expectation.
