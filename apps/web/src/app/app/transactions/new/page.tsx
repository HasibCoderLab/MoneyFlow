import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { NewTransactionView } from '@/components/new-transaction-view';

export const metadata: Metadata = {
  title: 'New transaction — MoneyFlow',
  description: 'Record money in, money out, or a transfer between your own accounts.',
};

/**
 * Transaction entry route (requirements.md §4.3, §5.4, §7.5). Accounts and
 * categories are loaded from the authenticated API, saving persists through
 * `POST /api/v1/transactions` with an idempotency key, and success is shown
 * explicitly.
 */
export default function NewTransactionPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>New transaction</h1>
          <p className="mf-page-header__subtitle">
            Record money in, money out, or a move between your own accounts.
          </p>
        </div>
        <Link className="mf-btn mf-btn--ghost" href="/app/transactions">
          Back to transactions
        </Link>
      </header>
      <NewTransactionView />
    </AppShell>
  );
}
