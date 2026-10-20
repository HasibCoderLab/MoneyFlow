import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { DashboardGoalsCard } from '@/components/dashboard-goals-card';
import { DashboardView } from '@/components/dashboard-view';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Dashboard — MoneyFlow',
  description: 'Your recorded balance, income, and spending — real figures from your own account.',
};

/**
 * Dashboard route (requirements.md §4.3, §5.6, §9). The widget area renders
 * recorded data from `GET /api/v1/dashboard` (IT-8), the goals card renders
 * real progress from the IT-10 goals API, and budgets stay an honest pointer
 * to their own page (IT-9) — no fabricated progress or figures are shown.
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
      </header>

      <DashboardView />

      <div className="mf-dashboard-columns">
        <DashboardGoalsCard />

        <Card
          title={<I18nText k="dashboard.budgetsTitle" />}
          subtitle={<I18nText k="dashboard.budgetsSubtitle" />}
          action={
            <Link className="mf-card__action" href="/app/budgets">
              <I18nText k="common.manage" />
            </Link>
          }
        >
          <p className="mf-empty__text">
            <I18nText k="dashboard.budgetsPlaceholder" />
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
