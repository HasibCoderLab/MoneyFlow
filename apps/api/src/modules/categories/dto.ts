import { BadRequestException } from '@nestjs/common';
import type { CategoryType } from '@moneyflow/contracts';

/**
 * Structural validation for the category endpoints (IT-5).
 *
 * Same style as the accounts DTO: shapes only here; ownership, uniqueness,
 * and reference rules live in the service and the database. `type` is never
 * accepted on update — a category is immutable across the income/expense
 * boundary (mirroring accounting-rules.md §4.2 for transactions; changing
 * the side of the ledger would silently rewrite history), so its presence
 * is rejected rather than ignored.
 */

export const CATEGORY_TYPES: readonly CategoryType[] = ['INCOME', 'EXPENSE'];
export const MAX_CATEGORY_NAME_LENGTH = 60;
/** `#RRGGBB` only; colours are UI hints, never the sole carrier of meaning. */
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export interface CreateCategoryInput {
  readonly name: string;
  readonly type: CategoryType;
  /** Normalized to `null` when the client omits or nulls it. */
  readonly color: string | null;
}

export interface UpdateCategoryInput {
  readonly name?: string;
  /** `null` clears the colour; a string replaces it; undefined leaves it. */
  readonly color?: string | null;
}

export interface ListCategoriesQuery {
  /** `true` includes archived categories (default: active only). */
  readonly includeArchived: boolean;
}

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
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new BadRequestException(`"name" must be at most ${MAX_CATEGORY_NAME_LENGTH} characters.`);
  }
  if (hasControlCharacter(name)) {
    throw new BadRequestException('"name" must not contain control characters.');
  }
  return name;
}

function parseType(value: unknown): CategoryType {
  if (typeof value !== 'string' || !(CATEGORY_TYPES as readonly string[]).includes(value)) {
    throw new BadRequestException(`"type" must be one of: ${CATEGORY_TYPES.join(', ')}.`);
  }
  return value as CategoryType;
}

function parseHexColor(value: unknown): string {
  if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value)) {
    throw new BadRequestException('"color" must be a hex colour like "#2563eb".');
  }
  return value;
}

/** Validates the `POST /api/v1/categories` body. */
export function parseCreateCategoryInput(input: unknown): CreateCategoryInput {
  assertObject(input);
  const color = input.color;
  return {
    name: parseName(input.name, true) as string,
    type: parseType(input.type),
    color: color === undefined || color === null ? null : parseHexColor(color),
  };
}

/**
 * Validates the `PATCH /api/v1/categories/:id` body; all fields optional.
 *
 * `type` is immutable: its presence is rejected so a side change can never
 * slip through as an edit. Archiving is done via the archive endpoints, not
 * via a `status` field here.
 */
export function parseUpdateCategoryInput(input: unknown): UpdateCategoryInput {
  assertObject(input);
  if (input.type !== undefined) {
    throw new BadRequestException(
      'Category type is immutable after creation (CATEGORY_TYPE_IMMUTABLE). Create a new category instead.',
    );
  }
  const result: { name?: string; color?: string | null } = {};
  const name = parseName(input.name, false);
  if (name !== undefined) {
    result.name = name;
  }
  if (input.color !== undefined) {
    result.color = input.color === null ? null : parseHexColor(input.color);
  }
  return result;
}

/** Validates the `GET /api/v1/categories` query string. */
export function parseListCategoriesQuery(input: unknown): ListCategoriesQuery {
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
