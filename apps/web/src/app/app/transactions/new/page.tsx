import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { TransactionForm } from '@/components/transaction-form';

export const metadata: Metadata = {
  title: 'New transaction — MoneyFlow UI preview',
};

/**
 * Transaction entry route (requirements.md §4.3, §5.4, §7.5). Renders the
 * form UI foundation only — validation is live, saving stays disabled until
 * the transaction API (IT-6) lands. Shell banner + in-form notice keep the
 * preview honest (AGENTS.md rule 12).
 */
export default function NewTransactionPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>New transaction</h1>
          <p className="mf-page-header__subtitle">
            Record money in, money out, or a move between your own accounts — layout preview with
            sample options.
          </p>
        </div>
      </header>
      <TransactionForm />
    </AppShell>
  );
}
