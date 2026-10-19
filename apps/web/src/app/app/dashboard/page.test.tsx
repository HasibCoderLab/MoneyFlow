import type { DashboardResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The app shell reads the current route to mark the active nav item.
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/dashboard',
}));

// Only the fetchers are stubbed; ApiClientError stays the real class so the
// 401 → signed-out mapping under test is the production one.
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...actual, fetchDashboard: vi.fn() };
});

import { ApiClientError, fetchDashboard } from '@/lib/api-client';
import DashboardPage from './page';

const mockedFetchDashboard = vi.mocked(fetchDashboard);

function dashboardFixture(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    period: {
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
    },
    totalTrackedBalanceMinor: '6350000',
    activeAccountCount: 3,
    totals: { incomeMinor: '1800000', expenseMinor: '975000', transactionCount: 5 },
    recentTransactions: [
      {
        id: 'tx-1',
        type: 'INCOME',
        amountMinor: '1200000',
        currency: 'BDT',
        occurredAt: '2026-10-12T06:00:00.000Z',
        adjustmentSign: null,
        note: null,
        categoryName: 'Salary',
        categoryColor: null,
      },
      {
        id: 'tx-2',
        type: 'TRANSFER',
        amountMinor: '200000',
        currency: 'BDT',
        occurredAt: '2026-10-11T06:00:00.000Z',
        adjustmentSign: null,
        note: null,
        categoryName: null,
        categoryColor: null,
      },
    ],
    spendingByCategory: [
      {
        categoryId: 'cat-1',
        name: 'Groceries',
        color: null,
        status: 'ACTIVE',
        expenseMinor: '320000',
        percentTimes10: '328',
      },
    ],
    ...overrides,
  };
}

describe('dashboard route (wired to GET /api/v1/dashboard)', () => {
  beforeEach(() => {
    mockedFetchDashboard.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the API figures, the period chip, and recent activity', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    render(<DashboardPage />);

    expect(await screen.findByText('BDT 63,500')).toBeTruthy(); // tracked balance hero
    expect(screen.getByText('BDT 18,000')).toBeTruthy(); // income
    // Appears twice by design: the KPI card and the donut centre total.
    expect(screen.getAllByText('BDT 9,750').length).toBeGreaterThanOrEqual(1); // spent
    expect(screen.getByText(/Tracked balance across 3 active accounts/)).toBeTruthy();
    expect(screen.getAllByText('October 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+BDT 12,000')).toBeTruthy();
    // Transfers carry no sign and resolve their label from the dictionary.
    expect(screen.getByText('BDT 2,000')).toBeTruthy();
    expect(mockedFetchDashboard).toHaveBeenCalledTimes(1);
  });

  it('shows the server-computed category share, not a client-side guess', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    render(<DashboardPage />);

    expect(await screen.findByTestId('chart-summary')).toBeTruthy();
    const summary = screen.getByTestId('chart-summary').textContent ?? '';
    expect(summary).toMatch(/Groceries is the largest category/);
    expect(summary).toMatch(/32\.8%/); // percentTimes10 "328" → 32.8%
    expect(screen.getByText('recorded spending')).toBeTruthy(); // donut caption, not "sample"
  });

  it('shows a neutral loading skeleton before data arrives', () => {
    mockedFetchDashboard.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<DashboardPage />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.querySelector('.mf-hero-card')).toBeNull();
  });

  it('asks signed-out visitors to sign in instead of showing sample data', async () => {
    mockedFetchDashboard.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<DashboardPage />);

    expect(await screen.findByText('Sign in to see your data')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.queryByText('BDT 12,450')).toBeNull(); // no mock fallback figure
  });

  it('renders a calm error state and retries on demand', async () => {
    mockedFetchDashboard
      .mockRejectedValueOnce(new ApiClientError('Server error', 500))
      .mockResolvedValueOnce(dashboardFixture());
    render(<DashboardPage />);

    expect(await screen.findByText('Could not load your data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BDT 63,500')).toBeTruthy();
    expect(mockedFetchDashboard).toHaveBeenCalledTimes(2);
  });

  it('renders honest empty states when nothing is recorded yet', async () => {
    mockedFetchDashboard.mockResolvedValue(
      dashboardFixture({
        recentTransactions: [],
        spendingByCategory: [],
        totals: { incomeMinor: '0', expenseMinor: '0', transactionCount: 0 },
      }),
    );
    render(<DashboardPage />);

    expect(await screen.findByText('No transactions recorded yet.')).toBeTruthy();
    expect(screen.getByText('No expenses recorded for this period.')).toBeTruthy();
  });

  it('keeps goals and budgets as honest placeholders with no fabricated figures', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    const { container } = render(<DashboardPage />);
    await screen.findByText('BDT 63,500');

    expect(
      screen.getByText(
        'Savings goal tracking is not available in this build yet — no goal figures are shown.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Budget tracking is not available in this build yet — no budget figures are shown.',
      ),
    ).toBeTruthy();
    expect(container.querySelector('.mf-progress')).toBeNull();
    expect(screen.queryByText(/sample goals/i)).toBeNull();
  });

  it('never draws a trend sparkline the API does not provide', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    const { container } = render(<DashboardPage />);
    await screen.findByText('BDT 63,500');

    expect(container.querySelector('.mf-hero-card__sparkline')).toBeNull();
  });

  it('hides the sample-data banner because this page shows recorded data', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    render(<DashboardPage />);
    await screen.findByText('BDT 63,500');

    expect(screen.queryByRole('note', { name: /preview data notice/i })).toBeNull();
  });
});
