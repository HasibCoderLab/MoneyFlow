'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TransactionResponse } from '@moneyflow/contracts';

import { TransactionForm } from '@/components/transaction-form';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Entry screen state: after a successful save, show an explicit confirmation
 * instead of silently clearing the form. The record is already persisted;
 * the links lead to the authoritative list or a fresh entry.
 */
export function NewTransactionView() {
  const { t } = useLocale();
  const [saved, setSaved] = useState<TransactionResponse | null>(null);

  if (saved !== null) {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">{t('txform.successTitle')}</p>
        <p className="mf-empty__text">{t('txform.successBody')}</p>
        <div className="mf-dialog__actions">
          <Link className="mf-btn mf-btn--primary" href="/app/transactions">
            {t('txform.viewTransactions')}
          </Link>
          <Button variant="ghost" onClick={() => setSaved(null)}>
            {t('txform.recordAnother')}
          </Button>
        </div>
      </div>
    );
  }

  return <TransactionForm onSaved={setSaved} />;
}
