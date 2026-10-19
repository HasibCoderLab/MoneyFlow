'use client';

import { useId, useState } from 'react';

import { TransactionList } from '@/components/transaction-list';
import { Button } from '@/components/ui/button';
import { formatSignedBdt } from '@/lib/format';
import type { MockTransaction } from '@/lib/mock-data';
import type { TransactionRow } from '@/lib/summary-display';

/** Maps hand-written sample rows to the shared transaction-row display model. */
function toDisplayRow(transaction: MockTransaction): TransactionRow {
  return {
    id: transaction.id,
    direction: transaction.direction,
    description: transaction.description,
    category: transaction.category,
    dateLabel: transaction.dateLabel,
    amountText: formatSignedBdt(transaction.amount, transaction.direction),
  };
}

/**
 * Sample transaction browser (preview). The search filters the visible
 * sample rows only — it performs exactly what it advertises and claims no
 * server querying. Full search/filter/pagination over real records arrives
 * with the transaction API (IT-6); this component is replaced then, not
 * extended with fake server behavior.
 */
export function TransactionBrowser({
  transactions,
}: {
  readonly transactions: readonly MockTransaction[];
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const countId = useId();

  const rows = transactions.map(toDisplayRow);
  const needle = query.trim().toLowerCase();
  const visible =
    needle.length === 0
      ? rows
      : rows.filter((row) =>
          `${row.description ?? ''} ${row.category ?? ''} ${row.direction}`
            .toLowerCase()
            .includes(needle),
        );

  return (
    <div>
      <div className="mf-field">
        <label className="mf-field__label" htmlFor={searchId}>
          Search sample transactions
        </label>
        <input
          id={searchId}
          className="mf-input"
          type="search"
          autoComplete="off"
          placeholder="e.g. groceries, stipend, transfer"
          value={query}
          aria-describedby={countId}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p id={countId} className="mf-field__hint" role="status">
          Showing {visible.length} of {transactions.length} sample rows.
        </p>
      </div>

      {visible.length > 0 ? (
        <TransactionList transactions={visible} />
      ) : (
        <div className="mf-empty">
          <p className="mf-empty__title">No sample rows match “{query.trim()}”.</p>
          <p className="mf-empty__text">
            This search covers only the sample rows shown on this page — real filtering over your
            records arrives with the transaction API.
          </p>
          <Button variant="ghost" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
