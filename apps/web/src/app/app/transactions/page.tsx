import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { TransactionBrowser } from '@/components/transaction-browser';
import { MOCK_RECENT_TRANSACTIONS } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Transactions — MoneyFlow UI preview',
};

/**
 * Transactions route (requirements.md §4.3, §5.4). Layout preview only:
 * the sample rows with a client-side search over the visible set. Server
 * search, filters, pagination, editing, and export arrive with the
 * transaction API (IT-6). Shell banner keeps the sample labelling honest.
 */
export default function TransactionsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Transactions</h1>
          <p className="mf-page-header__subtitle">
            Every recorded movement of money — sample rows for this preview.
          </p>
        </div>
      </header>

      <Card title="All activity" subtitle="Sample rows">
        <TransactionBrowser transactions={MOCK_RECENT_TRANSACTIONS} />
      </Card>
    </AppShell>
  );
}
