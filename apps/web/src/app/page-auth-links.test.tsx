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

  it('offers account creation from the closing call to action', () => {
    render(<Home />);
    const cta = screen.getByRole('heading', { name: /start with the ui preview/i }).closest('div')
      ?.parentElement as HTMLElement;
    const signUp = cta.querySelector('a[href="/sign-up"]');
    expect(signUp?.textContent).toMatch(/create an account/i);
  });

  it('keeps every UI-preview call to action pointed at the preview', () => {
    render(<Home />);
    for (const link of screen.getAllByRole('link', { name: /open (the )?ui preview/i })) {
      expect(link.getAttribute('href')).toBe('/app/dashboard');
    }
  });
});
