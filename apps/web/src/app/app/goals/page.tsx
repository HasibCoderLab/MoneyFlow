import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { GoalsView } from '@/components/goals-view';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Savings goals — MoneyFlow',
  description: 'Savings goals tracked by contributions — progress computed on the server.',
};

/**
 * Goals route (requirements.md §4.3, §5.8, ADR-0005). The view renders the
 * IT-10 goal endpoints: savings goals with server-derived progress from the
 * contribution ledger, create/edit, lifecycle moves, and the emergency-fund
 * preset. Contributions track progress only — they never move money between
 * accounts or count as income/spending.
 */
export default function GoalsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="goals.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="goals.subtitle" />
          </p>
        </div>
      </header>

      <GoalsView />
    </AppShell>
  );
}
