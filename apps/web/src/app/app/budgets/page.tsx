import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { formatBdt } from '@/lib/format';
import { MOCK_BUDGETS, MOCK_PERIOD_LABEL } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Budgets — MoneyFlow UI preview',
};

/**
 * Budgets route (requirements.md §4.3, §5.9). Layout preview only: sample
 * monthly category budgets with spent, remaining, and utilisation figures.
 * Every figure is a hand-written literal — the UI derives nothing. Real
 * budget rules (expense-only spending, period boundaries, overspend copy)
 * are computed server-side once the budgets API lands (IT-9). Creation and
 * editing stay disabled until then.
 */
export default function BudgetsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Budgets</h1>
          <p className="mf-page-header__subtitle">
            Monthly spending plan per category — sample budgets for {MOCK_PERIOD_LABEL}.
          </p>
        </div>
        <Button disabled aria-disabled="true" title="Budget creation connects with IT-9">
          New budget
        </Button>
      </header>

      <Card title="October budgets" subtitle="Sample limits">
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
              <p className="mf-budget-row__remaining">{formatBdt(budget.remaining)} remaining</p>
            </div>
          );
        })}
        <p className="mf-chart-note">
          Only recorded expenses count toward a budget — transfers between your own accounts never
          do. Figures above are samples; real utilisation is computed server-side.
        </p>
      </Card>
    </AppShell>
  );
}
