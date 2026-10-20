import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/data',
}));

import DataSettingsPage from './page';

describe('data settings route (real records, no export yet)', () => {
  it('says export and deletion are unavailable without claiming records do not exist', () => {
    render(<DataSettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your data' })).toBeTruthy();
    expect(screen.getByText(/export and deletion are not available yet/i)).toBeTruthy();
    expect(screen.getByText(/are stored in your own MoneyFlow account/i)).toBeTruthy();
  });

  it('names the planned rights without rendering controls that do nothing', () => {
    render(<DataSettingsPage />);
    for (const name of [
      'Export transactions (CSV)',
      'Delete your account',
      'Retention and audit record',
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: /export|download|delete/i })).toBeNull();
  });

  it('marks retention and export details as undecided rather than settled', () => {
    render(<DataSettingsPage />);
    expect(screen.getByText(/still need a decision/i)).toBeTruthy();
    expect(screen.getByText(/does not describe them as settled/i)).toBeTruthy();
  });
});
