import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { CategoryBars } from '@/components/category-bars';
import { ExpenseIcon, IncomeIcon } from '@/components/icons';
import { ProgressBar } from '@/components/progress-bar';
import { StatCard } from '@/components/stat-card';
import { TransactionList } from '@/components/transaction-list';
import { formatBdt } from '@/lib/format';
import {
  MOCK_BUDGETS,
  MOCK_PERIOD_LABEL,
  MOCK_RECENT_TRANSACTIONS,
  MOCK_SAVINGS_GOALS,
  MOCK_SPENDING_BY_CATEGORY,
  MOCK_SUMMARY,
} from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Dashboard — MoneyFlow UI preview',
  description:
    'UI preview with clearly labelled sample data. No real accounts or transactions exist yet.',
};

/**
 * Dashboard UI preview (requirements.md §4.3, §7). Every figure comes
 * from the mock-data module and is labelled as sample data by the app
 * shell banner. No calculations happen here — components only render
 * pre-formatted strings.
 */
export default function DashboardPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="mf-page-header__subtitle">
            Your money at a glance — everything below is sample data for this preview.
          </p>
        </div>
        <p className="mf-period-chip">{MOCK_PERIOD_LABEL}</p>
      </header>

      <div className="mf-dashboard-hero">
        <div className="mf-hero-card">
          <p className="mf-hero-card__label">Total balance</p>
          <p className="mf-hero-card__amount">{formatBdt(MOCK_SUMMARY.totalBalance)}</p>
          <p className="mf-hero-card__meta">Across all sample accounts · preview figures</p>
          <svg
            className="mf-hero-card__sparkline"
            viewBox="0 0 160 48"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M0 40 L23 34 L46 37 L69 26 L92 30 L115 18 L138 22 L160 12 L160 48 L0 48 Z"
              fill="rgb(255 255 255 / 0.14)"
            />
            <path
              d="M0 40 L23 34 L46 37 L69 26 L92 30 L115 18 L138 22 L160 12"
              stroke="rgb(255 255 255 / 0.55)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

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
        <Card
          title="Recent activity"
          subtitle="Sample transactions"
          action={
            <Link className="mf-card__action" href="/app/transactions">
              View all
            </Link>
          }
        >
          <TransactionList transactions={MOCK_RECENT_TRANSACTIONS} />
          <p className="mf-chart-note">
            Transfers move money between your own accounts, so they are shown separately and never
            counted as income or spending.
          </p>
        </Card>

        <Card title="Spending by category" subtitle="Sample breakdown">
          <CategoryBars
            categories={MOCK_SPENDING_BY_CATEGORY}
            periodLabel={MOCK_PERIOD_LABEL}
            totalAmount={MOCK_SUMMARY.monthlySpent}
          />
        </Card>
      </div>

      <div className="mf-dashboard-columns">
        <Card
          title="Savings goals"
          subtitle="Sample goals"
          action={
            <Link className="mf-card__action" href="/app/goals">
              Manage
            </Link>
          }
        >
          {MOCK_SAVINGS_GOALS.map((goal) => (
            <div key={goal.id} className="mf-goal">
              <p className="mf-goal__title">
                <span>{goal.name}</span>
                <span className="mf-goal__date">Target {goal.targetDateLabel}</span>
              </p>
              <ProgressBar
                label={`${goal.name} progress`}
                percent={goal.percent}
                valueText={`${formatBdt(goal.saved)} of ${formatBdt(goal.target)}`}
              />
            </div>
          ))}
        </Card>

        <Card
          title="Budgets"
          subtitle="Sample budget snapshot"
          action={
            <Link className="mf-card__action" href="/app/budgets">
              Manage
            </Link>
          }
        >
          {MOCK_BUDGETS.map((budget) => {
            const attention = budget.statusLabel === 'Close to limit';
            return (
              <div key={budget.id} className="mf-budget-row">
                <p className="mf-budget-row__title">
                  <span>{budget.category}</span>
                  <span
                    className={`mf-budget-row__status${
                      attention ? ' mf-budget-row__status--attention' : ''
                    }`}
                  >
                    {budget.statusLabel}
                  </span>
                </p>
                <ProgressBar
                  label={`${budget.category} budget usage`}
                  percent={budget.percentUsed}
                  valueText={`${formatBdt(budget.spent)} of ${formatBdt(budget.limit)} limit`}
                  emphasis={attention ? 'attention' : 'normal'}
                />
              </div>
            );
          })}
        </Card>
      </div>
    </AppShell>
  );
}
