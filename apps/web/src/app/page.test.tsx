import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('home (landing) page', () => {
  it('renders the value proposition as the single top-level heading', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /know your money\. build better habits\. reach your goals\./i,
      }),
    ).toBeTruthy();
  });

  it('points every call to action at the only real destination (the preview)', () => {
    render(<Home />);
    const previewLinks = screen.getAllByRole('link', { name: /open (the )?ui preview/i });
    expect(previewLinks.length).toBeGreaterThan(0);
    for (const link of previewLinks) {
      expect(link.getAttribute('href')).toBe('/app/dashboard');
    }
  });

  it('offers in-page section navigation', () => {
    render(<Home />);
    const nav = screen.getByRole('navigation', { name: /sections/i });
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['#capabilities', '#trust', '#roadmap']);
  });

  it('states plainly that this is a foundation build with no real data', () => {
    render(<Home />);
    expect(screen.getByText(/this is a foundation build/i)).toBeTruthy();
    expect(screen.getByText(/are not built yet/i)).toBeTruthy();
    expect(screen.getByText(/nothing here is real financial data/i)).toBeTruthy();
  });

  it('lists planned capabilities and labels each with its release', () => {
    render(<Home />);
    const section = screen
      .getByRole('heading', { name: /what moneyflow is being built to do/i })
      .closest('section') as HTMLElement;

    // Six MVP capabilities and one V1 capability, each a real heading.
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(7);
    expect(within(section).getAllByText('MVP')).toHaveLength(6);
    expect(within(section).getAllByText('V1')).toHaveLength(1);
    expect(
      within(section).getByRole('heading', { name: /an assistant that explains/i }),
    ).toBeTruthy();
  });

  it('describes trust and privacy principles without claiming certification', () => {
    render(<Home />);
    const section = screen
      .getByRole('heading', { name: /built to be trustworthy/i })
      .closest('section') as HTMLElement;

    expect(within(section).getAllByRole('listitem')).toHaveLength(4);
    expect(within(section).getByText(/your records stay yours/i)).toBeTruthy();
    expect(within(section).getByText(/claims no compliance standard/i)).toBeTruthy();
  });

  it('shows an honest, staged roadmap', () => {
    render(<Home />);
    const section = screen
      .getByRole('heading', { name: /where this is today/i })
      .closest('section') as HTMLElement;

    expect(within(section).getByText('In progress')).toBeTruthy();
    expect(within(section).getByText('Planned')).toBeTruthy();
    expect(within(section).getByText('Research only')).toBeTruthy();
  });

  it('never shows a balance or amount before real data exists', () => {
    render(<Home />);
    // No BDT-prefixed numbers and no ৳ sign anywhere on the landing page.
    expect(screen.queryByText(/৳|BDT\s*\d/)).toBeNull();
  });
});
