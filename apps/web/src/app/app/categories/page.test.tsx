import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/categories',
}));

import CategoriesPage from './page';

describe('categories route (layout preview, sample data)', () => {
  it('groups sample categories into income and expenses', () => {
    render(<CategoriesPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Categories' })).toBeTruthy();
    expect(screen.getByText('Salary')).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
  });

  it('keeps archived categories visible with history preserved', () => {
    render(<CategoriesPage />);
    expect(screen.getByText(/old hobby · archived/i)).toBeTruthy();
    expect(screen.getByText(/old reports keep making sense/i)).toBeTruthy();
  });

  it('keeps category creation disabled until the categories API lands', () => {
    render(<CategoriesPage />);
    expect(screen.getByRole('button', { name: /new category/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('marks the section as current in shared navigation', () => {
    render(<CategoriesPage />);
    expect(screen.getByRole('link', { name: 'Categories' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
