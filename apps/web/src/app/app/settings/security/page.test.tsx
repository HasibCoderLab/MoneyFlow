import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/security',
}));

import SecurityPage from './page';

describe('security route (preview, no account exists)', () => {
  it('renders the security heading with an honest empty state', () => {
    render(<SecurityPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Security' })).toBeTruthy();
    expect(screen.getByText(/nothing to manage here/i)).toBeTruthy();
    expect(screen.getByText(/no account, no session, and no password/i)).toBeTruthy();
  });

  it('names only real destinations and no pretend session controls', () => {
    render(<SecurityPage />);
    expect(screen.getByRole('link', { name: /visible previews/i }).getAttribute('href')).toBe(
      '/sign-in',
    );
    expect(
      screen.queryByRole('button', { name: /sign out|end session|change password/i }),
    ).toBeNull();
  });

  it('explains that authorization is server-side and errors stay generic', () => {
    render(<SecurityPage />);
    expect(screen.getByText(/enforced by the server/i)).toBeTruthy();
    expect(screen.getByText(/described in general\s+terms/i)).toBeTruthy();
    expect(screen.getAllByText(/planned/i).length).toBeGreaterThanOrEqual(1);
  });
});
