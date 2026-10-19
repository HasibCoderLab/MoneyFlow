/**
 * UI locale dictionaries for the two launch languages named in
 * requirements.md §7.4: English (default) and Bangla.
 *
 * Scope: the shared chrome (app shell, landing navigation and footer) and
 * the wired dashboard, reports, and categories pages translate through
 * this dictionary, including their loading, signed-out, empty, and error
 * states. Accounts, transactions, budgets, goals, and settings still
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
    'Foundation build — dashboard, reports, and categories show your recorded data; accounts, transactions, budgets, and goals are still previews.',

  // Sample-data banner — rendered only on pages that still use mock data
  'banner.ariaLabel': 'Preview data notice',
  'banner.title': 'UI preview — sample data.',
  'banner.body':
    'The figures on this page are still fictional sample data; dashboard, reports, and categories already use your recorded data.',

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
  'dashboard.goalsSubtitle': 'Arrives with a later update',
  'dashboard.goalsPlaceholder':
    'Savings goal tracking is not available in this build yet — no goal figures are shown.',
  'dashboard.budgetsTitle': 'Budgets',
  'dashboard.budgetsSubtitle': 'Arrives with a later update',
  'dashboard.budgetsPlaceholder':
    'Budget tracking is not available in this build yet — no budget figures are shown.',

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
    'ফাউন্ডেশন বিল্ড — ড্যাশবোর্ড, রিপোর্ট ও ক্যাটাগরিতে আপনার রেকর্ড করা ডেটা দেখা যায়; অ্যাকাউন্ট, লেনদেন, বাজেট ও লক্ষ্য এখনো প্রিভিউ।',

  'banner.ariaLabel': 'প্রিভিউ ডেটা নোটিশ',
  'banner.title': 'ইউআই প্রিভিউ — নমুনা ডেটা।',
  'banner.body':
    'এই পেজের হিসাব এখনো কাল্পনিক নমুনা ডেটা; ড্যাশবোর্ড, রিপোর্ট ও ক্যাটাগরিতে ইতিমধ্যে আপনার রেকর্ড করা ডেটা ব্যবহৃত হয়।',

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
  'dashboard.goalsSubtitle': 'পরবর্তী আপডেটে আসছে',
  'dashboard.goalsPlaceholder':
    'এই বিল্ডে সঞ্চয় লক্ষ্য ট্র্যাকিং এখনো নেই — কোনো লক্ষ্যের হিসাব দেখানো হচ্ছে না।',
  'dashboard.budgetsTitle': 'বাজেট',
  'dashboard.budgetsSubtitle': 'পরবর্তী আপডেটে আসছে',
  'dashboard.budgetsPlaceholder':
    'এই বিল্ডে বাজেট ট্র্যাকিং এখনো নেই — কোনো বাজেটের হিসাব দেখানো হচ্ছে না।',

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
