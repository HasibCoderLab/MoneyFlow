import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    deleteMyAccount: vi.fn(),
    downloadTransactionsCsv: vi.fn(),
  };
});

import { ApiClientError, deleteMyAccount, downloadTransactionsCsv } from '@/lib/api-client';

import { DeleteAccountControl, ExportTransactionsControl } from './data-controls';

const mockedExport = vi.mocked(downloadTransactionsCsv);
const mockedDelete = vi.mocked(deleteMyAccount);

beforeEach(() => {
  mockedExport.mockReset();
  mockedDelete.mockReset();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:moneyflow-csv'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CSV export control', () => {
  it('downloads the real API bytes with the server-provided filename', async () => {
    const blob = new Blob(['occurred_at_utc\r\n'], { type: 'text/csv' });
    mockedExport.mockResolvedValue({
      blob,
      filename: 'moneyflow-transactions-2026-10-20.csv',
    });

    render(<ExportTransactionsControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Download transactions CSV' }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        'Download started: moneyflow-transactions-2026-10-20.csv',
      );
    });
    expect(mockedExport).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole('button', { name: 'Download transactions CSV' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('shows the safe API error and does not claim a download', async () => {
    mockedExport.mockRejectedValue(
      new ApiClientError('Too many export requests. Try again later.', 429),
    );

    render(<ExportTransactionsControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Download transactions CSV' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Too many export requests. Try again later.');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('account deletion control', () => {
  it('requires the exact phrase and a password, then reports the real deletion', async () => {
    mockedDelete.mockResolvedValue(undefined);

    render(<DeleteAccountControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));

    const confirm = screen.getByRole('button', {
      name: 'Delete account permanently',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'integration-pass-12' },
    });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'delete' },
    });
    expect(confirm.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        'Your MoneyFlow account has been deleted',
      );
    });
    expect(mockedDelete).toHaveBeenCalledWith({
      password: 'integration-pass-12',
      confirmation: 'DELETE',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the server error, clears the password, and keeps the account', async () => {
    mockedDelete.mockRejectedValue(new ApiClientError('Current password is incorrect.', 401));

    render(<DeleteAccountControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account permanently' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Current password is incorrect.');
    expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes without calling the API and restores the trigger', () => {
    render(<DeleteAccountControl />);
    const open = screen.getByRole('button', { name: 'Delete my account…' });
    fireEvent.click(open);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(open).toBeTruthy();
  });
});
