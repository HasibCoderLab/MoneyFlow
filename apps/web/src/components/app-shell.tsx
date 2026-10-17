'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

import { MockDataBanner } from '@/components/mock-data-banner';
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

type NavItem = {
  readonly label: string;
  readonly href: string;
  readonly icon: ComponentType<IconProps>;
};

/**
 * Primary navigation following the information architecture in
 * requirements.md §4.3 (routes are kept stable). Active state uses
 * aria-current plus a visual marker; every item is a real link.
 */
export const APP_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: DashboardIcon },
  { label: 'Accounts', href: '/app/accounts', icon: WalletIcon },
  { label: 'Transactions', href: '/app/transactions', icon: TransactionsIcon },
  { label: 'Categories', href: '/app/categories', icon: TagIcon },
  { label: 'Budgets', href: '/app/budgets', icon: BudgetsIcon },
  { label: 'Savings goals', href: '/app/goals', icon: GoalsIcon },
  { label: 'Reports', href: '/app/reports', icon: ReportsIcon },
  { label: 'Settings', href: '/app/settings', icon: SettingsIcon },
];

/**
 * Shared application chrome for the UI preview: skip link, sticky
 * branded topbar with the primary Add Transaction action, sidebar
 * navigation, sample-data banner, and footer. Responsive — the sidebar
 * becomes a horizontally scrollable top bar on narrow screens
 * (requirements.md §7.3).
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mf-app">
      <a className="mf-skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="mf-app-header">
        <div className="mf-app-header__left">
          <span className="mf-brand-mark" aria-hidden="true">
            M
          </span>
          <p className="mf-app-header__brand">
            MoneyFlow <span className="mf-app-header__working-title">(working title)</span>
          </p>
        </div>
        <div className="mf-app-header__right">
          <p className="mf-app-header__badge">UI preview</p>
          <ThemeToggle />
          <Link className="mf-btn mf-btn--primary" href="/app/transactions/new">
            <PlusIcon />
            <span>Add Transaction</span>
          </Link>
        </div>
      </header>

      <div className="mf-app-body">
        <nav className="mf-nav" aria-label="Main">
          <p className="mf-nav__label">Menu</p>
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
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mf-app-content">
          <MockDataBanner />
          <main id="main-content" className="mf-app-main">
            {children}
          </main>
          <footer className="mf-app-footer">
            <p>
              Preview build — sample data only. No accounts, bank connections, or APIs are wired up
              yet.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
