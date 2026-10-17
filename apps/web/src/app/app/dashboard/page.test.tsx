import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The app shell reads the current route to mark the active nav item.
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/dashboard',
}));

import DashboardPage from './page';

describe('dashboard UI preview', () => {
  it('labels every figure as sample data', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/UI preview — sample data/i)).toBeTruthy();
    expect(screen.getByText(/fictional sample data/i)).toBeTruthy();
  });

  it('shows the sample summary figures with BDT formatting', () => {
    render(<DashboardPage />);
    expect(screen.getByText('BDT 12,450')).toBeTruthy(); // total balance (hero card)
    expect(screen.getByText('BDT 18,000')).toBeTruthy(); // income
    // Appears in two places by design: the KPI card and the donut centre.
    expect(screen.getAllByText('BDT 9,750').length).toBeGreaterThanOrEqual(1); // spent
  });

  it('offers the primary Add Transaction action pointing at its placeholder route', () => {
    render(<DashboardPage />);
    const cta = screen.getByRole('link', { name: /add transaction/i });
    expect(cta.getAttribute('href')).toBe('/app/transactions/new');
  });

  it('provides navigation to every placeholder section', () => {
    render(<DashboardPage />);
    const nav = screen.getByRole('navigation', { name: /main/i });
    const links = within(nav).getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/app/dashboard',
      '/app/accounts',
      '/app/transactions',
      '/app/categories',
      '/app/budgets',
      '/app/goals',
      '/app/reports',
      '/app/settings',
    ]);
  });

  it('marks the dashboard as the current page', () => {
    render(<DashboardPage />);
    const active = screen.getByRole('link', { name: 'Dashboard' });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('labels transfers as transfers, never as income or expense', () => {
    render(<DashboardPage />);
    // The transfer row carries a visible "Transfer" type label and its own
    // colour class — plus an explicit note that transfers are not counted.
    const transferRow = screen.getByText('Move to Emergency fund').closest('li') as HTMLElement;
    expect(transferRow.className).toContain('mf-tx--transfer');
    // The visible type label (not just colour) identifies this as a transfer.
    expect(transferRow.querySelector('.mf-tx__type')?.textContent).toBe('Transfer');
    expect(within(transferRow).getByText(/\u2212BDT 2,000/)).toBeTruthy();
    expect(screen.getByText(/never counted as income or spending/i)).toBeTruthy();
  });

  it('exposes goals and budgets as accessible progress indicators', () => {
    render(<DashboardPage />);
    const progressbars = screen.getAllByRole('progressbar');
    // 3 sample goals + 4 sample budgets.
    expect(progressbars).toHaveLength(7);
    expect(screen.getByRole('progressbar', { name: 'Emergency fund progress' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Groceries budget usage' })).toBeTruthy();
  });

  it('provides a plain-text summary for the category chart', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('chart-summary').textContent).toMatch(
      /Groceries is the largest category at BDT 3,200 \(33%/,
    );
  });
});
