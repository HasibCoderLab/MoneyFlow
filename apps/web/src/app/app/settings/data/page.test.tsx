import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/data',
}));

import DataSettingsPage from './page';

describe('data settings route (real export and deletion controls)', () => {
  it('renders the working export and deletion controls', () => {
    render(<DataSettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your data' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download transactions CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my account…' })).toBeTruthy();
    expect(screen.getByText(/internal database identifiers are not/i)).toBeTruthy();
  });

  it('explains the destructive scope, password re-entry, and session revocation', () => {
    render(<DataSettingsPage />);
    expect(screen.getByText(/permanently removes your user and every row it owns/i)).toBeTruthy();
    expect(screen.getByText(/requires your password/i)).toBeTruthy();
    expect(screen.getByText(/every active session/i)).toBeTruthy();
    expect(screen.getByText(/financial accounts cannot be deleted individually/i)).toBeTruthy();
  });

  it('is honest about audit contents and backup retention', () => {
    render(<DataSettingsPage />);
    expect(screen.getByText(/no public audit api/i)).toBeTruthy();
    expect(screen.getByText(/never contains amounts/i)).toBeTruthy();
    expect(screen.getByText(/backups are not claimed to be erased/i)).toBeTruthy();
    expect(screen.queryByText(/not available yet/i)).toBeNull();
  });
});
