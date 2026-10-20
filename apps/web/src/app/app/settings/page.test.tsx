import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings',
}));

import SettingsPage from './page';

describe('settings index', () => {
  it('links every settings section from the information architecture', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/app/settings/') || href === '/app/customize');
    expect(hrefs).toEqual([
      '/app/settings/profile',
      '/app/settings/preferences',
      '/app/customize',
      '/app/settings/security',
      '/app/settings/data',
    ]);
  });

  it('describes what is saved today and the remaining unbuilt controls honestly', () => {
    render(<SettingsPage />);
    for (const label of ['Profile', 'Preferences', 'Dashboard layout', 'Security', 'Data']) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy();
    }
    expect(screen.getByText(/saved per user/i)).toBeTruthy();
    expect(screen.getByText(/server-enforced sessions are live/i)).toBeTruthy();
    expect(screen.getByText(/CSV export and account deletion are not built yet/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /forgot|reset|billing|subscription/i })).toBeNull();
  });

  it('marks the section as current in shared navigation', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
