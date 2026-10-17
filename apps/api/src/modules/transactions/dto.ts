import { BadRequestException } from '@nestjs/common';
import type { AdjustmentDirection, TransactionType } from '@moneyflow/contracts';

/**
 * Structural validation for the transaction endpoints (IT-4/IT-6/IT-7).
 *
 * This layer checks shapes only: required fields per type, forbidden fields
 * per type (`TRANSFER`/`ADJUSTMENT` carry no category — the database CHECK
 * agrees), string formats, and note length. Ownership, account state,
 * currency equality, money grammar, and occurrence semantics are enforced by
 * the service. `type` is never accepted on update (immutable after creation,
 * accounting-rules.md §4.2).
 */

export const TRANSACTION_TYPES: readonly TransactionType[] = [
  'INCOME',
  'EXPENSE',
  'TRANSFER',
  'ADJUSTMENT',
];

export const ADJUSTMENT_DIRECTIONS: readonly AdjustmentDirection[] = ['INCREASE', 'DECREASE'];

export const MAX_NOTE_LENGTH = 500;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 100;

export interface ParsedTransactionInput {
  readonly type: TransactionType;
  /** Raw decimal string; parsed against the account currency by the service. */
  readonly amount: string;
  readonly occurredDate: string;
  readonly occurredTime?: string;
  readonly timezone?: string;
  readonly accountId?: string;
  readonly categoryId?: string;
  readonly fromAccountId?: string;
  readonly toAccountId?: string;
  readonly direction?: AdjustmentDirection;
  /** Trimmed; null when absent or blank (adjustments require non-blank). */
  readonly note: string | null;
}

export type ParsedUpdateInput = Omit<ParsedTransactionInput, 'type'>;

function assertObject(input: unknown): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }
}

function requiredString(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (typeof value !== 'string') {
    throw new BadRequestException(`"${field}" is required and must be a string.`);
  }
  return value;
}

function optionalString(input: Record<string, unknown>, field: string): string | undefined {
  const value = input[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`"${field}" must be a string when provided.`);
  }
  return value;
}

function forbidPresent(input: Record<string, unknown>, field: string, type: string): void {
  if (input[field] !== undefined) {
    throw new BadRequestException(`"${field}" is not allowed for ${type} transactions.`);
  }
}

function parseType(value: unknown): TransactionType {
  if (typeof value !== 'string' || !(TRANSACTION_TYPES as readonly string[]).includes(value)) {
    throw new BadRequestException(`"type" must be one of: ${TRANSACTION_TYPES.join(', ')}.`);
  }
  return value as TransactionType;
}

function parseDirection(value: unknown): AdjustmentDirection {
  if (typeof value !== 'string' || !(ADJUSTMENT_DIRECTIONS as readonly string[]).includes(value)) {
    throw new BadRequestException(
      `"direction" must be one of: ${ADJUSTMENT_DIRECTIONS.join(', ')}.`,
    );
  }
  return value as AdjustmentDirection;
}

function parseNote(input: Record<string, unknown>, type: TransactionType): string | null {
  const value = input.note;
  if (value === undefined) {
    if (type === 'ADJUSTMENT') {
      throw new BadRequestException(
        '"note" is required for adjustments (why the balance changed).',
      );
    }
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('"note" must be a string when provided.');
  }
  if (value.length > MAX_NOTE_LENGTH) {
    throw new BadRequestException(`"note" must be at most ${MAX_NOTE_LENGTH} characters.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (type === 'ADJUSTMENT') {
      throw new BadRequestException('"note" must not be blank for adjustments.');
    }
    return null;
  }
  return trimmed;
}

function parseCommon(input: Record<string, unknown>, type: TransactionType) {
  return {
    amount: requiredString(input, 'amount'),
    occurredDate: requiredString(input, 'occurredDate'),
    occurredTime: optionalString(input, 'occurredTime'),
    timezone: optionalString(input, 'timezone'),
    note: parseNote(input, type),
  };
}

/** Validates the `POST /api/v1/transactions` body. */
export function parseCreateTransactionInput(input: unknown): ParsedTransactionInput {
  assertObject(input);
  const type = parseType(input.type);
  const common = parseCommon(input, type);

  switch (type) {
    case 'INCOME':
    case 'EXPENSE': {
      forbidPresent(input, 'fromAccountId', type);
      forbidPresent(input, 'toAccountId', type);
      forbidPresent(input, 'direction', type);
      return {
        ...common,
        type,
        accountId: requiredString(input, 'accountId'),
        categoryId: requiredString(input, 'categoryId'),
      };
    }
    case 'TRANSFER': {
      forbidPresent(input, 'accountId', type);
      forbidPresent(input, 'categoryId', type);
      forbidPresent(input, 'direction', type);
      return {
        ...common,
        type,
        fromAccountId: requiredString(input, 'fromAccountId'),
        toAccountId: requiredString(input, 'toAccountId'),
      };
    }
    case 'ADJUSTMENT': {
      forbidPresent(input, 'categoryId', type);
      forbidPresent(input, 'fromAccountId', type);
      forbidPresent(input, 'toAccountId', type);
      return {
        ...common,
        type,
        accountId: requiredString(input, 'accountId'),
        direction: parseDirection(input.direction),
      };
    }
  }
}

/**
 * Validates the `PATCH /api/v1/transactions/:id` body. `type` is immutable:
 * its presence is rejected so a type change can never slip through as an
 * edit (delete + recreate instead, §4.2).
 */
export function parseUpdateTransactionInput(
  input: unknown,
  currentType: TransactionType,
): ParsedUpdateInput {
  assertObject(input);
  if (input.type !== undefined) {
    throw new BadRequestException(
      'Transaction type is immutable after creation (TRANSACTION_TYPE_IMMUTABLE). Delete and recreate to change it.',
    );
  }
  const common = parseCommon(input, currentType);

  switch (currentType) {
    case 'INCOME':
    case 'EXPENSE': {
      forbidPresent(input, 'fromAccountId', currentType);
      forbidPresent(input, 'toAccountId', currentType);
      forbidPresent(input, 'direction', currentType);
      return {
        ...common,
        accountId: requiredString(input, 'accountId'),
        categoryId: requiredString(input, 'categoryId'),
      };
    }
    case 'TRANSFER': {
      forbidPresent(input, 'accountId', currentType);
      forbidPresent(input, 'categoryId', currentType);
      forbidPresent(input, 'direction', currentType);
      return {
        ...common,
        fromAccountId: requiredString(input, 'fromAccountId'),
        toAccountId: requiredString(input, 'toAccountId'),
      };
    }
    case 'ADJUSTMENT': {
      forbidPresent(input, 'categoryId', currentType);
      forbidPresent(input, 'fromAccountId', currentType);
      forbidPresent(input, 'toAccountId', currentType);
      return {
        ...common,
        accountId: requiredString(input, 'accountId'),
        direction: parseDirection(input.direction),
      };
    }
  }
}

/**
 * Normalizes the `Idempotency-Key` header. Absent or blank means no
 * idempotency; over-long keys are rejected (documented service default).
 */
export function parseIdempotencyKey(header: string | undefined): string | null {
  if (header === undefined || header.trim().length === 0) {
    return null;
  }
  if (header.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new BadRequestException(
      `"Idempotency-Key" must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters.`,
    );
  }
  return header;
}
