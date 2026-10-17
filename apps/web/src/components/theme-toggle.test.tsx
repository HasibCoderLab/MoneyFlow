import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemeToggle } from './theme-toggle';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme toggle', () => {
  it('starts at Light with an explicit theme (SSR-safe)', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles Light ↔ Dark and persists each choice', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /theme:/i });

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /theme: dark/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('mf-theme')).toBe('dark');

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('mf-theme')).toBe('light');
  });

  it('restores a stored choice on mount', () => {
    window.localStorage.setItem('mf-theme', 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /theme: dark/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores a corrupt stored value and falls back to Light', () => {
    window.localStorage.setItem('mf-theme', 'neon');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('treats a legacy System value as Light', () => {
    window.localStorage.setItem('mf-theme', 'system');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
