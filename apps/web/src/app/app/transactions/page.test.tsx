import type {
  AccountResponse,
  CategoryResponse,
  TransactionListResponse,
  TransactionResponse,
} from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/transactions',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchTransactions: vi.fn(),
    fetchAccounts: vi.fn(),
    fetchCategories: vi.fn(),
    deleteTransaction: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  };
});

import {
  ApiClientError,
  deleteTransaction,
  fetchAccounts,
  fetchCategories,
  fetchTransactions,
} from '@/lib/api-client';
import TransactionsPage from './page';

const mockedFetchTransactions = vi.mocked(fetchTransactions);
const mockedFetchAccounts = vi.mocked(fetchAccounts);
const mockedFetchCategories = vi.mocked(fetchCategories);
const mockedDeleteTransaction = vi.mocked(deleteTransaction);

function account(overrides: Partial<AccountResponse> = {}): AccountResponse {
  return {
    id: 'a1',
    name: 'Cash',
    type: 'CASH',
    status: 'ACTIVE',
    currency: 'BDT',
    openingBalanceMinor: '0',
    balanceMinor: '0',
    archivedAt: null,
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    ...overrides,
  };
}

function category(overrides: Partial<CategoryResponse> = {}): CategoryResponse {
  return {
    id: 'c1',
    name: 'Groceries',
    type: 'EXPENSE',
    color: null,
    status: 'ACTIVE',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    ...overrides,
  };
}

function transaction(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id: 't1',
    type: 'EXPENSE',
    amountMinor: '32000',
    currency: 'BDT',
    occurredAt: '2026-10-20T06:00:00.000Z',
    accountId: 'a1',
    fromAccountId: null,
    toAccountId: null,
    categoryId: 'c1',
    adjustmentSign: null,
    note: 'Groceries — monthly restock',
    idempotencyKey: null,
    createdAt: '2026-10-20T06:00:00.000Z',
    updatedAt: '2026-10-20T06:00:00.000Z',
    ...overrides,
  };
}

function list(items: TransactionResponse[]): TransactionListResponse {
  return { items, nextOffset: null, total: items.length };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchAccounts.mockResolvedValue([account(), account({ id: 'a2', name: 'Bank' })]);
  mockedFetchCategories.mockResolvedValue([category()]);
});

describe('transactions route (IT-4/IT-6 API)', () => {
  it('shows an honest empty state with a real way to record the first transaction', async () => {
    mockedFetchTransactions.mockResolvedValue(list([]));

    render(<TransactionsPage />);

    expect(await screen.findByText(/no transactions yet/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /add your first transaction/i })).toBeTruthy();
  });

  it('renders persisted rows with resolved account/category names and exact signs', async () => {
    mockedFetchTransactions.mockResolvedValue(
      list([
        transaction(),
        transaction({
          id: 't2',
          type: 'INCOME',
          amountMinor: '1800000',
          categoryId: 'c1',
          note: null,
        }),
        transaction({
          id: 't3',
          type: 'TRANSFER',
          amountMinor: '200000',
          accountId: null,
          categoryId: null,
          fromAccountId: 'a1',
          toAccountId: 'a2',
          note: 'Move to savings',
        }),
      ]),
    );

    render(<TransactionsPage />);

    expect(await screen.findByText('Groceries — monthly restock')).toBeTruthy();
    expect(screen.getByText('\u2212BDT 320')).toBeTruthy();
    expect(screen.getByText('+BDT 18,000')).toBeTruthy();
    expect(screen.getByText('BDT 2,000')).toBeTruthy();
    expect(screen.getByText('Cash \u2192 Bank')).toBeTruthy();
    expect(screen.getByText(/showing 1–3 of 3 recorded transactions/i)).toBeTruthy();
  });

  it('applies server filters through the API', async () => {
    mockedFetchTransactions.mockResolvedValue(list([]));

    render(<TransactionsPage />);
    await screen.findByText(/no transactions yet/i);

    fireEvent.change(screen.getByLabelText(/^type$/i), { target: { value: 'EXPENSE' } });
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() =>
      expect(mockedFetchTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'EXPENSE', categoryId: 'c1', limit: 20, offset: 0 }),
      ),
    );
  });

  it('deletes a record only after the confirmation dialog', async () => {
    mockedFetchTransactions.mockResolvedValue(list([transaction()]));
    mockedDeleteTransaction.mockResolvedValue(undefined);

    render(<TransactionsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete transaction:/i }));
    expect(mockedDeleteTransaction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^delete transaction$/i }));

    await waitFor(() => expect(mockedDeleteTransaction).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(mockedFetchTransactions).toHaveBeenCalledTimes(2));
  });

  it('reports API failures with retry instead of falling back to sample rows', async () => {
    mockedFetchTransactions.mockRejectedValue(new ApiClientError('Server unavailable.', 503));

    render(<TransactionsPage />);

    expect(await screen.findByText(/could not load your data/i)).toBeTruthy();
    expect(screen.queryByText('Groceries — monthly restock')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedFetchTransactions).toHaveBeenCalledTimes(2));
  });
});
