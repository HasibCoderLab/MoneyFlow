import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('landing motion decor', () => {
  it('keeps the hero glow hidden from assistive tech', () => {
    render(<Home />);
    const hero = screen.getByRole('heading', { level: 1 }).closest('section') as HTMLElement;
    const glow = hero.querySelector('.mf-hero__glow');
    expect(glow?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the value proposition readable with the gradient accent', () => {
    render(<Home />);
    // Accessible name is unchanged by the decorative accent span.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /know your money\. build better habits\. reach your goals\./i,
      }),
    ).toBeTruthy();
  });

  it('renders all sections visibly without an observer', () => {
    render(<Home />);
    // jsdom has no IntersectionObserver: content must never stay hidden.
    for (const name of [/what moneyflow is being built to do/i, /built to be trustworthy/i]) {
      expect(screen.getByRole('heading', { name }).closest('section')).toBeTruthy();
    }
    expect(document.querySelectorAll('.mf-reveal:not(.mf-reveal--visible)')).toHaveLength(0);
  });
});
