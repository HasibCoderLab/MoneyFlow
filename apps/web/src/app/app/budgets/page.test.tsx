import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/budgets',
}));

import BudgetsPage from './page';

describe('budgets route (layout preview, sample data)', () => {
  it('lists sample budgets with spent, limit, and remaining figures', () => {
    render(<BudgetsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Budgets' })).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('BDT 3,200 of BDT 5,000 limit')).toBeTruthy();
    expect(screen.getByText('BDT 1,800 remaining')).toBeTruthy();
  });

  it('states budget status in words, never color alone', () => {
    render(<BudgetsPage />);
    expect(screen.getAllByText('Within plan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Close to limit').length).toBeGreaterThanOrEqual(1);
  });

  it('exposes each budget as an accessible progress indicator', () => {
    render(<BudgetsPage />);
    expect(screen.getByRole('progressbar', { name: 'Groceries budget usage' })).toBeTruthy();
  });

  it('clarifies that transfers never count as budget spending', () => {
    render(<BudgetsPage />);
    expect(screen.getByText(/transfers between your own accounts never do/i)).toBeTruthy();
  });

  it('keeps budget creation disabled until the budgets API lands', () => {
    render(<BudgetsPage />);
    expect(screen.getByRole('button', { name: /new budget/i }).hasAttribute('disabled')).toBe(true);
  });

  it('marks the section as current in shared navigation', () => {
    render(<BudgetsPage />);
    expect(screen.getByRole('link', { name: 'Budgets' }).getAttribute('aria-current')).toBe('page');
  });
});
