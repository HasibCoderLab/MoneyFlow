import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { I18nText } from '@/components/i18n-text';
import { TransactionsView } from '@/components/transactions-view';

export const metadata: Metadata = {
  title: 'Transactions — MoneyFlow',
  description:
    'Your recorded income, expenses, transfers, and adjustments from the authenticated API.',
};

/**
 * Transactions route (requirements.md §4.3, §5.4). The view reads persisted
 * rows from `GET /api/v1/transactions`, applies server-side filters and
 * offset pagination, and offers edit/delete for the selected record. No
 * sample rows are rendered in the authenticated flow.
 */
export default function TransactionsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="transactions.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="transactions.subtitle" />
          </p>
        </div>
      </header>

      <TransactionsView />
    </AppShell>
  );
}
