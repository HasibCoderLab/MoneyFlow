import type { DashboardResponse, GoalResponse } from '@moneyflow/contracts';
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
  return { ...actual, fetchDashboard: vi.fn(), fetchGoals: vi.fn() };
});

import { ApiClientError, fetchDashboard, fetchGoals } from '@/lib/api-client';
import DashboardPage from './page';

const mockedFetchDashboard = vi.mocked(fetchDashboard);
const mockedFetchGoals = vi.mocked(fetchGoals);

/** One goal as the IT-10 API returns it; the dashboard shows real progress. */
function goalFixture(overrides: Partial<GoalResponse> = {}): GoalResponse {
  return {
    id: 'goal-1',
    name: 'Emergency fund',
    type: 'EMERGENCY_FUND',
    currency: 'BDT',
    targetMinor: '3000000',
    startDate: '2026-10-01',
    deadline: null,
    priority: 'MEDIUM',
    status: 'ACTIVE',
    figures: {
      savedMinor: '800000',
      remainingMinor: '2200000',
      percentTimes10: '267',
      overfunded: false,
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

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
    mockedFetchGoals.mockReset();
    mockedFetchGoals.mockResolvedValue([]);
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
    mockedFetchGoals.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<DashboardPage />);

    expect((await screen.findAllByText('Sign in to see your data')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]?.getAttribute('href')).toBe(
      '/sign-in',
    );
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

  it('shows real goal progress from the goals API and keeps no fabricated figures', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    mockedFetchGoals.mockResolvedValue([goalFixture()]);
    render(<DashboardPage />);
    await screen.findByText('BDT 63,500');

    expect(await screen.findByText('BDT 8,000 of BDT 30,000 tracked')).toBeTruthy();
    expect(screen.getByText('26.7% of target')).toBeTruthy();
    expect(
      screen.getByText(/Tracking only: contributing to a goal never moves money/),
    ).toBeTruthy();
    // Budgets exist since IT-9 but live on their own page; the card points
    // there honestly and shows no invented figures (IT-9).
    expect(
      screen.getByText(
        'Budgets live on their own page: create a monthly plan and track spending against it there. No budget figures are shown here.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/sample goals/i)).toBeNull();
  });

  it('shows an honest empty goals state instead of invented progress', async () => {
    mockedFetchDashboard.mockResolvedValue(dashboardFixture());
    render(<DashboardPage />);
    await screen.findByText('BDT 63,500');

    expect(
      await screen.findByText('No goals yet — create one to track what you are setting aside.'),
    ).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
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
