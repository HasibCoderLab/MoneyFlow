import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The app shell reads the current route; no nav item is active on a 404.
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/does-not-exist',
}));

import AppNotFound from './not-found';

describe('app 404 page', () => {
  it('renders a single top-level heading stating the page is missing', () => {
    render(<AppNotFound />);
    expect(
      screen.getByRole('heading', { level: 1, name: /this page does not exist/i }),
    ).toBeTruthy();
    expect(screen.getByText(/error 404/i)).toBeTruthy();
  });

  it('keeps in-product recovery links inside the app chrome', () => {
    render(<AppNotFound />);
    const dashboard = screen.getByRole('link', { name: /back to dashboard/i });
    const transactions = screen.getByRole('link', { name: /view transactions/i });
    expect(dashboard.getAttribute('href')).toBe('/app/dashboard');
    expect(transactions.getAttribute('href')).toBe('/app/transactions');
    expect(screen.getByRole('navigation', { name: /main/i })).toBeTruthy();
  });

  it('marks no nav item as current on an unknown route', () => {
    render(<AppNotFound />);
    const nav = screen.getByRole('navigation', { name: /main/i });
    expect(nav.querySelector('[aria-current="page"]')).toBeNull();
  });

  it('never shows financial figures', () => {
    render(<AppNotFound />);
    const view = screen.getByTestId('not-found-view');
    expect(view.textContent).not.toMatch(/৳|BDT\s*\d/);
  });
});
