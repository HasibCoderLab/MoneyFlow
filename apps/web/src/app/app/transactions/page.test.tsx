import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/transactions',
}));

import TransactionsPage from './page';

describe('transactions route (layout preview, sample data)', () => {
  it('lists the sample rows with type labels and signed amounts', () => {
    render(<TransactionsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Transactions' })).toBeTruthy();
    expect(screen.getByText('Part-time stipend')).toBeTruthy();
    expect(screen.getByText('Move to Emergency fund')).toBeTruthy();
    expect(screen.getByText(/showing 6 of 6 sample rows/i)).toBeTruthy();
  });

  it('filters the visible sample rows as the user types', () => {
    render(<TransactionsPage />);
    fireEvent.change(screen.getByLabelText(/search sample transactions/i), {
      target: { value: 'groceries' },
    });
    expect(screen.getByText('Groceries — monthly restock')).toBeTruthy();
    expect(screen.queryByText('Part-time stipend')).toBeNull();
    expect(screen.getByText(/showing 1 of 6 sample rows/i)).toBeTruthy();
  });

  it('shows an honest empty state with a working clear action', () => {
    render(<TransactionsPage />);
    fireEvent.change(screen.getByLabelText(/search sample transactions/i), {
      target: { value: 'no-such-thing' },
    });
    expect(screen.getByText(/no sample rows match/i)).toBeTruthy();
    expect(screen.getByText(/covers only the sample rows/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(screen.getByText('Part-time stipend')).toBeTruthy();
  });

  it('marks the section as current in shared navigation', () => {
    render(<TransactionsPage />);
    expect(screen.getByRole('link', { name: 'Transactions' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
