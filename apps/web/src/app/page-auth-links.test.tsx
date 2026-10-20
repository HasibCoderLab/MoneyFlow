import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('landing auth entry points', () => {
  it('offers sign-in from the topbar', () => {
    render(<Home />);
    const header = screen.getByRole('banner');
    const signIn = header.querySelector('a[href="/sign-in"]');
    expect(signIn?.textContent).toMatch(/sign in/i);
  });

  it('offers account creation and sign-in from the closing call to action', () => {
    render(<Home />);
    const cta = screen.getByRole('heading', { name: /track your own money/i }).closest('div')
      ?.parentElement as HTMLElement;
    const signUp = cta.querySelector('a[href="/sign-up"]');
    const signIn = cta.querySelector('a[href="/sign-in"]');
    expect(signUp?.textContent).toMatch(/create an account/i);
    expect(signIn?.textContent).toMatch(/sign in/i);
  });

  it('never promises anonymous access to private financial data', () => {
    render(<Home />);
    expect(screen.queryByText(/no account needed/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /ui preview/i })).toBeNull();
    for (const link of screen.getAllByRole('link', { name: /get started|create an account/i })) {
      expect(link.getAttribute('href')).toBe('/sign-up');
    }
  });
});
