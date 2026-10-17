import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The app shell reads the current route to mark the active nav item.
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/transactions/new',
}));

import NewTransactionPage from './page';

function amountInput(): HTMLElement {
  return screen.getByLabelText(/amount \(bdt\)/i);
}

describe('new transaction route (form foundation, preview only)', () => {
  it('renders the form with an honestly disabled save action', () => {
    render(<NewTransactionPage />);
    expect(screen.getByRole('heading', { name: /new transaction/i })).toBeTruthy();
    const save = screen.getByRole('button', { name: /save transaction/i });
    expect(save.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/preview only.*nothing here is stored/i)).toBeTruthy();
  });

  it('rejects over-precision amounts with a field error', () => {
    render(<NewTransactionPage />);
    fireEvent.change(amountInput(), { target: { value: '12.345' } });
    fireEvent.blur(amountInput());
    expect(screen.getByText(/at most 2 decimals/i)).toBeTruthy();
  });

  it('reveals a destination account for transfers and requires it to differ', () => {
    render(<NewTransactionPage />);
    expect(screen.queryByLabelText(/to account/i)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /transfer/i }));
    const from = screen.getByLabelText(/^from account/i) as HTMLSelectElement;
    const to = screen.getByLabelText(/to account/i) as HTMLSelectElement;
    fireEvent.change(from, { target: { value: 'Cash (sample)' } });
    fireEvent.change(to, { target: { value: 'Cash (sample)' } });
    fireEvent.blur(to);
    expect(screen.getByText(/destination must differ/i)).toBeTruthy();
    // Transfers carry no category — the field is removed, not just hidden.
    expect(screen.queryByLabelText(/category/i)).toBeNull();
  });

  it('requires a category for money-in and money-out', () => {
    render(<NewTransactionPage />);
    fireEvent.click(screen.getByRole('radio', { name: /money in/i }));
    expect(screen.getByLabelText(/category/i)).toBeTruthy();
  });
});
