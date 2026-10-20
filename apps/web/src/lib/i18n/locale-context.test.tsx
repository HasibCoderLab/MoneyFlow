import { DEFAULT_USER_PREFERENCES, type UserPreferencesResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  };
});

const mockPathname = vi.hoisted(() => ({ current: '/app/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname.current,
}));

import { ApiClientError, fetchPreferences, updatePreferences } from '@/lib/api-client';

import { LocaleProvider, usePreferences } from './locale-context';

const mockedFetch = vi.mocked(fetchPreferences);
const mockedUpdate = vi.mocked(updatePreferences);

const savedPreferences: UserPreferencesResponse = {
  ...DEFAULT_USER_PREFERENCES,
  locale: 'bn',
  theme: 'DARK',
  reducedMotion: 'REDUCE',
  timezone: 'Asia/Dhaka',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

function Probe() {
  const { preferences, preferencesStatus, locale, savePreferences } = usePreferences();
  return (
    <div>
      <span data-testid="status">{preferencesStatus}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="theme">{preferences.theme}</span>
      <button
        type="button"
        onClick={() => {
          // The provider surfaces save failures to the caller (the form shows
          // them); this probe intentionally ignores the rejection.
          savePreferences({ theme: 'LIGHT' }).catch(() => undefined);
        }}
      >
        Save light
      </button>
    </div>
  );
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedUpdate.mockReset();
  mockedFetch.mockResolvedValue(savedPreferences);
  mockPathname.current = '/app/dashboard';
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-reduced-motion');
  document.documentElement.removeAttribute('lang');
});

afterEach(() => {
  window.localStorage.clear();
});

describe('preferences provider (IT-11)', () => {
  it('reconciles with the server values and applies them to the document', async () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByTestId('locale').textContent).toBe('bn');
    expect(screen.getByTestId('theme').textContent).toBe('DARK');
    expect(document.documentElement.getAttribute('lang')).toBe('bn');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('reduce');
    expect(window.localStorage.getItem('mf-locale')).toBe('bn');
    expect(window.localStorage.getItem('mf-theme')).toBe('dark');
  });

  it('keeps the cached choice for a guest instead of failing the page', async () => {
    mockedFetch.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    window.localStorage.setItem('mf-theme', 'system');
    window.localStorage.setItem('mf-locale', 'bn');

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    expect(await screen.findByText('guest')).toBeTruthy();
    expect(screen.getByTestId('locale').textContent).toBe('bn');
    expect(screen.getByTestId('theme').textContent).toBe('SYSTEM');
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('system');
  });

  it('does not request private preferences on a public route', async () => {
    mockPathname.current = '/sign-up';
    window.localStorage.setItem('mf-theme', 'dark');
    window.localStorage.setItem('mf-locale', 'bn');

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    expect(await screen.findByText('guest')).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('locale').textContent).toBe('bn');
    expect(screen.getByTestId('theme').textContent).toBe('DARK');
  });

  it('saves a partial update and applies the server response', async () => {
    mockedUpdate.mockResolvedValue({
      ...savedPreferences,
      theme: 'LIGHT',
      updatedAt: '2026-10-20T10:05:00.000Z',
    });

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    await screen.findByText('ready');

    fireEvent.click(screen.getByRole('button', { name: 'Save light' }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith({ theme: 'LIGHT' }));
    await waitFor(() => expect(screen.getByTestId('theme').textContent).toBe('LIGHT'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('marks the session as a guest when saving returns 401', async () => {
    mockedUpdate.mockRejectedValue(new ApiClientError('Unauthorized', 401));

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    await screen.findByText('ready');

    fireEvent.click(screen.getByRole('button', { name: 'Save light' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
  });
});
