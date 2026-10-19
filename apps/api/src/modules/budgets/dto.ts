import { BadRequestException } from '@nestjs/common';

import { MoneyDomainError } from '../../domain/money/errors';
import { parsePositiveAmountToMinor } from '../../domain/money/amount';
import { assertLocalDate } from '../summary/summary-periods';

/** A validated category limit: minor-unit bigint, ready for storage. */
export interface ParsedCategoryLimit {
  readonly categoryId: string;
  readonly limitMinor: bigint;
}

/**
 * Structural validation for the budget endpoints (IT-9, requirements.md
 * §5.9/§8.6, domain-model.md "Budget and BudgetCategoryLimit").
 *
 * Same style as the categories DTO: shapes, lengths, and amount grammar
 * live here; ownership, category eligibility, and overlap rules live in the
 * service and the database. Money crosses the boundary as canonical decimal
 * strings and is parsed with the shared strict grammar — never through a
 * JavaScript `number` (ADR-0003).
 *
 * `startDate` accepts `YYYY-MM` or a `YYYY-MM-DD` date; both normalize to
 * the first day of the month (the monthly period anchor, accounting-rules.md
 * §6). A day other than 01 is rejected here rather than silently snapped.
 */

export const MAX_BUDGET_NAME_LENGTH = 80;
/** domain-model.md: 1–50 category limits per budget (service-enforced count). */
export const MIN_CATEGORY_LIMITS = 1;
export const MAX_CATEGORY_LIMITS = 50;

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function assertObject(input: unknown): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function parseName(value: unknown, required: boolean): string | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"name" is required and must be a string.');
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('"name" must be a string.');
  }
  const name = value.trim();
  if (name.length === 0) {
    throw new BadRequestException('"name" must not be empty.');
  }
  if (name.length > MAX_BUDGET_NAME_LENGTH) {
    throw new BadRequestException(`"name" must be at most ${MAX_BUDGET_NAME_LENGTH} characters.`);
  }
  if (hasControlCharacter(name)) {
    throw new BadRequestException('"name" must not contain control characters.');
  }
  return name;
}

/**
 * Validates a monthly period anchor and normalizes it to `YYYY-MM-01`.
 * `YYYY-MM` is accepted as shorthand for the same date.
 */
export function parseMonthStart(value: unknown, required: boolean): string | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"startDate" is required and must be a monthly period.');
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('"startDate" must be a string.');
  }
  const text = MONTH_PATTERN.test(value) ? `${value}-01` : value;
  const date = assertLocalDate(text, 'startDate');
  if (!date.endsWith('-01')) {
    throw new BadRequestException(
      '"startDate" must be the first day of a month (monthly budgets, accounting-rules.md §6).',
    );
  }
  return date;
}

/** Parses a strictly positive budget-limit amount; maps money errors to 400. */
function parsePositiveLimit(value: unknown, field: string): bigint {
  try {
    return parsePositiveAmountToMinor(value);
  } catch (error) {
    if (error instanceof MoneyDomainError) {
      throw new BadRequestException(`"${field}" ${error.message.toLowerCase()}`);
    }
    throw error;
  }
}

function parseTotalLimit(value: unknown, required: boolean): bigint | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"totalLimit" is required and must be a string.');
    }
    return undefined;
  }
  return parsePositiveLimit(value, 'totalLimit');
}

function parseCategoryLimits(value: unknown, required: boolean): ParsedCategoryLimit[] | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"categoryLimits" is required and must be an array.');
    }
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new BadRequestException('"categoryLimits" must be an array.');
  }
  if (value.length < MIN_CATEGORY_LIMITS || value.length > MAX_CATEGORY_LIMITS) {
    throw new BadRequestException(
      `"categoryLimits" must contain between ${MIN_CATEGORY_LIMITS} and ${MAX_CATEGORY_LIMITS} entries.`,
    );
  }
  const parsed = value.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new BadRequestException(`"categoryLimits[${index}]" must be an object.`);
    }
    const record = entry as Record<string, unknown>;
    const categoryId = record.categoryId;
    if (typeof categoryId !== 'string' || categoryId.length === 0) {
      throw new BadRequestException(
        `"categoryLimits[${index}].categoryId" is required and must be a string.`,
      );
    }
    return {
      categoryId,
      limitMinor: parsePositiveLimit(record.limit, `categoryLimits[${index}].limit`),
    };
  });

  const seen = new Set<string>();
  for (const entry of parsed) {
    if (seen.has(entry.categoryId)) {
      throw new BadRequestException('"categoryLimits" must not repeat the same category.');
    }
    seen.add(entry.categoryId);
  }
  return parsed;
}

export interface CreateBudgetInput {
  readonly name: string;
  /** Normalized `YYYY-MM-01`. */
  readonly startDate: string;
  readonly totalLimitMinor: bigint | undefined;
  readonly categoryLimits: ParsedCategoryLimit[];
}

export interface UpdateBudgetInput {
  readonly name?: string;
  readonly startDate?: string;
  /** `undefined` = untouched; `null` = clear. */
  readonly totalLimitMinor?: bigint | null;
  readonly categoryLimits?: ParsedCategoryLimit[];
}

export interface ListBudgetsQuery {
  readonly includeArchived: boolean;
}

/**
 * Validates the `POST /api/v1/budgets` body. A budget must plan something:
 * a total limit, at least one category limit, or both (requirements.md
 * §5.9), so an empty plan is rejected instead of rendering "not set"
 * everywhere.
 */
export function parseCreateBudgetInput(input: unknown): CreateBudgetInput {
  assertObject(input);
  const totalLimitMinor = parseTotalLimit(input.totalLimit, false);
  const categoryLimits = parseCategoryLimits(input.categoryLimits, false) ?? [];
  if (totalLimitMinor === undefined && categoryLimits.length === 0) {
    throw new BadRequestException(
      'A budget needs a "totalLimit" and/or at least one category limit.',
    );
  }
  return {
    name: parseName(input.name, true) as string,
    startDate: parseMonthStart(input.startDate, true) as string,
    totalLimitMinor,
    categoryLimits,
  };
}

/**
 * Validates the `PATCH /api/v1/budgets/:id` body; all fields optional.
 * `totalLimit: null` clears the total; `categoryLimits` replaces the whole
 * set (validated non-empty — clearing every category limit is done by
 * deleting the budget, never by an ambiguous partial edit).
 */
export function parseUpdateBudgetInput(input: unknown): UpdateBudgetInput {
  assertObject(input);
  if (input.status !== undefined) {
    throw new BadRequestException(
      'Budget status changes go through the pause/resume/archive endpoints (STATUS_ENDPOINT_ONLY).',
    );
  }
  const result: {
    name?: string;
    startDate?: string;
    totalLimitMinor?: bigint | null;
    categoryLimits?: ParsedCategoryLimit[];
  } = {};

  const name = parseName(input.name, false);
  if (name !== undefined) {
    result.name = name;
  }
  const startDate = parseMonthStart(input.startDate, false);
  if (startDate !== undefined) {
    result.startDate = startDate;
  }
  if (input.totalLimit !== undefined) {
    result.totalLimitMinor =
      input.totalLimit === null ? null : parsePositiveLimit(input.totalLimit, 'totalLimit');
  }
  const categoryLimits = parseCategoryLimits(input.categoryLimits, false);
  if (categoryLimits !== undefined) {
    result.categoryLimits = categoryLimits;
  }
  return result;
}

/** Validates the `GET /api/v1/budgets` query string. */
export function parseListBudgetsQuery(input: unknown): ListBudgetsQuery {
  assertObject(input);
  const value = input['includeArchived'];
  if (value === undefined) {
    return { includeArchived: false };
  }
  if (value === 'true') {
    return { includeArchived: true };
  }
  if (value === 'false') {
    return { includeArchived: false };
  }
  throw new BadRequestException('"includeArchived" must be "true" or "false".');
}
