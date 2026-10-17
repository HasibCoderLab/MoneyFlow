import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  MAX_CATEGORY_NAME_LENGTH,
  parseCreateCategoryInput,
  parseListCategoriesQuery,
  parseUpdateCategoryInput,
} from './dto';

/**
 * Structural validation tests for the category DTOs (IT-5): shape errors are
 * 400 before any database work; ownership and uniqueness live elsewhere.
 */

describe('parseCreateCategoryInput', () => {
  it('normalizes a minimal body and trims the name', () => {
    expect(parseCreateCategoryInput({ name: '  Groceries  ', type: 'EXPENSE' })).toEqual({
      name: 'Groceries',
      type: 'EXPENSE',
      color: null,
    });
  });

  it('accepts explicit null colours and keeps valid hex colours', () => {
    expect(parseCreateCategoryInput({ name: 'Salary', type: 'INCOME', color: null })).toMatchObject(
      { color: null },
    );
    expect(
      parseCreateCategoryInput({ name: 'Salary', type: 'INCOME', color: '#2563EB' }),
    ).toMatchObject({ color: '#2563EB' });
  });

  it.each([
    ['missing name', { type: 'EXPENSE' }],
    ['empty name', { name: '   ', type: 'EXPENSE' }],
    ['over-long name', { name: 'x'.repeat(MAX_CATEGORY_NAME_LENGTH + 1), type: 'EXPENSE' }],
    ['control characters', { name: 'Bad\u0000Name', type: 'EXPENSE' }],
    ['missing type', { name: 'Groceries' }],
    ['unknown type', { name: 'Groceries', type: 'TRANSFER' }],
    ['short hex', { name: 'Groceries', type: 'EXPENSE', color: '#FFF' }],
    ['non-hex colour', { name: 'Groceries', type: 'EXPENSE', color: 'red' }],
    ['numeric colour', { name: 'Groceries', type: 'EXPENSE', color: 123 }],
  ])('rejects %s with 400', (_label, body) => {
    expect(() => parseCreateCategoryInput(body)).toThrow(BadRequestException);
  });

  it('rejects non-object bodies', () => {
    expect(() => parseCreateCategoryInput(null)).toThrow(BadRequestException);
    expect(() => parseCreateCategoryInput([])).toThrow(BadRequestException);
  });
});

describe('parseUpdateCategoryInput', () => {
  it('returns an empty patch for an empty body', () => {
    expect(parseUpdateCategoryInput({})).toEqual({});
  });

  it('carries a rename and a recolour', () => {
    expect(parseUpdateCategoryInput({ name: 'Food', color: '#f59e0b' })).toEqual({
      name: 'Food',
      color: '#f59e0b',
    });
  });

  it('clears the colour with an explicit null and leaves it alone when absent', () => {
    expect(parseUpdateCategoryInput({ color: null })).toEqual({ color: null });
    expect(parseUpdateCategoryInput({ name: 'Food' })).toEqual({ name: 'Food' });
  });

  it('rejects any attempt to change the immutable type', () => {
    expect(() => parseUpdateCategoryInput({ type: 'INCOME' })).toThrow(/CATEGORY_TYPE_IMMUTABLE/);
  });

  it('rejects invalid patches', () => {
    expect(() => parseUpdateCategoryInput({ name: '   ' })).toThrow(BadRequestException);
    expect(() => parseUpdateCategoryInput({ color: 'blue' })).toThrow(BadRequestException);
  });
});

describe('parseListCategoriesQuery', () => {
  it('defaults to active-only and parses the flag', () => {
    expect(parseListCategoriesQuery({})).toEqual({ includeArchived: false });
    expect(parseListCategoriesQuery({ includeArchived: 'true' })).toEqual({
      includeArchived: true,
    });
    expect(parseListCategoriesQuery({ includeArchived: 'false' })).toEqual({
      includeArchived: false,
    });
  });

  it('rejects unknown flag values', () => {
    expect(() => parseListCategoriesQuery({ includeArchived: 'yes' })).toThrow(BadRequestException);
    expect(() => parseListCategoriesQuery({ includeArchived: 42 })).toThrow(BadRequestException);
    expect(() => parseListCategoriesQuery({ includeArchived: ['true', 'false'] })).toThrow(
      BadRequestException,
    );
  });
});
