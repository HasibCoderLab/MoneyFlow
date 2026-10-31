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
  /** Localized label key, resolved through the active locale. */
  readonly labelKey: TranslationKey;
  readonly group: RouteGroup;
  readonly access: RouteAccess;
  readonly status: RouteStatus;
  /** Localized plain-language purpose, shown in the sitemap detail panel. */
  readonly descriptionKey: TranslationKey;
  /** Parent route id, for parent-child grouping in the sitemap. */
  readonly parentId?: string;
  /** Localized reason a route is unavailable; required reading for honesty. */
  readonly availabilityNoteKey?: TranslationKey;
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
    labelKey: 'route.home.label',
    group: 'public',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.home.description',
  },
  {
    id: 'features',
    href: '/features',
    labelKey: 'route.features.label',
    group: 'public',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.features.description',
  },
  {
    id: 'about',
    href: '/about',
    labelKey: 'route.about.label',
    group: 'public',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.about.description',
  },
  {
    id: 'contact',
    href: '/contact',
    labelKey: 'route.contact.label',
    group: 'public',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.contact.description',
  },
  {
    id: 'site-map',
    href: '/site-map',
    labelKey: 'route.siteMap.label',
    group: 'public',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.siteMap.description',
  },
  {
    id: 'privacy',
    href: '/privacy',
    labelKey: 'route.privacy.label',
    group: 'public',
    access: 'public',
    status: 'deferred',
    descriptionKey: 'route.privacy.description',
    availabilityNoteKey: 'route.privacy.note',
  },
  {
    id: 'terms',
    href: '/terms',
    labelKey: 'route.terms.label',
    group: 'public',
    access: 'public',
    status: 'deferred',
    descriptionKey: 'route.terms.description',
    availabilityNoteKey: 'route.terms.note',
  },
  {
    id: 'pricing',
    href: '/pricing',
    labelKey: 'route.pricing.label',
    group: 'public',
    access: 'public',
    status: 'deferred',
    descriptionKey: 'route.pricing.description',
    availabilityNoteKey: 'route.pricing.note',
  },

  // ── Authentication ────────────────────────────────────────────────────
  {
    id: 'sign-in',
    href: '/sign-in',
    labelKey: 'route.signIn.label',
    group: 'auth',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.signIn.description',
  },
  {
    id: 'sign-up',
    href: '/sign-up',
    labelKey: 'route.signUp.label',
    group: 'auth',
    access: 'public',
    status: 'implemented',
    descriptionKey: 'route.signUp.description',
  },
  {
    id: 'forgot-password',
    href: '/forgot-password',
    labelKey: 'route.forgotPassword.label',
    group: 'auth',
    access: 'public',
    status: 'planned',
    descriptionKey: 'route.forgotPassword.description',
    availabilityNoteKey: 'route.forgotPassword.note',
  },
  {
    id: 'reset-password',
    href: '/reset-password',
    labelKey: 'route.resetPassword.label',
    group: 'auth',
    access: 'public',
    status: 'planned',
    descriptionKey: 'route.resetPassword.description',
    availabilityNoteKey: 'route.resetPassword.note',
  },
  {
    id: 'verify-email',
    href: '/verify-email',
    labelKey: 'route.verifyEmail.label',
    group: 'auth',
    access: 'public',
    status: 'deferred',
    descriptionKey: 'route.verifyEmail.description',
    availabilityNoteKey: 'route.verifyEmail.note',
  },

  // ── Onboarding ────────────────────────────────────────────────────────
  {
    id: 'onboarding',
    href: '/onboarding',
    labelKey: 'route.onboarding.label',
    group: 'onboarding',
    access: 'authenticated',
    status: 'planned',
    descriptionKey: 'route.onboarding.description',
    parentId: 'sign-up',
    availabilityNoteKey: 'route.onboarding.note',
  },

  // ── Core app ──────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    href: '/app/dashboard',
    labelKey: 'route.dashboard.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.dashboard.description',
    nav: { order: 10, labelKey: 'nav.dashboard' },
  },
  {
    id: 'accounts',
    href: '/app/accounts',
    labelKey: 'route.accounts.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.accounts.description',
    nav: { order: 20, labelKey: 'nav.accounts' },
  },
  {
    id: 'transactions',
    href: '/app/transactions',
    labelKey: 'route.transactions.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.transactions.description',
    nav: { order: 30, labelKey: 'nav.transactions' },
  },
  {
    id: 'transactions-new',
    href: '/app/transactions/new',
    labelKey: 'route.transactionsNew.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.transactionsNew.description',
    parentId: 'transactions',
  },
  {
    id: 'categories',
    href: '/app/categories',
    labelKey: 'route.categories.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.categories.description',
    nav: { order: 40, labelKey: 'nav.categories' },
  },
  {
    id: 'budgets',
    href: '/app/budgets',
    labelKey: 'route.budgets.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.budgets.description',
    nav: { order: 50, labelKey: 'nav.budgets' },
  },
  {
    id: 'goals',
    href: '/app/goals',
    labelKey: 'route.goals.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.goals.description',
    nav: { order: 60, labelKey: 'nav.goals' },
  },
  {
    id: 'goal-detail',
    href: '/app/goals/[goalId]',
    labelKey: 'route.goalDetail.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.goalDetail.description',
    parentId: 'goals',
    dynamic: true,
    availabilityNoteKey: 'route.goalDetail.note',
  },
  {
    id: 'reports',
    href: '/app/reports',
    labelKey: 'route.reports.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.reports.description',
    nav: { order: 70, labelKey: 'nav.reports' },
  },
  {
    id: 'customize',
    href: '/app/customize',
    labelKey: 'route.customize.label',
    group: 'app',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.customize.description',
  },
  {
    id: 'assistant',
    href: '/app/assistant',
    labelKey: 'route.assistant.label',
    group: 'app',
    access: 'authenticated',
    status: 'deferred',
    descriptionKey: 'route.assistant.description',
    availabilityNoteKey: 'route.assistant.note',
  },

  // ── Settings ──────────────────────────────────────────────────────────
  {
    id: 'settings',
    href: '/app/settings',
    labelKey: 'route.settings.label',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.settings.description',
    nav: { order: 80, labelKey: 'nav.settings' },
  },
  {
    id: 'settings-profile',
    href: '/app/settings/profile',
    labelKey: 'route.settingsProfile.label',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.settingsProfile.description',
    parentId: 'settings',
  },
  {
    id: 'settings-preferences',
    href: '/app/settings/preferences',
    labelKey: 'route.settingsPreferences.label',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.settingsPreferences.description',
    parentId: 'settings',
  },
  {
    id: 'settings-security',
    href: '/app/settings/security',
    labelKey: 'route.settingsSecurity.label',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.settingsSecurity.description',
    parentId: 'settings',
  },
  {
    id: 'settings-data',
    href: '/app/settings/data',
    labelKey: 'route.settingsData.label',
    group: 'settings',
    access: 'authenticated',
    status: 'implemented',
    descriptionKey: 'route.settingsData.description',
    parentId: 'settings',
  },
];

export const ROUTE_GROUPS: readonly {
  readonly id: RouteGroup;
  readonly labelKey: TranslationKey;
}[] = [
  { id: 'public', labelKey: 'routeGroup.public' },
  { id: 'auth', labelKey: 'routeGroup.auth' },
  { id: 'onboarding', labelKey: 'routeGroup.onboarding' },
  { id: 'app', labelKey: 'routeGroup.app' },
  { id: 'settings', labelKey: 'routeGroup.settings' },
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
