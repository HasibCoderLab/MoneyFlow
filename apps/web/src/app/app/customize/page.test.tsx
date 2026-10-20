import {
  DASHBOARD_WIDGET_IDS,
  type DashboardLayoutResponse,
  type UpdateDashboardLayoutRequest,
} from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/customize',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchDashboardLayout: vi.fn(),
    saveDashboardLayout: vi.fn(),
    resetDashboardLayout: vi.fn(),
  };
});

import {
  ApiClientError,
  fetchDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
} from '@/lib/api-client';

import CustomizeDashboardPage from './page';

const mockedFetch = vi.mocked(fetchDashboardLayout);
const mockedSave = vi.mocked(saveDashboardLayout);
const mockedReset = vi.mocked(resetDashboardLayout);

function layoutFixture(
  widgets = DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: true })),
): DashboardLayoutResponse {
  return { widgets, isDefault: true, updatedAt: null };
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedSave.mockReset();
  mockedReset.mockReset();
  mockedFetch.mockResolvedValue(layoutFixture());
  mockedSave.mockImplementation(async (body: UpdateDashboardLayoutRequest) => ({
    widgets: body.widgets,
    isDefault: false,
    updatedAt: '2026-10-20T10:00:00.000Z',
  }));
  mockedReset.mockResolvedValue(layoutFixture());
});

describe('dashboard customize route (wired to /api/v1/dashboard/layout)', () => {
  it('lists every widget with its saved visibility', async () => {
    render(<CustomizeDashboardPage />);

    expect(await screen.findByText('Total tracked balance')).toBeTruthy();
    expect(screen.getByText('Recent activity')).toBeTruthy();
    expect(screen.getByText('Budget status')).toBeTruthy();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toHaveProperty('checked', true);
    }
  });

  it('reorders widgets and saves the complete validated list', async () => {
    render(<CustomizeDashboardPage />);
    await screen.findByText('Total tracked balance');

    fireEvent.click(screen.getByRole('button', { name: 'Move Total tracked balance down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));

    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    const sent = mockedSave.mock.calls[0]?.[0];
    expect(sent?.widgets.map((widget) => widget.id)).toEqual([
      'income',
      'totalBalance',
      'expense',
      'recentTransactions',
      'spendingByCategory',
      'goals',
      'budgets',
    ]);
    expect(await screen.findByText('Dashboard layout saved.')).toBeTruthy();
  });

  it('hides a widget without removing it from the list', async () => {
    render(<CustomizeDashboardPage />);
    await screen.findByText('Total tracked balance');

    fireEvent.click(screen.getAllByRole('checkbox')[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));

    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    expect(mockedSave.mock.calls[0]?.[0].widgets[0]).toEqual({
      id: 'totalBalance',
      visible: false,
    });
    expect(screen.getByText('Total tracked balance')).toBeTruthy();
  });

  it('resets to the documented default layout', async () => {
    mockedFetch.mockResolvedValue(
      layoutFixture([
        { id: 'goals', visible: false },
        { id: 'totalBalance', visible: true },
        { id: 'income', visible: true },
        { id: 'expense', visible: true },
        { id: 'recentTransactions', visible: true },
        { id: 'spendingByCategory', visible: true },
        { id: 'budgets', visible: true },
      ]),
    );
    render(<CustomizeDashboardPage />);
    await screen.findByText('Total tracked balance');

    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));

    await waitFor(() => expect(mockedReset).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Dashboard layout reset to the default.')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')[0]).toHaveProperty('checked', true);
  });

  it('asks a signed-out visitor to sign in', async () => {
    mockedFetch.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<CustomizeDashboardPage />);
    expect(await screen.findByText('Sign in to customize your dashboard')).toBeTruthy();
  });
});
