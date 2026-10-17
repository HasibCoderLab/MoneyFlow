import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/reports',
}));

import ReportsPage from './page';

describe('reports route (layout preview, sample data)', () => {
  it('shows income vs expense for the labelled sample period', () => {
    render(<ReportsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeTruthy();
    expect(screen.getByText('BDT 18,000')).toBeTruthy();
    expect(screen.getAllByText('BDT 9,750').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('October 2026').length).toBeGreaterThanOrEqual(1);
  });

  it('reuses the accessible category breakdown', () => {
    render(<ReportsPage />);
    expect(screen.getByTestId('chart-summary').textContent).toMatch(/Groceries is the largest/);
  });

  it('names forthcoming reports without fabricating trends', () => {
    render(<ReportsPage />);
    expect(screen.getByText(/daily, weekly, and monthly totals/i)).toBeTruthy();
    expect(screen.getByText(/nothing here is forecasted or estimated/i)).toBeTruthy();
    expect(screen.queryByText(/you will reach|projected savings|trend forecast/i)).toBeNull();
  });

  it('links only to existing preview routes', () => {
    render(<ReportsPage />);
    expect(screen.getByRole('link', { name: /goals preview/i }).getAttribute('href')).toBe(
      '/app/goals',
    );
    expect(screen.getByRole('link', { name: /budgets preview/i }).getAttribute('href')).toBe(
      '/app/budgets',
    );
  });

  it('keeps CSV export disabled until the export workflow lands', () => {
    render(<ReportsPage />);
    expect(screen.getByRole('button', { name: /export csv/i }).hasAttribute('disabled')).toBe(true);
  });

  it('marks the section as current in shared navigation', () => {
    render(<ReportsPage />);
    expect(screen.getByRole('link', { name: 'Reports' }).getAttribute('aria-current')).toBe('page');
  });
});
