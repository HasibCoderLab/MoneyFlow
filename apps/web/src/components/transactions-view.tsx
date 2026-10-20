'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { TransactionResponse, TransactionType } from '@moneyflow/contracts';

import { Card } from '@/components/card';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { TransactionForm } from '@/components/transaction-form';
import { TransactionList } from '@/components/transaction-list';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  ApiClientError,
  deleteTransaction,
  fetchAccounts,
  fetchCategories,
  fetchTransactions,
} from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';
import { transactionRows } from '@/lib/summary-display';
import { useAsyncData } from '@/lib/use-async-data';

const PAGE_SIZE = 20;

type Filters = {
  readonly type: TransactionType | '';
  readonly accountId: string;
  readonly categoryId: string;
  readonly dateFrom: string;
  readonly dateTo: string;
};

const EMPTY_FILTERS: Filters = {
  type: '',
  accountId: '',
  categoryId: '',
  dateFrom: '',
  dateTo: '',
};

type DeleteTarget = {
  readonly transaction: TransactionResponse;
  readonly description: string;
};

/**
 * Transactions screen (requirements.md §5.4). Rows, totals, ordering, and
 * filters come from `GET /api/v1/transactions`; editing/deleting use the
 * authenticated record endpoints. Transfers are shown as one movement with
 * no income/expense sign, matching the server's accounting rule.
 */
export function TransactionsView() {
  const { preferences } = useLocale();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [accounts, categories, list] = await Promise.all([
      fetchAccounts(),
      fetchCategories(true),
      fetchTransactions({
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        timezone: preferences.timezone,
        limit: PAGE_SIZE,
        offset,
      }),
    ]);
    return { accounts, categories, list };
  }, [filters, offset, preferences.timezone]);

  const { state, retry } = useAsyncData(load);

  const applyFilters = () => {
    if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) {
      setFilterError('The start date must not be after the end date.');
      return;
    }
    setFilterError(null);
    setFilters(draft);
    setOffset(0);
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFilterError(null);
    setOffset(0);
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteTransaction(deleteTarget.transaction.id);
      setDeleteTarget(null);
      if (state.status === 'ready' && state.data.list.items.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE));
      } else {
        retry();
      }
    } catch (error) {
      setActionError(
        error instanceof ApiClientError ? error.message : 'Could not delete the transaction.',
      );
      setDeleteTarget(null);
    }
  };

  const filtersApplied = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  let content;
  if (state.status === 'loading') {
    content = <SummaryLoading />;
  } else if (state.status === 'signedOut') {
    content = <SummarySignedOut />;
  } else if (state.status === 'error') {
    content = <SummaryError onRetry={retry} />;
  } else {
    const { list, accounts, categories } = state.data;
    const rows = transactionRows(
      list.items,
      accounts,
      categories,
      preferences.timezone,
      preferences,
    );
    const byId = new Map(list.items.map((transaction) => [transaction.id, transaction]));
    const rowById = new Map(rows.map((row) => [row.id, row]));

    if (list.total === 0) {
      content = (
        <div className="mf-empty">
          <p className="mf-empty__title">
            {filtersApplied ? 'No transactions match these filters.' : 'No transactions yet'}
          </p>
          <p className="mf-empty__text">
            {filtersApplied
              ? 'Change or clear the filters to see other recorded activity.'
              : 'Record money in, money out, or a transfer between your own accounts. Nothing is shown until you save a transaction.'}
          </p>
          {filtersApplied ? (
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Link className="mf-btn mf-btn--primary" href="/app/transactions/new">
              Add your first transaction
            </Link>
          )}
        </div>
      );
    } else {
      content = (
        <>
          <p className="mf-chart-note" role="status">
            Showing {offset + 1}–{offset + list.items.length} of {list.total} recorded
            {list.total === 1 ? ' transaction' : ' transactions'}.
          </p>
          <TransactionList
            transactions={rows}
            onEdit={(row) => {
              const transaction = byId.get(row.id);
              if (transaction) setEditing(transaction);
            }}
            onDelete={(row) => {
              const transaction = byId.get(row.id);
              if (!transaction) return;
              const display = rowById.get(row.id);
              setDeleteTarget({
                transaction,
                description: display?.description ?? row.direction,
              });
            }}
          />
          <div className="mf-pagination">
            <Button
              variant="ghost"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={list.nextOffset === null}
              onClick={() => {
                if (list.nextOffset !== null) setOffset(list.nextOffset);
              }}
            >
              Next
            </Button>
          </div>
        </>
      );
    }
  }

  return (
    <>
      <div className="mf-summary-meta">
        <Link className="mf-btn mf-btn--primary" href="/app/transactions/new">
          New transaction
        </Link>
        <p className="mf-chart-note">
          Search is not available yet; type, account, category, and date filters are.
        </p>
      </div>

      <Card title="Filters" subtitle="Applied by the server">
        <div className="mf-filter-grid">
          <label className="mf-field">
            <span className="mf-field__label">Type</span>
            <select
              className="mf-input"
              value={draft.type}
              onChange={(event) =>
                setDraft({ ...draft, type: event.target.value as Filters['type'] })
              }
            >
              <option value="">All types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </label>

          <label className="mf-field">
            <span className="mf-field__label">Account</span>
            <select
              className="mf-input"
              value={draft.accountId}
              onChange={(event) => setDraft({ ...draft, accountId: event.target.value })}
            >
              <option value="">All accounts</option>
              {state.status === 'ready'
                ? state.data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))
                : null}
            </select>
          </label>

          <label className="mf-field">
            <span className="mf-field__label">Category</span>
            <select
              className="mf-input"
              value={draft.categoryId}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            >
              <option value="">All categories</option>
              {state.status === 'ready'
                ? state.data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                : null}
            </select>
          </label>

          <label className="mf-field">
            <span className="mf-field__label">From date</span>
            <input
              className="mf-input"
              type="date"
              value={draft.dateFrom}
              onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })}
            />
          </label>

          <label className="mf-field">
            <span className="mf-field__label">To date</span>
            <input
              className="mf-input"
              type="date"
              value={draft.dateTo}
              onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })}
            />
          </label>
        </div>
        {filterError ? (
          <p className="mf-form__error" role="alert">
            {filterError}
          </p>
        ) : null}
        <div className="mf-dialog__actions">
          <Button onClick={applyFilters}>Apply filters</Button>
          <Button variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </Card>

      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <Card title="Your activity" subtitle="Recorded movements">
        {content}
      </Card>

      {editing ? (
        <Dialog
          open
          title="Edit transaction"
          description="The type cannot change. Delete and record a new transaction if the direction was wrong."
          onClose={() => setEditing(null)}
        >
          <TransactionForm
            transaction={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              retry();
            }}
          />
        </Dialog>
      ) : null}

      {deleteTarget ? (
        <Dialog
          open
          title="Delete this transaction?"
          description={`“${deleteTarget.description}” will be permanently removed and account balances, reports, and budgets will change. This cannot be undone.`}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void runDelete()}>Delete transaction</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
