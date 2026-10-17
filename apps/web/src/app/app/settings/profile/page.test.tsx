import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings',
}));

import ProfilePage from './page';

describe('profile route (form foundation, preview only)', () => {
  it('renders the profile form prefilled with a sample name', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeTruthy();
    expect(screen.getByLabelText(/display name/i)).toHaveProperty('value', 'Sample User');
  });

  it('validates the display name with a field error', () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText(/display name/i);
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toMatch(/enter a display name/i);
  });

  it('keeps saving disabled until the profile API lands', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: /save profile/i }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByText(/preview only.*nothing here is stored/i)).toBeTruthy();
  });
});
