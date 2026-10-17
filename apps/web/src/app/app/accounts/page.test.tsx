import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/accounts',
}));

import AccountsPage from './page';

describe('accounts route (layout preview, sample data)', () => {
  it('lists sample accounts with kinds and opening balances', () => {
    render(<AccountsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Accounts' })).toBeTruthy();
    expect(screen.getByText('City Bank savings')).toBeTruthy();
    expect(screen.getByText('Bank account · BDT')).toBeTruthy();
    expect(screen.getByText('BDT 45,000')).toBeTruthy();
    expect(screen.getByText('bKash wallet')).toBeTruthy();
  });

  it('keeps archived accounts visible with history preserved', () => {
    render(<AccountsPage />);
    expect(screen.getByText('Old student account')).toBeTruthy();
    expect(
      screen.getByText(/archiving hides an account.*without erasing its history/i),
    ).toBeTruthy();
  });

  it('shows opening balances only — no computed totals are claimed', () => {
    render(<AccountsPage />);
    expect(screen.getByText(/balances shown are opening balances/i)).toBeTruthy();
    // Every figure on the page is explicitly an opening balance.
    expect(screen.getAllByText('Opening balance').length).toBeGreaterThanOrEqual(4);
  });

  it('keeps account creation disabled until the accounts API lands', () => {
    render(<AccountsPage />);
    const action = screen.getByRole('button', { name: /new account/i });
    expect(action.hasAttribute('disabled')).toBe(true);
  });

  it('keeps the shared navigation available', () => {
    render(<AccountsPage />);
    const nav = screen.getByRole('navigation', { name: /main/i });
    expect(nav.querySelectorAll('a')).toHaveLength(8);
    expect(screen.getByRole('link', { name: 'Accounts' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('labels the page as sample data via the shell banner', () => {
    render(<AccountsPage />);
    const banner = screen.getByRole('note', { name: /preview data notice/i });
    expect(within(banner).getByText(/ui preview — sample data/i)).toBeTruthy();
  });
});
