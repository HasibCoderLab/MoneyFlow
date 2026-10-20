import type { AccountResponse, CategoryResponse, TransactionResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/transactions/new',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchAccounts: vi.fn(),
    fetchCategories: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  };
});

import { createTransaction, fetchAccounts, fetchCategories } from '@/lib/api-client';
import NewTransactionPage from './page';

const mockedFetchAccounts = vi.mocked(fetchAccounts);
const mockedFetchCategories = vi.mocked(fetchCategories);
const mockedCreateTransaction = vi.mocked(createTransaction);

function account(id: string, name: string): AccountResponse {
  return {
    id,
    name,
    type: 'CASH',
    status: 'ACTIVE',
    currency: 'BDT',
    openingBalanceMinor: '0',
    balanceMinor: '0',
    archivedAt: null,
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
  };
}

function category(id: string, name: string, type: 'INCOME' | 'EXPENSE'): CategoryResponse {
  return {
    id,
    name,
    type,
    color: null,
    status: 'ACTIVE',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
  };
}

function savedTransaction(): TransactionResponse {
  return {
    id: 't1',
    type: 'EXPENSE',
    amountMinor: '35000',
    currency: 'BDT',
    occurredAt: '2026-10-20T06:00:00.000Z',
    accountId: 'a1',
    fromAccountId: null,
    toAccountId: null,
    categoryId: 'c1',
    adjustmentSign: null,
    note: 'Groceries',
    idempotencyKey: 'key',
    createdAt: '2026-10-20T06:00:00.000Z',
    updatedAt: '2026-10-20T06:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchAccounts.mockResolvedValue([account('a1', 'Cash'), account('a2', 'Bank')]);
  mockedFetchCategories.mockResolvedValue([
    category('c1', 'Groceries', 'EXPENSE'),
    category('c2', 'Salary', 'INCOME'),
  ]);
});

describe('new transaction route (authenticated API)', () => {
  it('loads real active accounts and categories and enables saving', async () => {
    render(<NewTransactionPage />);

    expect(await screen.findByRole('option', { name: 'Cash' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeTruthy();
    const save = screen.getByRole('button', { name: /save transaction/i });
    expect(save.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/preview only/i)).toBeNull();
    expect(screen.queryByText(/\(sample\)/i)).toBeNull();
  });

  it('rejects over-precision amounts with a field error', async () => {
    render(<NewTransactionPage />);
    const amount = await screen.findByLabelText(/amount \(bdt\)/i);
    fireEvent.change(amount, { target: { value: '12.345' } });
    fireEvent.blur(amount);
    expect(screen.getByText(/at most 2 decimals/i)).toBeTruthy();
  });

  it('reveals a destination for transfers and requires it to differ', async () => {
    render(<NewTransactionPage />);
    await screen.findByRole('option', { name: 'Cash' });
    fireEvent.click(screen.getByRole('radio', { name: /transfer/i }));
    const from = screen.getByLabelText(/^from account$/i);
    const to = screen.getByLabelText(/^to account$/i);
    fireEvent.change(from, { target: { value: 'a1' } });
    fireEvent.change(to, { target: { value: 'a1' } });
    fireEvent.blur(to);
    expect(screen.getByText(/destination must differ/i)).toBeTruthy();
    expect(screen.queryByLabelText(/^category$/i)).toBeNull();
  });

  it('POSTs the selected record and confirms after it is persisted', async () => {
    mockedCreateTransaction.mockResolvedValue(savedTransaction());

    render(<NewTransactionPage />);
    await screen.findByRole('option', { name: 'Groceries' });
    fireEvent.change(screen.getByLabelText(/amount \(bdt\)/i), { target: { value: '350' } });
    fireEvent.change(screen.getByLabelText(/^account$/i), { target: { value: 'a1' } });
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'Groceries' } });
    fireEvent.click(screen.getByRole('button', { name: /save transaction/i }));

    await waitFor(() =>
      expect(mockedCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXPENSE',
          amount: '350',
          accountId: 'a1',
          categoryId: 'c1',
          note: 'Groceries',
          occurredDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
        expect.any(String),
      ),
    );
    expect(await screen.findByText(/transaction saved/i)).toBeTruthy();
  });

  it('stops before the form when no active account exists', async () => {
    mockedFetchAccounts.mockResolvedValue([]);

    render(<NewTransactionPage />);

    expect(await screen.findByText(/add an account first/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /go to accounts/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /save transaction/i })).toBeNull();
  });
});
