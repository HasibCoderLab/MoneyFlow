import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/profile',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchMe: vi.fn(),
    updateMe: vi.fn(),
  };
});

import { ApiClientError, fetchMe, updateMe } from '@/lib/api-client';

import ProfilePage from './page';

const mockedFetch = vi.mocked(fetchMe);
const mockedUpdate = vi.mocked(updateMe);

const profile = {
  id: 'user-1',
  email: 'hasib@example.test',
  name: 'Hasib',
  emailVerified: true,
  image: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};

beforeEach(() => {
  mockedFetch.mockReset();
  mockedUpdate.mockReset();
  mockedFetch.mockResolvedValue(profile);
  mockedUpdate.mockImplementation(async ({ name }) => ({ ...profile, name }));
});

describe('profile route (wired to /api/v1/me)', () => {
  it('loads the signed-in display name and read-only email', async () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeTruthy();
    expect(await screen.findByDisplayValue('Hasib')).toBeTruthy();
    expect(screen.getByDisplayValue('hasib@example.test').hasAttribute('readonly')).toBe(true);
  });

  it('validates a blank display name', async () => {
    render(<ProfilePage />);
    const input = await screen.findByLabelText(/display name/i);
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toMatch(/enter a display name/i);
  });

  it('saves the trimmed name through PATCH /me', async () => {
    render(<ProfilePage />);
    const input = await screen.findByLabelText(/display name/i);
    fireEvent.change(input, { target: { value: '  New Name  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith({ name: 'New Name' }));
    expect(await screen.findByText('Profile saved.')).toBeTruthy();
    expect(screen.getByDisplayValue('New Name')).toBeTruthy();
  });

  it('asks a signed-out visitor to sign in', async () => {
    mockedFetch.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<ProfilePage />);
    expect(await screen.findByText('Sign in to manage your profile')).toBeTruthy();
  });
});
