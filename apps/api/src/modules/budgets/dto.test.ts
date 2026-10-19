import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  MAX_BUDGET_NAME_LENGTH,
  MAX_CATEGORY_LIMITS,
  parseCreateBudgetInput,
  parseListBudgetsQuery,
  parseUpdateBudgetInput,
} from './dto';

/**
 * Structural validation tests for the budget DTOs (IT-9): shape, period
 * anchor, and amount-grammar errors are 400 before any database work;
 * ownership, category eligibility, and the overlap rule live in the service
 * and are covered by its tests plus the integration suite.
 */

const CAT_A = '11111111-1111-4111-8111-111111111111';
const CAT_B = '22222222-2222-4222-8222-222222222222';

describe('parseCreateBudgetInput', () => {
  it('normalizes a monthly shorthand start date and parses decimal limits', () => {
    expect(
      parseCreateBudgetInput({
        name: '  October plan  ',
        startDate: '2026-10',
        totalLimit: '5000.00',
        categoryLimits: [{ categoryId: CAT_A, limit: '1500.50' }],
      }),
    ).toEqual({
      name: 'October plan',
      startDate: '2026-10-01',
      totalLimitMinor: 500000n,
      categoryLimits: [{ categoryId: CAT_A, limitMinor: 150050n }],
    });
  });

  it('accepts a full first-of-month date and category limits without a total', () => {
    expect(
      parseCreateBudgetInput({
        name: 'Groceries only',
        startDate: '2026-11-01',
        categoryLimits: [{ categoryId: CAT_A, limit: '2000' }],
      }),
    ).toMatchObject({
      startDate: '2026-11-01',
      totalLimitMinor: undefined,
      categoryLimits: [{ categoryId: CAT_A, limitMinor: 200000n }],
    });
  });

  it('accepts a total-only budget (category budgets are optional, §5.9)', () => {
    expect(
      parseCreateBudgetInput({ name: 'Overall cap', startDate: '2026-10', totalLimit: '10000' }),
    ).toMatchObject({ totalLimitMinor: 1000000n, categoryLimits: [] });
  });

  it.each([
    ['missing name', { startDate: '2026-10', totalLimit: '100' }],
    ['empty name', { name: '   ', startDate: '2026-10', totalLimit: '100' }],
    [
      'over-long name',
      { name: 'x'.repeat(MAX_BUDGET_NAME_LENGTH + 1), startDate: '2026-10', totalLimit: '100' },
    ],
    ['control characters', { name: 'Bad\u0000Name', startDate: '2026-10', totalLimit: '100' }],
    ['missing startDate', { name: 'Plan', totalLimit: '100' }],
    ['mid-month startDate', { name: 'Plan', startDate: '2026-10-15', totalLimit: '100' }],
    ['impossible date', { name: 'Plan', startDate: '2026-02-30', totalLimit: '100' }],
    ['malformed date', { name: 'Plan', startDate: 'next-month', totalLimit: '100' }],
    ['zero totalLimit', { name: 'Plan', startDate: '2026-10', totalLimit: '0' }],
    ['negative totalLimit', { name: 'Plan', startDate: '2026-10', totalLimit: '-5' }],
    ['numeric totalLimit', { name: 'Plan', startDate: '2026-10', totalLimit: 100 }],
    ['over-cap totalLimit', { name: 'Plan', startDate: '2026-10', totalLimit: '1000000000.01' }],
    ['no limits at all', { name: 'Plan', startDate: '2026-10' }],
    ['empty categoryLimits', { name: 'Plan', startDate: '2026-10', categoryLimits: [] }],
    [
      'too many categoryLimits',
      {
        name: 'Plan',
        startDate: '2026-10',
        categoryLimits: Array.from({ length: MAX_CATEGORY_LIMITS + 1 }, (_, index) => ({
          categoryId: CAT_A,
          limit: `${index + 1}`,
        })),
      },
    ],
    [
      'duplicate category',
      {
        name: 'Plan',
        startDate: '2026-10',
        categoryLimits: [
          { categoryId: CAT_A, limit: '100' },
          { categoryId: CAT_A, limit: '200' },
        ],
      },
    ],
    [
      'zero category limit',
      { name: 'Plan', startDate: '2026-10', categoryLimits: [{ categoryId: CAT_A, limit: '0' }] },
    ],
    [
      'missing category id',
      { name: 'Plan', startDate: '2026-10', categoryLimits: [{ limit: '100' }] },
    ],
  ])('rejects %s with 400', (_label, body) => {
    expect(() => parseCreateBudgetInput(body)).toThrow(BadRequestException);
  });

  it('rejects a non-object body', () => {
    expect(() => parseCreateBudgetInput([])).toThrow(BadRequestException);
    expect(() => parseCreateBudgetInput('plan')).toThrow(BadRequestException);
  });
});

describe('parseUpdateBudgetInput', () => {
  it('accepts any subset of fields and parses limits to minor units', () => {
    expect(
      parseUpdateBudgetInput({
        name: '  Renamed  ',
        startDate: '2026-11',
        totalLimit: '7500.55',
        categoryLimits: [{ categoryId: CAT_B, limit: '3' }],
      }),
    ).toEqual({
      name: 'Renamed',
      startDate: '2026-11-01',
      totalLimitMinor: 750055n,
      categoryLimits: [{ categoryId: CAT_B, limitMinor: 300n }],
    });
  });

  it('treats totalLimit null as "clear the total"', () => {
    expect(parseUpdateBudgetInput({ totalLimit: null })).toEqual({ totalLimitMinor: null });
  });

  it('returns an empty patch for an empty body', () => {
    expect(parseUpdateBudgetInput({})).toEqual({});
  });

  it.each([
    ['status transitions', { status: 'ARCHIVED' }],
    ['mid-month startDate', { startDate: '2026-10-15' }],
    ['zero totalLimit', { totalLimit: '0' }],
    ['empty categoryLimits', { categoryLimits: [] }],
    [
      'duplicate category',
      {
        categoryLimits: [
          { categoryId: CAT_A, limit: '100' },
          { categoryId: CAT_A, limit: '200' },
        ],
      },
    ],
  ])('rejects %s with 400', (_label, body) => {
    expect(() => parseUpdateBudgetInput(body)).toThrow(BadRequestException);
  });
});

describe('parseListBudgetsQuery', () => {
  it('defaults to active-only listing', () => {
    expect(parseListBudgetsQuery({})).toEqual({ includeArchived: false });
  });

  it('accepts explicit true/false and rejects anything else', () => {
    expect(parseListBudgetsQuery({ includeArchived: 'true' })).toEqual({ includeArchived: true });
    expect(parseListBudgetsQuery({ includeArchived: 'false' })).toEqual({
      includeArchived: false,
    });
    expect(() => parseListBudgetsQuery({ includeArchived: 'yes' })).toThrow(BadRequestException);
  });
});
