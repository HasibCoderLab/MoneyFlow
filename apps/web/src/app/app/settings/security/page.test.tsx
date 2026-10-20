import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/security',
  useRouter: () => ({ push: vi.fn() }),
}));

import SecurityPage from './page';

describe('security route (live authentication)', () => {
  it('describes the real server-enforced session and offers a working sign-out control', () => {
    render(<SecurityPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Security' })).toBeTruthy();
    expect(screen.getByText(/signed in with an HttpOnly session cookie/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^sign out$/i })).toBeTruthy();
  });

  it('lists unimplemented controls as planned rather than rendering fake controls', () => {
    render(<SecurityPage />);
    expect(screen.queryByRole('button', { name: /change password|end session/i })).toBeNull();
    for (const name of ['Active sessions', 'Sign out everywhere', 'Password change']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getAllByText(/planned/i).length).toBeGreaterThanOrEqual(1);
  });

  it('explains that authorization is server-side and errors stay generic', () => {
    render(<SecurityPage />);
    expect(screen.getByText(/enforced by the server/i)).toBeTruthy();
    expect(screen.getByText(/described in general\s+terms/i)).toBeTruthy();
  });
});
