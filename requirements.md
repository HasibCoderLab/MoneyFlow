# Personal Finance SaaS --- Product Requirements & AI Engineering Guide

**Document type:** Product Requirements Document (PRD) + MVP/V1 Scope +
Technical Architecture + AI-Agent Implementation Rules\
**Status:** Initial specification for implementation and validation\
**Version:** 1.0.0\
**Product name:** Working title --- Personal Finance SaaS (final brand
name not yet selected)\
**Parent brand:** PaathAI (separate sub-product; do not mix with the
PaathAI education platform)\
**Primary audience:** Students, beginner savers, and young earners who
want a simple, trustworthy way to understand and manage their money\
**Initial locale:** Bangladesh; BDT (৳) first, with internationalization
designed so other currencies can be added later\
**Primary stack:** Next.js + TypeScript, NestJS + TypeScript,
PostgreSQL, Prisma, pnpm monorepo\
**Document owner:** Product owner\
**Important:** This is a proposed product specification, not evidence
that the business idea has been validated. Validate assumptions with
real target users before expanding scope.

------------------------------------------------------------------------

## 0. How to Use This Document

This file is the primary product and engineering reference for human
developers and AI coding agents. Read it before planning, coding,
changing architecture, or adding features.

When this document conflicts with an explicit, newer decision recorded
in `docs/decisions/`, follow the accepted decision record and update
this file. Never silently ignore a requirement. If a requirement is
ambiguous, document the ambiguity and ask for a decision rather than
inventing product behavior.

AI agents must not assume that a feature is complete because a page,
mockup, button, or type exists. A feature is complete only when its user
flow, data persistence, validation, authorization, error states, tests,
and documentation are implemented as applicable.

## 1. Agent Role, Context, and Mission

### 1.1 Role

Act as a senior product engineer, staff-level full-stack developer,
software architect, security-conscious financial-software engineer,
UX-minded product designer, QA engineer, and technical writer. Work
collaboratively and incrementally. Prefer correctness, simplicity,
maintainability, accessibility, and user trust over novelty.

### 1.2 Product context

Build an AI-first personal finance companion that helps people
understand their money, build better saving habits, plan spending, and
work toward financial goals.

**Core promise:** "Know your money. Build better habits. Reach your
goals."

The product is a standalone Personal Finance SaaS under the PaathAI
umbrella. It is NOT part of the PaathAI education application. Do not
add board questions, student learning rooms, chemistry features,
education dashboards, or unrelated PaathAI functionality.

### 1.3 Mission

Help users answer these questions quickly and accurately: - How much
money do I currently have across my tracked accounts? - How much did I
earn and spend today, this week, and this month? - Where is my money
going? - How much have I saved toward each goal? - Am I on track to
reach a goal by a chosen date? - How much could I safely plan to save,
based on the information I entered? - What practical next step could
improve my money habits?

### 1.4 Product principles

1.  **Trust before cleverness:** financial totals must be deterministic
    and testable; never let an LLM invent balances or perform accounting
    arithmetic.
2.  **User control:** users choose their categories, goals, dashboard
    layout, and preferences.
3.  **Clear by default:** a new user should understand the main
    dashboard without setup expertise.
4.  **Progressive complexity:** start with essential workflows; reveal
    advanced options when needed.
5.  **No shame:** present spending and saving insights neutrally,
    without guilt, fear, or manipulative streak mechanics.
6.  **Privacy by design:** collect only necessary data; private records
    belong only to their owner.
7.  **Accessible and responsive:** usable on mobile, tablet, and
    desktop, with keyboard and screen-reader support.
8.  **Honest AI:** distinguish recorded facts, calculations, estimates,
    and AI-generated suggestions.
9.  **No dark patterns:** no fake urgency, misleading balances, hidden
    fees, or deceptive subscription flows.
10. **Build for validation:** measure whether the product solves a real
    problem before building speculative advanced features.

------------------------------------------------------------------------

## 2. Target Users and Jobs to Be Done

### 2.1 Initial target segments

**Primary segment --- students and beginner savers** - Receive pocket
money, allowance, gifts, or occasional income. - Want to save for a
laptop, phone, course, exam, or other personal goal. - Need simple daily
logging and a visible progress bar. - May have little experience with
budgeting or financial terminology.

**Secondary segment --- young earners** - Have a salary or irregular
income. - Want to track expenses, create a budget, and build an
emergency fund. - Need a monthly overview and a practical savings plan.

**Not an initial target** - Professional accountants, businesses,
investment traders, tax filers, or users expecting automatic bank
integrations. - Users who need regulated investment, credit, tax, or
financial-advisory services.

### 2.2 Core problems and product responses

  -----------------------------------------------------------------------
  User problem            Product response        Success signal
  ----------------------- ----------------------- -----------------------
  "I don't know how much  Savings goals,          User can identify saved
  I saved."               contributions, and      and remaining amounts
                          progress                

  "I forget small         Fast transaction entry  User can record a
  expenses."              and recent activity     transaction quickly

  "I don't know where     Categories and          User can identify top
  money goes."            period-based reports    spending categories

  "I can't stick to a     Goal milestones,        Users revisit goals and
  savings goal."          reminders, and plan     make progress
                          suggestions             

  "I don't know what I    Budget planner based on User receives
  can save."              entered income and      transparent,
                          expenses                understandable
                                                  calculations

  "I need an emergency    Dedicated               User can set a target
  fund."                  emergency-fund goal     and track progress
                          template                

  "My financial situation Editable targets,       User can adjust plans
  changes."               budgets, and periods    without losing history

  "Every finance app      Custom dashboard and    User can hide/reorder
  feels cluttered."       progressive disclosure  widgets and keep a
                                                  useful view

  "I do not understand    Plain-language          Users can explain the
  finance terminology."   explanations and        meaning of key numbers
                          optional AI assistant   

  "I worry about losing   Persistent database,    User can access and
  my records."            export, and documented  export their data
                          deletion                
  -----------------------------------------------------------------------

### 2.3 Product assumptions to validate

These are hypotheses, not facts: - Users prefer manual entry initially
if it is fast and understandable. - Students and beginner savers value
goals and progress more than advanced financial analytics. - Dashboard
customization is useful after the default dashboard is clear. - AI
explanations improve understanding, but do not replace accurate
calculations. - BDT-first design is appropriate for the initial launch.

Validate these through interviews, usability tests, and a small beta
before investing in complex integrations.

------------------------------------------------------------------------

## 3. Product Scope and Release Strategy

Use three clear scope levels: **MVP**, **V1**, and **Later / Out of
Scope**. Do not build every idea in the first release.

### 3.1 MVP --- prove the core value

The MVP must enable one user to securely record money movements,
understand a basic financial summary, set savings goals, and customize a
useful dashboard.

**MVP features** 1. Sign up, sign in, sign out, and secure session
handling. 2. Basic profile and preferences. 3. Accounts/wallets with
opening balances and currency. 4. Income, expense, and transfer
transactions. 5. User-owned transaction categories. 6. Daily, weekly,
and monthly summaries. 7. Savings goals, including an emergency-fund
template. 8. Goal contributions and progress. 9. Basic budgets by
period/category. 10. Dashboard widgets with show/hide/reorder and
persisted layout. 11. Light/dark/system theme and currency/date
preferences. 12. Search, filter, pagination, and transaction
edit/delete. 13. Clear empty, loading, success, and error states. 14.
Data export in CSV for transactions. 15. Account deletion/data deletion
workflow, with clear confirmation. 16. Responsive mobile-first
interface. 17. Automated tests for financial calculations, permissions,
and key workflows. 18. Basic operational logging, error monitoring,
database backup plan, and deployment documentation.

**MVP does not require** - AI chat, unless core financial records and
calculation tests are already reliable. - Bank/mobile-wallet
integrations. - Payment processing or paid subscriptions. - Investments,
tax advice, credit scoring, lending, or stock/crypto tracking. - Shared
household accounts. - Multi-currency conversion or exchange-rate
automation. - Microservices, Kubernetes, Kafka, or complex event-driven
architecture.

### 3.2 V1 --- make the product genuinely useful and personalized

V1 follows after MVP usability and data correctness have been validated.

**V1 features** 1. AI Money Assistant grounded in the user's recorded
data. 2. Smart insights based on deterministic calculations and explicit
rules. 3. Goal deadline planning and daily/weekly/monthly suggested
contributions. 4. Recurring income and expense rules. 5. Budget alerts
and configurable notifications. 6. More advanced reports and trend
comparisons. 7. More complete customization: widget order, visibility,
widget size where appropriate, saved layouts, and custom categories. 8.
User-defined goals, tags, notes, and optional custom fields. 9. Data
export improvements and clear account deletion completion. 10. AI usage
limits, cost monitoring, safety handling, and feedback controls. 11.
Better onboarding and sample/demo data that is clearly labelled. 12.
Accessibility review and performance tuning based on measurements. 13.
Optional subscription/billing only after pricing and willingness-to-pay
have been validated.

### 3.3 Later / research-only ideas

Only consider after user research and a clear business case: -
Bank/open-banking connections where legally and technically supported. -
Mobile-wallet imports or integrations. - Shared household/family
finances. - Multiple currencies and exchange-rate histories. - Receipt
OCR and automatic transaction extraction. - Financial document
parsing. - More sophisticated forecasting. - Native mobile
applications. - Financial coaching marketplace or partner integrations.

### 3.4 Release gate

Do not label MVP or V1 "production-ready" until the acceptance criteria
in Section 17 are met. A deployed URL alone does not mean the product is
production-ready.

------------------------------------------------------------------------

## 4. Information Architecture and Pages

### 4.1 Public pages

-   `/` --- landing page, product value, features, privacy/security
    summary, clear call to action.
-   `/features` --- core capabilities.
-   `/pricing` --- only when pricing is decided; do not invent plans or
    prices.
-   `/about` --- product purpose and team information, only if accurate.
-   `/contact` --- valid support/contact method.
-   `/privacy` --- privacy policy reviewed for the actual data and
    operations.
-   `/terms` --- terms reviewed for the actual product and jurisdiction.

Do not publish fake testimonials, fake user counts, fake security
certifications, or unverified claims.

### 4.2 Auth pages

-   `/sign-up`
-   `/sign-in`
-   `/forgot-password`
-   `/reset-password`
-   `/verify-email` if email verification is implemented
-   `/onboarding`

Use generic authentication errors where appropriate to reduce account
enumeration. Follow the chosen auth provider's documented flows.

### 4.3 Authenticated application pages

-   `/app/dashboard`
-   `/app/transactions`
-   `/app/transactions/new`
-   `/app/accounts`
-   `/app/categories`
-   `/app/budgets`
-   `/app/goals`
-   `/app/goals/[goalId]`
-   `/app/reports`
-   `/app/assistant` (V1)
-   `/app/recurring` (V1)
-   `/app/notifications` (V1, if notifications exist)
-   `/app/customize`
-   `/app/settings/profile`
-   `/app/settings/preferences`
-   `/app/settings/security`
-   `/app/settings/data`

Route names may be refined, but keep navigation predictable and URLs
stable.

### 4.4 Optional admin routes

Only build an admin interface if there is a real operational need. Admin
access must be role-protected and must not grant broad access to private
financial details by default.

------------------------------------------------------------------------

## 5. Core Functional Requirements

### 5.1 Authentication and account lifecycle

-   Users can create an account, sign in, sign out, and recover access
    through a secure flow.
-   Sessions must be revocable and expire according to documented
    policy.
-   Passwords, if managed directly, must be hashed with a current,
    well-reviewed password hashing algorithm through a reputable
    library; never store plaintext passwords.
-   Prefer a reputable authentication provider or established session
    implementation over custom cryptography.
-   Cookies, if used for sessions, must use appropriate `HttpOnly`,
    `Secure` in production, and `SameSite` settings.
-   Authentication and authorization must be enforced by the backend,
    not only by hiding frontend routes.
-   Users can view relevant sessions/security information if supported
    and delete their account through a clearly explained flow.
-   Sensitive actions require appropriate re-authentication or
    confirmation.
-   Avoid logging passwords, session tokens, API keys, or sensitive
    financial details.

### 5.2 Profile and preferences

Each user can manage: - Display name and optional avatar. - Preferred
locale and timezone. - Preferred currency (MVP may support BDT only in
the UI, but store currency explicitly). - Date format and week-start
preference. - Theme: light, dark, system. - Number formatting and
optional reduced motion. - Notification preferences when notifications
are implemented.

Preferences must be validated and saved server-side when authenticated.
UI-only preferences may be cached locally but must reconcile with the
saved profile.

### 5.3 Accounts and wallets

A user can create, rename, archive, and view their own accounts/wallets,
for example: - Cash - Bank account - Mobile wallet - Savings account -
Custom account type

Fields should include: - ID - Owner user ID - Name - Account type -
Currency - Opening balance - Status (active/archived) - Created and
updated timestamps

Rules: - Accounts are scoped to their owner. - Do not let users set a
balance by directly editing a computed current balance without a
documented adjustment transaction. - Archiving must not silently erase
historical records. - Define how opening balances, balance adjustments,
and historical transactions interact. - MVP may use one currency per
account and restrict cross-currency transfers until conversion rules
exist.

### 5.4 Transactions

Supported types: - `INCOME` - `EXPENSE` - `TRANSFER`

Required fields: - ID - Owner/user ID - Type - Amount - Currency or
account-derived currency - Date/time of occurrence - Account ID for
income/expense - Source and destination account IDs for transfer -
Category where applicable - Optional description/note - Optional tags -
Created/updated timestamps - Optional recurring-rule reference

User actions: - Create, view, edit, delete, search, filter, sort, and
paginate transactions. - Filter by date range, type, account, category,
and amount. - See validation messages and clear confirmation for
destructive actions. - Export filtered or all permitted transaction
records as CSV.

Financial invariants: - Amount must be strictly greater than zero for a
new transaction. Represent direction through transaction type, not
negative input. - Use decimal-safe arithmetic. Do not use JavaScript
binary floating-point arithmetic as the source of truth for currency
calculations. - A transfer reduces one account and increases another by
the same amount, with no income/expense impact. - Goal contributions are
allocations or linked records, not new income. - Editing/deleting a
transaction must update derived balances and reports consistently. -
Define behavior for transactions dated in the future; do not silently
treat planned transactions as completed actual transactions. - Use
database transactions for multi-record changes. - Protect against
duplicate submissions where retry behavior could create duplicate
records; use idempotency keys where appropriate. - Store timestamps
consistently and calculate reporting periods using the user's selected
timezone. - Never infer an actual transaction from AI chat text without
user confirmation.

### 5.5 Categories

-   Provide sensible default income and expense categories.
-   Users can create, rename, recolor, archive, and organize their own
    categories.
-   Categories have owner scope or a clearly defined system/default
    scope.
-   Prevent deleting a category that is still referenced unless a safe
    reassignment strategy is provided.
-   Historical reports should remain understandable if a category is
    renamed or archived.
-   Do not use color alone to communicate category meaning.

### 5.6 Dashboard

The dashboard should answer at a glance: - What is my tracked balance? -
How much did I earn and spend in the selected period? - How much have I
saved toward my goals? - Am I within my budget? - What transactions
happened recently? - What is the next useful action?

MVP widgets: - Total tracked balance (with clear definition) - Income
summary - Expense summary - Savings goal progress - Budget status -
Recent transactions - Quick actions

Dashboard behavior: - Widgets can be shown/hidden and reordered in
MVP. - Layout persists per user. - Provide a useful default layout and a
one-click reset to default. - Empty states explain how to get started. -
All totals derive from the same trusted data/query layer; do not
hardcode numbers. - Clearly label the selected date range and whether
figures are actual, planned, or estimated. - Do not imply that tracked
account totals equal a user's complete real-world wealth.

### 5.7 Customization system

Customization is a core product capability, not a decorative add-on.

MVP: - Show/hide dashboard widgets. - Reorder widgets. - Choose theme. -
Set date/number preferences. - Create custom categories and financial
goals.

V1: - Resize supported widgets where responsive behavior remains
usable. - Save multiple named dashboard layouts if user research
confirms value. - Configure preferred landing page. - Configure budget
periods and notification thresholds. - Add custom tags and optional
notes/custom fields to relevant records. - Configure goal templates and
progress display.

Rules: - Persist layouts/preferences in a validated schema, not
arbitrary executable JSON. - Provide default/reset behavior and handle
removed/unsupported widgets safely. - Never allow customization to
bypass authorization or expose another user's data. - Keep critical
security and account controls accessible regardless of layout. - Do not
allow custom CSS/HTML/JavaScript injection. - Ensure the interface
remains usable on mobile even if desktop layout is highly customized.

### 5.8 Savings goals and emergency fund

Goal types may include: - General savings - Emergency fund - Education -
Device purchase - Travel - Debt payoff - Custom goal

Fields: - ID and owner - Name and type - Target amount - Current
credited amount or contribution records - Start date and optional
deadline - Priority - Status - Optional account association -
Created/updated timestamps

Features: - Create, edit, pause, complete, archive, and delete goals
according to safe rules. - Add and remove/reverse contributions with a
clear history. - Show saved amount, remaining amount, percentage, and
deadline status. - Support optional goal templates, but label suggested
targets as suggestions rather than universal financial advice. - Prevent
progress exceeding 100% from breaking the UI; define whether overfunding
is allowed and display it accurately. - If goal contributions are linked
to accounts, avoid double-counting the contribution as an expense or
income. - Make the source of a goal's current amount explicit:
contribution ledger, linked account allocation, or another documented
method. Do not mix methods silently.

### 5.9 Budgets

MVP: - Create a budget for a defined period (monthly by default). - Set
a total budget and optionally category budgets. - Show actual spending
against the relevant budget. - Display remaining amount and percentage
used. - Allow editing, pausing, or archiving a budget.

Rules: - Define whether a budget is based on expense transaction date or
another date basis; default to transaction occurrence date. - Transfers
are not expenses. - Refunds and expense reversals need a documented
treatment. - Budget period calculations must respect user timezone and
configured period. - Warn about overspending without shaming or
manipulative messaging. - Do not claim that a budget predicts the
future; distinguish actual from planned data.

### 5.10 Reports and analytics

MVP reports: - Income vs expense over a selected period. - Spending by
category. - Daily/weekly/monthly totals. - Savings goal progress. -
Budget utilization.

Requirements: - Charts must have accessible labels and a text/table
alternative where useful. - Empty datasets must render meaningful empty
states, not misleading zero trends. - Show date range, currency, and
relevant calculation basis. - Do not show false precision or unsupported
forecasts. - Report queries must be scoped to the authenticated user and
indexed based on real query patterns. - Use deterministic server-side
calculations for financial values.

### 5.11 Recurring transactions --- V1

-   Users can define recurring income or expense rules with frequency,
    start date, optional end date, account, category, and amount.
-   A recurring rule is not automatically a completed transaction until
    the defined processing rule creates/marks the actual entry.
-   Provide pause/resume and edit/cancel behavior.
-   Prevent duplicate generation on retries.
-   Clearly label future/expected transactions separately from actual
    transactions.
-   Timezone and month-end rules must be documented and tested.

### 5.12 Notifications --- V1

Potential notifications: - Budget threshold reached. - Goal milestone
reached. - Planned recurring transaction due. - User-configured
reminder.

Rules: - Notifications must be opt-in/configurable where appropriate. -
Do not expose sensitive amounts in lock-screen/email content unless the
user explicitly chooses that behavior. - Prevent notification spam. -
Respect quiet hours and timezone when implemented. - In-app
notifications are sufficient for the first notification release;
email/push may be later.

------------------------------------------------------------------------

## 6. AI Money Assistant

### 6.1 Purpose

The assistant explains the user's own recorded financial data, answers
basic budgeting questions, and suggests practical next steps. It is not
a licensed financial adviser and must not pretend to be one.

### 6.2 MVP vs V1

-   MVP: AI is optional. Ship the core financial workflows first if AI
    would delay data correctness or security.
-   V1: Add a server-side AI assistant after core calculations and
    access controls are reliable.

### 6.3 Architecture

1.  Authenticate the user.
2.  Validate the request and enforce quotas/rate limits.
3.  Fetch only the minimum necessary data for that user.
4.  Calculate financial summaries using trusted application code/SQL.
5.  Provide the model with a compact, clearly labelled context.
6.  Ask for structured output where appropriate.
7.  Validate the output against a schema.
8.  Clearly label suggestions and uncertainty.
9.  Log operational metadata without storing unnecessary sensitive
    prompts or secrets.
10. Provide an error/fallback path when the provider fails.

### 6.4 AI safety rules

-   Never let an LLM be the source of truth for balances, totals, or
    percentages.
-   Never let the model directly run arbitrary SQL or execute code.
-   Never expose API keys in frontend bundles or client-side environment
    variables.
-   Never let a prompt override server-side authorization.
-   Never execute a money-moving action from AI text. Require an
    explicit user-reviewed form and confirmation for any future action
    that changes records.
-   Do not claim guaranteed savings, investment returns, or financial
    outcomes.
-   Do not provide individualized investment, tax, legal, lending, or
    regulated financial advice as if qualified.
-   Explain when the assistant lacks enough data.
-   Distinguish recorded facts, deterministic calculations, estimates,
    and suggestions.
-   Minimize personal data sent to third-party model providers.
-   Set provider quotas, request size limits, rate limits, timeouts, and
    cost monitoring.
-   Provide a way to report a bad response.
-   Do not fabricate transactions, categories, goals, or user behavior.
-   Do not train on or reuse user financial data beyond the explicitly
    disclosed policy and provider terms.

### 6.5 Example assistant behavior

Good: "Based on the transactions you recorded for October, your expenses
total ৳X. This excludes any cash spending you did not enter."

Bad: "You definitely spent ৳X in real life" when the user only tracks
some transactions.

Good: "If you want to reach your ৳Y goal in Z days, the simple
arithmetic target is about ৳N per day. This assumes no withdrawals or
changes to your target."

Bad: "You will definitely reach your goal" or "You should invest in this
product."

------------------------------------------------------------------------

## 7. UX, Visual Design, and Brand System

### 7.1 Brand relationship

This product is a separate Personal Finance SaaS under the PaathAI
umbrella. It may reuse the broader brand palette, but it must not look
like the education dashboard or mix education-specific labels and
features into the finance app.

### 7.2 Proposed design tokens

These are proposed UI tokens inspired by the provided PaathAI palette,
not verified exact pixel samples from the logo.

-   Primary blue: `#2563EB`
-   Brand purple / AI accent: `#7C3AED`
-   Cyan accent: `#06B6D4`
-   Warm accent: `#F59E0B`
-   Light surface: `#F8FAFC`
-   Main dark text: `#0F172A`

Usage: - Blue for primary actions, active navigation, and links. -
Purple for AI-related UI and selected highlights. - Cyan for secondary
highlights. - Orange/yellow for limited emphasis or caution, not every
component. - Neutral surfaces for cards and tables. - Semantic success,
warning, and danger colors must be distinguishable and accessible; do
not rely on color alone.

### 7.3 Visual principles

-   Clean, calm, trustworthy, modern, and readable.
-   Use a consistent spacing scale, typography scale, radii, borders,
    and shadows.
-   Prioritize clear numbers, labels, date ranges, and currency.
-   Avoid excessive gradients, glassmorphism, animation, and rainbow
    colors in the core finance UI.
-   Use charts only when they answer a real question.
-   Make the add-transaction action easy to find.
-   Use responsive navigation and touch-friendly controls.
-   Support keyboard navigation, visible focus, contrast requirements,
    semantic landmarks, form labels, and accessible chart summaries.
-   Use skeletons only where loading is genuinely asynchronous.
-   Never use color alone to indicate whether a transaction is income or
    expense; include labels/icons/signs.

### 7.4 Content tone

Use plain, respectful language. Avoid shame, judgment, fear, or
exaggerated claims. For Bangladeshi users, support Bangla and English
labels where appropriate, with BDT formatting such as `৳৩,৫০০` in Bangla
UI and `BDT 3,500` where an English locale is selected. Ensure the font
supports Bangla correctly.

------------------------------------------------------------------------

## 8. Technical Architecture

### 8.1 Architecture style

Start with a **modular monolith**: - One Next.js web app. - One NestJS
API. - One PostgreSQL database. - Optional Redis/worker added only when
background processing or measured caching needs justify it.

Do not start with microservices, Kubernetes, Kafka, or a distributed
system without a concrete requirement.

### 8.2 Monorepo proposal

``` text
personal-finance-saas/
├── apps/
│   ├── web/                 # Next.js App Router
│   └── api/                 # NestJS REST API
├── packages/
│   ├── contracts/           # Shared API schemas/types where appropriate
│   ├── config/              # Shared TypeScript/lint configuration
│   └── test-utils/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── product/
│   └── runbooks/
├── infrastructure/
│   └── docker/
├── .github/workflows/
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

Do not create a shared package merely to share trivial code. Avoid
coupling frontend and backend through shared database models. API
contracts should describe public request/response shapes, not expose ORM
entities.

### 8.3 Frontend structure

Suggested structure:

``` text
apps/web/src/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   └── (app)/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── dashboard/
│   ├── transactions/
│   ├── accounts/
│   ├── categories/
│   ├── budgets/
│   ├── goals/
│   ├── reports/
│   ├── customization/
│   ├── assistant/
│   └── settings/
├── lib/
│   ├── api-client/
│   ├── formatters/
│   └── validation/
├── hooks/
└── types/
```

### 8.4 Backend structure

Suggested structure:

``` text
apps/api/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── decorators/
│   └── validation/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── budgets/
│   ├── goals/
│   ├── dashboard/
│   ├── reports/
│   ├── preferences/
│   ├── notifications/
│   ├── ai-assistant/
│   └── audit/
└── prisma/
```

Module boundaries must reflect domain responsibilities. Keep controllers
thin, put business rules in services/domain logic, and isolate database
operations. Avoid one giant service and avoid overengineering every
module with unnecessary abstractions.

### 8.5 API conventions

-   Base path: `/api/v1`.
-   Use RESTful resource naming.
-   Validate all incoming data at the API boundary.
-   Return consistent errors with a safe message and a trace/request ID.
-   Use pagination for potentially large lists.
-   Use stable sorting with a tie-breaker.
-   Use ISO 8601 timestamps and document timezone behavior.
-   Use decimal-safe amount representations in API contracts; never
    silently round monetary values.
-   Use OpenAPI/Swagger to document routes and DTOs.
-   Apply rate limits to authentication, exports, and AI endpoints.
-   Use idempotency support for operations where retries could create
    duplicates.
-   Do not expose stack traces, SQL details, internal tokens, or secrets
    in production responses.

### 8.6 Initial API endpoint proposal

Authentication: - `POST /api/v1/auth/sign-up` -
`POST /api/v1/auth/sign-in` - `POST /api/v1/auth/sign-out` -
`POST /api/v1/auth/forgot-password` -
`POST /api/v1/auth/reset-password` - `GET /api/v1/me` -
`PATCH /api/v1/me` - `DELETE /api/v1/me` (with explicit confirmation and
documented deletion behavior)

Accounts: - `GET /api/v1/accounts` - `POST /api/v1/accounts` -
`GET /api/v1/accounts/:id` - `PATCH /api/v1/accounts/:id` -
`POST /api/v1/accounts/:id/archive`

Transactions: - `GET /api/v1/transactions` -
`POST /api/v1/transactions` - `GET /api/v1/transactions/:id` -
`PATCH /api/v1/transactions/:id` - `DELETE /api/v1/transactions/:id` -
`GET /api/v1/transactions/export`

Categories: - `GET /api/v1/categories` - `POST /api/v1/categories` -
`PATCH /api/v1/categories/:id` - `DELETE /api/v1/categories/:id` only
when safe deletion/reassignment is defined

Budgets: - `GET /api/v1/budgets` - `POST /api/v1/budgets` -
`PATCH /api/v1/budgets/:id` - `DELETE /api/v1/budgets/:id` or archive,
according to the retention rules

Goals: - `GET /api/v1/goals` - `POST /api/v1/goals` -
`GET /api/v1/goals/:id` - `PATCH /api/v1/goals/:id` -
`POST /api/v1/goals/:id/contributions` -
`GET /api/v1/goals/:id/contributions` - A reversal endpoint/action if
contribution reversal is supported

Dashboard & reports: - `GET /api/v1/dashboard` -
`GET /api/v1/dashboard/layout` - `PUT /api/v1/dashboard/layout` -
`GET /api/v1/reports/summary` - `GET /api/v1/reports/categories` -
`GET /api/v1/preferences` - `PATCH /api/v1/preferences`

V1: - `POST /api/v1/ai/chat` - Recurring transaction endpoints -
Notification endpoints

This is an initial proposal, not an instruction to implement every
endpoint before the core data model and workflows are reviewed.

------------------------------------------------------------------------

## 9. Data Model and Accounting Rules

### 9.1 Core entities

**User** - `id`, normalized email or auth-provider identity, display
name, status, timestamps. - Do not duplicate secrets managed by the auth
provider.

**Account** - `id`, `userId`, name, account type, currency code, opening
balance, status, timestamps.

**Category** - `id`, `userId` or system scope, name, type (`INCOME` or
`EXPENSE`), optional color/icon, archived state, timestamps.

**Transaction** - `id`, `userId`, type, amount, currency, occurrence
date/time, account ID, optional source/destination account IDs for
transfers, optional category ID, description, tags, timestamps, optional
idempotency key.

**Budget** - `id`, `userId`, name, period definition, start/end or
period rules, total limit, status, timestamps.

**BudgetCategoryLimit** - `id`, `budgetId`, `categoryId`, limit amount.

**FinancialGoal** - `id`, `userId`, name, type, target amount, currency,
start date, optional deadline, priority, status, tracking method,
timestamps.

**GoalContribution** - `id`, `userId`, `goalId`, amount, date, optional
linked account/transaction, status, timestamps.

**DashboardLayout** - `id`, `userId`, layout name/default flag,
validated layout configuration, timestamps.

**UserPreference** - `userId`, locale, timezone, theme, currency
preference, date format, notification settings, timestamps.

**RecurringRule (V1)** - Owner, type, amount, frequency, start/end, next
scheduled occurrence, account/category, active status, timestamps.

**AIConversation / AIMessage (V1)** - Owner, minimal conversation
metadata, message role/content under a documented retention policy,
provider/model metadata as appropriate. Avoid storing unnecessary
sensitive context.

**AuditEvent** - Actor, event type, resource type/ID, timestamp, safe
metadata. Do not log secrets or full sensitive transaction content by
default.

### 9.2 Data integrity

-   Every user-owned record must be scoped to a user.
-   Foreign keys and unique constraints must enforce appropriate
    relationships.
-   Use database transactions for multi-step updates.
-   Define delete/archive behavior before implementation.
-   Use migrations committed to source control.
-   Seed only clearly identified development/demo data.
-   Never use production user data in development fixtures.
-   Use indexes based on query patterns, not by guesswork alone.
-   Do not store derived totals redundantly unless there is a measured
    reason and a clear consistency strategy.

### 9.3 Money representation

Choose and document one consistent strategy before implementing
transactions: - PostgreSQL `NUMERIC`/decimal values with a decimal-safe
library, or - Integer minor units for currencies whose precision is
explicitly defined.

Do not use JavaScript `number` as the authoritative representation for
currency arithmetic. Convert and validate at boundaries. Define rounding
behavior and currency precision explicitly. BDT is the initial target,
but do not hard-code the assumption that all future currencies have the
same decimal precision.

### 9.4 Balance definitions

The UI must distinguish: - **Account balance:** opening balance plus
completed income, minus completed expenses, adjusted by transfers and
explicit adjustments. - **Total tracked balance:** sum of balances for
included active accounts, with a clear currency rule. - **Savings goal
progress:** amount computed from the documented goal tracking method. -
**Income/expense totals:** completed transaction records in the selected
period, excluding transfers. - **Budget spent:** qualifying expense
transactions in the relevant period, applying the documented
refund/reversal policy.

Never label these as a user's complete real-world financial position if
the product only contains manually entered records.

------------------------------------------------------------------------

## 10. Security, Privacy, and Compliance

This product handles sensitive personal financial information. Security
is a product requirement, not a final polish task.

### 10.1 Minimum controls

-   TLS/HTTPS in production.
-   Secure session or token handling with a documented threat model.
-   Server-side authorization on every private resource.
-   Input validation and output encoding.
-   CSRF protection where relevant to the chosen cookie/session
    architecture.
-   Rate limiting and abuse controls.
-   Secure secret management and rotation.
-   Least-privilege database credentials.
-   Database backups and tested restore procedures.
-   Dependency updates and vulnerability scanning.
-   Safe error messages and structured logs.
-   Data export and account deletion workflows.
-   Privacy policy that accurately reflects actual processing and
    third-party AI providers.
-   Avoid collecting bank credentials; do not add bank integrations
    without a separate security and legal review.
-   No sensitive data in URLs, analytics events, screenshots, or client
    logs.

### 10.2 Multi-tenant isolation

Every query for user-owned records must be scoped to the authenticated
user. Do not trust a `userId` supplied by the browser. Derive identity
from the verified session/token.

Tests must attempt cross-user access for reads, updates, deletes,
exports, and nested resources. If PostgreSQL Row-Level Security is used,
it must be configured and tested correctly; RLS is an additional
control, not a substitute for understanding authorization.

### 10.3 Privacy and retention

Document: - Which data is collected and why. - Which AI providers
receive what data. - How long conversations, logs, exports, and backups
are retained. - How account deletion affects records and backups. - How
users request/export/delete their data. - Whether analytics are used and
how they are minimized. - How minors or younger users are handled, if
they are allowed to register.

Do not claim legal compliance or certifications without a real review
and evidence. Consult qualified legal/security professionals for
jurisdiction-specific obligations before public launch.

------------------------------------------------------------------------

## 11. Non-Functional Requirements

### 11.1 Performance

Set measurable targets after a baseline is available. Initial
engineering goals: - Keep common dashboard and transaction queries
indexed and bounded. - Avoid fetching all transactions for a report if
aggregation can be done efficiently in the database. - Use pagination
and limits for large lists. - Avoid unnecessary client JavaScript. -
Lazy-load noncritical charts and heavy UI where appropriate. - Measure
Core Web Vitals and API latency in realistic test conditions. - Define
explicit timeout and retry behavior for AI and external services.

Do not claim a specific latency or scalability guarantee without
measurement.

### 11.2 Reliability

-   Health/readiness checks for deployed services.
-   Graceful handling of database, email, and AI-provider failures.
-   Backups with documented restore testing.
-   Safe database migration process.
-   No duplicate transaction creation on retried requests.
-   Error monitoring and actionable alerts.
-   Documented rollback/recovery steps.

### 11.3 Accessibility

Target WCAG 2.2 AA where practical: - Keyboard navigation. - Visible
focus. - Semantic headings and landmarks. - Accessible form labels and
errors. - Sufficient contrast. - Screen-reader descriptions for charts
and status. - Do not rely only on color. - Respect reduced-motion
preferences.

### 11.4 Maintainability

-   Strict TypeScript settings.
-   Consistent lint/format configuration.
-   Small, domain-oriented modules.
-   Tests for important domain rules.
-   Architecture Decision Records (ADRs) for consequential choices.
-   README with local setup, environment variables, scripts, migrations,
    tests, and deployment.
-   Avoid dead code, duplicate logic, magic constants, and unbounded
    abstractions.

------------------------------------------------------------------------

## 12. Testing Strategy

### 12.1 Unit tests

Must cover: - Currency parsing/formatting and decimal arithmetic. -
Account balance calculation. - Transfer handling. - Income/expense
period summaries. - Goal progress and remaining amount. - Budget
utilization and period boundaries. - Recurring schedule rules (V1). -
Customization schema validation. - AI response schema validation.

### 12.2 Integration tests

Must cover: - Database writes and reads. - Transaction
creation/edit/delete. - Multi-record transfer consistency. - Goal
contributions and reversals. - User isolation. - Authorization
failures. - Pagination/filtering. - Migration and constraints where
practical.

### 12.3 End-to-end tests

Critical flows: 1. Sign up/sign in. 2. Complete onboarding. 3. Create an
account. 4. Add income and expense. 5. Create a transfer and verify it
does not count as income/expense. 6. Create a savings goal and add a
contribution. 7. Create a budget and verify utilization. 8.
Customize/reorder dashboard widgets and reload to verify persistence. 9.
Filter and export transactions. 10. Attempt to access another user's
record and confirm denial. 11. Delete account through the supported
flow. 12. Verify useful error and empty states.

### 12.4 Test data

-   Use deterministic synthetic fixtures.
-   Do not use real personal financial records.
-   Test zero, very small, very large, boundary, and invalid amounts.
-   Test timezone and month/year boundaries.
-   Test duplicate request/retry scenarios.
-   Test archived/deleted categories and accounts with historical
    transactions.

------------------------------------------------------------------------

## 13. AI Coding Agent Operating Rules

These rules apply to Claude Code, ChatGPT coding workflows, Cursor,
OpenCode, or any AI coding agent.

### 13.1 Before coding

1.  Read this `requirements.md`, `README.md`, relevant ADRs, and the
    existing code.
2.  Inspect package versions, scripts, folder structure, and current git
    diff.
3.  Do not overwrite existing work without understanding it.
4.  Identify the exact user story and acceptance criteria.
5.  Write a short implementation plan with files/modules affected.
6.  Identify data migration, security, testing, and
    backward-compatibility risks.
7.  Ask for clarification when a decision materially affects data
    integrity, security, cost, or product scope.
8.  Do not invent credentials, API keys, existing endpoints, user
    counts, or completed functionality.

### 13.2 During implementation

-   Work in small, reviewable increments.
-   Follow the existing conventions unless there is a documented reason
    to change them.
-   Keep business logic out of UI components and controllers.
-   Validate untrusted input at boundaries.
-   Enforce authorization server-side.
-   Add or update tests with every meaningful behavior change.
-   Update API contracts and documentation when routes/data shapes
    change.
-   Use migrations for schema changes; do not edit production databases
    manually.
-   Keep secrets out of source control and frontend bundles.
-   Do not install a dependency just because it is popular or new;
    explain why it is needed.
-   Check the current official documentation when using
    version-sensitive APIs.
-   Do not silently change the package manager, framework, database, or
    architecture.
-   Do not fabricate test results or say a command passed unless it was
    run and its output checked.
-   Do not claim the application is secure or production-ready based
    only on a successful build.

### 13.3 After implementation

1.  Run relevant formatter/linter.
2.  Run type checks.
3.  Run unit/integration tests affected by the change.
4.  Run a production build when practical.
5.  Inspect the diff for secrets, unrelated changes, debug code, and
    unsafe patterns.
6.  Report what changed, what was tested, results, known limitations,
    and next steps.
7.  If a check cannot be run, state that explicitly.
8.  Update this document or an ADR if a product/architecture decision
    changed.

### 13.4 Agent response format

For substantial tasks, report: - **Understanding** - **Plan** -
**Files/modules affected** - **Implementation** - **Tests run and actual
results** - **Security/data integrity considerations** - **Limitations
or open decisions** - **Next recommended task**

Do not dump an entire application in one unreviewable response. Build
incrementally and preserve a working codebase.

### 13.5 Prohibited agent behavior

-   Do not replace real functionality with fake data without labelling
    it as demo data.
-   Do not add placeholder buttons that appear functional but do
    nothing.
-   Do not create fake reviews, testimonials, metrics, or financial
    results.
-   Do not expose secrets in code, logs, screenshots, or client bundles.
-   Do not bypass failing tests or weaken validation merely to make a
    build pass.
-   Do not make arbitrary destructive changes or delete data without
    explicit approval.
-   Do not invent legal/compliance guarantees.
-   Do not use AI output as the accounting source of truth.
-   Do not add unrelated PaathAI education features.
-   Do not implement all "latest" libraries without a reasoned
    compatibility and maintenance decision.

------------------------------------------------------------------------

## 14. Environment and Configuration

Provide `.env.example` with placeholders only. Never commit real `.env`
files.

Likely configuration categories: - Application environment and public
web URL. - API base URL / allowed web origins. - PostgreSQL connection
string. - Session/auth secret or provider configuration. - Email
provider credentials if email is implemented. - AI provider key/model
settings for V1. - Redis connection string if Redis is used. - Object
storage settings if uploads are introduced. - Error-monitoring DSN if
monitoring is configured.

Rules: - Validate required environment variables at application
startup. - Fail fast on missing production secrets. - Separate
development, test, staging, and production credentials. - Never prefix
private secrets with a public frontend variable prefix. - Keep a list of
configuration variables and their purpose in the README. - Use a secret
manager or deployment platform's protected environment variables for
production.

------------------------------------------------------------------------

## 15. Deployment and DevOps

### 15.1 Environments

Use separate development, staging, and production environments where
feasible. Do not test destructive migrations against production.

### 15.2 CI pipeline

On pull requests: 1. Install dependencies with the committed lockfile.
2. Run lint/format checks. 3. Run TypeScript checks. 4. Run unit tests.
5. Run integration tests against an isolated test database where
configured. 6. Build web and API. 7. Run dependency/security checks
appropriate to the project.

### 15.3 Database migrations

-   Commit migration files.
-   Review SQL or generated migrations for destructive operations.
-   Back up before risky production changes.
-   Prefer backward-compatible expand/migrate/contract changes for
    important schema changes.
-   Have a rollback or recovery plan; not every migration is safely
    reversible.
-   Never automatically reset a production database.

### 15.4 Observability

Capture: - Request ID/trace ID. - Endpoint and status code. - Latency. -
Safe error category. - Job status and AI-provider failure/cost metadata
as appropriate.

Do not log passwords, auth tokens, full payment credentials, or full
financial records by default.

------------------------------------------------------------------------

## 16. Analytics and Product Validation

Do not assume the product is successful because it has many features.

### 16.1 Initial product metrics

-   Activation: user creates an account and records their first
    transaction.
-   Time to first value: time from signup to first meaningful financial
    summary.
-   Weekly active users who record or review financial data.
-   Goal creation and contribution rate.
-   Percentage of users who return after 7 and 30 days.
-   Transaction entry completion and error rates.
-   Dashboard customization adoption.
-   AI usefulness feedback and AI cost per active user in V1.
-   Data export/deletion request completion.
-   Critical errors and incorrect financial calculation incidents.

Use privacy-conscious analytics and avoid collecting transaction
descriptions or exact amounts unless there is a documented need and
transparent disclosure.

### 16.2 Validation plan

Before expanding beyond MVP: - Interview a small set of students,
beginner savers, and young earners. - Observe them recording a real or
synthetic example budget. - Ask which numbers they need first. - Test
whether they understand balance, expense, transfer, and savings goal
concepts. - Measure whether they can complete a core task without
assistance. - Prioritize repeated pain points over feature requests from
a single person.

Do not present sample targets or validation thresholds as industry
facts; set them based on observed baseline and product goals.

------------------------------------------------------------------------

## 17. Definition of Done and Acceptance Criteria

A feature is done only when all relevant items below are satisfied.

### Product

-   User story and acceptance criteria are clear.
-   Normal, empty, loading, error, and destructive states are handled.
-   Responsive behavior is tested.
-   Text is clear and nonjudgmental.
-   No fake data is presented as real.

### Engineering

-   Types and validation are correct.
-   Business rules are in the domain/service layer.
-   Database schema and migration are reviewed.
-   User ownership and authorization are enforced.
-   Unit/integration/E2E tests are added as appropriate.
-   Lint, typecheck, tests, and build results are reported accurately.
-   Documentation is updated.
-   No unrelated changes or secrets are included.

### Financial correctness

-   Money uses a documented decimal-safe strategy.
-   Income, expense, transfer, refund, and goal-contribution rules are
    explicit.
-   Totals are derived from trusted records.
-   Date range and timezone are correct.
-   Edit/delete/retry paths do not create inconsistent balances.
-   Edge cases and boundary values are tested.

### Production readiness

-   Authentication and authorization have been reviewed.
-   Rate limits and safe error handling are configured where required.
-   Backups and restoration procedures are documented and tested.
-   Monitoring and deployment checks exist.
-   Privacy, retention, export, and deletion behavior match the
    implementation.
-   Known limitations are documented.
-   No unsupported security or compliance claims are made.

------------------------------------------------------------------------

## 18. Open Decisions --- Do Not Guess

These decisions must be made before the related feature is implemented:

1.  Final product name and domain.
2.  Exact initial user segment and launch geography.
3.  Whether BDT-only is acceptable for MVP.
4.  Chosen authentication provider/session strategy.
5.  Exact accounting behavior for opening balances, adjustments,
    refunds, and goal allocation.
6.  Whether savings goals are virtual allocations, account-linked
    balances, or a clearly defined combination.
7.  Whether users can create multiple dashboard layouts in V1.
8.  Whether AI is included in the initial MVP or deferred to V1.
9.  AI provider, data-processing terms, budget, and retention policy.
10. Email/notification provider if needed.
11. Hosting provider, backup policy, and acceptable recovery objectives.
12. Pricing model and payment provider, only after business validation.
13. Legal/privacy review for the launch jurisdiction.
14. Data import/export format and account-deletion retention rules.

If a decision is required to proceed safely, stop and ask the product
owner. If it is not blocking, document a conservative default and
proceed without pretending it is confirmed.

------------------------------------------------------------------------

## 19. Recommended Implementation Order

Build in this order to reduce rework:

1.  Product brief, core flows, wireframes, and accounting decisions.
2.  Monorepo/tooling and design system.
3.  Database schema, authentication, and user isolation.
4.  Accounts and transaction domain with tested calculations.
5.  Categories, dashboard summaries, and reports.
6.  Savings goals, contributions, and budgets.
7.  Dashboard customization and preferences.
8.  Export, deletion, audit, backup, and operational controls.
9.  MVP usability testing and bug fixing.
10. V1 recurring transactions, notifications, and AI assistant.
11. Production hardening and limited beta.
12. Subscription or advanced integrations only after validated demand.

------------------------------------------------------------------------

## 20. First Task for the AI Coding Agent

Do not start by generating the whole application.

**Task 1 --- Repository and implementation plan** 1. Inspect the
existing repository and report its current structure. 2. Check installed
Node.js, pnpm, and relevant package versions if tools allow. 3. Identify
existing code that can be reused. 4. Compare current state against this
document. 5. List missing decisions that block safe implementation. 6.
Propose a phased plan with file-level changes. 7. Do not make
destructive changes or install large sets of dependencies in this first
task. 8. Wait for approval before major architectural or data-model
changes.

**Task 2 --- Foundation** After approval, set up the monorepo,
formatting/linting/type checks, Next.js app, NestJS app, PostgreSQL
development configuration, environment validation, CI baseline, and
documentation. Confirm each command actually runs before proceeding.

**Task 3 --- Financial domain** Design and review the database schema
and accounting invariants before implementing transaction CRUD. Add
calculation tests first, then implement the endpoints and UI.

**Task 4 --- Core user workflows** Complete accounts → transactions →
dashboard → goals → budgets → customization, with automated tests and
error states.

**Task 5 --- V1 intelligence** Only after reliable core data is
available, add AI insights, recurring transactions, notifications, and
advanced reports.

------------------------------------------------------------------------

## Final Product Definition

Personal Finance SaaS is an AI-first personal finance companion designed
to help students, beginner savers, and young earners understand their
recorded money activity, create sustainable savings habits, track
expenses, plan budgets, and reach personal financial goals.

Its defining capabilities are: - A trustworthy financial data model. - A
simple and fast transaction workflow. - User-defined goals, budgets, and
categories. - A genuinely customizable dashboard and personal
workspace. - Clear reports based on recorded data. - AI that explains
and suggests, while deterministic code remains the source of truth for
financial calculations. - Privacy, user ownership, accessibility, and
production engineering built in from the beginning.

**Build the smallest trustworthy product first. Expand only when user
evidence, data quality, and engineering readiness justify the next
step.**
