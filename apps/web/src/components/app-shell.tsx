'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  BudgetsIcon,
  DashboardIcon,
  GoalsIcon,
  PlusIcon,
  ReportsIcon,
  SettingsIcon,
  TagIcon,
  TransactionsIcon,
  WalletIcon,
  type IconProps,
} from '@/components/icons';
import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';

type NavItem = {
  readonly labelKey: TranslationKey;
  readonly href: string;
  readonly icon: ComponentType<IconProps>;
};

/**
 * Primary navigation following the information architecture in
 * requirements.md §4.3 (routes are kept stable). Labels resolve through
 * the locale context. Active state uses aria-current plus a visual
 * marker; every item is a real link.
 */
export const APP_NAV_ITEMS: readonly NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/app/dashboard', icon: DashboardIcon },
  { labelKey: 'nav.accounts', href: '/app/accounts', icon: WalletIcon },
  { labelKey: 'nav.transactions', href: '/app/transactions', icon: TransactionsIcon },
  { labelKey: 'nav.categories', href: '/app/categories', icon: TagIcon },
  { labelKey: 'nav.budgets', href: '/app/budgets', icon: BudgetsIcon },
  { labelKey: 'nav.goals', href: '/app/goals', icon: GoalsIcon },
  { labelKey: 'nav.reports', href: '/app/reports', icon: ReportsIcon },
  { labelKey: 'nav.settings', href: '/app/settings', icon: SettingsIcon },
];

/**
 * Shared application chrome: skip link, sticky branded topbar with the
 * primary Add Transaction action, sidebar navigation, and footer.
 * Responsive — the sidebar becomes a horizontally scrollable top bar on
 * narrow screens (requirements.md §7.3).
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <div className="mf-app">
      <a className="mf-skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>

      <header className="mf-app-header">
        <div className="mf-app-header__left">
          <span className="mf-brand-mark" aria-hidden="true">
            M
          </span>
          <p className="mf-app-header__brand">
            MoneyFlow <span className="mf-app-header__working-title">{t('app.workingTitle')}</span>
          </p>
        </div>
        <div className="mf-app-header__right">
          <p className="mf-app-header__badge">{t('app.badge')}</p>
          <LanguageToggle />
          <ThemeToggle />
          <Link className="mf-btn mf-btn--primary" href="/app/transactions/new">
            <PlusIcon />
            <span>{t('app.addTransaction')}</span>
          </Link>
        </div>
      </header>

      <div className="mf-app-body">
        <nav className="mf-nav" aria-label={t('nav.ariaMain')}>
          <p className="mf-nav__label">{t('app.menu')}</p>
          <ul className="mf-nav__list">
            {APP_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const NavIcon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    className={`mf-nav__link${isActive ? ' mf-nav__link--active' : ''}`}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <NavIcon className="mf-nav__icon" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mf-app-content">
          <main id="main-content" className="mf-app-main">
            {children}
          </main>
          <footer className="mf-app-footer">
            <p>{t('app.footerNote')}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
