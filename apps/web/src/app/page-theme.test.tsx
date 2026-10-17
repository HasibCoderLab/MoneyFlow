import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

/**
 * Landing-page theme coverage lives here — not in page.test.tsx — to avoid
 * editing a file under active concurrent work.
 */
describe('landing theme switcher', () => {
  it('offers the Light/Dark switcher in the topbar', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
  });

  it('switches the document theme without touching preview links', () => {
    render(<Home />);
    const toggle = screen.getByRole('button', { name: /theme:/i });
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const previewLinks = screen.getAllByRole('link', { name: /open (the )?ui preview/i });
    for (const link of previewLinks) {
      expect(link.getAttribute('href')).toBe('/app/dashboard');
    }
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.clear();
  });
});
