import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { CategoryBars } from '@/components/category-bars';
import { ExpenseIcon, IncomeIcon } from '@/components/icons';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { MOCK_PERIOD_LABEL, MOCK_SPENDING_BY_CATEGORY, MOCK_SUMMARY } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Reports — MoneyFlow UI preview',
};

/**
 * Reports route (requirements.md §4.3, §5.10). Layout preview only, composed
 * from the same sample figures as the dashboard — income vs expense and
 * spending by category. No trends are shown because no daily/weekly/monthly
 * series exists; inventing one would fabricate financial activity.
 * Date-range filtering, trends, export, and server-side totals arrive with
 * the reports API. Export stays disabled until then.
 */
export default function ReportsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Reports</h1>
          <p className="mf-page-header__subtitle">
            Income, spending, and where money goes — sample figures for {MOCK_PERIOD_LABEL}.
          </p>
        </div>
        <div className="mf-page-header__actions">
          <p className="mf-period-chip">{MOCK_PERIOD_LABEL}</p>
          <Button disabled aria-disabled="true" title="CSV export connects with IT-12">
            Export CSV
          </Button>
        </div>
      </header>

      <div className="mf-dashboard-hero">
        <StatCard
          label="Income this month"
          amount={MOCK_SUMMARY.monthlyIncome}
          context={MOCK_PERIOD_LABEL}
          icon={<IncomeIcon />}
          tone="income"
        />
        <StatCard
          label="Spent this month"
          amount={MOCK_SUMMARY.monthlySpent}
          context={MOCK_PERIOD_LABEL}
          icon={<ExpenseIcon />}
          tone="expense"
        />
      </div>

      <div className="mf-dashboard-columns">
        <Card title="Spending by category" subtitle="Sample breakdown">
          <CategoryBars
            categories={MOCK_SPENDING_BY_CATEGORY}
            periodLabel={MOCK_PERIOD_LABEL}
            totalAmount={MOCK_SUMMARY.monthlySpent}
          />
        </Card>

        <Card title="More reports" subtitle="Arrive with the reports API">
          <ul className="mf-report-list">
            <li>Daily, weekly, and monthly totals with timezone-correct periods.</li>
            <li>
              Savings goal progress — see the{' '}
              <Link className="mf-card__action" href="/app/goals">
                goals preview
              </Link>
              .
            </li>
            <li>
              Budget utilization — see the{' '}
              <Link className="mf-card__action" href="/app/budgets">
                budgets preview
              </Link>
              .
            </li>
          </ul>
          <p className="mf-chart-note">
            Report figures are computed server-side from your recorded transactions. Nothing here is
            forecasted or estimated.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
