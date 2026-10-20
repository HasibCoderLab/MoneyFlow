import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
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
          <h1>Transactions</h1>
          <p className="mf-page-header__subtitle">
            Every recorded movement of money — filter, edit, or remove your own records.
          </p>
        </div>
      </header>

      <TransactionsView />
    </AppShell>
  );
}
