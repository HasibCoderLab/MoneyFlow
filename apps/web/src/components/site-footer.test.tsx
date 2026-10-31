import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/lib/routes';

import { SiteFooter } from './site-footer';

const LINKABLE = new Set(
  ROUTES.filter((route) => route.status === 'implemented' && !route.dynamic).map(
    (route) => route.href,
  ),
);

describe('site footer', () => {
  it('states the brand and promise', () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(/know your money\. build better habits\. reach your goals\./i),
    ).toBeTruthy();
    expect(screen.queryByText(/\(working title\)/i)).toBeNull();
    expect(screen.getByText(/standalone product under the paathai umbrella/i)).toBeTruthy();
  });

  it('links the brand wordmark home', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'MoneyFlow' }).getAttribute('href')).toBe('/');
  });

  it('links only to implemented catalogue routes — never to unpublished legal pages', () => {
    render(<SiteFooter />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(LINKABLE.has(href), `${href} must exist in the route catalogue`).toBe(true);
      expect(href).not.toMatch(/privacy|terms|pricing/);
    }
    expect(screen.getByText(/privacy policy and terms will be published here/i)).toBeTruthy();
  });

  it('carries the honesty disclaimers without invented claims', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/nothing here is financial advice/i)).toBeTruthy();
    // Wired app pages show real recorded data, so the footer must not claim
    // that every figure in the preview is unreal (IT-8).
    expect(screen.queryByText(/no figures in the preview are real/i)).toBeNull();
    expect(screen.queryByText(/testimonial|users|\d+%/i)).toBeNull();
  });

  it('groups product navigation under its own labelled landmark', () => {
    render(<SiteFooter />);
    const nav = screen.getByRole('navigation', { name: /^product$/i });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['Features', 'About', 'Contact', 'Sitemap']);
  });

  it('groups app navigation under its own labelled landmark', () => {
    render(<SiteFooter />);
    const nav = screen.getByRole('navigation', { name: /^app$/i });
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
