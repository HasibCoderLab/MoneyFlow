import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/goals',
}));

import GoalsPage from './page';

describe('goals route (layout preview, sample data)', () => {
  it('lists sample goals with saved, target, remaining, and deadline', () => {
    render(<GoalsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Savings goals' })).toBeTruthy();
    expect(screen.getByText('Emergency fund')).toBeTruthy();
    expect(screen.getByText('BDT 8,000 of BDT 30,000')).toBeTruthy();
    expect(screen.getByText('BDT 22,000 remaining')).toBeTruthy();
    expect(screen.getByText('Target Mar 2027')).toBeTruthy();
  });

  it('exposes each goal as an accessible progress indicator', () => {
    render(<GoalsPage />);
    expect(screen.getByRole('progressbar', { name: 'New laptop progress' })).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('clarifies that contributions track progress without moving money', () => {
    render(<GoalsPage />);
    expect(screen.getByText(/adding to a goal does not move money/i)).toBeTruthy();
  });

  it('keeps goal creation disabled until the goals API lands', () => {
    render(<GoalsPage />);
    expect(screen.getByRole('button', { name: /new goal/i }).hasAttribute('disabled')).toBe(true);
  });

  it('marks the section as current in shared navigation', () => {
    render(<GoalsPage />);
    expect(screen.getByRole('link', { name: 'Savings goals' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
