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

import { LocaleProvider, useLocale } from '@/lib/i18n/locale-context';

import { LanguageSwitcher } from './language-switcher';

afterEach(() => {
  window.localStorage.clear();
  // jsdom has no root layout here, so tests remove the attributes the
  // provider sets on <html>.
  document.documentElement.removeAttribute('lang');
});

function renderSwitcher() {
  return render(
    <LocaleProvider>
      <LanguageSwitcher />
    </LocaleProvider>,
  );
}

describe('language switcher (English ↔ বাংলা, requirements.md §7.4)', () => {
  it('opens a menu that lists both languages and marks the current one checked', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }));

    const menu = screen.getByRole('menu');
    expect(menu).toBeTruthy();

    const english = screen.getByRole('menuitemradio', { name: 'English' });
    const bangla = screen.getByRole('menuitemradio', { name: 'বাংলা' });
    expect(english.getAttribute('aria-checked')).toBe('true');
    expect(bangla.getAttribute('aria-checked')).toBe('false');
    // Each option carries its own lang so screen readers pronounce it right.
    expect(bangla.getAttribute('lang')).toBe('bn');
  });

  it('starts in English, switches to Bangla from the menu, and persists the choice', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'বাংলা' }));

    // The menu closes and the trigger now shows the current language
    // (its accessible name is localized: "ভাষা: বাংলা…" in Bangla).
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: /ভাষা: বাংলা/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('bn');
    expect(window.localStorage.getItem('mf-locale')).toBe('bn');
    // The change is announced politely in the newly selected language.
    expect(screen.getByRole('status').textContent).toContain('বাংলা');
  });

  it('cycles back to English from Bangla', () => {
    window.localStorage.setItem('mf-locale', 'bn');
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /ভাষা: বাংলা/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(screen.getByRole('button', { name: /language: english/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(window.localStorage.getItem('mf-locale')).toBe('en');
  });

  it('selecting the already-active language only closes the menu', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(screen.queryByRole('menu')).toBeNull();
    // Still English: the duplicate click never applied a new locale (the
    // provider writes the baseline `en` on mount, so both stores read `en`).
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(window.localStorage.getItem('mf-locale')).toBe('en');
  });

  it('closes with Escape and returns focus to the trigger', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: /language: english/i });
    fireEvent.click(trigger);

    const englishItem = screen.getByRole('menuitemradio', { name: 'English' });
    expect(document.activeElement).toBe(englishItem);

    fireEvent.keyDown(englishItem, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('moves focus between items with the arrow keys', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /language: english/i }));

    const englishItem = screen.getByRole('menuitemradio', { name: 'English' });
    const banglaItem = screen.getByRole('menuitemradio', { name: 'বাংলা' });

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(banglaItem);
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(englishItem);
  });

  it('opens the menu directly from the keyboard with ArrowDown', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: /language: english/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'English' }));
  });

  it('restores a stored Bangla choice after mount', () => {
    window.localStorage.setItem('mf-locale', 'bn');
    renderSwitcher();
    expect(screen.getByRole('button', { name: /ভাষা: বাংলা/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('bn');
  });

  it('ignores a corrupt stored value and stays in English', () => {
    // The root layout serves <html lang="en">; mirror that baseline here.
    document.documentElement.setAttribute('lang', 'en');
    window.localStorage.setItem('mf-locale', 'french');
    renderSwitcher();
    expect(screen.getByRole('button', { name: /language: english/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('renders English labels safely when used outside the provider', () => {
    // Page-level tests mount components without the root layout provider;
    // useLocale must degrade to English instead of throwing, and switching
    // stays inert (no state, no document mutation).
    render(<LanguageSwitcher />);
    const trigger = screen.getByRole('button', { name: /language: english/i });
    expect(document.documentElement.getAttribute('lang')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'বাংলা' }));
    expect(screen.getByRole('button', { name: /language: english/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBeNull();
  });

  it('exposes translations through the context dictionary', () => {
    function Probe() {
      const { t } = useLocale();
      return <span data-testid="probe">{t('nav.dashboard')}</span>;
    }
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('Dashboard');
  });
});
