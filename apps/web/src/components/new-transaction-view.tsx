'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TransactionResponse } from '@moneyflow/contracts';

import { TransactionForm } from '@/components/transaction-form';
import { Button } from '@/components/ui/button';

/**
 * Entry screen state: after a successful save, show an explicit confirmation
 * instead of silently clearing the form. The record is already persisted;
 * the links lead to the authoritative list or a fresh entry.
 */
export function NewTransactionView() {
  const [saved, setSaved] = useState<TransactionResponse | null>(null);

  if (saved !== null) {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">Transaction saved</p>
        <p className="mf-empty__text">
          Your account balances, dashboard, reports, and budgets now include this record.
        </p>
        <div className="mf-dialog__actions">
          <Link className="mf-btn mf-btn--primary" href="/app/transactions">
            View transactions
          </Link>
          <Button variant="ghost" onClick={() => setSaved(null)}>
            Record another
          </Button>
        </div>
      </div>
    );
  }

  return <TransactionForm onSaved={setSaved} />;
}
