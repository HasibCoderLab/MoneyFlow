import { DEFAULT_USER_PREFERENCES, type UserPreferencesResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/settings/preferences',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    fetchDashboard: vi.fn(),
    fetchGoals: vi.fn(),
  };
});

import { ApiClientError, fetchPreferences, updatePreferences } from '@/lib/api-client';
import { LocaleProvider } from '@/lib/i18n/locale-context';

import PreferencesPage from './page';

const mockedFetch = vi.mocked(fetchPreferences);
const mockedUpdate = vi.mocked(updatePreferences);

const savedPreferences: UserPreferencesResponse = {
  ...DEFAULT_USER_PREFERENCES,
  theme: 'DARK',
  locale: 'bn',
  timezone: 'Asia/Dhaka',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

function renderPage() {
  return render(
    <LocaleProvider>
      <PreferencesPage />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedUpdate.mockReset();
  mockedFetch.mockResolvedValue(savedPreferences);
  mockedUpdate.mockImplementation(async (patch) => ({
    ...savedPreferences,
    ...patch,
    updatedAt: '2026-10-20T10:05:00.000Z',
  }));
  window.localStorage.clear();
});

describe('preferences route (wired to /api/v1/preferences)', () => {
  it('loads the saved preferences from the account', async () => {
    renderPage();

    expect(await screen.findByLabelText('Timezone')).toHaveProperty('value', 'Asia/Dhaka');
    expect(screen.getByLabelText('Theme')).toHaveProperty('value', 'DARK');
    expect(screen.getByLabelText('Language')).toHaveProperty('value', 'bn');
    expect(screen.getByLabelText('Currency')).toHaveProperty('value', 'BDT');
    expect(screen.getByLabelText('Currency').hasAttribute('readonly')).toBe(true);
  });

  it('saves only the changed fields and confirms success', async () => {
    renderPage();
    await screen.findByLabelText('Timezone');

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'LIGHT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith({
        theme: 'LIGHT',
      }),
    );
    expect(await screen.findByText('Preferences saved to your account.')).toBeTruthy();
  });

  it('renders a live, preference-aware preview', async () => {
    renderPage();
    await screen.findByLabelText('Timezone');

    // Bangla locale with Bengali numerals selected through LOCALE.
    expect(screen.getByText(/BDT ১২,৩৪,৫৬৭\.৮৯/)).toBeTruthy();
    expect(screen.getByText(/২০ অক্টো ২০২৬/)).toBeTruthy();
  });

  it('asks the visitor to sign in instead of offering an inert form', async () => {
    mockedFetch.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    renderPage();

    expect(await screen.findByText('Sign in to manage preferences')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save preferences' })).toBeNull();
  });

  it('shows a retry state when preferences cannot be loaded', async () => {
    mockedFetch.mockRejectedValue(new ApiClientError('Server error', 500));
    renderPage();

    expect(await screen.findByText('Could not load your preferences')).toBeTruthy();
    mockedFetch.mockResolvedValue(savedPreferences);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Timezone')).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
