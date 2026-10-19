import type {
  ReportCategoriesResponse,
  ReportGranularity,
  ReportSummaryResponse,
} from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/reports',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...actual, fetchReportSummary: vi.fn(), fetchReportCategories: vi.fn() };
});

import { ApiClientError, fetchReportCategories, fetchReportSummary } from '@/lib/api-client';
import ReportsPage from './page';

const mockedFetchSummary = vi.mocked(fetchReportSummary);
const mockedFetchCategories = vi.mocked(fetchReportCategories);

const PERIOD = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  timezone: 'Asia/Dhaka',
  currency: 'BDT',
};

function summaryFixture(granularity: ReportGranularity = 'daily'): ReportSummaryResponse {
  return {
    period: PERIOD,
    totals: { incomeMinor: '1800000', expenseMinor: '975000', transactionCount: 5 },
    granularity,
    weekStartsOn: granularity === 'weekly' ? 'SATURDAY' : null,
    series:
      granularity === 'daily'
        ? [
            {
              startDate: '2026-10-01',
              endDate: '2026-10-01',
              incomeMinor: '1800000',
              expenseMinor: '450000',
            },
            {
              startDate: '2026-10-02',
              endDate: '2026-10-02',
              incomeMinor: '0',
              expenseMinor: '525000',
            },
          ]
        : granularity === 'weekly'
          ? [
              {
                startDate: '2026-10-01',
                endDate: '2026-10-07',
                incomeMinor: '1800000',
                expenseMinor: '975000',
              },
            ]
          : [
              {
                startDate: '2026-10-01',
                endDate: '2026-10-31',
                incomeMinor: '1800000',
                expenseMinor: '975000',
              },
            ],
  };
}

function categoriesFixture(): ReportCategoriesResponse {
  return {
    period: PERIOD,
    totalExpenseMinor: '975000',
    categories: [
      {
        categoryId: 'cat-1',
        name: 'Groceries',
        color: null,
        status: 'ACTIVE',
        expenseMinor: '320000',
        percentTimes10: '328',
      },
    ],
  };
}

function mockHappyPath(): void {
  mockedFetchSummary.mockImplementation(async (_query, granularity) =>
    summaryFixture(granularity ?? 'daily'),
  );
  mockedFetchCategories.mockResolvedValue(categoriesFixture());
}

describe('reports route (wired to the IT-8 report endpoints)', () => {
  beforeEach(() => {
    mockedFetchSummary.mockReset();
    mockedFetchCategories.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders totals and the daily series table with a text alternative', async () => {
    mockHappyPath();
    render(<ReportsPage />);

    expect(await screen.findByRole('table')).toBeTruthy();
    // Income total appears by design: the KPI card, the series row, and the table total row.
    expect(screen.getAllByText('BDT 18,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('BDT 5,250')).toBeTruthy(); // second daily expense bucket
    expect(screen.getByRole('columnheader', { name: 'Period' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: '1 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: '2 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Total' })).toBeTruthy();
    expect(
      screen.getByText('Recorded income and spending for October 2026, grouped by Daily.'),
    ).toBeTruthy();
    expect(mockedFetchSummary).toHaveBeenCalledWith({}, 'daily');
  });

  it('re-queries the series when the granularity changes and labels it', async () => {
    mockHappyPath();
    render(<ReportsPage />);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));

    await waitFor(() => {
      expect(mockedFetchSummary).toHaveBeenCalledWith({}, 'weekly');
    });
    expect(await screen.findByRole('rowheader', { name: '1\u20137 Oct 2026' })).toBeTruthy();
    expect(screen.getByText('Weeks start on Saturday (Bangladesh standard week).')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Weekly' }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(await screen.findByRole('rowheader', { name: '1\u201331 Oct 2026' })).toBeTruthy();
    expect(screen.queryByText(/Weeks start on Saturday/)).toBeNull();
  });

  it('shows an honest empty state for a period with no recorded activity', async () => {
    mockedFetchSummary.mockResolvedValue({
      period: PERIOD,
      totals: { incomeMinor: '0', expenseMinor: '0', transactionCount: 0 },
      granularity: 'daily',
      weekStartsOn: null,
      series: [],
    });
    mockedFetchCategories.mockResolvedValue({
      period: PERIOD,
      totalExpenseMinor: '0',
      categories: [],
    });
    render(<ReportsPage />);

    expect(await screen.findByText('No activity was recorded for this period.')).toBeTruthy();
    expect(screen.getByText('No expenses were recorded for this period.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders the category breakdown from the report endpoint', async () => {
    mockHappyPath();
    render(<ReportsPage />);

    expect(await screen.findByTestId('chart-summary')).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getAllByText('BDT 3,200').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('32.8%')).toBeTruthy();
  });

  it('keeps CSV export disabled and explains why', async () => {
    mockHappyPath();
    render(<ReportsPage />);
    await screen.findByRole('table');

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    expect(exportButton.hasAttribute('disabled')).toBe(true);
    expect(exportButton.getAttribute('title')).toBe(
      'CSV export is not available in this build yet.',
    );
  });

  it('asks signed-out visitors to sign in', async () => {
    mockedFetchSummary.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    mockedFetchCategories.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<ReportsPage />);

    expect(await screen.findByText('Sign in to see your data')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders a calm error state and retries on demand', async () => {
    mockedFetchSummary
      .mockRejectedValueOnce(new ApiClientError('Server error', 500))
      .mockResolvedValueOnce(summaryFixture('daily'));
    mockedFetchCategories.mockResolvedValue(categoriesFixture());
    render(<ReportsPage />);

    expect(await screen.findByText('Could not load your data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeTruthy();
    expect(mockedFetchSummary).toHaveBeenCalledTimes(2);
  });

  it('hides the sample-data banner because this page shows recorded data', async () => {
    mockHappyPath();
    render(<ReportsPage />);
    await screen.findByRole('table');

    expect(screen.queryByRole('note', { name: /preview data notice/i })).toBeNull();
  });
});
