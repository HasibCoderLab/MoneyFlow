import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { BudgetsView } from '@/components/budgets-view';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Budgets — MoneyFlow',
  description: 'Monthly spending plans with server-computed usage — recorded expenses only.',
};

/**
 * Budgets route (requirements.md §4.3, §5.9). The view renders the IT-9
 * budget endpoints: monthly plans with per-category and optional total
 * limits, utilization computed server-side from qualifying expense
 * transactions in the budget's local month (accounting-rules.md §1/§6/§9).
 * Overspend is shown truthfully with neutral copy; create/edit/delete and
 * pause/archive all talk to the API — no figure is derived in the browser.
 */
export default function BudgetsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="budgets.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="budgets.subtitle" />
          </p>
        </div>
      </header>

      <BudgetsView />
    </AppShell>
  );
}
