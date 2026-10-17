import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/preferences',
}));

import PreferencesPage from './page';

describe('preferences route (preview, nothing saved)', () => {
  it('renders the preferences heading and points at the single working theme control', () => {
    render(<PreferencesPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Preferences' })).toBeTruthy();
    expect(screen.getByText(/theme switches from the top bar/i)).toBeTruthy();
    // The header owns the only theme control; a duplicate here could show a stale choice.
    expect(screen.getAllByRole('button', { name: /^Theme:/ })).toHaveLength(1);
  });

  it('lists every planned preference with its real decision status', () => {
    render(<PreferencesPage />);
    for (const name of [
      'Theme',
      'Currency',
      'Locale',
      'Timezone',
      'Week start',
      'Date and number format',
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText(/not confirmed/i)).toBeTruthy();
    expect(screen.getAllByText(/awaiting decision/i).length).toBeGreaterThanOrEqual(1);
  });

  it('states that nothing on the page is stored, and offers no fake save', () => {
    render(<PreferencesPage />);
    expect(screen.getByText(/nothing on this page is stored/i)).toBeTruthy();
    expect(screen.getByText(/no preference is saved to an account yet/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });
});
