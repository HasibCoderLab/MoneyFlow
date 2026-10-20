import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchPreferences: vi.fn().mockRejectedValue(new actual.ApiClientError('Unauthorized', 401)),
    updatePreferences: vi.fn(),
  };
});

import { LocaleProvider } from '@/lib/i18n/locale-context';

import Home from './page';

/**
 * Landing-page theme coverage lives here — not in page.test.tsx — to avoid
 * editing a file under active concurrent work. The root layout always mounts
 * the preferences provider, including for public pages.
 */
describe('landing theme switcher', () => {
  it('offers the Light/Dark switcher in the topbar', () => {
    render(
      <LocaleProvider>
        <Home />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
  });

  it('switches the document theme without touching preview links', () => {
    render(
      <LocaleProvider>
        <Home />
      </LocaleProvider>,
    );
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
