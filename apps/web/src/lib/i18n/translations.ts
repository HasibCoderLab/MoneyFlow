/**
 * UI locale dictionaries for the two launch languages named in
 * requirements.md §7.4: English (default) and Bangla.
 *
 * Scope: every user-facing surface in the web app — marketing and auth
 * pages, app chrome, dashboard, accounts, transactions, reports,
 * categories, budgets, goals, settings, and their loading, signed-out,
 * empty, and error states. Metadata titles/descriptions and brand names
 * remain English by design.
 *
 * Rules:
 * - `en` is the source of truth for the key set; `bn` is typed as
 *   `Record<TranslationKey, string>`, so a missing or extra Bangla key
 *   is a TypeScript error (no silent English fallbacks at build time).
 * - These are display labels only. Nothing here computes money —
 *   balances/totals/percentages stay in the deterministic domain layer
 *   (requirements.md §14 / AGENTS.md rules 5 and 8).
 * - Text is plain and neutral in both languages (no shame or urgency).
 */

/** Locales the preview can display, in menu order. */
export const LOCALES = ['en', 'bn'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Browser-local storage key for the language choice (non-sensitive). */
export const LOCALE_STORAGE_KEY = 'mf-locale';

/** Human-readable name of each locale, shown in the toggle itself. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
};

/** `<html lang>` value for each locale. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: 'en',
  bn: 'bn',
};

const en = {
  // Shared actions
  'common.signIn': 'Sign in',
  'common.getStarted': 'Get started',
  'common.viewAll': 'View all',
  'common.manage': 'Manage',
  'common.loading': 'Loading…',
  'common.tryAgain': 'Try again',

  // Language switcher (requirements.md §7.4, ADR-0009/ADR-0012)
  'language.menuLabel': 'Language',
  'language.triggerLabel': 'Language: {current}. Change language',
  'language.announce': 'Language changed to {language}.',

  // Shared data states on the API-backed pages (IT-8)
  'summary.signedOutTitle': 'Sign in to see your data',
  'summary.signedOutBody':
    'This page shows figures from your own account, so you need to be signed in.',
  'summary.errorTitle': 'Could not load your data',
  'summary.errorBody': 'Something went wrong while loading recorded figures. Please try again.',
  'summary.spentCaption': 'recorded spending',
  'summary.categorySummary':
    'In {period}, {name} is the largest category at {amount} ({percent} of recorded spending).',
  'summary.categoryNote': 'Recorded spending for {period}.',
  'summary.noSpending': 'No spending was recorded for this period.',

  // Application shell (requirements.md §4.3)
  'app.skipToContent': 'Skip to main content',
  'app.badge': 'Foundation build',
  'app.addTransaction': 'Add Transaction',
  'app.menu': 'Menu',
  'app.footerNote':
    'Foundation build — accounts, transactions, dashboard, reports, categories, budgets, and goals all show your recorded data.',

  // Transaction rows (recent activity + sample browser)
  'tx.type.income': 'Income',
  'tx.type.expense': 'Expense',
  'tx.type.transfer': 'Transfer',
  'tx.type.adjustment': 'Adjustment',
  'tx.fallback.income': 'Income',
  'tx.fallback.expense': 'Expense',
  'tx.fallback.transfer': 'Transfer between accounts',
  'tx.fallback.adjustment': 'Balance adjustment',

  // Primary navigation
  'nav.ariaMain': 'Main',
  'nav.dashboard': 'Dashboard',
  'nav.accounts': 'Accounts',
  'nav.transactions': 'Transactions',
  'nav.categories': 'Categories',
  'nav.budgets': 'Budgets',
  'nav.goals': 'Savings goals',
  'nav.reports': 'Reports',
  'nav.settings': 'Settings',

  // Landing page chrome
  'landing.ariaSections': 'Sections',
  'landing.features': 'Features',
  'landing.howItWorks': 'How it works',
  'landing.privacy': 'Privacy',
  'landing.roadmap': 'Roadmap',
  'landing.menu': 'Menu',
  'landing.ariaNavMenu': 'Navigation menu',
  'landing.ariaPrimary': 'Primary',

  // Public footer (requirements.md §7.4)
  'footer.promise': 'Know your money. Build better habits. Reach your goals.',
  'footer.about':
    'A personal finance companion for students, beginner savers, and young earners — a standalone product under the PaathAI umbrella, separate from the PaathAI education platform.',
  'footer.productHeading': 'Product',
  'footer.previewHeading': 'App',
  'footer.legalHeading': 'Legal',
  'footer.legalNote':
    'Privacy policy and terms will be published here before public launch. Nothing here is financial advice.',
  'footer.copyright':
    '© {year} MoneyFlow — foundation build. The final product name is not yet decided.',
  'footer.capabilities': 'Capabilities',
  'footer.privacyAndTrust': 'Privacy and trust',
  'footer.featuresLink': 'Features',
  'footer.aboutLink': 'About',
  'footer.contactLink': 'Contact',
  'footer.sitemapLink': 'Sitemap',

  // Dashboard — wired to `GET /api/v1/dashboard` (IT-8)
  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': 'Your money at a glance — recorded figures from your account.',
  'dashboard.totalBalance': 'Total balance',
  'dashboard.totalBalanceMeta':
    'Tracked balance across {count} active accounts — archived accounts are excluded.',
  'dashboard.incomeThisMonth': 'Income this month',
  'dashboard.spentThisMonth': 'Spent this month',
  'dashboard.periodNote':
    'Recorded amounts for {period} · {timezone}. Transfers and adjustments are never counted as income or spending.',
  'dashboard.recentTitle': 'Recent activity',
  'dashboard.recentSubtitle': 'Latest recorded activity',
  'dashboard.recentEmpty': 'No transactions recorded yet.',
  'dashboard.transferNote':
    'Transfers move money between your own accounts, so they are shown separately and never counted as income or spending.',
  'dashboard.categoriesTitle': 'Spending by category',
  'dashboard.categoriesSubtitle': 'Recorded spending for the period',
  'dashboard.categoriesEmpty': 'No expenses recorded for this period.',
  'dashboard.goalsTitle': 'Savings goals',
  'dashboard.goalsSubtitle': 'Progress computed from your contributions',
  'dashboard.goalsEmpty': 'No goals yet — create one to track what you are setting aside.',
  'dashboard.goalsNote':
    'Tracking only: contributing to a goal never moves money between accounts or counts as spending.',
  'dashboard.budgetsTitle': 'Budgets',
  'dashboard.budgetsSubtitle': 'Monthly spending plans',
  'dashboard.budgetsPlaceholder':
    'Budgets live on their own page: create a monthly plan and track spending against it there. No budget figures are shown here.',

  // Reports — wired to the IT-8 report endpoints
  'reports.title': 'Reports',
  'reports.subtitle': 'Recorded income, spending, and category totals for the current month.',
  'reports.granularityLabel': 'Group by',
  'reports.granularity.daily': 'Daily',
  'reports.granularity.weekly': 'Weekly',
  'reports.granularity.monthly': 'Monthly',
  'reports.seriesTitle': 'Income and spending over time',
  'reports.seriesSubtitle': 'Recorded totals per {granularity} · {period}',
  'reports.weekStartsNote': 'Weeks start on Saturday (Bangladesh standard week).',
  'reports.seriesEmpty': 'No activity was recorded for this period.',
  'reports.tableCaption': 'Recorded income and spending for {period}, grouped by {granularity}.',
  'reports.colBucket': 'Period',
  'reports.colIncome': 'Income',
  'reports.colExpense': 'Spending',
  'reports.colTotal': 'Total',
  'reports.categoriesTitle': 'Spending by category',
  'reports.categoriesSubtitle': 'Recorded spending per category for {period}',
  'reports.categoriesEmpty': 'No expenses were recorded for this period.',
  'reports.recordedNote':
    'Computed server-side from your recorded transactions in {timezone} — actual amounts only, never forecasts.',
  'reports.export': 'Export CSV',
  'reports.exportDisabled': 'CSV export is not available in this build yet.',
  'reports.moreTitle': 'More reports',
  'reports.moreSubtitle': 'Not in this build yet',
  'reports.moreSeries': 'Daily, weekly, and monthly series are included above.',
  'reports.moreBudgets': 'Budget and savings-goal reporting arrives with later updates.',
  'reports.moreExports': 'CSV export and scheduled reports arrive with the export work.',

  // Budgets — wired to the IT-9 budget endpoints
  'budgets.title': 'Budgets',
  'budgets.subtitle': 'Monthly spending plans — recorded expenses only, computed on the server.',
  'budgets.newButton': 'New budget',
  'budgets.editButton': 'Edit',
  'budgets.deleteButton': 'Delete',
  'budgets.pauseButton': 'Pause',
  'budgets.resumeButton': 'Resume',
  'budgets.archiveButton': 'Archive',
  'budgets.unarchiveButton': 'Unarchive',
  'budgets.paused': 'Paused',
  'budgets.archived': 'Archived',
  'budgets.pausedNote':
    'This plan is paused: recorded spending is shown for reference, but it is not an active plan.',
  'budgets.emptyTitle': 'No budgets yet.',
  'budgets.emptyBody':
    'Create a monthly budget to plan spending per category and see how much of it you have used.',
  'budgets.noCategories':
    'You need an active expense category first — create one on the Categories page.',
  'budgets.totalRow': 'Total budget',
  'budgets.spentOf': '{spent} of {limit} spent',
  'budgets.remaining': '{amount} remaining',
  'budgets.overBy': '{amount} over the limit',
  'budgets.percentUsed': '{percent} used',
  'budgets.formCreateTitle': 'New budget',
  'budgets.formEditTitle': 'Edit budget',
  'budgets.fieldName': 'Budget name',
  'budgets.fieldMonth': 'Month',
  'budgets.fieldTotal': 'Total limit (optional)',
  'budgets.fieldCategory': 'Category',
  'budgets.fieldLimit': 'Limit',
  'budgets.selectCategory': 'Select a category',
  'budgets.addLimit': 'Add category limit',
  'budgets.removeLimit': 'Remove',
  'budgets.save': 'Save budget',
  'budgets.saving': 'Saving…',
  'budgets.cancel': 'Cancel',
  'budgets.deleteConfirmTitle': 'Delete this budget?',
  'budgets.deleteConfirmBody':
    '“{name}” and its category limits will be removed. Your recorded transactions are not affected.',
  'budgets.deleteConfirmButton': 'Delete budget',
  'budgets.errorNameRequired': 'Enter a budget name.',
  'budgets.errorNameTooLong': 'The name must be at most 80 characters.',
  'budgets.errorMonthRequired': 'Choose the month this budget applies to.',
  'budgets.errorAmountFormat': 'Enter an amount like 1500 or 1500.50.',
  'budgets.errorAmountPositive': 'The limit must be greater than zero.',
  'budgets.errorNeedLimits': 'Set a total limit and/or at least one category limit.',
  'budgets.errorTooManyLimits': 'A budget can track up to 50 categories.',
  'budgets.errorDuplicateCategory': 'Each category can appear only once.',
  'budgets.serverError': 'The budget could not be saved. Please try again.',

  // Goals — wired to the IT-10 goal and contribution endpoints (ADR-0005)
  'goals.title': 'Savings goals',
  'goals.subtitle':
    'What you are setting aside — progress is tracked from contributions and never moves money between accounts.',
  'goals.newButton': 'New goal',
  'goals.presetButton': 'Emergency-fund preset',
  'goals.editButton': 'Edit',
  'goals.deleteButton': 'Delete',
  'goals.pauseButton': 'Pause',
  'goals.resumeButton': 'Resume',
  'goals.completeButton': 'Mark complete',
  'goals.archiveButton': 'Archive',
  'goals.unarchiveButton': 'Unarchive',
  'goals.viewDetails': 'View details',
  'goals.status.active': 'Active',
  'goals.status.paused': 'Paused',
  'goals.status.completed': 'Completed',
  'goals.status.archived': 'Archived',
  'goals.type.GENERAL': 'General savings',
  'goals.type.EMERGENCY_FUND': 'Emergency fund',
  'goals.type.EDUCATION': 'Education',
  'goals.type.DEVICE': 'Device purchase',
  'goals.type.TRAVEL': 'Travel',
  'goals.type.DEBT_PAYOFF': 'Debt payoff',
  'goals.type.CUSTOM': 'Custom goal',
  'goals.priority.LOW': 'Low',
  'goals.priority.MEDIUM': 'Medium',
  'goals.priority.HIGH': 'High',
  'goals.presetName': 'Emergency fund',
  'goals.presetNote':
    'Suggested example target — change it to fit your situation. This is a suggestion, not financial advice.',
  'goals.savedOf': '{saved} of {target} tracked',
  'goals.remaining': '{amount} remaining',
  'goals.overTarget': '{amount} over target',
  'goals.percentOfTarget': '{percent} of target',
  'goals.deadline': 'Deadline {date}',
  'goals.noDeadline': 'No deadline set',
  'goals.trackingNote':
    'Progress tracks contributions you record. Contributing never moves money between accounts, and it is never counted as income or spending.',
  'goals.emptyTitle': 'No goals yet.',
  'goals.emptyBody':
    'Create a goal to track what you are setting aside. Contributions are tracking only — they never move money between accounts.',
  'goals.formCreateTitle': 'New goal',
  'goals.formEditTitle': 'Edit goal',
  'goals.fieldName': 'Goal name',
  'goals.fieldType': 'Type',
  'goals.fieldTarget': 'Target amount',
  'goals.fieldStart': 'Start date',
  'goals.fieldDeadline': 'Deadline (optional)',
  'goals.fieldPriority': 'Priority',
  'goals.save': 'Save goal',
  'goals.saving': 'Saving…',
  'goals.cancel': 'Cancel',
  'goals.deleteConfirmTitle': 'Delete this goal?',
  'goals.deleteConfirmBody':
    '“{name}” and its contribution history will be removed. Account balances, income, spending, and budgets are not affected.',
  'goals.deleteConfirmButton': 'Delete goal',
  'goals.errorNameRequired': 'Enter a goal name.',
  'goals.errorNameTooLong': 'The name must be at most 80 characters.',
  'goals.errorTargetFormat': 'Enter a target like 30000 or 30000.50.',
  'goals.errorTargetPositive': 'The target must be greater than zero.',
  'goals.errorStartRequired': 'Choose a start date.',
  'goals.errorDeadlineBeforeStart': 'The deadline cannot be before the start date.',
  'goals.serverError': 'The goal could not be saved. Please try again.',
  'goals.actionError': 'That action could not be completed. Please try again.',
  'goals.contributionAmount': 'Contribution amount',
  'goals.contributionDate': 'Date (optional)',
  'goals.contributionNote': 'Note (optional)',
  'goals.addContribution': 'Add contribution',
  'goals.adding': 'Adding…',
  'goals.errorContributionFormat': 'Enter a contribution like 500 or 500.50.',
  'goals.errorContributionPositive': 'The contribution must be greater than zero.',
  'goals.errorContributionFuture': 'Choose today or an earlier date.',
  'goals.contributionServerError': 'The contribution could not be added. Please try again.',
  'goals.historyTitle': 'Contribution history',
  'goals.historySubtitle': 'Every contribution and reversal, newest first',
  'goals.contributionPausedNote':
    'Contributions can only be added while the goal is active. Resume or unarchive it to add one.',
  'goals.historyEmpty': 'No contributions recorded yet.',
  'goals.contributionLabel': 'Contribution',
  'goals.reversalLabel': 'Reversal',
  'goals.reverseButton': 'Reverse',
  'goals.reversedNote': 'Already reversed',
  'goals.reverseConfirmTitle': 'Reverse this contribution?',
  'goals.reverseConfirmBody':
    'A reversal entry will be added to the history. The original contribution stays visible and account balances are not affected.',
  'goals.reverseConfirmButton': 'Reverse contribution',
  'goals.reverseServerError': 'The contribution could not be reversed. Please try again.',
  'goals.backToGoals': 'Back to goals',

  // Categories — wired to `GET /api/v1/categories` (IT-5 API)
  'categories.title': 'Categories',
  'categories.subtitle':
    'The labels your money is recorded under — income, expenses, and archived history.',
  'categories.incomeTitle': 'Income',
  'categories.expensesTitle': 'Expenses',
  'categories.groupSubtitle': 'Active categories',
  'categories.archivedTitle': 'Archived',
  'categories.archivedSubtitle': 'History stays readable',
  'categories.archivedNote':
    'A category with past transactions cannot vanish: it is archived or its records are reassigned first, so old reports keep making sense.',
  'categories.empty': 'No categories were found on your account.',
  'categories.newButton': 'New category',
  'categories.newDisabled': 'Category creation is not available in this build yet.',

  // Shared actions added for the complete localization pass
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.archive': 'Archive',
  'common.unarchive': 'Unarchive',
  'common.reset': 'Reset',
  'common.clear': 'Clear',
  'common.close': 'Close',
  'common.signOut': 'Sign out',
  'common.openApp': 'Open the app',
  'common.home': 'Home',
  'common.previous': 'Previous',
  'common.next': 'Next',
  'common.optional': '(optional)',
  'common.required': '(required)',

  // Theme switcher (shared chrome)
  'theme.label': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.triggerLabel': 'Theme: {current}. Switch to {next}.',
  'theme.titleLabel': 'Theme: {current} (switch to {next})',
  'theme.saveFailed': 'Theme applied in this browser, but it could not be saved to your account.',

  // Authentication (sign-in, sign-up, shared shell)
  'auth.about': 'About MoneyFlow',
  'auth.home': 'MoneyFlow home',
  'auth.signInTitle': 'Sign in',
  'auth.signInSubtitle': 'Welcome back.',
  'auth.signUpTitle': 'Create your account',
  'auth.signUpSubtitle': 'Start tracking your money.',
  'auth.newHere': 'New to MoneyFlow?',
  'auth.alreadyHave': 'Already have an account?',
  'auth.createAccountLink': 'Create an account',
  'auth.sessionNote':
    'Your session is kept in an HttpOnly cookie that page scripts cannot read. For your privacy, sign-in problems are always described in general terms.',
  'auth.fullName': 'Full name',
  'auth.namePlaceholder': 'e.g. Ayesha Rahman',
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'Password',
  'auth.passwordPlaceholder': 'Your password',
  'auth.newPasswordPlaceholder': 'At least {count} characters',
  'auth.passwordHint': 'At least {count} characters.',
  'auth.confirmPassword': 'Confirm password',
  'auth.confirmPlaceholder': 'Repeat your password',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.signingIn': 'Signing in…',
  'auth.creatingAccount': 'Creating account…',
  'auth.errorNameRequired': 'Enter your name.',
  'auth.errorEmailRequired': 'Enter your email address.',
  'auth.errorEmailInvalid': 'Enter a valid email address, e.g. you@example.com.',
  'auth.errorPasswordRequired': 'Enter your password.',
  'auth.errorPasswordLength': 'Passwords must be at least {count} characters.',
  'auth.errorConfirmRequired': 'Repeat your password.',
  'auth.errorConfirmMismatch': 'Passwords do not match.',
  'auth.serverError': 'Something went wrong. Please try again.',
  'auth.principle.records.title': 'Your records stay yours',
  'auth.principle.records.text':
    'Private financial data is scoped to your authenticated account on the server.',
  'auth.principle.numbers.title': 'Numbers you can check',
  'auth.principle.numbers.text':
    'Balances and totals come from deterministic, tested code — never from a language model.',
  'auth.principle.bank.title': 'No bank credentials',
  'auth.principle.bank.text': 'MoneyFlow never asks for your bank or mobile-wallet logins.',
  'auth.asideFooter': 'Foundation build — the app shows recorded figures from your own account.',
  'auth.openDashboard': 'Open the dashboard',

  // Landing page (requirements.md §1.2, §7.4)
  'landing.heroEyebrow': 'Personal finance, made clear',
  'landing.heroTitle': 'Know your money.',
  'landing.heroAccent': 'Build better habits. Reach your goals.',
  'landing.heroLead':
    'Track your spending, build savings habits, and move toward your financial goals — all in one simple place.',
  'landing.exploreFeatures': 'Explore features',
  'landing.heroTrust': 'Your money. Your goals. Your decisions.',
  'landing.statusTitle': 'This is a foundation build',
  'landing.statusBody':
    'Accounts, transactions, dashboard, reports, categories, budgets, and goals run against the authenticated API and show your own recorded data. The product illustration on this page is sample data and is labelled as such; AI chat, exports, and account recovery are not built yet.',
  'landing.capabilitiesEyebrow': 'Capabilities',
  'landing.capabilitiesTitle': 'What MoneyFlow is being built to do',
  'landing.capabilitiesSubtitle':
    'A clear, honest set of tools to help you understand and manage your money.',
  'landing.tag.mvp': 'MVP',
  'landing.tag.v1': 'V1',
  'landing.benefit.spending.title': 'Understand your spending',
  'landing.benefit.spending.body':
    'Record income and expenses and see where your money goes, organised by the categories you choose.',
  'landing.benefit.saving.title': 'Build better saving habits',
  'landing.benefit.saving.body':
    'Give savings a purpose — an emergency fund, a laptop, a course — and watch progress grow with every contribution.',
  'landing.benefit.planning.title': 'Plan with confidence',
  'landing.benefit.planning.body':
    'Organise monthly budgets by category and compare recorded spending with the limits you set.',
  'landing.benefit.picture.title': 'See your financial picture',
  'landing.benefit.picture.body':
    'Review useful summaries of the financial activity you choose to track, in one calm place.',
  'landing.benefit.goals.title': 'Set and track savings goals',
  'landing.benefit.goals.body':
    'Create goals with targets and deadlines, contribute when you can, and see your progress over time.',
  'landing.benefit.customise.title': 'Customise your dashboard',
  'landing.benefit.customise.body':
    'Show, hide, and reorder dashboard widgets so the information you care about is always within reach.',
  'landing.benefit.assistant.title': 'An assistant that explains your money',
  'landing.benefit.assistant.body':
    'Ask about your own recorded data. It explains using the same tested calculations as the rest of the product — it never invents a balance.',
  'landing.howEyebrow': 'How it works',
  'landing.howTitle': 'Three simple steps',
  'landing.howSubtitle':
    'No bank connections, no automatic imports — just a clear way to record and review your money.',
  'landing.step.setup.title': 'Set up your accounts',
  'landing.step.setup.body': 'Add the cash, bank, and mobile-wallet balances you already track.',
  'landing.step.record.title': 'Record your income and expenses',
  'landing.step.record.body':
    'Log money in and out as it happens. Transfers between your own accounts are never counted twice.',
  'landing.step.review.title': 'Review and adjust',
  'landing.step.review.body':
    'Check your progress against goals and budgets, then refine what you plan to do next.',
  'landing.goalsEyebrow': 'Savings goals',
  'landing.goalsTitle': 'Small steps. Meaningful progress.',
  'landing.goalsSubtitle':
    'Give your savings a purpose, track what you contribute, and see how far you have come.',
  'landing.goal.emergency': 'Emergency fund',
  'landing.goal.laptop': 'New laptop',
  'landing.goal.education': 'Education',
  'landing.goal.personal': 'Personal savings',
  'landing.goal.percentOfGoal': 'of goal',
  'landing.goal.demoNote': 'Illustrative demo data — not a real account.',
  'landing.controlEyebrow': 'Personal control',
  'landing.controlTitle': 'Your finances. Your rules.',
  'landing.controlSubtitle':
    'Create a tracking system that reflects your own priorities, categories, budgets, and savings goals.',
  'landing.control.categories.title': 'Categories that fit your life',
  'landing.control.categories.body':
    'Create, rename, recolor, and archive your own income and expense categories. History stays readable.',
  'landing.control.dashboard.title': 'A dashboard you arrange',
  'landing.control.dashboard.body':
    'Show, hide, and reorder widgets and choose your theme, then keep a layout that is genuinely yours.',
  'landing.control.preferences.title': 'Preferences you control',
  'landing.control.preferences.body':
    'Light or dark theme, plus date and number formats that suit how you read money.',
  'landing.control.goals.title': 'Goals and budgets you define',
  'landing.control.goals.body':
    'Set your own targets, limits, and deadlines. Nothing is decided for you.',
  'landing.trustEyebrow': 'Privacy and trust',
  'landing.trustTitle': 'Built to be trustworthy',
  'landing.trustSubtitle':
    'Your financial information deserves care. Here is how MoneyFlow is designed to protect it.',
  'landing.trust.records.title': 'Your records stay yours',
  'landing.trust.records.body':
    'Financial data is scoped to your authenticated account on the server. MoneyFlow never trusts a user ID supplied by the browser.',
  'landing.trust.numbers.title': 'Numbers you can check',
  'landing.trust.numbers.body':
    'Balances, totals, and percentages come from deterministic, tested code — not from a language model.',
  'landing.trust.bank.title': 'No bank credentials',
  'landing.trust.bank.body':
    'MoneyFlow does not ask for your bank or mobile-wallet logins, and will not connect to them without a separate security and legal review.',
  'landing.trust.language.title': 'Plain, no-pressure language',
  'landing.trust.language.body':
    'No shame, fake urgency, or dark patterns. MoneyFlow claims no compliance standard it has not earned.',
  'landing.roadmapEyebrow': 'Roadmap',
  'landing.roadmapTitle': 'Where this is today',
  'landing.roadmapSubtitle':
    'MoneyFlow is being built in stages. Here is what is happening now and what is coming next.',
  'landing.roadmap.mvp.level': 'MVP',
  'landing.roadmap.mvp.state': 'In progress',
  'landing.roadmap.mvp.scope':
    'Core financial workflows — accounts, transactions, categories, budgets, goals, and a customisable dashboard.',
  'landing.roadmap.v1.level': 'V1',
  'landing.roadmap.v1.state': 'Planned',
  'landing.roadmap.v1.scope':
    'AI Money Assistant, smart insights, recurring transactions, and notifications.',
  'landing.roadmap.later.level': 'Later',
  'landing.roadmap.later.state': 'Research only',
  'landing.roadmap.later.scope':
    'Bank integrations, shared household finances, multi-currency support, and native mobile apps.',
  'landing.faqEyebrow': 'Questions',
  'landing.faqTitle': 'Frequently asked questions',
  'landing.faqSubtitle':
    'Only what is known today. Pricing is not decided yet, so it is not covered here.',
  'landing.faq.what.q': 'What is MoneyFlow?',
  'landing.faq.what.a':
    'MoneyFlow is a standalone personal finance companion under the PaathAI umbrella — separate from the PaathAI education platform. It helps you record and understand income, expenses, budgets, and savings goals in one calm place.',
  'landing.faq.who.q': 'Who is MoneyFlow designed for?',
  'landing.faq.who.a':
    'Students, beginner savers, and young earners who want a simple, trustworthy way to understand their money. No finance expertise is needed to start.',
  'landing.faq.track.q': 'How do I track income and expenses?',
  'landing.faq.track.a':
    'You record them manually as they happen. Transfers between your own accounts move money without ever being counted as income or spending, so your totals stay honest.',
  'landing.faq.categories.q': 'Can I create my own categories?',
  'landing.faq.categories.a':
    'Yes. You can create, rename, recolor, archive, and organize your own income and expense categories, and reports remain understandable when categories change.',
  'landing.faq.savings.q': 'Can I set savings goals?',
  'landing.faq.savings.a':
    'Yes — including an emergency-fund template. You add contributions, see saved and remaining amounts with honest progress, and adjust targets without losing history.',
  'landing.faq.bank.q': 'Does MoneyFlow connect to my bank?',
  'landing.faq.bank.a':
    'No. MoneyFlow keeps manual records only and never asks for your bank or mobile-wallet logins. Bank connections are research-only and would require a separate security and legal review first.',
  'landing.faq.privacy.q': 'How is my financial information handled?',
  'landing.faq.privacy.a':
    'Records belong to your authenticated account and are scoped to it on the server. Balances and totals come from deterministic, tested code. CSV export and account deletion are part of the plan, and the privacy text will be published to match the implementation before launch.',
  'landing.ctaTitle': 'Track your own money',
  'landing.ctaBody':
    'Create an account to record accounts and transactions and see your own figures. Signing in is required for private data.',
  'landing.ctaCreate': 'Create an account',

  // Illustrative landing/product preview (demo data, not a real account)
  'preview.ariaLabel': 'Illustrative product preview',
  'preview.badge': 'Illustrative preview — demo data',
  'preview.period': 'October 2026',
  'preview.trackedBalance': 'Tracked balance',
  'preview.activeAccounts': 'Across {count} active accounts',
  'preview.incomeThisMonth': 'Income this month',
  'preview.spentThisMonth': 'Spent this month',
  'preview.savingsGoal': 'Savings goal',
  'preview.recentActivity': 'Recent activity',
  'preview.footer': 'This is a static illustration of the planned experience.',
  'preview.goalProgress': '{name}: {percent} percent of goal reached',
  'preview.percentOfGoal': '{percent}% of goal',
  'preview.dataDisclaimer':
    'All amounts, names, and dates below are fictional sample data shown for UI review only.',
  'mock.tx.stipend': 'Part-time stipend',
  'mock.tx.groceries': 'Groceries — monthly restock',
  'mock.tx.recharge': 'Mobile recharge',
  'mock.tx.emergencyTransfer': 'Move to Emergency fund',
  'mock.tx.freelance': 'Freelance design work',
  'mock.tx.busPass': 'Bus pass',
  'mock.category.income': 'Income',
  'mock.category.groceries': 'Groceries',
  'mock.category.utilities': 'Utilities',
  'mock.category.transfer': 'Transfer',
  'mock.category.freelance': 'Freelance',
  'mock.category.transport': 'Transport',
  'mock.goal.emergencyFund': 'Emergency fund',
  'mock.goal.newLaptop': 'New laptop',
  'mock.goal.semesterBuffer': 'Semester fees buffer',

  // Public marketing pages (/features, /about, /contact, /site-map)
  'marketing.breadcrumb': 'Breadcrumb',
  'marketing.home': 'Home',
  'features.eyebrow': 'Features',
  'features.title': 'What MoneyFlow does today',
  'features.lead':
    'An honest inventory: only shipped capabilities are listed as available. Everything else is labelled as not built.',
  'features.availableTitle': 'Available now',
  'features.item.accounts.title': 'Accounts and wallets',
  'features.item.accounts.body':
    'Create a cash, bank, mobile-wallet, savings, or custom account with an opening balance. Current balances are derived from your recorded transactions; archiving keeps history intact.',
  'features.item.transactions.title': 'Income, expenses, and transfers',
  'features.item.transactions.body':
    'Record money in, money out, and moves between your own accounts. Transfers never count as income or spending. Entries can be edited and deleted, and repeat submissions are rejected by an idempotency key.',
  'features.item.categories.title': 'Categories you control',
  'features.item.categories.body':
    'Start from clear defaults, then rename, recolour, or archive your own income and expense categories. A category still in use cannot be silently deleted.',
  'features.item.budgets.title': 'Budgets by period',
  'features.item.budgets.body':
    'Set a monthly budget with optional category limits. See actual spending, remaining amount, and percentage used, calculated only from qualifying expense records in your timezone.',
  'features.item.goals.title': 'Savings goals',
  'features.item.goals.body':
    'Track a goal with a contribution ledger, including an editable emergency-fund preset. Progress and remaining amount come from recorded contributions, with overfunding displayed honestly.',
  'features.item.reports.title': 'Dashboard and reports',
  'features.item.reports.body':
    'See tracked balance, period income and expenses, goal progress, and recent activity. Reports show income versus expenses and spending by category for the period you choose.',
  'features.item.customization.title': 'Customization and preferences',
  'features.item.customization.body':
    'Show, hide, and reorder dashboard widgets; the layout is saved to your account. Choose currency, timezone, date format, week start, theme, and English or Bangla labels.',
  'features.item.data.title': 'Your data, in your hands',
  'features.item.data.body':
    'Export your transactions as CSV and delete your account through a confirmed self-service flow. Records are scoped to the signed-in owner on the server, not just hidden in the interface.',
  'features.notYetTitle': 'Not built yet',
  'features.notYet.onboarding': 'Guided onboarding — designed and approved, not built yet.',
  'features.notYet.recovery':
    'Password recovery and email verification — waiting on an email provider decision.',
  'features.notYet.search':
    'Text search across transactions — filters cover type, account, category, dates, and amounts today.',
  'features.notYet.later':
    'AI assistant, recurring transactions, notifications, and bank or mobile-wallet connections — later phases, deliberately excluded from this build.',
  'features.noteFoundation': 'This is a foundation build, not a finished product. See the',
  'features.noteSitemap': 'sitemap',
  'features.noteMiddle': 'for the status of every route, or',
  'features.noteCreate': 'create an account',
  'features.noteAfter': 'to try the available workflows.',
  'about.eyebrow': 'About',
  'about.title': 'A calmer way to understand your money',
  'about.lead':
    'MoneyFlow is a personal finance companion for students, beginner savers, and young earners. It is an early foundation build, and this page describes only what exists.',
  'about.purposeTitle': 'Why it exists',
  'about.purposeBody1':
    'MoneyFlow is built around one promise: know your money, build better habits, reach your goals. Instead of bank connections or automatic imports, you record what happened, and the app turns those records into clear balances, spending summaries, budget progress, and savings goal progress.',
  'about.purposeBody2':
    'The first audience is people in Bangladesh who want a simple starting point. BDT is the first supported currency, and the interface supports English and Bangla labels. Other currencies are designed for, but multi-currency conversion is not implemented.',
  'about.principlesTitle': 'How it is built',
  'about.principle.numbers':
    'Financial totals come from deterministic, tested code — never from an AI model.',
  'about.principle.isolation':
    'Every private record is scoped to its signed-in owner on the server.',
  'about.principle.honesty':
    'The interface never invents balances, trends, testimonials, or certifications.',
  'about.principle.neutral': 'Spending guidance is neutral: no shame, streaks, or dark patterns.',
  'about.principle.status':
    'Not-built features are labelled as not built, in the app and on this site.',
  'about.relationshipTitle': 'Relationship to PaathAI',
  'about.relationshipBody':
    'MoneyFlow is a standalone product under the PaathAI umbrella. It is separate from the PaathAI education platform: it contains no courses, board questions, or student learning rooms. “MoneyFlow” is currently a working name; the final product name is not decided.',
  'about.statusTitle': 'Current status',
  'about.statusBody':
    'Accounts, transactions, categories, budgets, savings goals, reports, dashboard customization, preferences, CSV export, and account deletion are implemented. Onboarding, password recovery, and email verification are not built yet. There is no pricing and no paid plan.',
  'about.statusNoteBefore': 'The full route-by-route status is in the',
  'about.statusNoteSitemap': 'sitemap',
  'about.statusNoteMiddle': '. Questions can go through the',
  'about.statusNoteContact': 'contact page',
  'about.statusNoteAfter': '.',
  'contact.eyebrow': 'Contact',
  'contact.title': 'Get help or report a problem',
  'contact.lead':
    'MoneyFlow is an early build without a support inbox yet. The project issue tracker is the working support channel.',
  'contact.issuesTitle': 'Open an issue',
  'contact.issuesBody':
    'Report a bug, ask a question, or suggest an improvement in the project issue tracker. It is the only support channel that currently exists, and no email address or contact form is offered because neither is set up.',
  'contact.issuesButton': 'Open the issue tracker',
  'contact.includeTitle': 'What to include',
  'contact.include.what': 'What you were trying to do, and what happened instead.',
  'contact.include.where': 'The page address and the approximate time.',
  'contact.include.context': 'Whether you were signed in, and which browser and device you used.',
  'contact.privacyTitle': 'Please do not share private financial details',
  'contact.privacyBody':
    'Do not post your password, session cookie, or real account numbers, and redact transaction descriptions and amounts from screenshots. A description of the problem is enough; exported records are not needed to investigate most issues.',
  'contact.privacyNoteBefore': 'For what the app stores and how it is protected, see the',
  'contact.privacyNoteSitemap': 'sitemap',
  'contact.privacyNoteAfter':
    'for the current status of the privacy policy. It is not published yet and is not replaced by placeholder text.',
  'siteMap.eyebrow': 'Sitemap',
  'siteMap.title': 'Every page, and whether it exists',
  'siteMap.lead':
    'Search the full route inventory, filter it by area, and check what each page needs before you open it. Planned and deferred pages are labelled, never linked as if they worked.',

  // Route catalogue labels and descriptions (shown by the sitemap)
  'route.home.label': 'Home',
  'route.home.description': 'Product overview, capabilities, and the honest build status.',
  'route.features.label': 'Features',
  'route.features.description': 'What MoneyFlow does today, and what is still being built.',
  'route.about.label': 'About',
  'route.about.description': 'What MoneyFlow is, who it is for, and how it relates to PaathAI.',
  'route.contact.label': 'Contact',
  'route.contact.description': 'Where to report a problem or ask a question.',
  'route.siteMap.label': 'Sitemap',
  'route.siteMap.description':
    'Every route in this app, grouped, searchable, and honestly labelled.',
  'route.privacy.label': 'Privacy policy',
  'route.privacy.description': 'Privacy policy describing the actual data handling.',
  'route.privacy.note':
    'Not published yet: the policy text must match the shipped implementation and pass the legal review in requirements.md §18.13 / DR-17.',
  'route.terms.label': 'Terms of service',
  'route.terms.description': 'Terms appropriate to the actual product and jurisdiction.',
  'route.terms.note':
    'Not published yet: awaiting the same legal review (requirements.md §18.13). No placeholder terms are shown.',
  'route.pricing.label': 'Pricing',
  'route.pricing.description': 'Plan and price information.',
  'route.pricing.note':
    'Deliberately absent: pricing is an open decision (requirements.md §18.12). No plans or prices are invented.',
  'route.signIn.label': 'Sign in',
  'route.signIn.description':
    'Email and password sign-in; the session lives in an HttpOnly cookie.',
  'route.signUp.label': 'Create account',
  'route.signUp.description': 'Create a MoneyFlow account with email and password.',
  'route.forgotPassword.label': 'Forgot password',
  'route.forgotPassword.description': 'Request a password-reset link by email.',
  'route.forgotPassword.note':
    'Blocked on the email-provider decision (requirements.md §18.10 / DR-06); no fake recovery flow is offered.',
  'route.resetPassword.label': 'Reset password',
  'route.resetPassword.description': 'Set a new password from a single-use reset link.',
  'route.resetPassword.note': 'Ships with forgot-password once a mail provider exists (DR-06).',
  'route.verifyEmail.label': 'Verify email',
  'route.verifyEmail.description': 'Confirm ownership of the sign-up email address.',
  'route.verifyEmail.note':
    'Email verification is disabled in the auth configuration until a mail provider exists (ADR-0006 decision 8).',
  'route.onboarding.label': 'Onboarding',
  'route.onboarding.description':
    'Welcome, basic preferences, a first account, an explanation of income/expense/transfer, optional goal and budget setup.',
  'route.onboarding.note':
    'Approved as the next increment (server-persisted progress, migration included) but not built yet.',
  'route.dashboard.label': 'Dashboard',
  'route.dashboard.description':
    'Tracked balance, period income and expenses, goal progress, and recent activity.',
  'route.accounts.label': 'Accounts',
  'route.accounts.description':
    'Wallets and accounts with opening balances and derived current balances.',
  'route.transactions.label': 'Transactions',
  'route.transactions.description':
    'Recorded income, expenses, and transfers with filters and pagination.',
  'route.transactionsNew.label': 'Add transaction',
  'route.transactionsNew.description': 'Create an income, expense, or transfer entry.',
  'route.categories.label': 'Categories',
  'route.categories.description':
    'Your own income and expense categories, with safe archive rules.',
  'route.budgets.label': 'Budgets',
  'route.budgets.description':
    'Period budgets with actual spending, remaining amount, and percentage used.',
  'route.goals.label': 'Savings goals',
  'route.goals.description':
    'Savings goals tracked by a contribution ledger, including the emergency-fund preset.',
  'route.goalDetail.label': 'Goal detail',
  'route.goalDetail.description': 'One goal: progress, remaining amount, and contribution history.',
  'route.goalDetail.note':
    'Openable only from the goals list, because it needs a specific goal id.',
  'route.reports.label': 'Reports',
  'route.reports.description': 'Income versus expense over a period, plus spending by category.',
  'route.customize.label': 'Customize dashboard',
  'route.customize.description':
    'Show, hide, and reorder dashboard widgets; the layout is saved to your account.',
  'route.assistant.label': 'AI assistant',
  'route.assistant.description': 'Explanations of your own recorded data in plain language.',
  'route.assistant.note':
    'V1 scope, not Phase 1 (requirements.md §6.2). Deterministic calculations stay the source of truth.',
  'route.settings.label': 'Settings',
  'route.settings.description':
    'Overview of your profile, preferences, security, and data controls.',
  'route.settingsProfile.label': 'Profile',
  'route.settingsProfile.description': 'Display name and account details.',
  'route.settingsPreferences.label': 'Preferences',
  'route.settingsPreferences.description':
    'Currency, timezone, date format, week start, theme, and language.',
  'route.settingsSecurity.label': 'Security',
  'route.settingsSecurity.description': 'Session information and sign-out.',
  'route.settingsData.label': 'Data controls',
  'route.settingsData.description':
    'CSV export of your transactions and self-service account deletion.',
  'routeGroup.public': 'Public',
  'routeGroup.auth': 'Authentication',
  'routeGroup.onboarding': 'Onboarding',
  'routeGroup.app': 'Core app',
  'routeGroup.settings': 'Settings',

  // Sitemap view
  'sitemap.searchLabel': 'Search routes',
  'sitemap.searchPlaceholder': 'Search by name, path, or status',
  'sitemap.filterLabel': 'Filter by area',
  'sitemap.allAreas': 'All areas',
  'sitemap.reset': 'Reset',
  'sitemap.count': '{shown} of {total} routes shown.',
  'sitemap.legend': 'Status legend',
  'sitemap.emptyTitle': 'No routes match your search',
  'sitemap.emptyBody': 'Try a different word, choose another area, or reset the filters.',
  'sitemap.detailsEyebrow': 'Route details',
  'sitemap.area': 'Area',
  'sitemap.access': 'Access',
  'sitemap.status': 'Status',
  'sitemap.parent': 'Parent',
  'sitemap.anyone': 'Anyone',
  'sitemap.signedIn': 'Signed-in users only — enforced by the API',
  'sitemap.signInRequired': 'Sign-in required',
  'sitemap.open': 'Open {name}',
  'sitemap.dynamicNote': 'This page needs a specific record id, so it opens from its parent page.',
  'sitemap.unavailable': 'This destination is not available yet.',
  'sitemap.textListSummary': 'Text list of all routes',
  'sitemap.textListNote':
    'A plain, non-interactive list with the same information for keyboard and screen-reader users.',
  'sitemap.status.implemented': 'Available',
  'sitemap.status.planned': 'Planned',
  'sitemap.status.deferred': 'Deferred',

  // Accounts
  'accounts.title': 'Accounts',
  'accounts.subtitle':
    'Cash, bank, and wallet balances you track — computed from your recorded activity.',
  'accounts.emptyTitle': 'No accounts yet',
  'accounts.emptyBody':
    'Add the cash, bank, or mobile-wallet accounts you want to track. Balances start from the opening balance you enter and update as you record transactions.',
  'accounts.addFirst': 'Add your first account',
  'accounts.activeTitle': 'Active accounts',
  'accounts.activeCount': '{count} in use',
  'accounts.activeEmpty': 'No active accounts. Unarchive one below or add a new account.',
  'accounts.archivedTitle': 'Archived',
  'accounts.archivedSubtitle': 'History is preserved',
  'accounts.archivedNote':
    'Archived accounts keep their recorded history and stay visible here. They cannot be used for new transactions.',
  'accounts.newButton': 'New account',
  'accounts.serverBalanceNote': 'Balances are computed by the server from your records.',
  'accounts.openingNote':
    'Opening balances are not income. They only set the starting point of an account; income and spending come from your recorded transactions.',
  'accounts.archiveTitle': 'Archive this account?',
  'accounts.archiveBody':
    '{name} will disappear from active use. Its balance, opening balance, and recorded transaction history stay intact, and it can be unarchived at any time.',
  'accounts.archiveButton': 'Archive account',
  'accounts.openingLabel': 'Opening {amount}',
  'accounts.editAria': 'Edit {name}',
  'accounts.archiveAria': 'Archive {name}',
  'accounts.unarchiveAria': 'Unarchive {name}',
  'accounts.unarchiveButton': 'Unarchive',
  'accounts.archivedBadge': 'Archived',
  'accounts.formEditTitle': 'Edit account',
  'accounts.formNewTitle': 'New account',
  'accounts.formEditBody':
    'The account kind cannot change after creation. Archived accounts stay editable.',
  'accounts.formNewBody':
    'Choose a name and the balance the account holds today. You can change the opening balance until the account has activity.',
  'accounts.nameLabel': 'Account name',
  'accounts.nameRequired': 'Enter an account name.',
  'accounts.nameTooLong': 'Use at most 80 characters.',
  'accounts.kindLabel': 'Account kind',
  'accounts.kindFixed': 'Kind is fixed after creation.',
  'accounts.currencyLabel': 'Currency',
  'accounts.currencyHint': 'BDT only in this build; no conversion is performed.',
  'accounts.openingLabelBdt': 'Opening balance (BDT)',
  'accounts.openingError': 'Use a signed amount with at most 2 decimals, e.g. 0 or 3500.50.',
  'accounts.openingFixed':
    'This account already has recorded activity, so its opening balance is fixed. Record an adjustment transaction instead.',
  'accounts.save': 'Save account',
  'accounts.saving': 'Saving…',
  'accounts.saveError': 'Could not save the account. Try again.',
  'accounts.updateError': 'Could not update the account.',
  'accounts.type.CASH': 'Cash',
  'accounts.type.BANK': 'Bank account',
  'accounts.type.MOBILE_WALLET': 'Mobile wallet',
  'accounts.type.SAVINGS': 'Savings account',
  'accounts.type.OTHER': 'Other',

  // Transactions
  'transactions.title': 'Transactions',
  'transactions.subtitle':
    'Every recorded movement of money — filter, edit, or remove your own records.',
  'transactions.newButton': 'New transaction',
  'transactions.searchNote':
    'Search is not available yet; type, account, category, and date filters are.',
  'transactions.filtersTitle': 'Filters',
  'transactions.filtersSubtitle': 'Applied by the server',
  'transactions.type': 'Type',
  'transactions.allTypes': 'All types',
  'transactions.account': 'Account',
  'transactions.allAccounts': 'All accounts',
  'transactions.category': 'Category',
  'transactions.allCategories': 'All categories',
  'transactions.fromDate': 'From date',
  'transactions.toDate': 'To date',
  'transactions.applyFilters': 'Apply filters',
  'transactions.dateRangeError': 'The start date must not be after the end date.',
  'transactions.activityTitle': 'Your activity',
  'transactions.activitySubtitle': 'Recorded movements',
  'transactions.showing': 'Showing {from}–{to} of {total} recorded transactions.',
  'transactions.showingOne': 'Showing {from}–{to} of {total} recorded transaction.',
  'transactions.emptyFilteredTitle': 'No transactions match these filters.',
  'transactions.emptyFilteredBody': 'Change or clear the filters to see other recorded activity.',
  'transactions.emptyTitle': 'No transactions yet',
  'transactions.emptyBody':
    'Record money in, money out, or a transfer between your own accounts. Nothing is shown until you save a transaction.',
  'transactions.clearFilters': 'Clear filters',
  'transactions.addFirst': 'Add your first transaction',
  'transactions.editTitle': 'Edit transaction',
  'transactions.editBody':
    'The type cannot change. Delete and record a new transaction if the direction was wrong.',
  'transactions.deleteTitle': 'Delete this transaction?',
  'transactions.deleteBody':
    '“{description}” will be permanently removed and account balances, reports, and budgets will change. This cannot be undone.',
  'transactions.deleteButton': 'Delete transaction',
  'transactions.deleteError': 'Could not delete the transaction.',
  'transactions.editAria': 'Edit transaction: {description}',
  'transactions.deleteAria': 'Delete transaction: {description}',
  'transactions.previous': 'Previous',
  'transactions.next': 'Next',

  // Transaction form and new-transaction confirmation
  'txform.addAccountTitle': 'Add an account first',
  'txform.addAccountBody':
    'A transaction needs an active account. Create one, then come back to record the movement.',
  'txform.goToAccounts': 'Go to Accounts',
  'txform.pageTitle': 'New transaction',
  'txform.pageSubtitle': 'Record money in, money out, or a move between your own accounts.',
  'txform.backToTransactions': 'Back to transactions',
  'txform.typeLegend': 'Type',
  'txform.typeCannotChange': '{type} (type cannot be changed)',
  'txform.typeAria': 'Transaction type',
  'txform.type.INCOME': 'Money in',
  'txform.type.EXPENSE': 'Money out',
  'txform.type.TRANSFER': 'Transfer',
  'txform.type.ADJUSTMENT': 'Adjustment',
  'txform.typeHint':
    'Transfers move money between your own accounts — never counted as income or spending.',
  'txform.amountLabel': 'Amount (BDT)',
  'txform.amountPlaceholder': 'e.g. 3500.50',
  'txform.errorAmountRequired': 'Enter an amount greater than zero.',
  'txform.errorAmountFormat': 'Use digits with at most 2 decimals, e.g. 3500 or 3500.50.',
  'txform.fromAccount': 'From account',
  'txform.account': 'Account',
  'txform.toAccount': 'To account',
  'txform.selectAccount': 'Select an account',
  'txform.selectDestination': 'Select a destination',
  'txform.category': 'Category',
  'txform.selectCategory': 'Select a category',
  'txform.archivedSuffix': ' (archived)',
  'txform.adjustmentDirection': 'Adjustment direction',
  'txform.increase': 'Increase the recorded balance',
  'txform.decrease': 'Decrease the recorded balance',
  'txform.date': 'Date',
  'txform.time': 'Time',
  'txform.note': 'Note',
  'txform.notePlaceholder': 'e.g. Monthly groceries',
  'txform.timeOptional': '(optional)',
  'txform.noteOptional': '(optional)',
  'txform.noteRequired': '(required)',
  'txform.timezoneNote':
    'Saved to your account. Times use {timezone}; a date without a time is recorded at local noon.',
  'txform.errorAccount': 'Choose an account.',
  'txform.errorSource': 'Choose a source account.',
  'txform.errorDestination': 'Choose a destination account.',
  'txform.errorSameAccount': 'Destination must differ from the source account.',
  'txform.errorCategory': 'Choose a category.',
  'txform.errorDate': 'Choose a date.',
  'txform.errorRealDate': 'Choose a real calendar date.',
  'txform.errorFutureDate': 'Future dates are not accepted; record planned spending later.',
  'txform.errorTime': 'Use a valid 24-hour time.',
  'txform.errorNoteRequired': 'A note is required for an adjustment.',
  'txform.save': 'Save transaction',
  'txform.saveChanges': 'Save changes',
  'txform.saving': 'Saving…',
  'txform.serverError': 'Could not save the transaction.',
  'txform.savedNote':
    'Saved to your account. Times use {timezone}; a date without a time is recorded at local noon.',
  'txform.successTitle': 'Transaction saved',
  'txform.successBody':
    'Your account balances, dashboard, reports, and budgets now include this record.',
  'txform.viewTransactions': 'View transactions',
  'txform.recordAnother': 'Record another',

  // Settings index
  'settings.title': 'Settings',
  'settings.subtitle': 'Profile, preferences, and customization saved to your account.',
  'settings.sectionsTitle': 'Sections',
  'settings.sectionsSubtitle': 'What each section does today',
  'settings.section.profile.label': 'Profile',
  'settings.section.profile.body': 'Display name, loaded from and saved to your account.',
  'settings.section.preferences.label': 'Preferences',
  'settings.section.preferences.body':
    'Theme, language, timezone, week start, date/number formats, and reduced motion — saved per user.',
  'settings.section.layout.label': 'Dashboard layout',
  'settings.section.layout.body':
    'Show, hide, reorder, or reset the dashboard widgets saved to your account.',
  'settings.section.security.label': 'Security',
  'settings.section.security.body':
    'Authentication and server-enforced sessions are live; session management and password recovery are not built yet.',
  'settings.section.data.label': 'Data',
  'settings.section.data.body':
    'Download every recorded transaction as CSV, or permanently delete your account and its records.',
  'settings.note':
    'Authentication is live and enforced by the server. Session management, password change, and email recovery remain unbuilt and are never presented as operational. CSV export and self-service account deletion are real and documented in Data.',

  // Profile settings
  'profile.title': 'Profile',
  'profile.subtitle': 'How MoneyFlow addresses you. Your email remains your sign-in identity.',
  'profile.cardTitle': 'Display name',
  'profile.cardSubtitle': 'Saved to your account',
  'profile.email': 'Email',
  'profile.emailHint': 'Email is your sign-in identity and cannot be changed here.',
  'profile.displayName': 'Display name',
  'profile.nameErrorRequired': 'Enter a display name.',
  'profile.nameErrorShort': 'Use at least 2 characters.',
  'profile.nameErrorLong': 'Keep it to 100 characters or fewer.',
  'profile.nameHint': 'Shown in greetings and on your dashboard. Never a login.',
  'profile.save': 'Save profile',
  'profile.saving': 'Saving…',
  'profile.saved': 'Profile saved.',
  'profile.saveError': 'Could not save your profile. Please try again.',
  'profile.guestTitle': 'Sign in to manage your profile',
  'profile.guestBody': 'Your profile belongs to your MoneyFlow account.',
  'profile.loadErrorTitle': 'Could not load your profile',
  'profile.loadErrorBody': 'Check your connection and try again.',
  'profile.loading': 'Loading profile',

  // Preferences settings
  'preferences.title': 'Preferences',
  'preferences.subtitle': 'Display and reporting preferences saved to your account.',
  'preferences.cardTitle': 'Your preferences',
  'preferences.cardSubtitle': 'Applied across the dashboard, reports, budgets, and goals',
  'preferences.note':
    'Preferences change presentation and reporting boundaries only. They never edit or convert recorded financial data.',
  'preferences.theme': 'Theme',
  'preferences.themeSystemHint': 'System follows your operating-system setting.',
  'preferences.language': 'Language',
  'preferences.languageHint': 'Label language. Number numerals follow the format choice below.',
  'preferences.timezone': 'Timezone',
  'preferences.timezoneHint':
    'Used for reporting and budget periods. Choose any IANA timezone, e.g. Asia/Dhaka.',
  'preferences.currency': 'Currency',
  'preferences.currencyHint':
    'BDT is the only MVP currency. Amounts are stored exactly and are never converted.',
  'preferences.weekStart': 'Week starts on',
  'preferences.weekStartHint': 'Used for weekly report buckets.',
  'preferences.dateFormat': 'Date format',
  'preferences.numberFormat': 'Numerals',
  'preferences.reducedMotion': 'Reduced motion',
  'preferences.preview': 'Preview',
  'preferences.previewAmount': 'Amount: {amount}',
  'preferences.previewDate': 'Date: {date}',
  'preferences.previewShare': 'Share: {share}',
  'preferences.save': 'Save preferences',
  'preferences.saving': 'Saving…',
  'preferences.saved': 'Preferences saved to your account.',
  'preferences.noChanges': 'No changes to save.',
  'preferences.saveError': 'Could not save preferences. Please try again.',
  'preferences.sessionExpired': 'Your session has expired. Sign in again to save preferences.',
  'preferences.guestTitle': 'Sign in to manage preferences',
  'preferences.guestBody':
    "Preferences are saved to your account. Without a session, only this browser's theme and language choices are remembered.",
  'preferences.loadErrorTitle': 'Could not load your preferences',
  'preferences.loadErrorBody': 'Check your connection and try again.',
  'preferences.loading': 'Loading preferences',
  'preferences.option.light': 'Light',
  'preferences.option.dark': 'Dark',
  'preferences.option.system': 'System',
  'preferences.option.followSystem': 'Follow system',
  'preferences.option.reduceMotion': 'Reduce motion',
  'preferences.option.dmy': 'Day / month / year',
  'preferences.option.mdy': 'Month / day / year',
  'preferences.option.ymd': 'Year / month / day',
  'preferences.option.localeDigits': 'Follow language',
  'preferences.option.latinDigits': 'Latin digits (0–9)',
  'preferences.option.bengaliDigits': 'Bengali digits (০–৯)',
  'preferences.weekday.SATURDAY': 'Saturday',
  'preferences.weekday.SUNDAY': 'Sunday',
  'preferences.weekday.MONDAY': 'Monday',
  'preferences.weekday.TUESDAY': 'Tuesday',
  'preferences.weekday.WEDNESDAY': 'Wednesday',
  'preferences.weekday.THURSDAY': 'Thursday',
  'preferences.weekday.FRIDAY': 'Friday',
  'preferences.savedNote':
    'Saving preferences never changes recorded transactions, balances, budgets, or goals.',

  // Security settings
  'security.title': 'Security',
  'security.subtitle': 'Your session today, and the controls that are still planned.',
  'security.currentTitle': 'Current session',
  'security.currentSubtitle': 'Server-enforced',
  'security.currentBody':
    'You are signed in with an HttpOnly session cookie. Every private page and API call checks that session on the server; hiding a button or page never protects data by itself.',
  'security.plannedTitle': 'Planned controls',
  'security.plannedSubtitle': 'Each arrives with its real backend flow',
  'security.plannedBadge': 'Planned',
  'security.planned.sessions.name': 'Active sessions',
  'security.planned.sessions.body':
    'List where you are signed in and end a session you do not recognise.',
  'security.planned.signOutAll.name': 'Sign out everywhere',
  'security.planned.signOutAll.body':
    'End every session at once when you think an account is at risk.',
  'security.planned.password.name': 'Password change',
  'security.planned.password.body':
    'Passwords are already hashed with Argon2id and never stored or logged in plain text; a change flow is not built yet.',
  'security.planned.recovery.name': 'Email verification and recovery',
  'security.planned.recovery.body':
    'Confirm your address and regain access — planned, waiting on an email provider decision.',
  'security.noteTitle': 'Security is enforced by the server, never by hiding pages',
  'security.noteBody':
    'Every private record is checked against the signed-in user on the server, so a page being hidden or a button being disabled never protects anything by itself. Sensitive actions ask you to confirm again, and sign-in problems are described in general terms so the page cannot be used to discover which email addresses have accounts.',
  'security.signingOut': 'Signing out…',
  'security.signOutError': 'Could not sign out. Try again.',
  'security.signOutHint':
    'This ends the session on this device. Other devices keep their own sessions.',

  // Data settings
  'data.title': 'Your data',
  'data.subtitle': 'Download your transactions, or permanently delete your MoneyFlow account.',
  'data.exportTitle': 'Export transactions',
  'data.exportSubtitle': 'CSV · generated from your own records',
  'data.exportBody':
    'The export contains every transaction currently recorded in your account, newest first. Amounts keep their exact recorded value, dates are UTC, and text that a spreadsheet could treat as a formula is neutralized. Account and category names are included; internal database identifiers are not.',
  'data.exportButton': 'Download transactions CSV',
  'data.exporting': 'Preparing CSV…',
  'data.exportStarted': 'Download started: {filename}',
  'data.exportError': 'Could not export your transactions. Please try again.',
  'data.exportHint':
    'Includes every transaction currently recorded in your account. The file is generated by the server from your own rows only.',
  'data.deleteTitle': 'Delete account',
  'data.deleteSubtitle': 'Permanent · requires your password',
  'data.deleteBody':
    "Deletion removes your profile, financial accounts, transactions, categories, budgets, goals and contributions, preferences, dashboard layout, sign-in credentials, and every active session. Other people's records are never touched.",
  'data.deleteButton': 'Delete my account…',
  'data.deleteHint':
    'This permanently removes your user and every row it owns. Financial accounts cannot be deleted individually — they are archived — so deleting the user is the only hard delete of financial data.',
  'data.deleteDialogTitle': 'Delete your MoneyFlow account?',
  'data.deleteDialogBody':
    'This cannot be undone. Your accounts, transactions, categories, budgets, goals, contributions, preferences, and dashboard layout will be permanently removed, and you will be signed out everywhere.',
  'data.currentPassword': 'Current password',
  'data.confirmLabel': 'Type DELETE to confirm',
  'data.confirmHint':
    "The word must be exactly uppercase. Backups are not claimed to be erased here; they age out under the hosting provider's retention policy.",
  'data.deleteConfirmButton': 'Delete account permanently',
  'data.deleting': 'Deleting your account…',
  'data.deleteError': 'Could not delete your account. Please try again.',
  'data.deletedTitle': 'Your MoneyFlow account has been deleted',
  'data.deletedBody':
    'Your profile, financial records, preferences, and sign-in credentials were removed, and every session was ended. A minimal audit record of the deletion remains without amounts or notes.',
  'data.returnHome': 'Return to the home page',
  'data.returning': 'Returning to the home page shortly…',
  'data.auditTitle': 'Retention and audit record',
  'data.auditSubtitle': 'Minimal, without financial content',
  'data.auditBody':
    'Destructive actions and this export write a small audit event: the event type, your user id, and a resource identifier where one exists. Audit metadata never contains amounts, notes, passwords, tokens, or request bodies, and there is no public audit API. When you delete your account, the audit rows remain with the user link removed.',
  'data.auditNote':
    "Deletion removes your live records. Infrastructure backups are not claimed to be erased here; they age out under the hosting provider's retention policy.",

  // Dashboard customization
  'customize.title': 'Customize dashboard',
  'customize.subtitle':
    'Choose which widgets appear and in what order. Changes apply to your account.',
  'customize.cardTitle': 'Widgets',
  'customize.cardSubtitle': 'Shown on /app/dashboard',
  'customize.toolbarNote':
    'Use the arrows to reorder. Hidden widgets stay listed here so you can turn them back on.',
  'customize.reset': 'Reset to default',
  'customize.save': 'Save layout',
  'customize.saving': 'Saving…',
  'customize.saved': 'Dashboard layout saved.',
  'customize.resetDone': 'Dashboard layout reset to the default.',
  'customize.sessionExpired': 'Your session has expired. Sign in again to save the layout.',
  'customize.saveError': 'Could not save the dashboard layout. Please try again.',
  'customize.guestTitle': 'Sign in to customize your dashboard',
  'customize.guestBody': 'Dashboard layouts are saved to your own account.',
  'customize.loadErrorTitle': 'Could not load your dashboard layout',
  'customize.loadErrorBody': 'Check your connection and try again.',
  'customize.loading': 'Loading dashboard layout',
  'customize.moveUp': 'Move {name} up',
  'customize.moveDown': 'Move {name} down',
  'customize.note':
    'Every layout keeps all supported widgets exactly once. The API rejects malformed or unknown widget ids, and it can only ever save to your own account.',
  'customize.widget.totalBalance.name': 'Total tracked balance',
  'customize.widget.totalBalance.body': 'Your tracked account balance, computed by the server.',
  'customize.widget.income.name': 'Income summary',
  'customize.widget.income.body': 'Recorded income for the selected period.',
  'customize.widget.expense.name': 'Expense summary',
  'customize.widget.expense.body': 'Recorded spending for the selected period.',
  'customize.widget.recentTransactions.name': 'Recent activity',
  'customize.widget.recentTransactions.body': 'The latest recorded activity.',
  'customize.widget.spendingByCategory.name': 'Spending by category',
  'customize.widget.spendingByCategory.body': 'Server-computed category shares for the period.',
  'customize.widget.goals.name': 'Savings goals',
  'customize.widget.goals.body': 'Progress from your recorded goal contributions.',
  'customize.widget.budgets.name': 'Budget status',
  'customize.widget.budgets.body': 'A pointer to your monthly budget plans.',
  'dashboard.allHiddenTitle': 'All dashboard widgets are hidden.',
  'dashboard.allHiddenBody':
    'Your financial data is still recorded. Turn widgets back on to see it here.',
  'dashboard.customize': 'Customize dashboard',

  // Not-found, error, and loading states
  'notFound.eyebrow': 'Error 404 · Page not found',
  'notFound.title': 'This page does not exist',
  'notFound.bodySite':
    'The link you followed may be broken, or the page may have been moved. Nothing was changed — sign in to view your own recorded financial data.',
  'notFound.bodyApp':
    'The link you followed may be broken, or the page may have been moved. Nothing was changed — your accounts, transactions, goals, and budgets are unaffected.',
  'notFound.recovery': 'Page-not-found recovery',
  'notFound.backHome': 'Back to home',
  'notFound.openApp': 'Open the app',
  'notFound.backDashboard': 'Back to dashboard',
  'notFound.viewTransactions': 'View transactions',
  'notFound.hintSite': 'Sign in to see figures computed from your own recorded records.',
  'notFound.hintApp': 'Use the menu to reach Accounts, Budgets, Goals, Reports, or Settings.',
  'error.title': 'Something went wrong',
  'error.body':
    'This section could not be displayed. Your records are unaffected — nothing was changed.',
  'error.reference': ' (Reference: {digest})',
  'loading.label': 'Loading',
} as const;

export type TranslationKey = keyof typeof en;

/** Bangla labels — typed against `en`, so a missing key fails `tsc`. */
const bn: Record<TranslationKey, string> = {
  'common.signIn': 'সাইন ইন',
  'common.getStarted': 'শুরু করুন',
  'common.viewAll': 'সব দেখুন',
  'common.manage': 'পরিচালনা',
  'common.loading': 'লোড হচ্ছে…',
  'common.tryAgain': 'আবার চেষ্টা করুন',

  'language.menuLabel': 'ভাষা',
  'language.triggerLabel': 'ভাষা: {current}। ভাষা পরিবর্তন করুন',
  'language.announce': 'ভাষা পরিবর্তন করে {language} করা হয়েছে।',

  'summary.signedOutTitle': 'আপনার ডেটা দেখতে সাইন ইন করুন',
  'summary.signedOutBody':
    'এই পেজে আপনার নিজের অ্যাকাউন্টের হিসাব দেখা যায়, তাই আগে সাইন ইন করতে হবে।',
  'summary.errorTitle': 'আপনার ডেটা লোড করা যায়নি',
  'summary.errorBody': 'রেকর্ড করা হিসাব লোড করার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  'summary.spentCaption': 'রেকর্ড করা খরচ',
  'summary.categorySummary':
    '{period}-এ {name} সবচেয়ে বড় ক্যাটাগরি — {amount} ({percent} রেকর্ড করা খরচের)।',
  'summary.categoryNote': '{period}-এর রেকর্ড করা খরচ।',
  'summary.noSpending': 'এই সময়ে কোনো খরচ রেকর্ড হয়নি।',

  'app.skipToContent': 'মূল কন্টেন্টে যান',
  'app.badge': 'ফাউন্ডেশন বিল্ড',
  'app.addTransaction': 'লেনদেন যোগ করুন',
  'app.menu': 'মেনু',
  'app.footerNote':
    'ফাউন্ডেশন বিল্ড — অ্যাকাউন্ট, লেনদেন, ড্যাশবোর্ড, রিপোর্ট, ক্যাটাগরি, বাজেট ও লক্ষ্যে আপনার রেকর্ড করা ডেটা দেখা যায়।',

  'tx.type.income': 'আয়',
  'tx.type.expense': 'খরচ',
  'tx.type.transfer': 'ট্রান্সফার',
  'tx.type.adjustment': 'সমন্বয়',
  'tx.fallback.income': 'রেকর্ড করা আয়',
  'tx.fallback.expense': 'রেকর্ড করা খরচ',
  'tx.fallback.transfer': 'অ্যাকাউন্টের মধ্যে ট্রান্সফার',
  'tx.fallback.adjustment': 'ব্যালেন্স সমন্বয়',

  'nav.ariaMain': 'প্রধান',
  'nav.dashboard': 'ড্যাশবোর্ড',
  'nav.accounts': 'অ্যাকাউন্ট',
  'nav.transactions': 'লেনদেন',
  'nav.categories': 'ক্যাটাগরি',
  'nav.budgets': 'বাজেট',
  'nav.goals': 'সঞ্চয়ের লক্ষ্য',
  'nav.reports': 'রিপোর্ট',
  'nav.settings': 'সেটিংস',

  'landing.ariaSections': 'সেকশনসমূহ',
  'landing.features': 'ফিচার',
  'landing.howItWorks': 'কীভাবে কাজ করে',
  'landing.privacy': 'গোপনীয়তা',
  'landing.roadmap': 'রোডম্যাপ',
  'landing.menu': 'মেনু',
  'landing.ariaNavMenu': 'নেভিগেশন মেনু',
  'landing.ariaPrimary': 'প্রধান নেভিগেশন',

  'footer.promise': 'আপনার টাকা বুঝুন। ভালো অভ্যাস গড়ুন। লক্ষ্য পৌঁছান।',
  'footer.about':
    'শিক্ষার্থী, নতুন সঞ্চয়কারী ও তরুণ আয়কারীদের জন্য একটি ব্যক্তিগত অর্থসঙ্গী — PaathAI-এর অধীনে একটি স্বতন্ত্র প্রোডাক্ট, PaathAI শিক্ষা প্ল্যাটফর্ম থেকে সম্পূর্ণ আলাদা।',
  'footer.productHeading': 'প্রোডাক্ট',
  'footer.previewHeading': 'অ্যাপ',
  'footer.legalHeading': 'আইনি',
  'footer.legalNote':
    'পাবলিক লঞ্চের আগে এখানে প্রাইভেসি নীতিমালা ও শর্তাবলি প্রকাশ করা হবে। এখানকার কোনো তথ্য আর্থিক পরামর্শ নয়।',
  'footer.copyright':
    '© {year} MoneyFlow — ফাউন্ডেশন বিল্ড। প্রোডাক্টের চূড়ান্ত নাম এখনো নির্ধারিত হয়নি।',
  'footer.capabilities': 'সুবিধাসমূহ',
  'footer.privacyAndTrust': 'গোপনীয়তা ও নিরাপত্তা',
  'footer.featuresLink': 'ফিচারসমূহ',
  'footer.aboutLink': 'পরিচিতি',
  'footer.contactLink': 'যোগাযোগ',
  'footer.sitemapLink': 'সাইটম্যাপ',

  'dashboard.title': 'ড্যাশবোর্ড',
  'dashboard.subtitle': 'এক নজরে আপনার টাকা — আপনার অ্যাকাউন্টের রেকর্ড করা হিসাব।',
  'dashboard.totalBalance': 'মোট ব্যালেন্স',
  'dashboard.totalBalanceMeta':
    'সক্রিয় {count}টি অ্যাকাউন্ট মিলিয়ে ট্র্যাক করা ব্যালেন্স — আর্কাইভ করা অ্যাকাউন্ট বাদ।',
  'dashboard.incomeThisMonth': 'এই মাসের আয়',
  'dashboard.spentThisMonth': 'এই মাসের খরচ',
  'dashboard.periodNote':
    '{period} · {timezone} অনুযায়ী রেকর্ড করা হিসাব। ট্রান্সফার ও সমন্বয় কখনো আয় বা খরচ হিসেবে ধরা হয় না।',
  'dashboard.recentTitle': 'সাম্প্রতিক কার্যকলাপ',
  'dashboard.recentSubtitle': 'সাম্প্রতিক রেকর্ড করা কার্যকলাপ',
  'dashboard.recentEmpty': 'এখনো কোনো লেনদেন রেকর্ড হয়নি।',
  'dashboard.transferNote':
    'ট্রান্সফার আপনার নিজের অ্যাকাউন্টের মধ্যে টাকা সরায়, তাই সেগুলো আলাদা দেখানো হয় এবং কখনো আয় বা খরচ ধরা হয় না।',
  'dashboard.categoriesTitle': 'ক্যাটাগরি অনুযায়ী খরচ',
  'dashboard.categoriesSubtitle': 'এই সময়ের রেকর্ড করা খরচ',
  'dashboard.categoriesEmpty': 'এই সময়ে কোনো খরচ রেকর্ড হয়নি।',
  'dashboard.goalsTitle': 'সঞ্চয়ের লক্ষ্য',
  'dashboard.goalsSubtitle': 'আপনার জমা থেকে হিসাব করা অগ্রগতি',
  'dashboard.goalsEmpty': 'এখনো কোনো লক্ষ্য নেই — কিছু জমা রাখতে একটি লক্ষ্য তৈরি করুন।',
  'dashboard.goalsNote':
    'শুধু ট্র্যাকিং: লক্ষ্যে জমা যোগ করলে অ্যাকাউন্টের মধ্যে টাকা যায় না, খরচও ধরা হয় না।',
  'dashboard.budgetsTitle': 'বাজেট',
  'dashboard.budgetsSubtitle': 'মাসিক খরচের পরিকল্পনা',
  'dashboard.budgetsPlaceholder':
    'বাজেট আলাদা পেজে রাখা আছে: সেখানে মাসিক পরিকল্পনা তৈরি করে খরচের সাথে মিলিয়ে দেখুন। এখানে কোনো বাজেটের হিসাব দেখানো হচ্ছে না।',

  'reports.title': 'রিপোর্ট',
  'reports.subtitle': 'চলতি মাসের রেকর্ড করা আয়, খরচ ও ক্যাটাগরিভিত্তিক মোট।',
  'reports.granularityLabel': 'গ্রুপিং',
  'reports.granularity.daily': 'দৈনিক',
  'reports.granularity.weekly': 'সাপ্তাহিক',
  'reports.granularity.monthly': 'মাসিক',
  'reports.seriesTitle': 'সময়ের সাথে আয় ও খরচ',
  'reports.seriesSubtitle': '{granularity} ভিত্তিতে রেকর্ড করা মোট · {period}',
  'reports.weekStartsNote': 'সপ্তাহ শুরু শনিবার থেকে (বাংলাদেশের প্রচলিত সপ্তাহ)।',
  'reports.seriesEmpty': 'এই সময়ে কোনো কার্যকলাপ রেকর্ড হয়নি।',
  'reports.tableCaption': '{period}-এর রেকর্ড করা আয় ও খরচ, {granularity} ভিত্তিতে।',
  'reports.colBucket': 'সময়',
  'reports.colIncome': 'আয়',
  'reports.colExpense': 'খরচ',
  'reports.colTotal': 'মোট',
  'reports.categoriesTitle': 'ক্যাটাগরি অনুযায়ী খরচ',
  'reports.categoriesSubtitle': '{period}-এর ক্যাটাগরি অনুযায়ী রেকর্ড করা খরচ',
  'reports.categoriesEmpty': 'এই সময়ে কোনো খরচ রেকর্ড হয়নি।',
  'reports.recordedNote':
    '{timezone} অনুযায়ী আপনার রেকর্ড করা লেনদেন থেকে সার্ভারে হিসাব করা — শুধু প্রকৃত অঙ্ক, কোনো পূর্বাভাস নয়।',
  'reports.export': 'CSV এক্সপোর্ট',
  'reports.exportDisabled': 'এই বিল্ডে CSV এক্সপোর্ট এখনো নেই।',
  'reports.moreTitle': 'আরও রিপোর্ট',
  'reports.moreSubtitle': 'এই বিল্ডে এখনো নেই',
  'reports.moreSeries': 'দৈনিক, সাপ্তাহিক ও মাসিক সিরিজ উপরে দেখানো হয়েছে।',
  'reports.moreBudgets': 'বাজেট ও সঞ্চয় লক্ষ্যের রিপোর্ট পরবর্তী আপডেটে আসছে।',
  'reports.moreExports': 'CSV এক্সপোর্ট ও সময়সূচিভিত্তিক রিপোর্ট এক্সপোর্ট কাজের সাথে আসবে।',

  'budgets.title': 'বাজেট',
  'budgets.subtitle': 'মাসিক খরচের পরিকল্পনা — শুধু রেকর্ড করা খরচ, সার্ভারে হিসাব করা।',
  'budgets.newButton': 'নতুন বাজেট',
  'budgets.editButton': 'সম্পাদনা',
  'budgets.deleteButton': 'মুছুন',
  'budgets.pauseButton': 'সাময়িক বিরতি',
  'budgets.resumeButton': 'চালু করুন',
  'budgets.archiveButton': 'আর্কাইভ',
  'budgets.unarchiveButton': 'আর্কাইভ থেকে ফেরান',
  'budgets.paused': 'সাময়িক বিরতিতে',
  'budgets.archived': 'আর্কাইভ করা',
  'budgets.pausedNote':
    'এই পরিকল্পনা সাময়িক বিরতিতে আছে: রেকর্ড করা খরচ কেবল তথ্যের জন্য দেখানো হয়, এটি সক্রিয় পরিকল্পনা নয়।',
  'budgets.emptyTitle': 'এখনো কোনো বাজেট নেই।',
  'budgets.emptyBody':
    'মাসিক খরচের পরিকল্পনা তৈরি করুন — ক্যাটাগরি অনুযায়ী খরচ দেখে নিন কতটুকু ব্যবহার করেছেন।',
  'budgets.noCategories': 'আগে একটি সক্রিয় খরচের ক্যাটাগরি দরকার — ক্যাটাগরি পেজে তৈরি করুন।',
  'budgets.totalRow': 'মোট বাজেট',
  'budgets.spentOf': '{limit} থেকে {spent} খরচ হয়েছে',
  'budgets.remaining': '{amount} বাকি আছে',
  'budgets.overBy': 'সীমার {amount} বেশি খরচ',
  'budgets.percentUsed': '{percent} ব্যবহৃত',
  'budgets.formCreateTitle': 'নতুন বাজেট',
  'budgets.formEditTitle': 'বাজেট সম্পাদনা',
  'budgets.fieldName': 'বাজেটের নাম',
  'budgets.fieldMonth': 'মাস',
  'budgets.fieldTotal': 'মোট সীমা (ঐচ্ছিক)',
  'budgets.fieldCategory': 'ক্যাটাগরি',
  'budgets.fieldLimit': 'সীমা',
  'budgets.selectCategory': 'ক্যাটাগরি বাছুন',
  'budgets.addLimit': 'ক্যাটাগরি সীমা যোগ করুন',
  'budgets.removeLimit': 'সরান',
  'budgets.save': 'বাজেট সংরক্ষণ',
  'budgets.saving': 'সংরক্ষণ হচ্ছে…',
  'budgets.cancel': 'বাতিল',
  'budgets.deleteConfirmTitle': 'এই বাজেটটি মুছবেন?',
  'budgets.deleteConfirmBody':
    '“{name}” ও এর ক্যাটাগরি সীমাগুলো মুছে যাবে। আপনার রেকর্ড করা লেনদেনে কোনো প্রভাব পড়বে না।',
  'budgets.deleteConfirmButton': 'বাজেট মুছুন',
  'budgets.errorNameRequired': 'বাজেটের নাম লিখুন।',
  'budgets.errorNameTooLong': 'নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে।',
  'budgets.errorMonthRequired': 'যে মাসের জন্য বাজেট, সেটি বাছুন।',
  'budgets.errorAmountFormat': '১৫০০ বা ১৫০০.৫০ আকারে পরিমাণ লিখুন।',
  'budgets.errorAmountPositive': 'সীমা শূন্যের চেয়ে বেশি হতে হবে।',
  'budgets.errorNeedLimits': 'মোট সীমা এবং/অথবা অন্তত একটি ক্যাটাগরি সীমা দিন।',
  'budgets.errorTooManyLimits': 'একটি বাজেটে সর্বোচ্চ ৫০টি ক্যাটাগরি রাখা যায়।',
  'budgets.errorDuplicateCategory': 'একই ক্যাটাগরি একাধিকবার দেওয়া যায় না।',
  'budgets.serverError': 'বাজেট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',

  'goals.title': 'সঞ্চয়ের লক্ষ্য',
  'goals.subtitle':
    'আপনি যা জমা রাখছেন — জমার হিসাব থেকে অগ্রগতি ট্র্যাক হয়, অ্যাকাউন্টের মধ্যে টাকা যায় না।',
  'goals.newButton': 'নতুন লক্ষ্য',
  'goals.presetButton': 'ইমার্জেন্সি ফান্ড প্রিসেট',
  'goals.editButton': 'সম্পাদনা',
  'goals.deleteButton': 'মুছুন',
  'goals.pauseButton': 'সাময়িক বিরতি',
  'goals.resumeButton': 'চালু করুন',
  'goals.completeButton': 'সম্পন্ন হিসাবে চিহ্নিত করুন',
  'goals.archiveButton': 'আর্কাইভ',
  'goals.unarchiveButton': 'আর্কাইভ থেকে ফেরান',
  'goals.viewDetails': 'বিস্তারিত দেখুন',
  'goals.status.active': 'সক্রিয়',
  'goals.status.paused': 'সাময়িক বিরতিতে',
  'goals.status.completed': 'সম্পন্ন',
  'goals.status.archived': 'আর্কাইভ করা',
  'goals.type.GENERAL': 'সাধারণ সঞ্চয়',
  'goals.type.EMERGENCY_FUND': 'ইমার্জেন্সি ফান্ড',
  'goals.type.EDUCATION': 'শিক্ষা',
  'goals.type.DEVICE': 'ডিভাইস কেনা',
  'goals.type.TRAVEL': 'ভ্রমণ',
  'goals.type.DEBT_PAYOFF': 'ঋণ পরিশোধ',
  'goals.type.CUSTOM': 'নিজস্ব লক্ষ্য',
  'goals.priority.LOW': 'কম',
  'goals.priority.MEDIUM': 'মাঝারি',
  'goals.priority.HIGH': 'বেশি',
  'goals.presetName': 'ইমার্জেন্সি ফান্ড',
  'goals.presetNote':
    'প্রস্তাবিত নমুনা লক্ষ্য — আপনার অবস্থা অনুযায়ী বদলে নিন। এটি একটি প্রস্তাব, আর্থিক পরামর্শ নয়।',
  'goals.savedOf': '{target}-এর মধ্যে {saved} জমা',
  'goals.remaining': '{amount} বাকি',
  'goals.overTarget': 'লক্ষ্যের চেয়ে {amount} বেশি',
  'goals.percentOfTarget': 'লক্ষ্যের {percent}',
  'goals.deadline': 'সময়সীমা {date}',
  'goals.noDeadline': 'কোনো সময়সীমা নেই',
  'goals.trackingNote':
    'আপনি যে জমা রেকর্ড করেন তার ভিত্তিতে অগ্রগতি হিসাব হয়। জমা যোগ করলে অ্যাকাউন্টের মধ্যে টাকা যায় না এবং তা আয় বা খরচ হিসেবে ধরা হয় না।',
  'goals.emptyTitle': 'এখনো কোনো লক্ষ্য নেই।',
  'goals.emptyBody':
    'কিছু জমা রাখার হিসাব রাখতে একটি লক্ষ্য তৈরি করুন। জমা শুধু ট্র্যাকিং — অ্যাকাউন্টের মধ্যে টাকা যায় না।',
  'goals.formCreateTitle': 'নতুন লক্ষ্য',
  'goals.formEditTitle': 'লক্ষ্য সম্পাদনা',
  'goals.fieldName': 'লক্ষ্যের নাম',
  'goals.fieldType': 'ধরন',
  'goals.fieldTarget': 'লক্ষ্যের পরিমাণ',
  'goals.fieldStart': 'শুরুর তারিখ',
  'goals.fieldDeadline': 'সময়সীমা (ঐচ্ছিক)',
  'goals.fieldPriority': 'গুরুত্ব',
  'goals.save': 'লক্ষ্য সংরক্ষণ করুন',
  'goals.saving': 'সংরক্ষণ হচ্ছে…',
  'goals.cancel': 'বাতিল',
  'goals.deleteConfirmTitle': 'এই লক্ষ্যটি মুছবেন?',
  'goals.deleteConfirmBody':
    '“{name}” এবং তার জমার ইতিহাস মুছে যাবে। অ্যাকাউন্টের ব্যালেন্স, আয়, খরচ বা বাজেটে কোনো প্রভাব পড়বে না।',
  'goals.deleteConfirmButton': 'লক্ষ্য মুছুন',
  'goals.errorNameRequired': 'লক্ষ্যের নাম লিখুন।',
  'goals.errorNameTooLong': 'নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারবে।',
  'goals.errorTargetFormat': '৩০০০০ বা ৩০০০০.৫০ আকারে পরিমাণ লিখুন।',
  'goals.errorTargetPositive': 'লক্ষ্য শূন্যের চেয়ে বেশি হতে হবে।',
  'goals.errorStartRequired': 'শুরুর তারিখ বাছুন।',
  'goals.errorDeadlineBeforeStart': 'সময়সীমা শুরুর তারিখের আগে হতে পারবে না।',
  'goals.serverError': 'লক্ষ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  'goals.actionError': 'কাজটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।',
  'goals.contributionAmount': 'জমার পরিমাণ',
  'goals.contributionDate': 'তারিখ (ঐচ্ছিক)',
  'goals.contributionNote': 'নোট (ঐচ্ছিক)',
  'goals.addContribution': 'জমা যোগ করুন',
  'goals.adding': 'যোগ হচ্ছে…',
  'goals.errorContributionFormat': '৫০০ বা ৫০০.৫০ আকারে জমার পরিমাণ লিখুন।',
  'goals.errorContributionPositive': 'জমার পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।',
  'goals.errorContributionFuture': 'আজ বা আগের কোনো তারিখ বাছুন।',
  'goals.contributionServerError': 'জমা যোগ করা যায়নি। আবার চেষ্টা করুন।',
  'goals.historyTitle': 'জমার ইতিহাস',
  'goals.historySubtitle': 'সব জমা ও ফেরানো এন্ট্রি, নতুন আগে',
  'goals.contributionPausedNote':
    'লক্ষ্য সক্রিয় থাকলেই কেবল জমা যোগ করা যায়। যোগ করতে চাইলে চালু করুন বা আর্কাইভ থেকে ফেরান।',
  'goals.historyEmpty': 'এখনো কোনো জমা রেকর্ড হয়নি।',
  'goals.contributionLabel': 'জমা',
  'goals.reversalLabel': 'ফেরানো এন্ট্রি',
  'goals.reverseButton': 'ফেরান',
  'goals.reversedNote': 'ইতিমধ্যে ফেরানো হয়েছে',
  'goals.reverseConfirmTitle': 'এই জমাটি ফেরাবেন?',
  'goals.reverseConfirmBody':
    'ইতিহাসে একটি ফেরানো এন্ট্রি যোগ হবে। মূল জমাটি দৃশ্যমান থাকবে এবং অ্যাকাউন্টের ব্যালেন্সে কোনো প্রভাব পড়বে না।',
  'goals.reverseConfirmButton': 'জমা ফেরান',
  'goals.reverseServerError': 'জমাটি ফেরানো যায়নি। আবার চেষ্টা করুন।',
  'goals.backToGoals': 'লক্ষ্যের তালিকায় ফিরুন',

  'categories.title': 'ক্যাটাগরি',
  'categories.subtitle': 'আপনার টাকা যে লেবেলে রেকর্ড হয় — আয়, খরচ ও আর্কাইভ করা ইতিহাস।',
  'categories.incomeTitle': 'আয়',
  'categories.expensesTitle': 'খরচ',
  'categories.groupSubtitle': 'সক্রিয় ক্যাটাগরি',
  'categories.archivedTitle': 'আর্কাইভ করা',
  'categories.archivedSubtitle': 'ইতিহাস সবসময় পাঠযোগ্য',
  'categories.archivedNote':
    'অতীতে লেনদেন থাকা ক্যাটাগরি মুছে যায় না — আগে তা আর্কাইভ করা হয় বা রেকর্ড অন্য ক্যাটাগরিতে বদলানো হয়, যাতে পুরোনো রিপোর্টের অর্থ বোঝা যায়।',
  'categories.empty': 'আপনার অ্যাকাউন্টে কোনো ক্যাটাগরি পাওয়া যায়নি।',
  'categories.newButton': 'নতুন ক্যাটাগরি',
  'categories.newDisabled': 'এই বিল্ডে ক্যাটাগরি তৈরি এখনো নেই।',

  // Shared actions added for the complete localization pass
  'common.cancel': 'বাতিল',
  'common.save': 'সংরক্ষণ করুন',
  'common.edit': 'সম্পাদনা',
  'common.delete': 'মুছুন',
  'common.archive': 'আর্কাইভ',
  'common.unarchive': 'আর্কাইভ থেকে ফেরান',
  'common.reset': 'রিসেট',
  'common.clear': 'মুছুন',
  'common.close': 'বন্ধ করুন',
  'common.signOut': 'সাইন আউট',
  'common.openApp': 'অ্যাপ খুলুন',
  'common.home': 'হোম',
  'common.previous': 'পূর্ববর্তী',
  'common.next': 'পরবর্তী',
  'common.optional': '(ঐচ্ছিক)',
  'common.required': '(আবশ্যক)',

  // Theme switcher (shared chrome)
  'theme.label': 'থিম',
  'theme.light': 'হালকা',
  'theme.dark': 'গাঢ়',
  'theme.system': 'সিস্টেম',
  'theme.triggerLabel': 'থিম: {current}। {next}-এ যান।',
  'theme.titleLabel': 'থিম: {current} ({next}-এ যান)',
  'theme.saveFailed': 'থিম এই ব্রাউজারে প্রয়োগ হয়েছে, তবে আপনার অ্যাকাউন্টে সংরক্ষণ করা যায়নি।',

  // Authentication (sign-in, sign-up, shared shell)
  'auth.about': 'MoneyFlow সম্পর্কে',
  'auth.home': 'MoneyFlow হোম',
  'auth.signInTitle': 'সাইন ইন',
  'auth.signInSubtitle': 'আবার স্বাগতম।',
  'auth.signUpTitle': 'আপনার অ্যাকাউন্ট তৈরি করুন',
  'auth.signUpSubtitle': 'আপনার টাকার হিসাব রাখা শুরু করুন।',
  'auth.newHere': 'MoneyFlow-এ নতুন?',
  'auth.alreadyHave': 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
  'auth.createAccountLink': 'একটি অ্যাকাউন্ট তৈরি করুন',
  'auth.sessionNote':
    'আপনার সেশন একটি HttpOnly কুকিতে রাখা হয়, যা পেজের স্ক্রিপ্ট পড়তে পারে না। গোপনীয়তার জন্য সাইন-ইন সংক্রান্ত সমস্যা সবসময় সাধারণ ভাষায় জানানো হয়।',
  'auth.fullName': 'পূর্ণ নাম',
  'auth.namePlaceholder': 'যেমন: আয়েশা রহমান',
  'auth.email': 'ইমেইল',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'পাসওয়ার্ড',
  'auth.passwordPlaceholder': 'আপনার পাসওয়ার্ড',
  'auth.newPasswordPlaceholder': 'কমপক্ষে {count} অক্ষর',
  'auth.passwordHint': 'কমপক্ষে {count} অক্ষর।',
  'auth.confirmPassword': 'পাসওয়ার্ড নিশ্চিত করুন',
  'auth.confirmPlaceholder': 'পাসওয়ার্ডটি আবার লিখুন',
  'auth.showPassword': 'পাসওয়ার্ড দেখান',
  'auth.hidePassword': 'পাসওয়ার্ড লুকান',
  'auth.signingIn': 'সাইন ইন হচ্ছে…',
  'auth.creatingAccount': 'অ্যাকাউন্ট তৈরি হচ্ছে…',
  'auth.errorNameRequired': 'আপনার নাম লিখুন।',
  'auth.errorEmailRequired': 'আপনার ইমেইল ঠিকানা লিখুন।',
  'auth.errorEmailInvalid': 'একটি বৈধ ইমেইল ঠিকানা লিখুন, যেমন you@example.com।',
  'auth.errorPasswordRequired': 'আপনার পাসওয়ার্ড লিখুন।',
  'auth.errorPasswordLength': 'পাসওয়ার্ড কমপক্ষে {count} অক্ষরের হতে হবে।',
  'auth.errorConfirmRequired': 'পাসওয়ার্ডটি আবার লিখুন।',
  'auth.errorConfirmMismatch': 'পাসওয়ার্ড মেলেনি।',
  'auth.serverError': 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  'auth.principle.records.title': 'আপনার রেকর্ড আপনারই থাকে',
  'auth.principle.records.text':
    'ব্যক্তিগত আর্থিক তথ্য সার্ভারে আপনার সাইন-ইন করা অ্যাকাউন্টের মধ্যে সীমাবদ্ধ থাকে।',
  'auth.principle.numbers.title': 'যাচাইযোগ্য সংখ্যা',
  'auth.principle.numbers.text':
    'ব্যালেন্স ও মোট হিসাব আসে নির্ধারিত, পরীক্ষিত কোড থেকে — কখনো ভাষা মডেল থেকে নয়।',
  'auth.principle.bank.title': 'ব্যাংক তথ্য নয়',
  'auth.principle.bank.text': 'MoneyFlow কখনো আপনার ব্যাংক বা মোবাইল-ওয়ালেটের লগইন চায় না।',
  'auth.asideFooter': 'ফাউন্ডেশন বিল্ড — অ্যাপটি আপনার নিজের অ্যাকাউন্টের রেকর্ড করা হিসাব দেখায়।',
  'auth.openDashboard': 'ড্যাশবোর্ড খুলুন',

  // Landing page (requirements.md §1.2, §7.4)
  'landing.heroEyebrow': 'ব্যক্তিগত অর্থ, সহজ ভাষায়',
  'landing.heroTitle': 'আপনার টাকা বুঝুন।',
  'landing.heroAccent': 'ভালো অভ্যাস গড়ুন। লক্ষ্যে পৌঁছান।',
  'landing.heroLead':
    'আপনার খরচ ট্র্যাক করুন, সঞ্চয়ের অভ্যাস গড়ুন এবং আর্থিক লক্ষ্যের দিকে এগিয়ে যান — সব এক জায়গায়।',
  'landing.exploreFeatures': 'ফিচার দেখুন',
  'landing.heroTrust': 'আপনার টাকা। আপনার লক্ষ্য। আপনার সিদ্ধান্ত।',
  'landing.statusTitle': 'এটি একটি ফাউন্ডেশন বিল্ড',
  'landing.statusBody':
    'অ্যাকাউন্ট, লেনদেন, ড্যাশবোর্ড, রিপোর্ট, ক্যাটাগরি, বাজেট ও লক্ষ্য সাইন-ইন করা API-তে চলে এবং আপনার নিজের রেকর্ড করা ডেটা দেখায়। এই পেজের প্রোডাক্ট চিত্রটি নমুনা ডেটা এবং তা স্পষ্টভাবে চিহ্নিত; AI চ্যাট, এক্সপোর্ট ও অ্যাকাউন্ট পুনরুদ্ধার এখনো তৈরি হয়নি।',
  'landing.capabilitiesEyebrow': 'সুবিধাসমূহ',
  'landing.capabilitiesTitle': 'MoneyFlow কী করতে তৈরি হচ্ছে',
  'landing.capabilitiesSubtitle':
    'আপনার টাকা বুঝতে ও পরিচালনা করতে স্পষ্ট ও সৎ সরঞ্জামের একটি সেট।',
  'landing.tag.mvp': 'MVP',
  'landing.tag.v1': 'V1',
  'landing.benefit.spending.title': 'আপনার খরচ বুঝুন',
  'landing.benefit.spending.body':
    'আয় ও খরচ রেকর্ড করুন এবং আপনার বেছে নেওয়া ক্যাটাগরি অনুযায়ী টাকা কোথায় যাচ্ছে দেখুন।',
  'landing.benefit.saving.title': 'ভালো সঞ্চয়ের অভ্যাস গড়ুন',
  'landing.benefit.saving.body':
    'সঞ্চয়কে একটি উদ্দেশ্য দিন — ইমার্জেন্সি ফান্ড, ল্যাপটপ, কোর্স — এবং প্রতিটি জমার সাথে অগ্রগতি বাড়তে দেখুন।',
  'landing.benefit.planning.title': 'নিশ্চিন্তে পরিকল্পনা করুন',
  'landing.benefit.planning.body':
    'ক্যাটাগরি অনুযায়ী মাসিক বাজেট সাজান এবং রেকর্ড করা খরচ আপনার নির্ধারিত সীমার সাথে মিলিয়ে দেখুন।',
  'landing.benefit.picture.title': 'আপনার আর্থিক চিত্র দেখুন',
  'landing.benefit.picture.body':
    'আপনি যে আর্থিক কার্যকলাপ ট্র্যাক করতে চান তার কাজের সারাংশ এক শান্ত জায়গায় দেখুন।',
  'landing.benefit.goals.title': 'সঞ্চয়ের লক্ষ্য ঠিক করুন ও ট্র্যাক করুন',
  'landing.benefit.goals.body':
    'লক্ষ্য ও সময়সীমা দিয়ে লক্ষ্য তৈরি করুন, যখন সম্ভব জমা দিন এবং সময়ের সাথে অগ্রগতি দেখুন।',
  'landing.benefit.customise.title': 'আপনার ড্যাশবোর্ড সাজান',
  'landing.benefit.customise.body':
    'ড্যাশবোর্ড উইজেট দেখান, লুকান ও পুনর্বিন্যাস করুন যাতে আপনার দরকারি তথ্য সবসময় হাতের কাছে থাকে।',
  'landing.benefit.assistant.title': 'আপনার টাকা ব্যাখ্যা করে এমন সহায়ক',
  'landing.benefit.assistant.body':
    'আপনার নিজের রেকর্ড করা ডেটা সম্পর্কে জিজ্ঞাসা করুন। এটি বাকি প্রোডাক্টের মতো একই পরীক্ষিত হিসাব ব্যবহার করে ব্যাখ্যা করে — কখনো ব্যালেন্স বানিয়ে বলে না।',
  'landing.howEyebrow': 'কীভাবে কাজ করে',
  'landing.howTitle': 'তিনটি সহজ ধাপ',
  'landing.howSubtitle':
    'ব্যাংক সংযোগ নেই, স্বয়ংক্রিয় আমদানি নেই — শুধু আপনার টাকা রেকর্ড ও পর্যালোচনার একটি স্পষ্ট উপায়।',
  'landing.step.setup.title': 'আপনার অ্যাকাউন্ট সেট করুন',
  'landing.step.setup.body':
    'আপনি যে নগদ, ব্যাংক ও মোবাইল-ওয়ালেট ব্যালেন্স ট্র্যাক করেন তা যোগ করুন।',
  'landing.step.record.title': 'আয় ও খরচ রেকর্ড করুন',
  'landing.step.record.body':
    'টাকা আসা-যাওয়া ঘটার সময়ই লিখুন। নিজের অ্যাকাউন্টের মধ্যে ট্রান্সফার কখনো দুইবার গণনা হয় না।',
  'landing.step.review.title': 'পর্যালোচনা ও সমন্বয় করুন',
  'landing.step.review.body':
    'লক্ষ্য ও বাজেটের বিপরীতে অগ্রগতি দেখুন, তারপর পরবর্তী পরিকল্পনা সাজান।',
  'landing.goalsEyebrow': 'সঞ্চয়ের লক্ষ্য',
  'landing.goalsTitle': 'ছোট পদক্ষেপ। অর্থবহ অগ্রগতি।',
  'landing.goalsSubtitle': 'আপনার সঞ্চয়কে উদ্দেশ্য দিন, জমা ট্র্যাক করুন এবং কতদূর এসেছেন দেখুন।',
  'landing.goal.emergency': 'ইমার্জেন্সি ফান্ড',
  'landing.goal.laptop': 'নতুন ল্যাপটপ',
  'landing.goal.education': 'শিক্ষা',
  'landing.goal.personal': 'ব্যক্তিগত সঞ্চয়',
  'landing.goal.percentOfGoal': 'লক্ষ্যের',
  'landing.goal.demoNote': 'নমুনা ডেমো ডেটা — বাস্তব অ্যাকাউন্ট নয়।',
  'landing.controlEyebrow': 'ব্যক্তিগত নিয়ন্ত্রণ',
  'landing.controlTitle': 'আপনার অর্থ। আপনার নিয়ম।',
  'landing.controlSubtitle':
    'আপনার নিজের অগ্রাধিকার, ক্যাটাগরি, বাজেট ও সঞ্চয়ের লক্ষ্য অনুযায়ী ট্র্যাকিং ব্যবস্থা তৈরি করুন।',
  'landing.control.categories.title': 'আপনার জীবনের সাথে মানানসই ক্যাটাগরি',
  'landing.control.categories.body':
    'নিজের আয় ও খরচের ক্যাটাগরি তৈরি, নাম পরিবর্তন, রঙ পরিবর্তন ও আর্কাইভ করুন। ইতিহাস পাঠযোগ্য থাকে।',
  'landing.control.dashboard.title': 'আপনার সাজানো ড্যাশবোর্ড',
  'landing.control.dashboard.body':
    'উইজেট দেখান, লুকান ও পুনর্বিন্যাস করুন এবং থিম বাছুন, তারপর সত্যিকারের নিজের মতো লেআউট রাখুন।',
  'landing.control.preferences.title': 'আপনার নিয়ন্ত্রণে পছন্দ',
  'landing.control.preferences.body':
    'হালকা বা গাঢ় থিম, সাথে তারিখ ও সংখ্যার এমন ফরম্যাট যা আপনার টাকা পড়ার ধরনে মানায়।',
  'landing.control.goals.title': 'আপনার নির্ধারিত লক্ষ্য ও বাজেট',
  'landing.control.goals.body':
    'নিজের লক্ষ্য, সীমা ও সময়সীমা ঠিক করুন। আপনার হয়ে কিছুই ঠিক করা হয় না।',
  'landing.trustEyebrow': 'গোপনীয়তা ও আস্থা',
  'landing.trustTitle': 'বিশ্বাসযোগ্য হতে তৈরি',
  'landing.trustSubtitle':
    'আপনার আর্থিক তথ্যের যত্ন দরকার। MoneyFlow কীভাবে তা সুরক্ষিত রাখতে তৈরি, তা এখানে দেখা যায়।',
  'landing.trust.records.title': 'আপনার রেকর্ড আপনারই থাকে',
  'landing.trust.records.body':
    'আর্থিক তথ্য সার্ভারে আপনার সাইন-ইন করা অ্যাকাউন্টের মধ্যে সীমাবদ্ধ। MoneyFlow ব্রাউজার থেকে আসা ব্যবহারকারী আইডি কখনো বিশ্বাস করে না।',
  'landing.trust.numbers.title': 'যাচাইযোগ্য সংখ্যা',
  'landing.trust.numbers.body':
    'ব্যালেন্স, মোট ও শতাংশ আসে নির্ধারিত, পরীক্ষিত কোড থেকে — ভাষা মডেল থেকে নয়।',
  'landing.trust.bank.title': 'ব্যাংক তথ্য নয়',
  'landing.trust.bank.body':
    'MoneyFlow আপনার ব্যাংক বা মোবাইল-ওয়ালেটের লগইন চায় না, এবং আলাদা নিরাপত্তা ও আইনি পর্যালোচনা ছাড়া সেগুলোর সাথে সংযোগ করবে না।',
  'landing.trust.language.title': 'সরল, চাপমুক্ত ভাষা',
  'landing.trust.language.body':
    'লজ্জা, কৃত্রিম তাড়া বা ডার্ক প্যাটার্ন নেই। MoneyFlow এমন কোনো কমপ্লায়েন্স দাবি করে না যা এটি অর্জন করেনি।',
  'landing.roadmapEyebrow': 'রোডম্যাপ',
  'landing.roadmapTitle': 'আজ এটি কোথায় আছে',
  'landing.roadmapSubtitle':
    'MoneyFlow ধাপে ধাপে তৈরি হচ্ছে। এখন কী হচ্ছে ও এরপর কী আসছে তা এখানে।',
  'landing.roadmap.mvp.level': 'MVP',
  'landing.roadmap.mvp.state': 'চলমান',
  'landing.roadmap.mvp.scope':
    'মূল আর্থিক কার্যপ্রবাহ — অ্যাকাউন্ট, লেনদেন, ক্যাটাগরি, বাজেট, লক্ষ্য ও কাস্টমাইজযোগ্য ড্যাশবোর্ড।',
  'landing.roadmap.v1.level': 'V1',
  'landing.roadmap.v1.state': 'পরিকল্পিত',
  'landing.roadmap.v1.scope':
    'AI মানি অ্যাসিস্ট্যান্ট, স্মার্ট ইনসাইট, পুনরাবৃত্ত লেনদেন ও বিজ্ঞপ্তি।',
  'landing.roadmap.later.level': 'পরে',
  'landing.roadmap.later.state': 'শুধু গবেষণা',
  'landing.roadmap.later.scope':
    'ব্যাংক সংযোগ, যৌথ পরিবার অর্থ, একাধিক মুদ্রা সমর্থন ও নেটিভ মোবাইল অ্যাপ।',
  'landing.faqEyebrow': 'প্রশ্ন',
  'landing.faqTitle': 'সচরাচর জিজ্ঞাসা',
  'landing.faqSubtitle':
    'আজ যা জানা আছে শুধু তাই। মূল্য এখনো নির্ধারিত নয়, তাই এখানে তা আলোচনা করা হয়নি।',
  'landing.faq.what.q': 'MoneyFlow কী?',
  'landing.faq.what.a':
    'MoneyFlow PaathAI-এর অধীনে একটি স্বতন্ত্র ব্যক্তিগত অর্থসঙ্গী — PaathAI শিক্ষা প্ল্যাটফর্ম থেকে আলাদা। এটি আয়, খরচ, বাজেট ও সঞ্চয়ের লক্ষ্য এক শান্ত জায়গায় রেকর্ড ও বুঝতে সাহায্য করে।',
  'landing.faq.who.q': 'MoneyFlow কাদের জন্য?',
  'landing.faq.who.a':
    'শিক্ষার্থী, নতুন সঞ্চয়কারী ও তরুণ আয়কারী, যারা নিজেদের টাকা বোঝার সহজ ও বিশ্বাসযোগ্য উপায় চান। শুরু করতে কোনো অর্থনৈতিক দক্ষতা লাগে না।',
  'landing.faq.track.q': 'আয় ও খরচ কীভাবে ট্র্যাক করব?',
  'landing.faq.track.a':
    'ঘটার সময়ই সেগুলো হাতে রেকর্ড করেন। নিজের অ্যাকাউন্টের মধ্যে ট্রান্সফার টাকা সরায় কিন্তু কখনো আয় বা খরচ হিসেবে গণনা হয় না, তাই মোট হিসাব সৎ থাকে।',
  'landing.faq.categories.q': 'নিজের ক্যাটাগরি তৈরি করতে পারি?',
  'landing.faq.categories.a':
    'হ্যাঁ। নিজের আয় ও খরচের ক্যাটাগরি তৈরি, নাম পরিবর্তন, রঙ পরিবর্তন, আর্কাইভ ও সাজাতে পারেন, এবং ক্যাটাগরি বদলালেও রিপোর্ট বোঝা যায়।',
  'landing.faq.savings.q': 'সঞ্চয়ের লক্ষ্য ঠিক করতে পারি?',
  'landing.faq.savings.a':
    'হ্যাঁ — ইমার্জেন্সি ফান্ড টেমপ্লেটসহ। জমা যোগ করুন, সঞ্চিত ও বাকি পরিমাণ সৎ অগ্রগতিসহ দেখুন, এবং ইতিহাস না হারিয়ে লক্ষ্য সমন্বয় করুন।',
  'landing.faq.bank.q': 'MoneyFlow কি আমার ব্যাংকের সাথে যুক্ত?',
  'landing.faq.bank.a':
    'না। MoneyFlow শুধু হাতে রেকর্ড রাখে এবং কখনো আপনার ব্যাংক বা মোবাইল-ওয়ালেটের লগইন চায় না। ব্যাংক সংযোগ শুধু গবেষণায় আছে এবং আগে আলাদা নিরাপত্তা ও আইনি পর্যালোচনা দরকার।',
  'landing.faq.privacy.q': 'আমার আর্থিক তথ্য কীভাবে পরিচালিত হয়?',
  'landing.faq.privacy.a':
    'রেকর্ড আপনার সাইন-ইন করা অ্যাকাউন্টের এবং সার্ভারে তার মধ্যেই সীমাবদ্ধ। ব্যালেন্স ও মোট আসে নির্ধারিত, পরীক্ষিত কোড থেকে। CSV এক্সপোর্ট ও অ্যাকাউন্ট মুছে ফেলা পরিকল্পনার অংশ, এবং লঞ্চের আগে বাস্তবায়নের সাথে মিলিয়ে প্রাইভেসি লেখা প্রকাশ করা হবে।',
  'landing.ctaTitle': 'নিজের টাকা ট্র্যাক করুন',
  'landing.ctaBody':
    'অ্যাকাউন্ট তৈরি করে অ্যাকাউন্ট ও লেনদেন রেকর্ড করুন এবং নিজের হিসাব দেখুন। ব্যক্তিগত ডেটার জন্য সাইন ইন করা আবশ্যক।',
  'landing.ctaCreate': 'একটি অ্যাকাউন্ট তৈরি করুন',

  // Illustrative landing/product preview (demo data, not a real account)
  'preview.ariaLabel': 'প্রোডাক্টের নমুনা চিত্র',
  'preview.badge': 'নমুনা প্রিভিউ — ডেমো ডেটা',
  'preview.period': 'অক্টোবর ২০২৬',
  'preview.trackedBalance': 'ট্র্যাক করা ব্যালেন্স',
  'preview.activeAccounts': '{count}টি সক্রিয় অ্যাকাউন্ট মিলিয়ে',
  'preview.incomeThisMonth': 'এই মাসের আয়',
  'preview.spentThisMonth': 'এই মাসের খরচ',
  'preview.savingsGoal': 'সঞ্চয়ের লক্ষ্য',
  'preview.recentActivity': 'সাম্প্রতিক কার্যকলাপ',
  'preview.footer': 'এটি পরিকল্পিত অভিজ্ঞতার একটি স্থির নমুনা।',
  'preview.goalProgress': '{name}: লক্ষ্যের {percent} শতাংশ পূরণ হয়েছে',
  'preview.percentOfGoal': 'লক্ষ্যের {percent}%',
  'preview.dataDisclaimer':
    'নিচের সব অঙ্ক, নাম ও তারিখ কাল্পনিক নমুনা ডেটা, শুধু UI পর্যালোচনার জন্য দেখানো।',
  'mock.tx.stipend': 'খণ্ডকালীন বৃত্তি',
  'mock.tx.groceries': 'মুদি — মাসিক কেনাকাটা',
  'mock.tx.recharge': 'মোবাইল রিচার্জ',
  'mock.tx.emergencyTransfer': 'ইমার্জেন্সি ফান্ডে সরান',
  'mock.tx.freelance': 'ফ্রিল্যান্স ডিজাইন কাজ',
  'mock.tx.busPass': 'বাস পাস',
  'mock.category.income': 'আয়',
  'mock.category.groceries': 'মুদি',
  'mock.category.utilities': 'ইউটিলিটি',
  'mock.category.transfer': 'ট্রান্সফার',
  'mock.category.freelance': 'ফ্রিল্যান্স',
  'mock.category.transport': 'যাতায়াত',
  'mock.goal.emergencyFund': 'ইমার্জেন্সি ফান্ড',
  'mock.goal.newLaptop': 'নতুন ল্যাপটপ',
  'mock.goal.semesterBuffer': 'সেমিস্টার ফি বাফার',

  // Public marketing pages (/features, /about, /contact, /site-map)
  'marketing.breadcrumb': 'ব্রেডক্রাম্ব',
  'marketing.home': 'হোম',
  'features.eyebrow': 'ফিচার',
  'features.title': 'MoneyFlow আজ যা করে',
  'features.lead':
    'একটি সৎ তালিকা: শুধু প্রকাশিত সুবিধাগুলোই উপলভ্য হিসেবে লেখা। বাকি সব "তৈরি হয়নি" হিসেবে চিহ্নিত।',
  'features.availableTitle': 'এখন উপলভ্য',
  'features.item.accounts.title': 'অ্যাকাউন্ট ও ওয়ালেট',
  'features.item.accounts.body':
    'নগদ, ব্যাংক, মোবাইল-ওয়ালেট, সঞ্চয় বা নিজস্ব অ্যাকাউন্ট খোলার ব্যালেন্সসহ তৈরি করুন। বর্তমান ব্যালেন্স আপনার রেকর্ড করা লেনদেন থেকে হিসাব হয়; আর্কাইভ করলে ইতিহাস অক্ষত থাকে।',
  'features.item.transactions.title': 'আয়, খরচ ও ট্রান্সফার',
  'features.item.transactions.body':
    'টাকা আসা, টাকা যাওয়া এবং নিজের অ্যাকাউন্টের মধ্যে স্থানান্তর রেকর্ড করুন। ট্রান্সফার কখনো আয় বা খরচ হিসেবে গণনা হয় না। এন্ট্রি সম্পাদনা ও মুছে ফেলা যায়, এবং একই অনুরোধ বারবার পাঠালে idempotency key তা ঠেকিয়ে দেয়।',
  'features.item.categories.title': 'আপনার নিয়ন্ত্রণে ক্যাটাগরি',
  'features.item.categories.body':
    'স্পষ্ট ডিফল্ট থেকে শুরু করুন, তারপর নিজের আয় ও খরচের ক্যাটাগরির নাম, রঙ বা আর্কাইভ বদলান। ব্যবহৃত ক্যাটাগরি নীরবে মুছে ফেলা যায় না।',
  'features.item.budgets.title': 'সময়ভিত্তিক বাজেট',
  'features.item.budgets.body':
    'ঐচ্ছিক ক্যাটাগরি সীমাসহ মাসিক বাজেট ঠিক করুন। প্রকৃত খরচ, বাকি পরিমাণ ও ব্যবহৃত শতাংশ দেখুন — শুধু আপনার টাইমজোনে প্রযোজ্য খরচের রেকর্ড থেকে হিসাব করা।',
  'features.item.goals.title': 'সঞ্চয়ের লক্ষ্য',
  'features.item.goals.body':
    'জমার খাতা দিয়ে লক্ষ্য ট্র্যাক করুন, সাথে সম্পাদনাযোগ্য ইমার্জেন্সি ফান্ড প্রিসেট। অগ্রগতি ও বাকি পরিমাণ রেকর্ড করা জমা থেকে আসে, লক্ষ্যের বেশি জমা হলে তা সততার সাথে দেখানো হয়।',
  'features.item.reports.title': 'ড্যাশবোর্ড ও রিপোর্ট',
  'features.item.reports.body':
    'ট্র্যাক করা ব্যালেন্স, সময়ের আয় ও খরচ, লক্ষ্যের অগ্রগতি এবং সাম্প্রতিক কার্যকলাপ দেখুন। রিপোর্টে আপনার বেছে নেওয়া সময়ের আয় বনাম খরচ ও ক্যাটাগরি অনুযায়ী খরচ দেখানো হয়।',
  'features.item.customization.title': 'কাস্টমাইজেশন ও পছন্দ',
  'features.item.customization.body':
    'ড্যাশবোর্ড উইজেট দেখান, লুকান ও পুনর্বিন্যাস করুন; লেআউট আপনার অ্যাকাউন্টে সংরক্ষিত হয়। মুদ্রা, টাইমজোন, তারিখের ফরম্যাট, সপ্তাহের শুরু, থিম এবং ইংরেজি বা বাংলা লেবেল বাছুন।',
  'features.item.data.title': 'আপনার ডেটা, আপনার হাতে',
  'features.item.data.body':
    'আপনার লেনদেন CSV হিসেবে এক্সপোর্ট করুন এবং নিশ্চিতকরণসহ স্ব-সেবা প্রবাহে অ্যাকাউন্ট মুছে ফেলুন। রেকর্ড সার্ভারে সাইন-ইন করা মালিকের মধ্যেই সীমাবদ্ধ, শুধু ইন্টারফেসে লুকানো নয়।',
  'features.notYetTitle': 'এখনো তৈরি হয়নি',
  'features.notYet.onboarding': 'গাইডেড অনবোর্ডিং — নকশা ও অনুমোদিত, তবে এখনো তৈরি হয়নি।',
  'features.notYet.recovery':
    'পাসওয়ার্ড পুনরুদ্ধার ও ইমেইল যাচাই — ইমেইল সরবরাহকারীর সিদ্ধান্তের অপেক্ষায়।',
  'features.notYet.search':
    'লেনদেনে টেক্সট সার্চ — আজ ফিল্টার দিয়ে ধরন, অ্যাকাউন্ট, ক্যাটাগরি, তারিখ ও পরিমাণ কভার করা হয়।',
  'features.notYet.later':
    'AI অ্যাসিস্ট্যান্ট, পুনরাবৃত্ত লেনদেন, বিজ্ঞপ্তি এবং ব্যাংক বা মোবাইল-ওয়ালেট সংযোগ — পরবর্তী ধাপ, এই বিল্ড থেকে ইচ্ছাকৃতভাবে বাদ।',
  'features.noteFoundation': 'এটি একটি ফাউন্ডেশন বিল্ড, সম্পূর্ণ প্রোডাক্ট নয়। দেখুন',
  'features.noteSitemap': 'সাইটম্যাপ',
  'features.noteMiddle': 'প্রতিটি রুটের অবস্থার জন্য, অথবা',
  'features.noteCreate': 'অ্যাকাউন্ট তৈরি করুন',
  'features.noteAfter': 'উপলভ্য কার্যপ্রবাহ চেষ্টা করতে।',
  'about.eyebrow': 'পরিচিতি',
  'about.title': 'আপনার টাকা বোঝার শান্ত উপায়',
  'about.lead':
    'MoneyFlow শিক্ষার্থী, নতুন সঞ্চয়কারী ও তরুণ আয়কারীদের জন্য একটি ব্যক্তিগত অর্থসঙ্গী। এটি একটি প্রাথমিক ফাউন্ডেশন বিল্ড, এবং এই পেজ শুধু যা আছে তা বর্ণনা করে।',
  'about.purposeTitle': 'কেন এটি আছে',
  'about.purposeBody1':
    'MoneyFlow একটি প্রতিশ্রুতিকে ঘিরে তৈরি: আপনার টাকা বুঝুন, ভালো অভ্যাস গড়ুন, লক্ষ্যে পৌঁছান। ব্যাংক সংযোগ বা স্বয়ংক্রিয় আমদানির বদলে আপনি যা ঘটেছে তা রেকর্ড করেন, আর অ্যাপ সেই রেকর্ড থেকে স্পষ্ট ব্যালেন্স, খরচের সারাংশ, বাজেটের অগ্রগতি ও সঞ্চয় লক্ষ্যের অগ্রগতি তৈরি করে।',
  'about.purposeBody2':
    'প্রথম ব্যবহারকারী বাংলাদেশের মানুষ, যারা সহজ শুরু চান। BDT প্রথম সমর্থিত মুদ্রা, এবং ইন্টারফেস ইংরেজি ও বাংলা লেবেল সমর্থন করে। অন্যান্য মুদ্রার জন্য নকশা আছে, তবে একাধিক মুদ্রা রূপান্তর বাস্তবায়িত নয়।',
  'about.principlesTitle': 'এটি কীভাবে তৈরি',
  'about.principle.numbers': 'আর্থিক মোট আসে নির্ধারিত, পরীক্ষিত কোড থেকে — কখনো AI মডেল থেকে নয়।',
  'about.principle.isolation':
    'প্রতিটি ব্যক্তিগত রেকর্ড সার্ভারে সাইন-ইন করা মালিকের মধ্যেই সীমাবদ্ধ।',
  'about.principle.honesty':
    'ইন্টারফেস কখনো ব্যালেন্স, ট্রেন্ড, প্রশংসাপত্র বা সার্টিফিকেশন বানিয়ে দেখায় না।',
  'about.principle.neutral': 'খরচের নির্দেশনা নিরপেক্ষ: লজ্জা, স্ট্রিক বা ডার্ক প্যাটার্ন নেই।',
  'about.principle.status': 'তৈরি না হওয়া ফিচার অ্যাপে ও এই সাইটে "তৈরি হয়নি" হিসেবে চিহ্নিত।',
  'about.relationshipTitle': 'PaathAI-এর সাথে সম্পর্ক',
  'about.relationshipBody':
    'MoneyFlow PaathAI-এর অধীনে একটি স্বতন্ত্র প্রোডাক্ট। এটি PaathAI শিক্ষা প্ল্যাটফর্ম থেকে আলাদা: এতে কোনো কোর্স, বোর্ড প্রশ্ন বা শিক্ষার্থীর লার্নিং রুম নেই। “MoneyFlow” এখন একটি কাজের নাম; চূড়ান্ত প্রোডাক্টের নাম নির্ধারিত হয়নি।',
  'about.statusTitle': 'বর্তমান অবস্থা',
  'about.statusBody':
    'অ্যাকাউন্ট, লেনদেন, ক্যাটাগরি, বাজেট, সঞ্চয়ের লক্ষ্য, রিপোর্ট, ড্যাশবোর্ড কাস্টমাইজেশন, পছন্দ, CSV এক্সপোর্ট ও অ্যাকাউন্ট মুছে ফেলা বাস্তবায়িত। অনবোর্ডিং, পাসওয়ার্ড পুনরুদ্ধার ও ইমেইল যাচাই এখনো তৈরি হয়নি। কোনো মূল্য বা পেইড প্ল্যান নেই।',
  'about.statusNoteBefore': 'রুটভিত্তিক পূর্ণ অবস্থা দেখুন',
  'about.statusNoteSitemap': 'সাইটম্যাপে',
  'about.statusNoteMiddle': '। প্রশ্ন পাঠানো যেতে পারে',
  'about.statusNoteContact': 'যোগাযোগ পেজে',
  'about.statusNoteAfter': '।',
  'contact.eyebrow': 'যোগাযোগ',
  'contact.title': 'সাহায্য নিন বা সমস্যা জানান',
  'contact.lead':
    'MoneyFlow একটি প্রাথমিক বিল্ড, এখনো কোনো সাপোর্ট ইনবক্স নেই। প্রজেক্টের ইস্যু ট্র্যাকারই বর্তমানে কাজের সাপোর্ট চ্যানেল।',
  'contact.issuesTitle': 'একটি ইস্যু খুলুন',
  'contact.issuesBody':
    'প্রজেক্টের ইস্যু ট্র্যাকারে বাগ জানান, প্রশ্ন করুন বা উন্নতির প্রস্তাব দিন। এটি এখন একমাত্র সাপোর্ট চ্যানেল, এবং কোনো ইমেইল ঠিকানা বা যোগাযোগ ফর্ম দেওয়া হয় না কারণ কোনোটাই চালু নেই।',
  'contact.issuesButton': 'ইস্যু ট্র্যাকার খুলুন',
  'contact.includeTitle': 'কী অন্তর্ভুক্ত করবেন',
  'contact.include.what': 'আপনি কী করতে চেয়েছিলেন এবং তার বদলে কী হয়েছে।',
  'contact.include.where': 'পেজের ঠিকানা ও আনুমানিক সময়।',
  'contact.include.context': 'আপনি সাইন ইন ছিলেন কি না, এবং কোন ব্রাউজার ও ডিভাইস ব্যবহার করেছেন।',
  'contact.privacyTitle': 'অনুগ্রহ করে ব্যক্তিগত আর্থিক তথ্য শেয়ার করবেন না',
  'contact.privacyBody':
    'আপনার পাসওয়ার্ড, সেশন কুকি বা আসল অ্যাকাউন্ট নম্বর পোস্ট করবেন না, এবং স্ক্রিনশট থেকে লেনদেনের বিবরণ ও পরিমাণ মুছে দিন। সমস্যার বর্ণনাই যথেষ্ট; বেশিরভাগ সমস্যা তদন্তে এক্সপোর্ট করা রেকর্ড দরকার হয় না।',
  'contact.privacyNoteBefore': 'অ্যাপ কী সংরক্ষণ করে ও কীভাবে সুরক্ষিত থাকে, দেখুন',
  'contact.privacyNoteSitemap': 'সাইটম্যাপ',
  'contact.privacyNoteAfter':
    'প্রাইভেসি নীতির বর্তমান অবস্থার জন্য। এটি এখনো প্রকাশিত নয় এবং প্লেসহোল্ডার লেখা দিয়ে প্রতিস্থাপিত হয় না।',
  'siteMap.eyebrow': 'সাইটম্যাপ',
  'siteMap.title': 'প্রতিটি পেজ, এবং তা আছে কি না',
  'siteMap.lead':
    'পূর্ণ রুট তালিকা খুঁজুন, এলাকা অনুযায়ী ফিল্টার করুন এবং প্রতিটি পেজ খোলার আগে কী দরকার তা দেখুন। পরিকল্পিত ও বিলম্বিত পেজ চিহ্নিত, কাজ করছে বলে লিংক করা হয় না।',

  // Route catalogue labels and descriptions (shown by the sitemap)
  'route.home.label': 'হোম',
  'route.home.description': 'প্রোডাক্ট পরিচিতি, সুবিধা ও সৎ বিল্ড অবস্থা।',
  'route.features.label': 'ফিচার',
  'route.features.description': 'MoneyFlow আজ যা করে, এবং যা এখনো তৈরি হচ্ছে।',
  'route.about.label': 'পরিচিতি',
  'route.about.description': 'MoneyFlow কী, কাদের জন্য এবং PaathAI-এর সাথে সম্পর্ক।',
  'route.contact.label': 'যোগাযোগ',
  'route.contact.description': 'সমস্যা জানানো বা প্রশ্ন করার জায়গা।',
  'route.siteMap.label': 'সাইটম্যাপ',
  'route.siteMap.description': 'এই অ্যাপের প্রতিটি রুট, দলবদ্ধ, খোঁজযোগ্য ও সৎভাবে চিহ্নিত।',
  'route.privacy.label': 'প্রাইভেসি নীতি',
  'route.privacy.description': 'প্রকৃত ডেটা হ্যান্ডলিং বর্ণনা করে প্রাইভেসি নীতি।',
  'route.privacy.note':
    'এখনো প্রকাশিত নয়: নীতির লেখা প্রকাশিত বাস্তবায়নের সাথে মিলতে হবে এবং requirements.md §18.13 / DR-17-এর আইনি পর্যালোচনা পাস করতে হবে।',
  'route.terms.label': 'পরিষেবার শর্তাবলি',
  'route.terms.description': 'প্রকৃত প্রোডাক্ট ও এখতিয়ার অনুযায়ী শর্তাবলি।',
  'route.terms.note':
    'এখনো প্রকাশিত নয়: একই আইনি পর্যালোচনার অপেক্ষায় (requirements.md §18.13)। কোনো প্লেসহোল্ডার শর্ত দেখানো হয় না।',
  'route.pricing.label': 'মূল্য',
  'route.pricing.description': 'পরিকল্পনা ও মূল্যের তথ্য।',
  'route.pricing.note':
    'ইচ্ছাকৃতভাবে অনুপস্থিত: মূল্য একটি অমীমাংসিত সিদ্ধান্ত (requirements.md §18.12)। কোনো প্ল্যান বা মূল্য বানিয়ে বলা হয় না।',
  'route.signIn.label': 'সাইন ইন',
  'route.signIn.description': 'ইমেইল ও পাসওয়ার্ডে সাইন ইন; সেশন HttpOnly কুকিতে থাকে।',
  'route.signUp.label': 'অ্যাকাউন্ট তৈরি',
  'route.signUp.description': 'ইমেইল ও পাসওয়ার্ড দিয়ে MoneyFlow অ্যাকাউন্ট তৈরি করুন।',
  'route.forgotPassword.label': 'পাসওয়ার্ড ভুলে গেছেন',
  'route.forgotPassword.description': 'ইমেইলে পাসওয়ার্ড রিসেট লিংকের অনুরোধ করুন।',
  'route.forgotPassword.note':
    'ইমেইল সরবরাহকারীর সিদ্ধান্তে আটকে আছে (requirements.md §18.10 / DR-06); কোনো নকল পুনরুদ্ধার প্রবাহ দেওয়া হয় না।',
  'route.resetPassword.label': 'পাসওয়ার্ড রিসেট',
  'route.resetPassword.description': 'একবার ব্যবহারযোগ্য রিসেট লিংক থেকে নতুন পাসওয়ার্ড দিন।',
  'route.resetPassword.note': 'মেইল সরবরাহকারী থাকলে forgot-password-এর সাথে আসে (DR-06)।',
  'route.verifyEmail.label': 'ইমেইল যাচাই',
  'route.verifyEmail.description': 'সাইন-আপ ইমেইল ঠিকানার মালিকানা নিশ্চিত করুন।',
  'route.verifyEmail.note':
    'মেইল সরবরাহকারী না থাকা পর্যন্ত auth কনফিগারেশনে ইমেইল যাচাই বন্ধ (ADR-0006 সিদ্ধান্ত ৮)।',
  'route.onboarding.label': 'অনবোর্ডিং',
  'route.onboarding.description':
    'স্বাগতম, মৌলিক পছন্দ, প্রথম অ্যাকাউন্ট, আয়/খরচ/ট্রান্সফারের ব্যাখ্যা, ঐচ্ছিক লক্ষ্য ও বাজেট সেটআপ।',
  'route.onboarding.note':
    'পরবর্তী ইনক্রিমেন্ট হিসেবে অনুমোদিত (সার্ভার-সংরক্ষিত অগ্রগতি, মাইগ্রেশনসহ) তবে এখনো তৈরি হয়নি।',
  'route.dashboard.label': 'ড্যাশবোর্ড',
  'route.dashboard.description':
    'ট্র্যাক করা ব্যালেন্স, সময়ের আয় ও খরচ, লক্ষ্যের অগ্রগতি এবং সাম্প্রতিক কার্যকলাপ।',
  'route.accounts.label': 'অ্যাকাউন্ট',
  'route.accounts.description':
    'ওপেনিং ব্যালেন্স ও তা থেকে হিসাব করা বর্তমান ব্যালেন্সসহ ওয়ালেট ও অ্যাকাউন্ট।',
  'route.transactions.label': 'লেনদেন',
  'route.transactions.description': 'ফিল্টার ও পেজিনেশনসহ রেকর্ড করা আয়, খরচ ও ট্রান্সফার।',
  'route.transactionsNew.label': 'লেনদেন যোগ করুন',
  'route.transactionsNew.description': 'আয়, খরচ বা ট্রান্সফার এন্ট্রি তৈরি করুন।',
  'route.categories.label': 'ক্যাটাগরি',
  'route.categories.description': 'নিরাপদ আর্কাইভ নিয়মসহ আপনার নিজের আয় ও খরচের ক্যাটাগরি।',
  'route.budgets.label': 'বাজেট',
  'route.budgets.description': 'প্রকৃত খরচ, বাকি পরিমাণ ও ব্যবহৃত শতাংশসহ সময়ভিত্তিক বাজেট।',
  'route.goals.label': 'সঞ্চয়ের লক্ষ্য',
  'route.goals.description':
    'জমার খাতায় ট্র্যাক করা সঞ্চয়ের লক্ষ্য, ইমার্জেন্সি ফান্ড প্রিসেটসহ।',
  'route.goalDetail.label': 'লক্ষ্যের বিস্তারিত',
  'route.goalDetail.description': 'একটি লক্ষ্য: অগ্রগতি, বাকি পরিমাণ ও জমার ইতিহাস।',
  'route.goalDetail.note': 'শুধু লক্ষ্যের তালিকা থেকে খোলা যায়, কারণ নির্দিষ্ট লক্ষ্য আইডি দরকার।',
  'route.reports.label': 'রিপোর্ট',
  'route.reports.description': 'একটি সময়ে আয় বনাম খরচ, সাথে ক্যাটাগরি অনুযায়ী খরচ।',
  'route.customize.label': 'ড্যাশবোর্ড সাজান',
  'route.customize.description':
    'ড্যাশবোর্ড উইজেট দেখান, লুকান ও পুনর্বিন্যাস করুন; লেআউট আপনার অ্যাকাউন্টে সংরক্ষিত হয়।',
  'route.assistant.label': 'AI সহায়ক',
  'route.assistant.description': 'আপনার নিজের রেকর্ড করা ডেটার সহজ ভাষায় ব্যাখ্যা।',
  'route.assistant.note':
    'V1 পরিধি, Phase 1 নয় (requirements.md §6.2)। নির্ধারিত হিসাবই সত্যের উৎস থাকে।',
  'route.settings.label': 'সেটিংস',
  'route.settings.description': 'আপনার প্রোফাইল, পছন্দ, নিরাপত্তা ও ডেটা নিয়ন্ত্রণের সারাংশ।',
  'route.settingsProfile.label': 'প্রোফাইল',
  'route.settingsProfile.description': 'প্রদর্শিত নাম ও অ্যাকাউন্টের বিবরণ।',
  'route.settingsPreferences.label': 'পছন্দ',
  'route.settingsPreferences.description':
    'মুদ্রা, টাইমজোন, তারিখের ফরম্যাট, সপ্তাহের শুরু, থিম ও ভাষা।',
  'route.settingsSecurity.label': 'নিরাপত্তা',
  'route.settingsSecurity.description': 'সেশনের তথ্য ও সাইন আউট।',
  'route.settingsData.label': 'ডেটা নিয়ন্ত্রণ',
  'route.settingsData.description': 'আপনার লেনদেনের CSV এক্সপোর্ট ও স্ব-সেবা অ্যাকাউন্ট মুছে ফেলা।',
  'routeGroup.public': 'পাবলিক',
  'routeGroup.auth': 'প্রমাণীকরণ',
  'routeGroup.onboarding': 'অনবোর্ডিং',
  'routeGroup.app': 'মূল অ্যাপ',
  'routeGroup.settings': 'সেটিংস',

  // Sitemap view
  'sitemap.searchLabel': 'রুট খুঁজুন',
  'sitemap.searchPlaceholder': 'নাম, পাথ বা অবস্থা দিয়ে খুঁজুন',
  'sitemap.filterLabel': 'এলাকা অনুযায়ী ফিল্টার',
  'sitemap.allAreas': 'সব এলাকা',
  'sitemap.reset': 'রিসেট',
  'sitemap.count': '{total}টির মধ্যে {shown}টি রুট দেখানো হচ্ছে।',
  'sitemap.legend': 'অবস্থার ব্যাখ্যা',
  'sitemap.emptyTitle': 'আপনার খোঁজার সাথে কোনো রুট মেলেনি',
  'sitemap.emptyBody': 'অন্য শব্দ চেষ্টা করুন, অন্য এলাকা বাছুন বা ফিল্টার রিসেট করুন।',
  'sitemap.detailsEyebrow': 'রুটের বিস্তারিত',
  'sitemap.area': 'এলাকা',
  'sitemap.access': 'প্রবেশাধিকার',
  'sitemap.status': 'অবস্থা',
  'sitemap.parent': 'মূল পেজ',
  'sitemap.anyone': 'যে কেউ',
  'sitemap.signedIn': 'শুধু সাইন-ইন করা ব্যবহারকারী — API-তে প্রয়োগ করা',
  'sitemap.signInRequired': 'সাইন ইন আবশ্যক',
  'sitemap.open': '{name} খুলুন',
  'sitemap.dynamicNote': 'এই পেজে নির্দিষ্ট রেকর্ড আইডি দরকার, তাই এটি মূল পেজ থেকে খোলে।',
  'sitemap.unavailable': 'এই গন্তব্য এখনো উপলভ্য নয়।',
  'sitemap.textListSummary': 'সব রুটের টেক্সট তালিকা',
  'sitemap.textListNote':
    'কিবোর্ড ও স্ক্রিন-রিডার ব্যবহারকারীদের জন্য একই তথ্যসহ সাধারণ, নিষ্ক্রিয় তালিকা।',
  'sitemap.status.implemented': 'উপলভ্য',
  'sitemap.status.planned': 'পরিকল্পিত',
  'sitemap.status.deferred': 'বিলম্বিত',

  // Accounts
  'accounts.title': 'অ্যাকাউন্ট',
  'accounts.subtitle':
    'আপনি যে নগদ, ব্যাংক ও ওয়ালেট ব্যালেন্স ট্র্যাক করেন — আপনার রেকর্ড করা কার্যকলাপ থেকে হিসাব করা।',
  'accounts.emptyTitle': 'এখনো কোনো অ্যাকাউন্ট নেই',
  'accounts.emptyBody':
    'আপনি যে নগদ, ব্যাংক বা মোবাইল-ওয়ালেট অ্যাকাউন্ট ট্র্যাক করতে চান তা যোগ করুন। ব্যালেন্স আপনি দেওয়া ওপেনিং ব্যালেন্স থেকে শুরু হয় এবং লেনদেন রেকর্ডের সাথে হালনাগাদ হয়।',
  'accounts.addFirst': 'আপনার প্রথম অ্যাকাউন্ট যোগ করুন',
  'accounts.activeTitle': 'সক্রিয় অ্যাকাউন্ট',
  'accounts.activeCount': '{count}টি ব্যবহৃত',
  'accounts.activeEmpty':
    'কোনো সক্রিয় অ্যাকাউন্ট নেই। নিচে একটি আর্কাইভ থেকে ফেরান বা নতুন অ্যাকাউন্ট যোগ করুন।',
  'accounts.archivedTitle': 'আর্কাইভ করা',
  'accounts.archivedSubtitle': 'ইতিহাস সংরক্ষিত',
  'accounts.archivedNote':
    'আর্কাইভ করা অ্যাকাউন্ট তাদের রেকর্ড করা ইতিহাস রাখে এবং এখানে দৃশ্যমান থাকে। নতুন লেনদেনে ব্যবহার করা যায় না।',
  'accounts.newButton': 'নতুন অ্যাকাউন্ট',
  'accounts.serverBalanceNote': 'ব্যালেন্স সার্ভার আপনার রেকর্ড থেকে হিসাব করে।',
  'accounts.openingNote':
    'ওপেনিং ব্যালেন্স আয় নয়। এটি শুধু অ্যাকাউন্টের শুরুর বিন্দু ঠিক করে; আয় ও খরচ আসে আপনার রেকর্ড করা লেনদেন থেকে।',
  'accounts.archiveTitle': 'এই অ্যাকাউন্টটি আর্কাইভ করবেন?',
  'accounts.archiveBody':
    '{name} সক্রিয় ব্যবহার থেকে সরে যাবে। এর ব্যালেন্স, ওপেনিং ব্যালেন্স ও রেকর্ড করা লেনদেন ইতিহাস অক্ষত থাকবে, এবং যেকোনো সময় আর্কাইভ থেকে ফেরানো যাবে।',
  'accounts.archiveButton': 'অ্যাকাউন্ট আর্কাইভ করুন',
  'accounts.openingLabel': 'ওপেনিং {amount}',
  'accounts.editAria': '{name} সম্পাদনা করুন',
  'accounts.archiveAria': '{name} আর্কাইভ করুন',
  'accounts.unarchiveAria': '{name} আর্কাইভ থেকে ফেরান',
  'accounts.unarchiveButton': 'আর্কাইভ থেকে ফেরান',
  'accounts.archivedBadge': 'আর্কাইভকৃত',
  'accounts.formEditTitle': 'অ্যাকাউন্ট সম্পাদনা',
  'accounts.formNewTitle': 'নতুন অ্যাকাউন্ট',
  'accounts.formEditBody':
    'তৈরির পর অ্যাকাউন্টের ধরন বদলানো যায় না। আর্কাইভ করা অ্যাকাউন্ট সম্পাদনাযোগ্য থাকে।',
  'accounts.formNewBody':
    'একটি নাম এবং আজ অ্যাকাউন্টে থাকা ব্যালেন্স বাছুন। অ্যাকাউন্টে কার্যকলাপ না হওয়া পর্যন্ত ওপেনিং ব্যালেন্স বদলাতে পারেন।',
  'accounts.nameLabel': 'অ্যাকাউন্টের নাম',
  'accounts.nameRequired': 'অ্যাকাউন্টের নাম লিখুন।',
  'accounts.nameTooLong': 'সর্বোচ্চ ৮০ অক্ষর ব্যবহার করুন।',
  'accounts.kindLabel': 'অ্যাকাউন্টের ধরন',
  'accounts.kindFixed': 'তৈরির পর ধরন নির্দিষ্ট।',
  'accounts.currencyLabel': 'মুদ্রা',
  'accounts.currencyHint': 'এই বিল্ডে শুধু BDT; কোনো রূপান্তর করা হয় না।',
  'accounts.openingLabelBdt': 'ওপেনিং ব্যালেন্স (BDT)',
  'accounts.openingError': 'সর্বোচ্চ ২ দশমিকসহ চিহ্নযুক্ত পরিমাণ ব্যবহার করুন, যেমন 0 বা 3500.50।',
  'accounts.openingFixed':
    'এই অ্যাকাউন্টে ইতিমধ্যে রেকর্ড করা কার্যকলাপ আছে, তাই ওপেনিং ব্যালেন্স নির্দিষ্ট। এর বদলে একটি সমন্বয় লেনদেন রেকর্ড করুন।',
  'accounts.save': 'অ্যাকাউন্ট সংরক্ষণ করুন',
  'accounts.saving': 'সংরক্ষণ হচ্ছে…',
  'accounts.saveError': 'অ্যাকাউন্ট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  'accounts.updateError': 'অ্যাকাউন্ট হালনাগাদ করা যায়নি।',
  'accounts.type.CASH': 'নগদ',
  'accounts.type.BANK': 'ব্যাংক অ্যাকাউন্ট',
  'accounts.type.MOBILE_WALLET': 'মোবাইল ওয়ালেট',
  'accounts.type.SAVINGS': 'সঞ্চয় অ্যাকাউন্ট',
  'accounts.type.OTHER': 'অন্যান্য',

  // Transactions
  'transactions.title': 'লেনদেন',
  'transactions.subtitle':
    'টাকার প্রতিটি রেকর্ড করা চলাচল — আপনার নিজের রেকর্ড ফিল্টার, সম্পাদনা বা মুছে ফেলুন।',
  'transactions.newButton': 'নতুন লেনদেন',
  'transactions.searchNote': 'সার্চ এখনো নেই; ধরন, অ্যাকাউন্ট, ক্যাটাগরি ও তারিখের ফিল্টার আছে।',
  'transactions.filtersTitle': 'ফিল্টার',
  'transactions.filtersSubtitle': 'সার্ভারে প্রয়োগ করা হয়',
  'transactions.type': 'ধরন',
  'transactions.allTypes': 'সব ধরন',
  'transactions.account': 'অ্যাকাউন্ট',
  'transactions.allAccounts': 'সব অ্যাকাউন্ট',
  'transactions.category': 'ক্যাটাগরি',
  'transactions.allCategories': 'সব ক্যাটাগরি',
  'transactions.fromDate': 'শুরুর তারিখ',
  'transactions.toDate': 'শেষ তারিখ',
  'transactions.applyFilters': 'ফিল্টার প্রয়োগ করুন',
  'transactions.dateRangeError': 'শুরুর তারিখ শেষ তারিখের পরে হতে পারবে না।',
  'transactions.activityTitle': 'আপনার কার্যকলাপ',
  'transactions.activitySubtitle': 'রেকর্ড করা চলাচল',
  'transactions.showing': '{total}টি রেকর্ড করা লেনদেনের {from}–{to} দেখানো হচ্ছে।',
  'transactions.showingOne': '{total}টি রেকর্ড করা লেনদেনের {from}–{to} দেখানো হচ্ছে।',
  'transactions.emptyFilteredTitle': 'এই ফিল্টারে কোনো লেনদেন মেলেনি।',
  'transactions.emptyFilteredBody': 'অন্য রেকর্ড করা কার্যকলাপ দেখতে ফিল্টার বদলান বা মুছুন।',
  'transactions.emptyTitle': 'এখনো কোনো লেনদেন নেই',
  'transactions.emptyBody':
    'টাকা আসা, টাকা যাওয়া বা নিজের অ্যাকাউন্টের মধ্যে ট্রান্সফার রেকর্ড করুন। লেনদেন সংরক্ষণ না করা পর্যন্ত কিছু দেখানো হয় না।',
  'transactions.clearFilters': 'ফিল্টার মুছুন',
  'transactions.addFirst': 'আপনার প্রথম লেনদেন যোগ করুন',
  'transactions.editTitle': 'লেনদেন সম্পাদনা',
  'transactions.editBody': 'ধরন বদলানো যায় না। দিক ভুল হলে মুছে নতুন লেনদেন রেকর্ড করুন।',
  'transactions.deleteTitle': 'এই লেনদেনটি মুছবেন?',
  'transactions.deleteBody':
    '“{description}” স্থায়ীভাবে মুছে যাবে এবং অ্যাকাউন্টের ব্যালেন্স, রিপোর্ট ও বাজেট বদলে যাবে। এটি ফেরানো যাবে না।',
  'transactions.deleteButton': 'লেনদেন মুছুন',
  'transactions.deleteError': 'লেনদেন মুছে ফেলা যায়নি।',
  'transactions.editAria': 'লেনদেন সম্পাদনা: {description}',
  'transactions.deleteAria': 'লেনদেন মুছুন: {description}',
  'transactions.previous': 'আগের',
  'transactions.next': 'পরের',

  // Transaction form and new-transaction confirmation
  'txform.addAccountTitle': 'আগে একটি অ্যাকাউন্ট যোগ করুন',
  'txform.addAccountBody':
    'লেনদেনের জন্য একটি সক্রিয় অ্যাকাউন্ট দরকার। একটি তৈরি করুন, তারপর ফিরে এসে চলাচল রেকর্ড করুন।',
  'txform.goToAccounts': 'অ্যাকাউন্টে যান',
  'txform.pageTitle': 'নতুন লেনদেন',
  'txform.pageSubtitle':
    'টাকা আসা, টাকা যাওয়া বা নিজের অ্যাকাউন্টের মধ্যে স্থানান্তর রেকর্ড করুন।',
  'txform.backToTransactions': 'লেনদেনে ফিরুন',
  'txform.typeLegend': 'ধরন',
  'txform.typeCannotChange': '{type} (ধরন বদলানো যায় না)',
  'txform.typeAria': 'লেনদেনের ধরন',
  'txform.type.INCOME': 'টাকা আসা',
  'txform.type.EXPENSE': 'টাকা যাওয়া',
  'txform.type.TRANSFER': 'ট্রান্সফার',
  'txform.type.ADJUSTMENT': 'সমন্বয়',
  'txform.typeHint':
    'ট্রান্সফার নিজের অ্যাকাউন্টের মধ্যে টাকা সরায় — কখনো আয় বা খরচ হিসেবে গণনা হয় না।',
  'txform.amountLabel': 'পরিমাণ (BDT)',
  'txform.amountPlaceholder': 'যেমন 3500.50',
  'txform.errorAmountRequired': 'শূন্যের বেশি পরিমাণ লিখুন।',
  'txform.errorAmountFormat': 'সর্বোচ্চ ২ দশমিকসহ অঙ্ক ব্যবহার করুন, যেমন 3500 বা 3500.50।',
  'txform.fromAccount': 'যে অ্যাকাউন্ট থেকে',
  'txform.account': 'অ্যাকাউন্ট',
  'txform.toAccount': 'যে অ্যাকাউন্টে',
  'txform.selectAccount': 'একটি অ্যাকাউন্ট বাছুন',
  'txform.selectDestination': 'গন্তব্য বাছুন',
  'txform.category': 'ক্যাটাগরি',
  'txform.selectCategory': 'একটি ক্যাটাগরি বাছুন',
  'txform.archivedSuffix': ' (আর্কাইভ করা)',
  'txform.adjustmentDirection': 'সমন্বয়ের দিক',
  'txform.increase': 'রেকর্ড করা ব্যালেন্স বাড়ান',
  'txform.decrease': 'রেকর্ড করা ব্যালেন্স কমান',
  'txform.date': 'তারিখ',
  'txform.time': 'সময়',
  'txform.note': 'নোট',
  'txform.notePlaceholder': 'যেমন মাসিক মুদি',
  'txform.timeOptional': '(ঐচ্ছিক)',
  'txform.noteOptional': '(ঐচ্ছিক)',
  'txform.noteRequired': '(আবশ্যক)',
  'txform.timezoneNote':
    'আপনার অ্যাকাউন্টে সংরক্ষিত। সময় {timezone} অনুযায়ী; সময় ছাড়া তারিখ স্থানীয় দুপুরে রেকর্ড হয়।',
  'txform.errorAccount': 'একটি অ্যাকাউন্ট বাছুন।',
  'txform.errorSource': 'উৎস অ্যাকাউন্ট বাছুন।',
  'txform.errorDestination': 'গন্তব্য অ্যাকাউন্ট বাছুন।',
  'txform.errorSameAccount': 'গন্তব্য উৎস অ্যাকাউন্ট থেকে আলাদা হতে হবে।',
  'txform.errorCategory': 'একটি ক্যাটাগরি বাছুন।',
  'txform.errorDate': 'একটি তারিখ বাছুন।',
  'txform.errorRealDate': 'একটি বাস্তব ক্যালেন্ডার তারিখ বাছুন।',
  'txform.errorFutureDate': 'ভবিষ্যতের তারিখ গ্রহণ করা হয় না; পরিকল্পিত খরচ পরে রেকর্ড করুন।',
  'txform.errorTime': 'একটি বৈধ ২৪-ঘণ্টার সময় ব্যবহার করুন।',
  'txform.errorNoteRequired': 'সমন্বয়ের জন্য নোট আবশ্যক।',
  'txform.save': 'লেনদেন সংরক্ষণ করুন',
  'txform.saveChanges': 'পরিবর্তন সংরক্ষণ করুন',
  'txform.saving': 'সংরক্ষণ হচ্ছে…',
  'txform.serverError': 'লেনদেন সংরক্ষণ করা যায়নি।',
  'txform.savedNote':
    'আপনার অ্যাকাউন্টে সংরক্ষিত। সময় {timezone} ব্যবহার করে; সময় ছাড়া তারিখ স্থানীয় দুপুরে রেকর্ড হয়।',
  'txform.successTitle': 'লেনদেন সংরক্ষিত',
  'txform.successBody':
    'আপনার অ্যাকাউন্টের ব্যালেন্স, ড্যাশবোর্ড, রিপোর্ট ও বাজেটে এখন এই রেকর্ড অন্তর্ভুক্ত।',
  'txform.viewTransactions': 'লেনদেন দেখুন',
  'txform.recordAnother': 'আরেকটি রেকর্ড করুন',

  // Settings index
  'settings.title': 'সেটিংস',
  'settings.subtitle': 'আপনার অ্যাকাউন্টে সংরক্ষিত প্রোফাইল, পছন্দ ও কাস্টমাইজেশন।',
  'settings.sectionsTitle': 'সেকশনসমূহ',
  'settings.sectionsSubtitle': 'আজ প্রতিটি সেকশন কী করে',
  'settings.section.profile.label': 'প্রোফাইল',
  'settings.section.profile.body': 'প্রদর্শিত নাম, আপনার অ্যাকাউন্ট থেকে লোড ও সংরক্ষিত।',
  'settings.section.preferences.label': 'পছন্দ',
  'settings.section.preferences.body':
    'থিম, ভাষা, টাইমজোন, সপ্তাহের শুরু, তারিখ/সংখ্যার ফরম্যাট ও কম গতি — ব্যবহারকারী অনুযায়ী সংরক্ষিত।',
  'settings.section.layout.label': 'ড্যাশবোর্ড লেআউট',
  'settings.section.layout.body':
    'আপনার অ্যাকাউন্টে সংরক্ষিত ড্যাশবোর্ড উইজেট দেখান, লুকান, পুনর্বিন্যাস বা রিসেট করুন।',
  'settings.section.security.label': 'নিরাপত্তা',
  'settings.section.security.body':
    'প্রমাণীকরণ ও সার্ভার-প্রয়োগকৃত সেশন চালু; সেশন ব্যবস্থাপনা ও পাসওয়ার্ড পুনরুদ্ধার এখনো তৈরি হয়নি।',
  'settings.section.data.label': 'ডেটা',
  'settings.section.data.body':
    'প্রতিটি রেকর্ড করা লেনদেন CSV হিসেবে ডাউনলোড করুন, অথবা আপনার অ্যাকাউন্ট ও এর রেকর্ড স্থায়ীভাবে মুছে ফেলুন।',
  'settings.note':
    'প্রমাণীকরণ চালু এবং সার্ভারে প্রয়োগ করা। সেশন ব্যবস্থাপনা, পাসওয়ার্ড পরিবর্তন ও ইমেইল পুনরুদ্ধার এখনো তৈরি হয়নি এবং কখনো চালু হিসেবে দেখানো হয় না। CSV এক্সপোর্ট ও স্ব-সেবা অ্যাকাউন্ট মুছে ফেলা বাস্তব এবং ডেটা সেকশনে নথিভুক্ত।',

  // Profile settings
  'profile.title': 'প্রোফাইল',
  'profile.subtitle': 'MoneyFlow আপনাকে কীভাবে সম্বোধন করে। আপনার ইমেইলই সাইন-ইনের পরিচয়।',
  'profile.cardTitle': 'প্রদর্শিত নাম',
  'profile.cardSubtitle': 'আপনার অ্যাকাউন্টে সংরক্ষিত',
  'profile.email': 'ইমেইল',
  'profile.emailHint': 'ইমেইল আপনার সাইন-ইন পরিচয় এবং এখানে বদলানো যায় না।',
  'profile.displayName': 'প্রদর্শিত নাম',
  'profile.nameErrorRequired': 'একটি প্রদর্শিত নাম লিখুন।',
  'profile.nameErrorShort': 'কমপক্ষে ২ অক্ষর ব্যবহার করুন।',
  'profile.nameErrorLong': '১০০ অক্ষর বা তার কম রাখুন।',
  'profile.nameHint': 'অভিবাদন ও আপনার ড্যাশবোর্ডে দেখানো হয়। কখনো লগইন নয়।',
  'profile.save': 'প্রোফাইল সংরক্ষণ করুন',
  'profile.saving': 'সংরক্ষণ হচ্ছে…',
  'profile.saved': 'প্রোফাইল সংরক্ষিত।',
  'profile.saveError': 'আপনার প্রোফাইল সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  'profile.guestTitle': 'প্রোফাইল পরিচালনা করতে সাইন ইন করুন',
  'profile.guestBody': 'আপনার প্রোফাইল আপনার MoneyFlow অ্যাকাউন্টের।',
  'profile.loadErrorTitle': 'আপনার প্রোফাইল লোড করা যায়নি',
  'profile.loadErrorBody': 'আপনার সংযোগ দেখে আবার চেষ্টা করুন।',
  'profile.loading': 'প্রোফাইল লোড হচ্ছে',

  // Preferences settings
  'preferences.title': 'পছন্দ',
  'preferences.subtitle': 'আপনার অ্যাকাউন্টে সংরক্ষিত প্রদর্শন ও রিপোর্টিং পছন্দ।',
  'preferences.cardTitle': 'আপনার পছন্দ',
  'preferences.cardSubtitle': 'ড্যাশবোর্ড, রিপোর্ট, বাজেট ও লক্ষ্যে প্রয়োগ হয়',
  'preferences.note':
    'পছন্দ শুধু উপস্থাপনা ও রিপোর্টিং সীমা বদলায়। এগুলো কখনো রেকর্ড করা আর্থিক ডেটা সম্পাদনা বা রূপান্তর করে না।',
  'preferences.theme': 'থিম',
  'preferences.themeSystemHint': 'সিস্টেম আপনার অপারেটিং সিস্টেমের সেটিং অনুসরণ করে।',
  'preferences.language': 'ভাষা',
  'preferences.languageHint': 'লেবেলের ভাষা। সংখ্যার অঙ্ক নিচের ফরম্যাট পছন্দ অনুসরণ করে।',
  'preferences.timezone': 'টাইমজোন',
  'preferences.timezoneHint':
    'রিপোর্টিং ও বাজেট সময়ের জন্য ব্যবহৃত। যেকোনো IANA টাইমজোন বাছুন, যেমন Asia/Dhaka।',
  'preferences.currency': 'মুদ্রা',
  'preferences.currencyHint':
    'BDT একমাত্র MVP মুদ্রা। পরিমাণ নির্ভুলভাবে সংরক্ষিত হয় এবং কখনো রূপান্তর করা হয় না।',
  'preferences.weekStart': 'সপ্তাহ শুরু হয়',
  'preferences.weekStartHint': 'সাপ্তাহিক রিপোর্ট ভাগে ব্যবহৃত।',
  'preferences.dateFormat': 'তারিখের ফরম্যাট',
  'preferences.numberFormat': 'অঙ্ক',
  'preferences.reducedMotion': 'কম গতি',
  'preferences.preview': 'প্রিভিউ',
  'preferences.previewAmount': 'পরিমাণ: {amount}',
  'preferences.previewDate': 'তারিখ: {date}',
  'preferences.previewShare': 'অংশ: {share}',
  'preferences.save': 'পছন্দ সংরক্ষণ করুন',
  'preferences.saving': 'সংরক্ষণ হচ্ছে…',
  'preferences.saved': 'পছন্দ আপনার অ্যাকাউন্টে সংরক্ষিত হয়েছে।',
  'preferences.noChanges': 'সংরক্ষণের জন্য কোনো পরিবর্তন নেই।',
  'preferences.saveError': 'পছন্দ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  'preferences.sessionExpired': 'আপনার সেশনের সময় শেষ। পছন্দ সংরক্ষণ করতে আবার সাইন ইন করুন।',
  'preferences.guestTitle': 'পছন্দ পরিচালনা করতে সাইন ইন করুন',
  'preferences.guestBody':
    'পছন্দ আপনার অ্যাকাউন্টে সংরক্ষিত হয়। সেশন ছাড়া শুধু এই ব্রাউজারের থিম ও ভাষার পছন্দ মনে রাখা হয়।',
  'preferences.loadErrorTitle': 'আপনার পছন্দ লোড করা যায়নি',
  'preferences.loadErrorBody': 'আপনার সংযোগ দেখে আবার চেষ্টা করুন।',
  'preferences.loading': 'পছন্দ লোড হচ্ছে',
  'preferences.option.light': 'হালকা',
  'preferences.option.dark': 'গাঢ়',
  'preferences.option.system': 'সিস্টেম',
  'preferences.option.followSystem': 'সিস্টেম অনুসরণ করুন',
  'preferences.option.reduceMotion': 'গতি কমান',
  'preferences.option.dmy': 'দিন / মাস / বছর',
  'preferences.option.mdy': 'মাস / দিন / বছর',
  'preferences.option.ymd': 'বছর / মাস / দিন',
  'preferences.option.localeDigits': 'ভাষা অনুসরণ করুন',
  'preferences.option.latinDigits': 'ল্যাটিন অঙ্ক (0–9)',
  'preferences.option.bengaliDigits': 'বাংলা অঙ্ক (০–৯)',
  'preferences.weekday.SATURDAY': 'শনিবার',
  'preferences.weekday.SUNDAY': 'রবিবার',
  'preferences.weekday.MONDAY': 'সোমবার',
  'preferences.weekday.TUESDAY': 'মঙ্গলবার',
  'preferences.weekday.WEDNESDAY': 'বুধবার',
  'preferences.weekday.THURSDAY': 'বৃহস্পতিবার',
  'preferences.weekday.FRIDAY': 'শুক্রবার',
  'preferences.savedNote':
    'পছন্দ সংরক্ষণ করলে রেকর্ড করা লেনদেন, ব্যালেন্স, বাজেট বা লক্ষ্য কখনো বদলায় না।',

  // Security settings
  'security.title': 'নিরাপত্তা',
  'security.subtitle': 'আজ আপনার সেশন, এবং যে নিয়ন্ত্রণগুলো এখনো পরিকল্পিত।',
  'security.currentTitle': 'বর্তমান সেশন',
  'security.currentSubtitle': 'সার্ভারে প্রয়োগকৃত',
  'security.currentBody':
    'আপনি HttpOnly সেশন কুকি দিয়ে সাইন ইন করেছেন। প্রতিটি ব্যক্তিগত পেজ ও API কল সার্ভারে সেই সেশন যাচাই করে; শুধু বোতাম বা পেজ লুকানো কখনো নিজে থেকে ডেটা সুরক্ষিত করে না।',
  'security.plannedTitle': 'পরিকল্পিত নিয়ন্ত্রণ',
  'security.plannedSubtitle': 'প্রতিটি তার প্রকৃত ব্যাকএন্ড প্রবাহসহ আসবে',
  'security.plannedBadge': 'পরিকল্পিত',
  'security.planned.sessions.name': 'সক্রিয় সেশন',
  'security.planned.sessions.body':
    'আপনি কোথায় সাইন ইন আছেন দেখুন এবং চেনা না গেলে একটি সেশন শেষ করুন।',
  'security.planned.signOutAll.name': 'সব জায়গা থেকে সাইন আউট',
  'security.planned.signOutAll.body': 'অ্যাকাউন্ট ঝুঁকিতে মনে হলে একবারে সব সেশন শেষ করুন।',
  'security.planned.password.name': 'পাসওয়ার্ড পরিবর্তন',
  'security.planned.password.body':
    'পাসওয়ার্ড ইতিমধ্যে Argon2id দিয়ে হ্যাশ করা এবং কখনো সাদা লেখায় সংরক্ষণ বা লগ করা হয় না; পরিবর্তনের প্রবাহ এখনো তৈরি হয়নি।',
  'security.planned.recovery.name': 'ইমেইল যাচাই ও পুনরুদ্ধার',
  'security.planned.recovery.body':
    'আপনার ঠিকানা নিশ্চিত করে আবার প্রবেশাধিকার পান — পরিকল্পিত, ইমেইল সরবরাহকারীর সিদ্ধান্তের অপেক্ষায়।',
  'security.noteTitle': 'নিরাপত্তা সার্ভারে প্রয়োগ হয়, পেজ লুকিয়ে নয়',
  'security.noteBody':
    'প্রতিটি ব্যক্তিগত রেকর্ড সার্ভারে সাইন-ইন করা ব্যবহারকারীর সাথে যাচাই করা হয়, তাই পেজ লুকানো বা বোতাম নিষ্ক্রিয় করা নিজে থেকে কিছু সুরক্ষিত করে না। সংবেদনশীল কাজে আবার নিশ্চিতকরণ চাওয়া হয়, এবং সাইন-ইন সমস্যা সাধারণ ভাষায় বর্ণনা করা হয় যাতে পেজ ব্যবহার করে কোন ইমেইল ঠিকানায় অ্যাকাউন্ট আছে তা খুঁজে বের করা না যায়।',
  'security.signingOut': 'সাইন আউট হচ্ছে…',
  'security.signOutError': 'সাইন আউট করা যায়নি। আবার চেষ্টা করুন।',
  'security.signOutHint': 'এটি এই ডিভাইসের সেশন শেষ করে। অন্য ডিভাইস তাদের নিজেদের সেশন রাখে।',

  // Data settings
  'data.title': 'আপনার ডেটা',
  'data.subtitle':
    'আপনার লেনদেন ডাউনলোড করুন, অথবা আপনার MoneyFlow অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন।',
  'data.exportTitle': 'লেনদেন এক্সপোর্ট',
  'data.exportSubtitle': 'CSV · আপনার নিজের রেকর্ড থেকে তৈরি',
  'data.exportBody':
    'এক্সপোর্টে আপনার অ্যাকাউন্টে বর্তমানে রেকর্ড করা প্রতিটি লেনদেন থাকে, নতুন আগে। পরিমাণ তাদের নির্ভুল রেকর্ড করা মান ধরে রাখে, তারিখ UTC-তে, এবং স্প্রেডশিট যে লেখাকে সূত্র হিসেবে ধরতে পারে তা নিরপেক্ষ করা হয়। অ্যাকাউন্ট ও ক্যাটাগরির নাম অন্তর্ভুক্ত; অভ্যন্তরীণ ডেটাবেস আইডি নয়।',
  'data.exportButton': 'লেনদেনের CSV ডাউনলোড করুন',
  'data.exporting': 'CSV তৈরি হচ্ছে…',
  'data.exportStarted': 'ডাউনলোড শুরু হয়েছে: {filename}',
  'data.exportError': 'আপনার লেনদেন এক্সপোর্ট করা যায়নি। আবার চেষ্টা করুন।',
  'data.exportHint':
    'আপনার অ্যাকাউন্টে বর্তমানে রেকর্ড করা প্রতিটি লেনদেন অন্তর্ভুক্ত। ফাইলটি সার্ভার শুধু আপনার নিজের সারি থেকে তৈরি করে।',
  'data.deleteTitle': 'অ্যাকাউন্ট মুছুন',
  'data.deleteSubtitle': 'স্থায়ী · আপনার পাসওয়ার্ড আবশ্যক',
  'data.deleteBody':
    'মুছে ফেললে আপনার প্রোফাইল, আর্থিক অ্যাকাউন্ট, লেনদেন, ক্যাটাগরি, বাজেট, লক্ষ্য ও জমা, পছন্দ, ড্যাশবোর্ড লেআউট, সাইন-ইন তথ্য এবং প্রতিটি সক্রিয় সেশন সরানো হয়। অন্য মানুষের রেকর্ড কখনো স্পর্শ করা হয় না।',
  'data.deleteButton': 'আমার অ্যাকাউন্ট মুছুন…',
  'data.deleteHint':
    'এটি আপনার ব্যবহারকারী ও তার মালিকানাধীন প্রতিটি সারি স্থায়ীভাবে সরায়। আর্থিক অ্যাকাউন্ট আলাদাভাবে মুছে ফেলা যায় না — সেগুলো আর্কাইভ করা হয় — তাই ব্যবহারকারী মুছে ফেলাই আর্থিক ডেটার একমাত্র স্থায়ী মুছে ফেলা।',
  'data.deleteDialogTitle': 'আপনার MoneyFlow অ্যাকাউন্ট মুছবেন?',
  'data.deleteDialogBody':
    'এটি ফেরানো যাবে না। আপনার অ্যাকাউন্ট, লেনদেন, ক্যাটাগরি, বাজেট, লক্ষ্য, জমা, পছন্দ ও ড্যাশবোর্ড লেআউট স্থায়ীভাবে সরানো হবে, এবং আপনাকে সব জায়গা থেকে সাইন আউট করা হবে।',
  'data.currentPassword': 'বর্তমান পাসওয়ার্ড',
  'data.confirmLabel': 'নিশ্চিত করতে DELETE লিখুন',
  'data.confirmHint':
    'শব্দটি অবশ্যই ঠিক বড় হাতের হতে হবে। এখানে ব্যাকআপ মুছে ফেলার দাবি করা হয় না; হোস্টিং সরবরাহকারীর ধারণ নীতির অধীনে সেগুলো সময়ের সাথে সরে যায়।',
  'data.deleteConfirmButton': 'অ্যাকাউন্ট স্থায়ীভাবে মুছুন',
  'data.deleting': 'আপনার অ্যাকাউন্ট মুছে ফেলা হচ্ছে…',
  'data.deleteError': 'আপনার অ্যাকাউন্ট মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  'data.deletedTitle': 'আপনার MoneyFlow অ্যাকাউন্ট মুছে ফেলা হয়েছে',
  'data.deletedBody':
    'আপনার প্রোফাইল, আর্থিক রেকর্ড, পছন্দ ও সাইন-ইন তথ্য সরানো হয়েছে, এবং প্রতিটি সেশন শেষ করা হয়েছে। মুছে ফেলার একটি ন্যূনতম অডিট রেকর্ড পরিমাণ বা নোট ছাড়া থাকে।',
  'data.returnHome': 'হোম পেজে ফিরুন',
  'data.returning': 'শীঘ্রই হোম পেজে ফিরে যাচ্ছে…',
  'data.auditTitle': 'ধারণ ও অডিট রেকর্ড',
  'data.auditSubtitle': 'ন্যূনতম, আর্থিক বিষয়বস্তু ছাড়া',
  'data.auditBody':
    'ধ্বংসাত্মক কাজ ও এই এক্সপোর্ট একটি ছোট অডিট ইভেন্ট লেখে: ইভেন্টের ধরন, আপনার ব্যবহারকারী আইডি, এবং থাকলে একটি রিসোর্স আইডেন্টিফায়ার। অডিট মেটাডেটায় কখনো পরিমাণ, নোট, পাসওয়ার্ড, টোকেন বা অনুরোধের বডি থাকে না, এবং কোনো পাবলিক অডিট API নেই। আপনি অ্যাকাউন্ট মুছলে অডিট সারিগুলো ব্যবহারকারী লিংক ছাড়া থাকে।',
  'data.auditNote':
    'মুছে ফেলা আপনার সক্রিয় রেকর্ড সরায়। এখানে অবকাঠামোর ব্যাকআপ মুছে ফেলার দাবি করা হয় না; হোস্টিং সরবরাহকারীর ধারণ নীতির অধীনে সেগুলো সময়ের সাথে সরে যায়।',

  // Dashboard customization
  'customize.title': 'ড্যাশবোর্ড সাজান',
  'customize.subtitle':
    'কোন উইজেট দেখাবে ও কোন ক্রমে, তা বাছুন। পরিবর্তন আপনার অ্যাকাউন্টে প্রয়োগ হয়।',
  'customize.cardTitle': 'উইজেট',
  'customize.cardSubtitle': '/app/dashboard-এ দেখানো হয়',
  'customize.toolbarNote':
    'ক্রম বদলাতে তীরগুলো ব্যবহার করুন। লুকানো উইজেট এখানে তালিকাভুক্ত থাকে যাতে আবার চালু করতে পারেন।',
  'customize.reset': 'ডিফল্টে রিসেট করুন',
  'customize.save': 'লেআউট সংরক্ষণ করুন',
  'customize.saving': 'সংরক্ষণ হচ্ছে…',
  'customize.saved': 'ড্যাশবোর্ড লেআউট সংরক্ষিত।',
  'customize.resetDone': 'ড্যাশবোর্ড লেআউট ডিফল্টে রিসেট হয়েছে।',
  'customize.sessionExpired': 'আপনার সেশনের সময় শেষ। লেআউট সংরক্ষণ করতে আবার সাইন ইন করুন।',
  'customize.saveError': 'ড্যাশবোর্ড লেআউট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  'customize.guestTitle': 'ড্যাশবোর্ড সাজাতে সাইন ইন করুন',
  'customize.guestBody': 'ড্যাশবোর্ড লেআউট আপনার নিজের অ্যাকাউন্টে সংরক্ষিত হয়।',
  'customize.loadErrorTitle': 'আপনার ড্যাশবোর্ড লেআউট লোড করা যায়নি',
  'customize.loadErrorBody': 'আপনার সংযোগ দেখে আবার চেষ্টা করুন।',
  'customize.loading': 'ড্যাশবোর্ড লেআউট লোড হচ্ছে',
  'customize.moveUp': '{name} উপরে সরান',
  'customize.moveDown': '{name} নিচে সরান',
  'customize.note':
    'প্রতিটি লেআউটে সব সমর্থিত উইজেট ঠিক একবার থাকে। API বিকৃত বা অজানা উইজেট আইডি প্রত্যাখ্যান করে, এবং এটি কখনো শুধু আপনার নিজের অ্যাকাউন্টে সংরক্ষণ করতে পারে।',
  'customize.widget.totalBalance.name': 'মোট ট্র্যাক করা ব্যালেন্স',
  'customize.widget.totalBalance.body':
    'আপনার ট্র্যাক করা অ্যাকাউন্ট ব্যালেন্স, সার্ভারে হিসাব করা।',
  'customize.widget.income.name': 'আয়ের সারাংশ',
  'customize.widget.income.body': 'নির্বাচিত সময়ের রেকর্ড করা আয়।',
  'customize.widget.expense.name': 'খরচের সারাংশ',
  'customize.widget.expense.body': 'নির্বাচিত সময়ের রেকর্ড করা খরচ।',
  'customize.widget.recentTransactions.name': 'সাম্প্রতিক কার্যকলাপ',
  'customize.widget.recentTransactions.body': 'সর্বশেষ রেকর্ড করা কার্যকলাপ।',
  'customize.widget.spendingByCategory.name': 'ক্যাটাগরি অনুযায়ী খরচ',
  'customize.widget.spendingByCategory.body': 'সার্ভারে হিসাব করা সময়ের ক্যাটাগরি অংশ।',
  'customize.widget.goals.name': 'সঞ্চয়ের লক্ষ্য',
  'customize.widget.goals.body': 'আপনার রেকর্ড করা লক্ষ্য জমা থেকে অগ্রগতি।',
  'customize.widget.budgets.name': 'বাজেটের অবস্থা',
  'customize.widget.budgets.body': 'আপনার মাসিক বাজেট পরিকল্পনার একটি সূচক।',
  'dashboard.allHiddenTitle': 'ড্যাশবোর্ডের সব উইজেট লুকানো।',
  'dashboard.allHiddenBody': 'আপনার আর্থিক ডেটা এখনো রেকর্ড হয়। এখানে দেখতে উইজেট আবার চালু করুন।',
  'dashboard.customize': 'ড্যাশবোর্ড সাজান',

  // Not-found, error, and loading states
  'notFound.eyebrow': 'ত্রুটি 404 · পেজ পাওয়া যায়নি',
  'notFound.title': 'এই পেজটি নেই',
  'notFound.bodySite':
    'আপনি যে লিংক অনুসরণ করেছেন তা ভাঙা হতে পারে, অথবা পেজটি সরানো হয়েছে। কিছুই বদলানো হয়নি — আপনার নিজের রেকর্ড করা আর্থিক ডেটা দেখতে সাইন ইন করুন।',
  'notFound.bodyApp':
    'আপনি যে লিংক অনুসরণ করেছেন তা ভাঙা হতে পারে, অথবা পেজটি সরানো হয়েছে। কিছুই বদলানো হয়নি — আপনার অ্যাকাউন্ট, লেনদেন, লক্ষ্য ও বাজেট অপরিবর্তিত।',
  'notFound.recovery': 'পেজ না পাওয়ার পরবর্তী উপায়',
  'notFound.backHome': 'হোমে ফিরুন',
  'notFound.openApp': 'অ্যাপ খুলুন',
  'notFound.backDashboard': 'ড্যাশবোর্ডে ফিরুন',
  'notFound.viewTransactions': 'লেনদেন দেখুন',
  'notFound.hintSite': 'আপনার নিজের রেকর্ড করা রেকর্ড থেকে হিসাব করা সংখ্যা দেখতে সাইন ইন করুন।',
  'notFound.hintApp': 'অ্যাকাউন্ট, বাজেট, লক্ষ্য, রিপোর্ট বা সেটিংসে যেতে মেনু ব্যবহার করুন।',
  'error.title': 'কিছু একটা সমস্যা হয়েছে',
  'error.body': 'এই অংশটি দেখানো যায়নি। আপনার রেকর্ড অপরিবর্তিত — কিছুই বদলানো হয়নি।',
  'error.reference': ' (রেফারেন্স: {digest})',
  'loading.label': 'লোড হচ্ছে',
};

export const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en,
  bn,
};

/** Runtime guard for values read from storage or the URL. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Looks up a label in the given locale, substituting `{name}` tokens.
 * Returns the English string when a key is unknown, so a bad key can
 * never render an empty control.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Readonly<Record<string, string | number>>,
): string {
  const template = TRANSLATIONS[locale][key] ?? TRANSLATIONS[DEFAULT_LOCALE][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token,
  );
}
