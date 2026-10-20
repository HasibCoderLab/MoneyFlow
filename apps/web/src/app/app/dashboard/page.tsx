import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { DashboardView } from '@/components/dashboard-view';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Dashboard — MoneyFlow',
  description: 'Your recorded balance, income, and spending — real figures from your own account.',
};

/**
 * Dashboard route (requirements.md §4.3, §5.6, §9). The widget area renders
 * recorded data from `GET /api/v1/dashboard` (IT-8), goal progress from the
 * IT-10 goals API, and budgets from their own page. Widget order/visibility
 * come from the saved IT-11 layout; `Customize` opens that screen.
 */
export default function DashboardPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="dashboard.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="dashboard.subtitle" />
          </p>
        </div>
        <Link className="mf-btn mf-btn--ghost" href="/app/customize">
          Customize
        </Link>
      </header>

      <DashboardView />
    </AppShell>
  );
}
