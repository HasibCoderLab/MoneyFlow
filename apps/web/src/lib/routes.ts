import type { TranslationKey } from '@/lib/i18n/translations';

/**
 * Central route inventory (Phase 1, requirements.md §4).
 *
 * One typed catalogue is the single source of truth for the navigation, the
 * public 2D sitemap at `/site-map`, the landing footer, and the route tests.
 * `routes.test.ts` cross-checks this list against the real App Router tree, so
 * a page added or removed without updating the catalogue fails the suite
 * instead of leaving the sitemap quietly wrong (requirements.md §13.5: never
 * present unbuilt functionality as real).
 *
 * Status vocabulary — never overstate it:
 * - `implemented`: a real page exists and does what the description says.
 * - `planned`: agreed scope, not built yet. Shown as unavailable.
 * - `deferred`: intentionally pushed out (open decision or later phase).
 */

export type RouteGroup = 'public' | 'auth' | 'onboarding' | 'app' | 'settings';

/** `public` = anyone; `authenticated` = signed-in user only (server-enforced). */
export type RouteAccess = 'public' | 'authenticated';

export type RouteStatus = 'implemented' | 'planned' | 'deferred';

export interface AppRouteMeta {
  /** Stable key, also used as the a11y id prefix in the sitemap. */
  readonly id: string;
  /** App Router path. Dynamic segments stay in `[bracket]` form. */
  readonly href: string;
  /** Canonical English label. Translating a route is optional. */
  readonly label: string;
  readonly group: RouteGroup;
  readonly access: RouteAccess;
  readonly status: RouteStatus;
  /** Plain-language purpose, shown in the sitemap detail panel. */
  readonly description: string;
  /** Parent route id, for parent-child grouping in the sitemap. */
  readonly parentId?: string;
  /** Why a route is not available yet; required reading for honesty. */
  readonly availabilityNote?: string;
  /** True for parameterized routes, which a link cannot open by themselves. */
  readonly dynamic?: boolean;
  /** Present when the route appears in the app's primary navigation. */
  readonly nav?: {
    readonly order: number;
    /** Existing shared translation key for the nav label. */
    readonly labelKey: TranslationKey;
  };
}

export const ROUTES: readonly AppRouteMeta[] = [
  // ── Public ────────────────────────────────────────────────────────────
  {
    id: 'home',
    href: '/',
    label: 'Home',
    group: 'public',
    access: 'public',
    status: 'implemented',
    description: 'Product overview, capabilities, and the honest build status.',
  },
  {
    id: 'features',
    href: '/features',
    label: 'Features',
    group: 'public',
    access: 'public',
    status: 'implemented',
    description: 'What MoneyFlow does today, and what is still being built.',
  },
  {
    id: 'about',
    href: '/about',
    label: 'About',
    group: 'public',
    access: 'public',
    status: 'implemented',
    description: 'What MoneyFlow is, who it is for, and how it relates to PaathAI.',
  },
  {
    id: 'contact',
    href: '/contact',
    label: 'Contact',
    group: 'public',
    access: 'public',
    status: 'implemented',
    description: 'Where to report a problem or ask a question.',
  },
  {
    id: 'site-map',
    href: '/site-map',
    label: 'Sitemap',
    group: 'public',
    access: 'public',
    status: 'implemented',
    description: 'Every route in this app, grouped, searchable, and honestly labelled.',
  },
  {
    id: 'privacy',
    href: '/privacy',
    label: 'Privacy policy',
    group: 'public',
    access: 'public',
    status: 'deferred',
    description: 'Privacy policy describing the actual data handling.',
    availabilityNote:
      'Not published yet: the policy text must match the shipped implementation and pass the legal review in requirements.md §18.13 / DR-17.',
  },
  {
    id: 'terms',
    href: '/terms',
    label: 'Terms of service',
    group: 'public',
    access: 'public',
    status: 'deferred',
    description: 'Terms appropriate to the actual product and jurisdiction.',
    availabilityNote:
      'Not published yet: awaiting the same legal review (requirements.md §18.13). No placeholder terms are shown.',
  },
  {
    id: 'pricing',
    href: '/pricing',
    label: 'Pricing',
    group: 'public',
    access: 'public',
    status: 'deferred',
    description: 'Plan and price information.',
    availabilityNote:
      'Deliberately absent: pricing is an open decision (requirements.md §18.12). No plans or prices are invented.',
  },

  // ── Authentication ────────────────────────────────────────────────────
  {
    id: 'sign-in',
    href: '/sign-in',
    label: 'Sign in',
    group: 'auth',
    access: 'public',
    status: 'implemented',
    description: 'Email and password sign-in; the session lives in an HttpOnly cookie.',
  },
  {
    id: 'sign-up',
    href: '/sign-up',
    label: 'Create account',
    group: 'auth',
    access: 'public',
    status: 'implemented',
    description: 'Create a MoneyFlow account with email and password.',
  },
  {
    id: 'forgot-password',
    href: '/forgot-password',
    label: 'Forgot password',
    group: 'auth',
    access: 'public',
    status: 'planned',
    description: 'Request a password-reset link by email.',
    availabilityNote:
      'Blocked on the email-provider decision (requirements.md §18.10 / DR-06); no fake recovery flow is offered.',
  },
  {
    id: 'reset-password',
    href: '/reset-password',
    label: 'Reset password',
    group: 'auth',
    access: 'public',
    status: 'planned',
    description: 'Set a new password from a single-use reset link.',
    availabilityNote: 'Ships with forgot-password once a mail provider exists (DR-06).',
  },
  {
    id: 'verify-email',
    href: '/verify-email',
    label: 'Verify email',
    group: 'auth',
    access: 'public',
    status: 'deferred',
    description: 'Confirm ownership of the sign-up email address.',
    availabilityNote:
      'Email verification is disabled in the auth configuration until a mail provider exists (ADR-0006 decision 8).',
  },

  // ── Onboarding ────────────────────────────────────────────────────────
  {
    id: 'onboarding',
    href: '/onboarding',
    label: 'Onboarding',
    group: 'onboarding',
    access: 'authenticated',
    status: 'planned',
    description:
      'Welcome, basic preferences, a first account, an explanation of income/expense/transfer, optional goal and budget setup.',
    parentId: 'sign-up',
    availabilityNote:
      'Approved as the next increment (server-persisted progress, migration included) but not built yet.',
  },

  // ── Core app ──────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    href: '/app/dashboard',
    label: 'Dashboard',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Tracked balance, period income and expenses, goal progress, and recent activity.',
    nav: { order: 10, labelKey: 'nav.dashboard' },
  },
  {
    id: 'accounts',
    href: '/app/accounts',
    label: 'Accounts',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Wallets and accounts with opening balances and derived current balances.',
    nav: { order: 20, labelKey: 'nav.accounts' },
  },
  {
    id: 'transactions',
    href: '/app/transactions',
    label: 'Transactions',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Recorded income, expenses, and transfers with filters and pagination.',
    nav: { order: 30, labelKey: 'nav.transactions' },
  },
  {
    id: 'transactions-new',
    href: '/app/transactions/new',
    label: 'Add transaction',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Create an income, expense, or transfer entry.',
    parentId: 'transactions',
  },
  {
    id: 'categories',
    href: '/app/categories',
    label: 'Categories',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Your own income and expense categories, with safe archive rules.',
    nav: { order: 40, labelKey: 'nav.categories' },
  },
  {
    id: 'budgets',
    href: '/app/budgets',
    label: 'Budgets',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Period budgets with actual spending, remaining amount, and percentage used.',
    nav: { order: 50, labelKey: 'nav.budgets' },
  },
  {
    id: 'goals',
    href: '/app/goals',
    label: 'Savings goals',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description:
      'Savings goals tracked by a contribution ledger, including the emergency-fund preset.',
    nav: { order: 60, labelKey: 'nav.goals' },
  },
  {
    id: 'goal-detail',
    href: '/app/goals/[goalId]',
    label: 'Goal detail',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'One goal: progress, remaining amount, and contribution history.',
    parentId: 'goals',
    dynamic: true,
    availabilityNote: 'Openable only from the goals list, because it needs a specific goal id.',
  },
  {
    id: 'reports',
    href: '/app/reports',
    label: 'Reports',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Income versus expense over a period, plus spending by category.',
    nav: { order: 70, labelKey: 'nav.reports' },
  },
  {
    id: 'customize',
    href: '/app/customize',
    label: 'Customize dashboard',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    description: 'Show, hide, and reorder dashboard widgets; the layout is saved to your account.',
  },
  {
    id: 'assistant',
    href: '/app/assistant',
    label: 'AI assistant',
    group: 'app',
    access: 'authenticated',
    status: 'deferred',
    description: 'Explanations of your own recorded data in plain language.',
    availabilityNote:
      'V1 scope, not Phase 1 (requirements.md §6.2). Deterministic calculations stay the source of truth.',
  },

  // ── Settings ──────────────────────────────────────────────────────────
  {
    id: 'settings',
    href: '/app/settings',
    label: 'Settings',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    description: 'Overview of your profile, preferences, security, and data controls.',
    nav: { order: 80, labelKey: 'nav.settings' },
  },
  {
    id: 'settings-profile',
    href: '/app/settings/profile',
    label: 'Profile',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    description: 'Display name and account details.',
    parentId: 'settings',
  },
  {
    id: 'settings-preferences',
    href: '/app/settings/preferences',
    label: 'Preferences',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    description: 'Currency, timezone, date format, week start, theme, and language.',
    parentId: 'settings',
  },
  {
    id: 'settings-security',
    href: '/app/settings/security',
    label: 'Security',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    description: 'Session information and sign-out.',
    parentId: 'settings',
  },
  {
    id: 'settings-data',
    href: '/app/settings/data',
    label: 'Data controls',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    description: 'CSV export of your transactions and self-service account deletion.',
    parentId: 'settings',
  },
];

export const ROUTE_GROUPS: readonly { readonly id: RouteGroup; readonly label: string }[] = [
  { id: 'public', label: 'Public' },
  { id: 'auth', label: 'Authentication' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'app', label: 'Core app' },
  { id: 'settings', label: 'Settings' },
];

/** Routes reachable without a session (and never leaking private data). */
export function publicRoutes(): readonly AppRouteMeta[] {
  return ROUTES.filter((route) => route.access === 'public');
}

/** Routes rendered in the app's primary navigation, in display order. */
export function primaryNavRoutes(): readonly AppRouteMeta[] {
  return ROUTES.filter((route) => route.nav !== undefined).sort(
    (a, b) => (a.nav?.order ?? 0) - (b.nav?.order ?? 0),
  );
}

/** Direct children of a route (parent-child edges shown in the sitemap). */
export function childRoutes(parentId: string): readonly AppRouteMeta[] {
  return ROUTES.filter((route) => route.parentId === parentId);
}

/** A route the sitemap can link to right now, or null plus a reason. */
export function linkTarget(route: AppRouteMeta): { readonly href: string } | null {
  if (route.status !== 'implemented' || route.dynamic) {
    return null;
  }
  return { href: route.href };
}

export function getRouteById(id: string): AppRouteMeta | undefined {
  return ROUTES.find((route) => route.id === id);
}

export function getRouteByHref(href: string): AppRouteMeta | undefined {
  return ROUTES.find((route) => route.href === href);
}
