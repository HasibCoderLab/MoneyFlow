import type { AccountResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/accounts',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    moveAccount: vi.fn(),
  };
});

import { ApiClientError, createAccount, fetchAccounts, moveAccount } from '@/lib/api-client';
import AccountsPage from './page';

const mockedFetchAccounts = vi.mocked(fetchAccounts);
const mockedCreateAccount = vi.mocked(createAccount);
const mockedMoveAccount = vi.mocked(moveAccount);

function account(overrides: Partial<AccountResponse> = {}): AccountResponse {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Cash',
    type: 'CASH',
    status: 'ACTIVE',
    currency: 'BDT',
    openingBalanceMinor: '150050',
    balanceMinor: '150050',
    archivedAt: null,
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('accounts route (IT-4 API)', () => {
  it('renders server-derived balances and the opening balance separately', async () => {
    mockedFetchAccounts.mockResolvedValue([account()]);

    render(<AccountsPage />);

    expect(await screen.findByText('Cash')).toBeTruthy();
    expect(screen.getByText('BDT 1,500.50')).toBeTruthy();
    expect(screen.getByText('Opening BDT 1,500.50')).toBeTruthy();
  });

  it('shows an honest empty state and creates an account through the API', async () => {
    mockedFetchAccounts.mockResolvedValue([]);
    mockedCreateAccount.mockResolvedValue(account({ name: 'bKash' }));

    render(<AccountsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /add your first account/i }));
    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'bKash' } });
    fireEvent.change(screen.getByLabelText(/opening balance/i), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() =>
      expect(mockedCreateAccount).toHaveBeenCalledWith({
        name: 'bKash',
        type: 'CASH',
        currency: 'BDT',
        openingBalance: '250',
      }),
    );
  });

  it('archives an active account only after confirmation', async () => {
    mockedFetchAccounts.mockResolvedValue([account()]);
    mockedMoveAccount.mockResolvedValue(account({ status: 'ARCHIVED' }));

    render(<AccountsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /archive cash/i }));
    expect(mockedMoveAccount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^archive account$/i }));

    await waitFor(() =>
      expect(mockedMoveAccount).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        'archive',
      ),
    );
  });

  it('surfaces a retryable error instead of empty or invented data', async () => {
    mockedFetchAccounts.mockRejectedValue(new ApiClientError('Server unavailable.', 503));

    render(<AccountsPage />);

    expect(await screen.findByText(/could not load your data/i)).toBeTruthy();
    expect(screen.queryByText(/no accounts yet/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedFetchAccounts).toHaveBeenCalledTimes(2));
  });
});
