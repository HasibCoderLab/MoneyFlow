import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from './site-footer';

describe('site footer', () => {
  it('states the brand, promise, and working-title status', () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(/know your money\. build better habits\. reach your goals\./i),
    ).toBeTruthy();
    expect(screen.getByText(/\(working title\)/)).toBeTruthy();
    expect(screen.getByText(/standalone product under the paathai umbrella/i)).toBeTruthy();
  });

  it('links only to routes that exist — never to unpublished legal pages', () => {
    render(<SiteFooter />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href).toMatch(/^(\/#[a-z-]+|\/app\/[a-z]+)$/);
      expect(href).not.toMatch(/privacy|terms|contact/);
    }
    expect(screen.getByText(/privacy policy and terms will be published here/i)).toBeTruthy();
  });

  it('carries the honesty disclaimers without invented claims', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/nothing here is financial advice/i)).toBeTruthy();
    // Wired app pages now show real recorded data, so the footer must not
    // claim that every figure in the preview is unreal (IT-8).
    expect(screen.queryByText(/no figures in the preview are real/i)).toBeNull();
    expect(screen.queryByText(/testimonial|users|\d+%/i)).toBeNull();
  });

  it('groups preview navigation under its own labelled landmark', () => {
    render(<SiteFooter />);
    const nav = screen.getByRole('navigation', { name: /preview/i });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual([
      'Dashboard',
      'Accounts',
      'Transactions',
      'Budgets',
      'Savings goals',
      'Reports',
    ]);
  });
});
