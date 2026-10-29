import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteMapView } from './sitemap-view';

describe('sitemap view', () => {
  it('groups routes by area and states the total', () => {
    render(<SiteMapView />);
    expect(screen.getByRole('heading', { name: 'Public' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Authentication' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Core app' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText(/routes shown\.$/)).toBeTruthy();
  });

  it('filters by search and shows a useful empty state', () => {
    render(<SiteMapView />);
    const search = screen.getByLabelText(/search routes/i);
    fireEvent.change(search, { target: { value: 'onboarding' } });

    expect(screen.getByRole('button', { name: /onboarding/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Dashboard/i })).toBeNull();

    fireEvent.change(search, { target: { value: 'zzzz-no-route' } });
    expect(screen.getByText(/no routes match your search/i)).toBeTruthy();
  });

  it('filters by area and resets in one action', () => {
    render(<SiteMapView />);
    const filter = screen.getByLabelText(/filter by area/i);
    fireEvent.change(filter, { target: { value: 'settings' } });

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Public' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(screen.getByRole('heading', { name: 'Public' })).toBeTruthy();
    expect((filter as HTMLSelectElement).value).toBe('all');
    expect((screen.getByLabelText(/search routes/i) as HTMLInputElement).value).toBe('');
  });

  it('explains a deferred route and offers no link to it', () => {
    render(<SiteMapView />);
    fireEvent.click(screen.getByRole('button', { name: /privacy policy/i }));

    const detail = screen.getByRole('complementary');
    expect(within(detail).getByText(/legal review/i)).toBeTruthy();
    expect(within(detail).queryByRole('link')).toBeNull();
    expect(within(detail).getByText(/not available yet/i)).toBeTruthy();
  });

  it('links an available public route and labels signed-in routes', () => {
    render(<SiteMapView />);
    fireEvent.click(screen.getByRole('button', { name: /^Features/i }));

    const detail = screen.getByRole('complementary');
    const link = within(detail).getByRole('link', { name: /open features/i });
    expect(link.getAttribute('href')).toBe('/features');

    fireEvent.click(screen.getByRole('button', { name: /^Dashboard/i }));
    expect(
      within(screen.getByRole('complementary')).getByText(/signed-in users only/i),
    ).toBeTruthy();
  });

  it('does not link a parameterized route directly', () => {
    render(<SiteMapView />);
    fireEvent.click(screen.getByRole('button', { name: /goal detail/i }));

    const detail = screen.getByRole('complementary');
    expect(within(detail).queryByRole('link')).toBeNull();
    expect(within(detail).getByText(/needs a specific record id/i)).toBeTruthy();
  });

  it('provides a plain text alternative for every filtered route', () => {
    render(<SiteMapView />);
    const summary = screen.getByText(/text list of all routes/i);
    const details = summary.closest('details');
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getAllByRole('listitem').length).toBeGreaterThan(20);
  });
});
