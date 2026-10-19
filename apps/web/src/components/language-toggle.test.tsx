import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LocaleProvider, useLocale } from '@/lib/i18n/locale-context';

import { LanguageToggle } from './language-toggle';

afterEach(() => {
  window.localStorage.clear();
  // jsdom has no root layout here, so tests remove the attributes the
  // provider sets on <html>.
  document.documentElement.removeAttribute('lang');
});

describe('language toggle (Bangla ↔ English, requirements.md §7.4)', () => {
  it('starts in English, switches to Bangla, and persists the choice', () => {
    render(
      <LocaleProvider>
        <LanguageToggle />
      </LocaleProvider>,
    );
    const button = screen.getByRole('button', { name: /language: english/i });

    fireEvent.click(button);
    // The button then shows the language it would switch to (English) while
    // the document is in Bangla.
    expect(screen.getByRole('button', { name: /language: বাংলা/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /switch to english/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('bn');
    expect(window.localStorage.getItem('mf-locale')).toBe('bn');
  });

  it('cycles back to English from Bangla', () => {
    window.localStorage.setItem('mf-locale', 'bn');
    render(
      <LocaleProvider>
        <LanguageToggle />
      </LocaleProvider>,
    );
    const button = screen.getByRole('button', { name: /language: বাংলা/i });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /language: english/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(window.localStorage.getItem('mf-locale')).toBe('en');
  });

  it('restores a stored Bangla choice after mount', () => {
    window.localStorage.setItem('mf-locale', 'bn');
    render(
      <LocaleProvider>
        <LanguageToggle />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: /language: বাংলা/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('bn');
  });

  it('ignores a corrupt stored value and stays in English', () => {
    // The root layout serves <html lang="en">; mirror that baseline here.
    document.documentElement.setAttribute('lang', 'en');
    window.localStorage.setItem('mf-locale', 'french');
    render(
      <LocaleProvider>
        <LanguageToggle />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: /language: english/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('renders English labels safely when used outside the provider', () => {
    // Page-level tests mount components without the root layout provider;
    // useLocale must degrade to English instead of throwing, and switching
    // stays inert (no state, no document mutation).
    render(<LanguageToggle />);
    const button = screen.getByRole('button', { name: /language: english/i });
    expect(document.documentElement.getAttribute('lang')).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /language: english/i })).toBeTruthy();
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
