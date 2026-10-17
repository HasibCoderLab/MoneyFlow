import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

/**
 * FAQ + personal-control coverage for the landing page. Kept in its own
 * file to avoid editing test files under concurrent work.
 */
describe('landing faq and personal control', () => {
  it('renders seven grounded questions with answers present in the DOM', () => {
    render(<Home />);
    const section = screen
      .getByRole('heading', { name: /frequently asked questions/i })
      .closest('section') as HTMLElement;
    expect(section.querySelectorAll('details')).toHaveLength(7);
    expect(section.querySelectorAll('summary')).toHaveLength(7);
    // Answers render server-side even while collapsed (no-JS friendly).
    expect(within(section).getByText(/standalone personal finance companion/i)).toBeTruthy();
    expect(within(section).getByText(/does moneyflow connect to my bank\?/i)).toBeTruthy();
  });

  it('states plainly that there is no bank connection', () => {
    render(<Home />);
    expect(screen.getByText(/keeps manual records only/i)).toBeTruthy();
    expect(screen.getByText(/never asks for your bank or mobile-wallet logins/i)).toBeTruthy();
  });

  it('invents no pricing, trials, or availability promises', () => {
    render(<Home />);
    expect(screen.queryByText(/free trial|subscription|payment plan|per month/i)).toBeNull();
    expect(screen.getByText(/pricing is not decided yet/i)).toBeTruthy();
  });

  it('presents the personal-control section with four grounded points', () => {
    render(<Home />);
    const section = screen
      .getByRole('heading', { name: /your finances\. your rules\./i })
      .closest('section') as HTMLElement;
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(within(section).getByText(/categories that fit your life/i)).toBeTruthy();
  });
});
