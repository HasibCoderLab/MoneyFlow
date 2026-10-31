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
  const { preferences, t } = useLocale();
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
      setFilterError(t('transactions.dateRangeError'));
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
        error instanceof ApiClientError ? error.message : t('transactions.deleteError'),
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
            {filtersApplied ? t('transactions.emptyFilteredTitle') : t('transactions.emptyTitle')}
          </p>
          <p className="mf-empty__text">
            {filtersApplied ? t('transactions.emptyFilteredBody') : t('transactions.emptyBody')}
          </p>
          {filtersApplied ? (
            <Button variant="ghost" onClick={clearFilters}>
              {t('transactions.clearFilters')}
            </Button>
          ) : (
            <Link className="mf-btn mf-btn--primary" href="/app/transactions/new">
              {t('transactions.addFirst')}
            </Link>
          )}
        </div>
      );
    } else {
      content = (
        <>
          <p className="mf-chart-note" role="status">
            {t(list.total === 1 ? 'transactions.showingOne' : 'transactions.showing', {
              from: offset + 1,
              to: offset + list.items.length,
              total: list.total,
            })}
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
              {t('transactions.previous')}
            </Button>
            <Button
              variant="ghost"
              disabled={list.nextOffset === null}
              onClick={() => {
                if (list.nextOffset !== null) setOffset(list.nextOffset);
              }}
            >
              {t('transactions.next')}
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
          {t('transactions.newButton')}
        </Link>
        <p className="mf-chart-note">{t('transactions.searchNote')}</p>
      </div>

      <Card title={t('transactions.filtersTitle')} subtitle={t('transactions.filtersSubtitle')}>
        <div className="mf-filter-grid">
          <label className="mf-field">
            <span className="mf-field__label">{t('transactions.type')}</span>
            <select
              className="mf-input"
              value={draft.type}
              onChange={(event) =>
                setDraft({ ...draft, type: event.target.value as Filters['type'] })
              }
            >
              <option value="">{t('transactions.allTypes')}</option>
              <option value="INCOME">{t('tx.type.income')}</option>
              <option value="EXPENSE">{t('tx.type.expense')}</option>
              <option value="TRANSFER">{t('tx.type.transfer')}</option>
              <option value="ADJUSTMENT">{t('tx.type.adjustment')}</option>
            </select>
          </label>

          <label className="mf-field">
            <span className="mf-field__label">{t('transactions.account')}</span>
            <select
              className="mf-input"
              value={draft.accountId}
              onChange={(event) => setDraft({ ...draft, accountId: event.target.value })}
            >
              <option value="">{t('transactions.allAccounts')}</option>
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
            <span className="mf-field__label">{t('transactions.category')}</span>
            <select
              className="mf-input"
              value={draft.categoryId}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            >
              <option value="">{t('transactions.allCategories')}</option>
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
            <span className="mf-field__label">{t('transactions.fromDate')}</span>
            <input
              className="mf-input"
              type="date"
              value={draft.dateFrom}
              onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })}
            />
          </label>

          <label className="mf-field">
            <span className="mf-field__label">{t('transactions.toDate')}</span>
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
          <Button onClick={applyFilters}>{t('transactions.applyFilters')}</Button>
          <Button variant="ghost" onClick={clearFilters}>
            {t('common.clear')}
          </Button>
        </div>
      </Card>

      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <Card title={t('transactions.activityTitle')} subtitle={t('transactions.activitySubtitle')}>
        {content}
      </Card>

      {editing ? (
        <Dialog
          open
          title={t('transactions.editTitle')}
          description={t('transactions.editBody')}
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
          title={t('transactions.deleteTitle')}
          description={t('transactions.deleteBody', {
            description: deleteTarget.description,
          })}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void runDelete()}>{t('transactions.deleteButton')}</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
