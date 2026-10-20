# Data-integration audit and fix — 2026-10-20

**Scope:** verify every authenticated screen against the real API/PostgreSQL
backend, remove misleading sample-data fallbacks, and prove the key workflows
in a real browser. No new product feature (IT-12) was started.

## Environment and method

- Web: Next.js dev server on `http://localhost:3000`, isolated API on
  `http://localhost:4100`.
- Database: disposable **native PostgreSQL 16.10** database
  `moneyflow_e2e` on `127.0.0.1:55432`; all four committed migrations
  applied. No Docker was used.
- Browser: real headless Chrome 155 controlled through the DevTools
  Protocol, with a fresh browser context per user. Viewport was the default
  headless desktop size; no mobile-emulation acceptance run was performed.
- Users: two newly registered email/password users; the second user shared
  no session cookie with the first.
- Data was generated through the UI, then compared against SQL queries over
  the persisted rows. No response or total was hand-written.

## Confirmed root causes

1. **Dashboard error: the browser bundle had no API base URL.** Next.js only
   loads `apps/web/.env*`, while this repository documents a single
   repository-root `.env`. Before the fix, Chrome recorded **zero API
   requests** and rendered “Could not load your data”. After loading the root
   env in `apps/web/next.config.ts` and passing `NEXT_PUBLIC_API_URL` through
   the Next config, the dashboard issued authenticated requests to
   `/api/v1/preferences`, `/api/v1/dashboard`, and
   `/api/v1/dashboard/layout` and rendered the persisted zero state.
2. **Accounts and transactions were sample-only.** Both pages rendered
   `MOCK_ACCOUNTS` / `MOCK_RECENT_TRANSACTIONS`; the transaction form had
   every control disabled, and the app shell showed a sample-data banner.
   They now use the authenticated IT-4 APIs; the sample rows, banner,
   `transaction-browser`, `format.ts`, and the fake placeholder notice were
   removed.
3. **Stale public/settings claims contradicted the live app.** The landing
   CTA, footer, 404 pages, security/data settings, and README still described
   a disconnected preview. They now distinguish live authenticated data from
   the labelled landing-page illustration and the genuinely unbuilt controls.

## Integration matrix

| Area                  | Route(s)                            | API endpoints used                                                                                         | Session identity / persistence                                 | Data and result                                                                                                                                                                                                                        |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard             | `/app/dashboard`                    | `GET /api/v1/dashboard`, `GET /api/v1/dashboard/layout`, `GET /api/v1/goals`                               | Global guard; server-derived from the session user; PostgreSQL | Real. Empty state rendered at zero; populated state later matched SQL exactly. Root-cause fix verified with real network requests.                                                                                                     |
| Accounts              | `/app/accounts`                     | `GET/POST /api/v1/accounts`, `PATCH /api/v1/accounts/:id`, `POST /api/v1/accounts/:id/{archive,unarchive}` | Session-scoped; Prisma; derived balances                       | Real. Created two accounts through the UI; rename persisted; opening balance became read-only after activity; archive and unarchive persisted. No sample rows remain.                                                                  |
| Transactions list     | `/app/transactions`                 | `GET /api/v1/transactions`, `PATCH/DELETE /api/v1/transactions/:id`                                        | Session-scoped; Prisma; server filters + offset paging         | Real. Created expense, income, transfer, and temporary expense; list showed account/category names, exact signs, and “1–4 of 4”. Edit and confirmed delete persisted and refreshed. Filter UI is server-backed.                        |
| Transaction entry     | `/app/transactions/new`             | `GET /api/v1/accounts`, `GET /api/v1/categories`, `POST /api/v1/transactions`                              | Session-scoped; idempotency key; server date/time conversion   | Real. Form loads active accounts/categories only; expense, income, and transfer saved through the API; explicit success panel follows persistence. Empty-account state links to Accounts. No sample options or disabled submit remain. |
| Categories            | `/app/categories`                   | `GET /api/v1/categories?includeArchived=true`                                                              | Session-scoped; PostgreSQL                                     | Real taxonomy rendered. Creation/edit actions are still not exposed in this screen; the API exists and is covered by API tests.                                                                                                        |
| Budgets               | `/app/budgets`                      | `GET /api/v1/budgets?includeArchived=true`                                                                 | Session-scoped; server-computed spending                       | Real empty state rendered; no error and no mock banner. CRUD behavior remains covered by the existing IT-9 unit/integration suites.                                                                                                    |
| Goals / contributions | `/app/goals`, `/app/goals/[goalId]` | `GET /api/v1/goals?includeArchived=true`, contribution endpoints                                           | Session-scoped; contribution ledger                            | Real empty state rendered; no error. Contribution add/reverse and lifecycle behavior remain covered by the existing IT-10 tests.                                                                                                       |
| Reports               | `/app/reports`                      | `GET /api/v1/reports/summary`, `GET /api/v1/reports/categories`                                            | Session-scoped; saved period/timezone                          | Real report shell rendered from API responses; no sample figures.                                                                                                                                                                      |
| Preferences           | `/app/settings/preferences`         | `GET/PATCH /api/v1/preferences`                                                                            | Session-scoped; `userPreference` row                           | Real values loaded from the API; no error.                                                                                                                                                                                             |
| Dashboard layout      | `/app/customize`                    | `GET/PUT /api/v1/dashboard/layout`, reset endpoint                                                         | Session-scoped; persisted layout                               | Real widget configuration loaded; persistence/reset covered by existing IT-11 tests and this audit’s dashboard requests.                                                                                                               |
| Security              | `/app/settings/security`            | `POST /api/v1/auth/sign-out`                                                                               | HttpOnly session cookie cleared server-side                    | Real sign-out control; browser returned to `/sign-in`. Session listing/password change are explicitly marked planned, not fake controls.                                                                                               |
| Data settings         | `/app/settings/data`                | None                                                                                                       | No export/deletion endpoint exists                             | Correctly states that records exist but CSV export and account deletion are not built; no fake download/delete button.                                                                                                                 |

## Browser acceptance evidence

All of the following ran in Chrome against the isolated API and disposable
database:

- Empty new user: dashboard showed `BDT 0`, 0 active accounts, no activity,
  no spending, no error; Accounts and Transactions showed their empty states.
- Created `Cash` (opening BDT 5,000) and `Bank` (opening BDT 10,000).
- Created:
  - expense BDT 3,500 from Cash, category Groceries;
  - income BDT 20,000 to Cash, category Salary;
  - transfer BDT 2,000 from Cash to Bank;
  - temporary expense BDT 100 (later deleted).
- Edited the income to BDT 21,000 and changed its note; the list refreshed.
- Deleted the temporary expense after a confirmation dialog; the total moved
  from 4 to 3 rows.
- Renamed `Cash` to `Cash wallet`; opening balance was disabled because the
  account had activity. Archived and unarchived `Bank`; its derived balance
  stayed intact.
- Visited categories, budgets, goals, reports, preferences, and customize;
  every page had `hasError: false`, issued its real API calls, and showed no
  sample banner.
- Blocked the API URLs in Chrome: Accounts showed “Could not load your
  data”; unblocking and pressing “Try again” recovered the empty state. Error
  and retry are therefore observable, not hidden by a fallback.
- Signed out; created a second user; its dashboard was zero/empty.
- From the second session, fetching the first user’s account and transaction
  IDs returned **404 `Account not found.`** and **404 `Transaction not
found.`**; the second user’s own account list was empty.
- Browser console exceptions: none. Browser console errors: none.

## Dashboard totals versus PostgreSQL

Final persisted state for the first test user:

| Source                      | Income          | Expense       | Transfer                   | Tracked balance |
| --------------------------- | --------------- | ------------- | -------------------------- | --------------- |
| API `GET /api/v1/dashboard` | 2,100,000 minor | 350,000 minor | not counted                | 3,250,000 minor |
| SQL over persisted rows     | 2,100,000       | 350,000       | 200,000 moved              | 3,250,000       |
| Rendered UI                 | BDT 21,000      | BDT 3,500     | BDT 2,000 shown separately | BDT 32,500      |

SQL account balances were `Cash wallet = 2,050,000` and
`Bank = 1,200,000`; their sum equals the dashboard’s **3,250,000 minor**
(BDT 32,500). The BDT 2,000 transfer moved between accounts and did not
change total balance, income, or expense. The dashboard’s
`transactionCount` was 2, counting only the income and expense movements,
not the transfer.

## Verification commands and results

| Gate                                                       | Result                                                                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                | Passed                                                                                                                                                                        |
| `pnpm typecheck`                                           | Passed                                                                                                                                                                        |
| `pnpm test`                                                | **API 397/397 passed** (35 files); **web 235/235 passed** (37 files)                                                                                                          |
| `TEST_DATABASE_URL=…/moneyflow_test pnpm test:integration` | **134/134 passed** (11 files) against native PostgreSQL 16.10                                                                                                                 |
| `pnpm build`                                               | Passed (Next.js production build, 19 routes; NestJS build)                                                                                                                    |
| `DATABASE_URL=…/moneyflow_e2e pnpm db:validate`            | Prisma schema valid                                                                                                                                                           |
| `git diff --check`                                         | Passed (exit 0)                                                                                                                                                               |
| `pnpm format:check`                                        | Only the pre-existing untracked `docs/reports/2026-10-20-it8-verification-report.md` fails; it was preserved and not modified. All files changed by this audit are formatted. |

No migrations were added or changed by this audit. No database data in the
shared Neon database was read, changed, or used for the E2E run.

## Commit and CI

- Code commit: `5dfe1b57d38b29fad60a920f8e06904b0c62342c`
  (`fix(web): connect remaining screens to persisted data`), pushed to
  `origin/main`.
- CI run
  [`39394282726`](https://github.com/HasibCoderLab/MoneyFlow/actions/runs/39394282726):
  **success** for that exact commit.
  - “Checks (format, lint, typecheck, unit tests, build)”: success.
  - “Integration tests (PostgreSQL 16)”: success.
- This report is included in a docs-only follow-up commit; it does not alter
  the verified code behaviour.

## Files changed

- Browser URL loading: `apps/web/next.config.ts`, `apps/web/package.json`,
  `pnpm-lock.yaml`.
- API client and presentation helpers: `apps/web/src/lib/api-client.ts`,
  `summary-display.ts`, `transaction-input.ts`, `account-labels.ts` plus
  their tests.
- Accounts: `components/accounts-view.tsx`,
  `app/app/accounts/page.tsx` and its test.
- Transactions: `components/transactions-view.tsx`, `transaction-form.tsx`,
  `transaction-list.tsx`, `new-transaction-view.tsx`,
  `app/app/transactions/{page,new/page}.tsx` plus tests.
- Shell and honesty copy: `app-shell.tsx`, `auth-form.tsx`, `auth-shell.tsx`,
  landing/404/footer/settings pages, translations, `globals.css`;
  removed `mock-data-banner.tsx`, `transaction-browser.tsx`,
  `placeholder-notice.tsx`, and `lib/format.ts`.
- Security/data settings now state the real session and the unbuilt controls;
  added `components/sign-out-button.tsx`.
- Documentation: `README.md`, architecture/implementation/mvp docs, and this
  report.

## Remaining limitations and next step

- Transaction **search** is not implemented; the screen states that filters
  are available instead of pretending local search covers all records.
- Categories remain read-only in the UI; category CRUD is API-only today.
- CSV export, account deletion, session listing/password change, and email
  recovery are still not built and are labelled as such.
- Mobile-width visual acceptance was not repeated in this browser run; the
  existing responsive CSS and unit coverage remain.
- IT-12 should wait until the owner reviews this integration result.
