import type { CategoryResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/categories',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...actual, fetchCategories: vi.fn() };
});

import { ApiClientError, fetchCategories } from '@/lib/api-client';
import CategoriesPage from './page';

const mockedFetchCategories = vi.mocked(fetchCategories);

function category(overrides: Partial<CategoryResponse>): CategoryResponse {
  return {
    id: 'cat-1',
    name: 'Category',
    type: 'EXPENSE',
    color: null,
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

const FIXTURE: CategoryResponse[] = [
  category({ id: 'cat-salary', name: 'Salary', type: 'INCOME', color: '#15803d' }),
  category({ id: 'cat-freelance', name: 'Freelance', type: 'INCOME', color: null }),
  category({ id: 'cat-groceries', name: 'Groceries', color: '#2563eb' }),
  category({ id: 'cat-old-hobby', name: 'Old hobby', color: '#64748b', status: 'ARCHIVED' }),
];

describe('categories route (wired to GET /api/v1/categories)', () => {
  beforeEach(() => {
    mockedFetchCategories.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('groups the real taxonomy into income, expenses, and archived rows', async () => {
    mockedFetchCategories.mockResolvedValue(FIXTURE);
    render(<CategoriesPage />);

    expect(await screen.findByText('Salary')).toBeTruthy();
    expect(mockedFetchCategories).toHaveBeenCalledWith(true); // includeArchived
    expect(screen.getByRole('heading', { name: 'Income' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Archived' })).toBeTruthy();
    expect(screen.getByText('Old hobby')).toBeTruthy();
    // Archived groups stay explainable; no invented spend figures anywhere.
    expect(screen.getByText(/old reports keep making sense/)).toBeTruthy();
    expect(screen.queryByText(/BDT/)).toBeNull();
  });

  it('keeps category creation disabled with an accurate explanation', async () => {
    mockedFetchCategories.mockResolvedValue(FIXTURE);
    render(<CategoriesPage />);
    await screen.findByText('Salary');

    const newButton = screen.getByRole('button', { name: 'New category' });
    expect(newButton.hasAttribute('disabled')).toBe(true);
    expect(newButton.getAttribute('title')).toBe(
      'Category creation is not available in this build yet.',
    );
  });

  it('shows an honest empty state when the account has no categories', async () => {
    mockedFetchCategories.mockResolvedValue([]);
    render(<CategoriesPage />);

    expect(await screen.findByText('No categories were found on your account.')).toBeTruthy();
  });

  it('asks signed-out visitors to sign in instead of showing sample categories', async () => {
    mockedFetchCategories.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<CategoriesPage />);

    expect(await screen.findByText('Sign in to see your data')).toBeTruthy();
    expect(screen.queryByText('Groceries')).toBeNull();
  });

  it('renders a calm error state and retries on demand', async () => {
    mockedFetchCategories
      .mockRejectedValueOnce(new ApiClientError('Server error', 500))
      .mockResolvedValueOnce(FIXTURE);
    render(<CategoriesPage />);

    expect(await screen.findByText('Could not load your data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Salary')).toBeTruthy();
    expect(mockedFetchCategories).toHaveBeenCalledTimes(2);
  });

  it('hides the sample-data banner because this page shows real categories', async () => {
    mockedFetchCategories.mockResolvedValue(FIXTURE);
    render(<CategoriesPage />);
    await screen.findByText('Salary');

    expect(screen.queryByRole('note', { name: /preview data notice/i })).toBeNull();
  });
});
