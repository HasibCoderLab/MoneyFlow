import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { formatBdt } from '@/lib/format';
import { MOCK_SAVINGS_GOALS } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Savings goals — MoneyFlow UI preview',
};

/**
 * Goals route (requirements.md §4.3, §5.8). Layout preview only: sample
 * goals with saved, remaining, progress, and target dates. Every figure is a
 * hand-written literal — the UI derives nothing. Contributions, reversals,
 * deadlines, and the emergency-fund template arrive with the goals API
 * (IT-10); goal progress tracks contributions and never moves money, so
 * creation stays disabled until then.
 */
export default function GoalsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Savings goals</h1>
          <p className="mf-page-header__subtitle">
            What you are setting aside money for — sample goals for this preview.
          </p>
        </div>
        <Button disabled aria-disabled="true" title="Goal creation connects with IT-10">
          New goal
        </Button>
      </header>

      <Card title="All goals" subtitle="Sample goals">
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
            <p className="mf-goal__remaining">{formatBdt(goal.remaining)} remaining</p>
          </div>
        ))}
        <p className="mf-chart-note">
          Progress tracks contributions you record — adding to a goal does not move money between
          accounts. Figures above are samples; real progress is computed server-side.
        </p>
      </Card>
    </AppShell>
  );
}
