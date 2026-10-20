import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchPreferences: vi.fn().mockRejectedValue(new actual.ApiClientError('Unauthorized', 401)),
    updatePreferences: vi.fn(),
  };
});

import { LocaleProvider } from '@/lib/i18n/locale-context';

import { ThemeToggle } from './theme-toggle';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

function renderToggle() {
  return render(
    <LocaleProvider>
      <ThemeToggle />
    </LocaleProvider>,
  );
}

describe('theme toggle', () => {
  it('starts at Light with an explicit theme (SSR-safe)', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('cycles Light → Dark → System and persists each choice', () => {
    renderToggle();
    const button = screen.getByRole('button', { name: /theme:/i });

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /theme: dark/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('mf-theme')).toBe('dark');

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /theme: system/i })).toBeTruthy();
    // jsdom has no matchMedia; System resolves to Light, but the choice stays
    // explicit in storage so the pre-paint script can honour the OS later.
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('mf-theme')).toBe('system');

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('mf-theme')).toBe('light');
  });

  it('restores a stored Dark choice on mount', () => {
    window.localStorage.setItem('mf-theme', 'dark');
    renderToggle();
    expect(screen.getByRole('button', { name: /theme: dark/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores a corrupt stored value and falls back to Light', () => {
    window.localStorage.setItem('mf-theme', 'neon');
    renderToggle();
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('recognizes the System choice instead of treating it as corrupt', () => {
    window.localStorage.setItem('mf-theme', 'system');
    renderToggle();
    expect(screen.getByRole('button', { name: /theme: system/i })).toBeTruthy();
  });
});
