import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SiteNotFound from './not-found';

describe('site 404 page', () => {
  it('renders a single top-level heading stating the page is missing', () => {
    render(<SiteNotFound />);
    expect(
      screen.getByRole('heading', { level: 1, name: /this page does not exist/i }),
    ).toBeTruthy();
    expect(screen.getByText(/error 404/i)).toBeTruthy();
  });

  it('offers only real recovery destinations', () => {
    render(<SiteNotFound />);
    const home = screen.getByRole('link', { name: /back to home/i });
    const preview = screen.getByRole('link', { name: /open ui preview/i });
    expect(home.getAttribute('href')).toBe('/');
    expect(preview.getAttribute('href')).toBe('/app/dashboard');
  });

  it('never shows financial figures', () => {
    render(<SiteNotFound />);
    expect(screen.queryByText(/৳|BDT\s*\d/)).toBeNull();
  });

  it('provides a skip link for keyboard users', () => {
    render(<SiteNotFound />);
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip.getAttribute('href')).toBe('#main-content');
  });

  it('keeps the decorative floating art hidden from assistive tech', () => {
    render(<SiteNotFound />);
    const view = screen.getByTestId('not-found-view');
    const art = view.querySelector('.mf-notfound__art');
    expect(art?.getAttribute('aria-hidden')).toBe('true');
    // Decorative only: still a single top-level heading.
    expect(view.querySelectorAll('h1')).toHaveLength(1);
  });
});
