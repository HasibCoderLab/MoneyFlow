/**
 * UI locale dictionaries for the two launch languages named in
 * requirements.md §7.4: English (default) and Bangla.
 *
 * Scope: the shared chrome (app shell, landing navigation and footer) and
 * the wired dashboard, reports, categories, budgets, and goals pages
 * translate through this dictionary, including their loading, signed-out,
 * empty, and error states. Accounts, transactions, and settings still
 * render English only — a known, deliberate limitation, not an accident,
 * so the dictionaries below only contain keys whose Bangla text has
 * actually been reviewed.
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
  'app.workingTitle': '(working title)',
  'app.badge': 'UI preview',
  'app.addTransaction': 'Add Transaction',
  'app.menu': 'Menu',
  'app.footerNote':
    'Foundation build — dashboard, reports, categories, budgets, and goals show your recorded data; accounts and transactions are still previews.',

  // Sample-data banner — rendered only on pages that still use mock data
  'banner.ariaLabel': 'Preview data notice',
  'banner.title': 'UI preview — sample data.',
  'banner.body':
    'The figures on this page are still fictional sample data; dashboard, reports, categories, budgets, and goals already use your recorded data.',

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
  'footer.previewHeading': 'UI preview',
  'footer.legalHeading': 'Legal',
  'footer.legalNote':
    'Privacy policy and terms will be published here before public launch. Nothing here is financial advice.',
  'footer.copyright':
    '© {year} MoneyFlow — foundation build. The final product name is not yet decided.',
  'footer.capabilities': 'Capabilities',
  'footer.privacyAndTrust': 'Privacy and trust',

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
  'app.workingTitle': '(কাজের নাম)',
  'app.badge': 'ইউআই প্রিভিউ',
  'app.addTransaction': 'লেনদেন যোগ করুন',
  'app.menu': 'মেনু',
  'app.footerNote':
    'ফাউন্ডেশন বিল্ড — ড্যাশবোর্ড, রিপোর্ট, ক্যাটাগরি, বাজেট ও লক্ষ্যে আপনার রেকর্ড করা ডেটা দেখা যায়; অ্যাকাউন্ট ও লেনদেন এখনো প্রিভিউ।',

  'banner.ariaLabel': 'প্রিভিউ ডেটা নোটিশ',
  'banner.title': 'ইউআই প্রিভিউ — নমুনা ডেটা।',
  'banner.body':
    'এই পেজের হিসাব এখনো কাল্পনিক নমুনা ডেটা; ড্যাশবোর্ড, রিপোর্ট, ক্যাটাগরি, বাজেট ও লক্ষ্যে ইতিমধ্যে আপনার রেকর্ড করা ডেটা ব্যবহৃত হয়।',

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
  'footer.previewHeading': 'ইউআই প্রিভিউ',
  'footer.legalHeading': 'আইনি',
  'footer.legalNote':
    'পাবলিক লঞ্চের আগে এখানে প্রাইভেসি নীতিমালা ও শর্তাবলি প্রকাশ করা হবে। এখানকার কোনো তথ্য আর্থিক পরামর্শ নয়।',
  'footer.copyright':
    '© {year} MoneyFlow — ফাউন্ডেশন বিল্ড। প্রোডাক্টের চূড়ান্ত নাম এখনো নির্ধারিত হয়নি।',
  'footer.capabilities': 'সুবিধাসমূহ',
  'footer.privacyAndTrust': 'গোপনীয়তা ও নিরাপত্তা',

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
