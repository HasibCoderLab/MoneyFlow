import type { BudgetResponse, CategoryResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/budgets',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchBudgets: vi.fn(),
    fetchCategories: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    moveBudget: vi.fn(),
  };
});

import {
  ApiClientError,
  createBudget,
  deleteBudget,
  fetchBudgets,
  fetchCategories,
  moveBudget,
} from '@/lib/api-client';
import BudgetsPage from './page';

const mockedFetchBudgets = vi.mocked(fetchBudgets);
const mockedFetchCategories = vi.mocked(fetchCategories);
const mockedCreateBudget = vi.mocked(createBudget);
const mockedDeleteBudget = vi.mocked(deleteBudget);
const mockedMoveBudget = vi.mocked(moveBudget);

const GROCERIES_ID = '11111111-1111-4111-8111-111111111111';

function expenseCategory(id = GROCERIES_ID, name = 'Groceries'): CategoryResponse {
  return {
    id,
    name,
    type: 'EXPENSE',
    color: '#2563eb',
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function budgetFixture(overrides: Partial<BudgetResponse> = {}): BudgetResponse {
  return {
    id: 'budget-1',
    name: 'October plan',
    period: 'MONTHLY',
    startDate: '2026-10-01',
    status: 'ACTIVE',
    totalFigures: {
      limitMinor: '800000',
      spentMinor: '320000',
      remainingMinor: '480000',
      percentTimes10: '400',
    },
    categoryLimits: [
      {
        id: 'limit-1',
        categoryId: GROCERIES_ID,
        categoryName: 'Groceries',
        categoryColor: '#2563eb',
        figures: {
          limitMinor: '500000',
          spentMinor: '320000',
          remainingMinor: '180000',
          percentTimes10: '640',
        },
      },
    ],
    currency: 'BDT',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('budgets route (wired to the IT-9 budget endpoints)', () => {
  beforeEach(() => {
    mockedFetchBudgets.mockReset();
    mockedFetchCategories.mockReset();
    mockedCreateBudget.mockReset();
    mockedDeleteBudget.mockReset();
    mockedMoveBudget.mockReset();
    mockedFetchCategories.mockResolvedValue([expenseCategory()]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders API figures: month, spent-of-limit, exact percent, and remainder', async () => {
    mockedFetchBudgets.mockResolvedValue([budgetFixture()]);
    render(<BudgetsPage />);

    expect(await screen.findByText(/October plan · /)).toBeTruthy();
    // includeArchived=true keeps archived history visible with its chip.
    expect(mockedFetchBudgets).toHaveBeenCalledWith(true);

    // Category row: name + server-computed spent-of-limit.
    expect(screen.getByText('Groceries · BDT 3,200 of BDT 5,000 spent')).toBeTruthy();
    expect(screen.getByText('64% used')).toBeTruthy();
    expect(screen.getByText('BDT 1,800 remaining')).toBeTruthy();
    // Total row.
    expect(screen.getByText('BDT 3,200 of BDT 8,000 spent')).toBeTruthy();
    expect(screen.getByText('40% used')).toBeTruthy();
    expect(screen.getByText('BDT 4,800 remaining')).toBeTruthy();

    // The bar stays within 0–100; meaning lives in the text (§7.3).
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBe(2);
    for (const bar of bars) {
      expect(Number(bar.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(100);
    }

    // Real data — the sample-data banner must not label it otherwise.
    expect(screen.queryByText(/UI preview — sample data/)).toBeNull();
  });

  it('shows honest overspend copy with the exact percentage and negative remainder', async () => {
    mockedFetchBudgets.mockResolvedValue([
      budgetFixture({
        totalFigures: null,
        categoryLimits: [
          {
            id: 'limit-1',
            categoryId: GROCERIES_ID,
            categoryName: 'Groceries',
            categoryColor: null,
            figures: {
              limitMinor: '1000000',
              spentMinor: '1200000',
              remainingMinor: '-200000',
              percentTimes10: '1200',
            },
          },
        ],
      }),
    ]);
    render(<BudgetsPage />);

    expect(await screen.findByText('BDT 2,000 over the limit')).toBeTruthy();
    expect(screen.getByText('120% used')).toBeTruthy();
    // The fill caps at 100 while the label keeps the real value.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(screen.queryByText('BDT 0 remaining')).toBeNull();
  });

  it('shows the honest empty state and still offers budget creation', async () => {
    mockedFetchBudgets.mockResolvedValue([]);
    render(<BudgetsPage />);

    expect(await screen.findByText('No budgets yet.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button', { name: 'New budget' })).toBeTruthy();
  });

  it('asks a signed-out visitor to sign in instead of showing figures', async () => {
    mockedFetchBudgets.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<BudgetsPage />);

    expect(await screen.findByText('Sign in to see your data')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('offers a retry after a failure and renders the loaded budgets', async () => {
    mockedFetchBudgets
      .mockRejectedValueOnce(new ApiClientError('Server exploded', 500))
      .mockResolvedValueOnce([budgetFixture()]);
    render(<BudgetsPage />);

    expect(await screen.findByText('Could not load your data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(/October plan · /)).toBeTruthy();
    expect(mockedFetchBudgets).toHaveBeenCalledTimes(2);
  });

  it('validates the create form locally and posts canonical decimal limits', async () => {
    mockedFetchBudgets.mockResolvedValue([]);
    mockedCreateBudget.mockResolvedValue(budgetFixture());
    render(<BudgetsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'New budget' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));

    // Nothing is sent while the form is invalid.
    expect(await screen.findByText('Enter a budget name.')).toBeTruthy();
    expect(screen.getByText('Choose the month this budget applies to.')).toBeTruthy();
    expect(screen.getByText('Set a total limit and/or at least one category limit.')).toBeTruthy();
    expect(mockedCreateBudget).not.toHaveBeenCalled();

    // Labels also hold their inline error text, so match on the leading name.
    fireEvent.change(screen.getByLabelText(/^Budget name/), {
      target: { value: ' November plan ' },
    });
    fireEvent.change(screen.getByLabelText(/^Month/), { target: { value: '2026-11' } });
    fireEvent.change(screen.getByLabelText(/^Total limit/), {
      target: { value: '5000.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));

    await waitFor(() => {
      expect(mockedCreateBudget).toHaveBeenCalledWith({
        name: 'November plan',
        startDate: '2026-11-01',
        totalLimit: '5000.50',
        categoryLimits: [],
      });
    });
    // Saving closes the dialog and reloads the list from the API.
    await waitFor(() => expect(mockedFetchBudgets).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Save budget' })).toBeNull();
  });

  it('rejects invalid amounts and duplicate categories before sending', async () => {
    mockedFetchBudgets.mockResolvedValue([]);
    render(<BudgetsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'New budget' }));
    fireEvent.change(screen.getByLabelText(/^Budget name/), { target: { value: 'Plan' } });
    fireEvent.change(screen.getByLabelText(/^Month/), { target: { value: '2026-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add category limit' }));

    // Row with no category and no limit: the placeholder plus the error copy.
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));
    await waitFor(() => expect(screen.getAllByText('Select a category').length).toBeGreaterThan(1));
    expect(mockedCreateBudget).not.toHaveBeenCalled();

    // A positive limit with an unselected category still fails.
    fireEvent.change(screen.getAllByLabelText(/^Limit/)[0]!, { target: { value: '250' } });
    fireEvent.change(screen.getAllByLabelText(/^Category/)[0]!, {
      target: { value: GROCERIES_ID },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add category limit' }));
    fireEvent.change(screen.getAllByLabelText(/^Limit/)[1]!, { target: { value: '100' } });
    fireEvent.change(screen.getAllByLabelText(/^Category/)[1]!, {
      target: { value: GROCERIES_ID },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));

    expect(await screen.findByText('Each category can appear only once.')).toBeTruthy();
    expect(mockedCreateBudget).not.toHaveBeenCalled();
  });

  it('surfaces a server rejection (overlap rule) above the form', async () => {
    mockedFetchBudgets.mockResolvedValue([]);
    mockedCreateBudget.mockRejectedValue(
      new ApiClientError('A budget already covers this month.', 409),
    );
    render(<BudgetsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'New budget' }));
    fireEvent.change(screen.getByLabelText('Budget name'), { target: { value: 'Plan' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-10' } });
    fireEvent.change(screen.getByLabelText('Total limit (optional)'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'A budget already covers this month.',
    );
    // The dialog stays open so the user can fix the input.
    expect(screen.getByRole('button', { name: 'Save budget' })).toBeTruthy();
  });

  it('pauses through the API and reloads the list', async () => {
    mockedFetchBudgets.mockResolvedValue([budgetFixture()]);
    mockedMoveBudget.mockResolvedValue(budgetFixture({ status: 'PAUSED' }));
    render(<BudgetsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Pause: October plan' }));

    await waitFor(() => expect(mockedMoveBudget).toHaveBeenCalledWith('budget-1', 'pause'));
    await waitFor(() => expect(mockedFetchBudgets).toHaveBeenCalledTimes(2));
  });

  it('deletes only after explicit confirmation', async () => {
    mockedFetchBudgets.mockResolvedValue([budgetFixture()]);
    mockedDeleteBudget.mockResolvedValue(undefined);
    render(<BudgetsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete: October plan' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mockedDeleteBudget).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete budget' }));

    await waitFor(() => expect(mockedDeleteBudget).toHaveBeenCalledWith('budget-1'));
    await waitFor(() => expect(mockedFetchBudgets).toHaveBeenCalledTimes(2));
  });
});
