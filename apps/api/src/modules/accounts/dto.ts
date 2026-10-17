import { BadRequestException } from '@nestjs/common';
import type { AccountType } from '@moneyflow/contracts';

/**
 * Request validation for the accounts endpoints (IT-4).
 *
 * Pure input parsing in the `modules/auth/profile.ts` style: structural
 * checks throw `BadRequestException` here, while money-grammar validation
 * (`parseOpeningBalanceToMinor`) throws `MoneyDomainError` and is mapped to
 * 400 by the service via `common/http-errors.ts`. Identity never comes from
 * the body — controllers pass only the session-derived user id.
 */

export const ACCOUNT_TYPES: readonly AccountType[] = [
  'CASH',
  'BANK',
  'MOBILE_WALLET',
  'SAVINGS',
  'OTHER',
];

export const MAX_ACCOUNT_NAME_LENGTH = 80;

export interface CreateAccountInput {
  readonly name: string;
  readonly type: AccountType;
  readonly currency: string;
  readonly openingBalance: string;
}

export interface UpdateAccountInput {
  readonly name?: string;
  readonly openingBalance?: string;
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
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    throw new BadRequestException(`"name" must be at most ${MAX_ACCOUNT_NAME_LENGTH} characters.`);
  }
  if (hasControlCharacter(name)) {
    throw new BadRequestException('"name" must not contain control characters.');
  }
  return name;
}

function parseType(value: unknown): AccountType {
  if (typeof value !== 'string' || !(ACCOUNT_TYPES as readonly string[]).includes(value)) {
    throw new BadRequestException(`"type" must be one of: ${ACCOUNT_TYPES.join(', ')}.`);
  }
  return value as AccountType;
}

function parseCurrency(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestException('"currency" is required and must be a string.');
  }
  // Registry membership (BDT only in MVP) is enforced when the opening
  // balance is parsed; the raw code is carried through untouched here.
  return value;
}

function parseMoneyField(value: unknown, field: '"openingBalance"'): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`"${field}" is required and must be a string.`);
  }
  return value;
}

/** Validates the `POST /api/v1/accounts` body (money grammar checked later). */
export function parseCreateAccountInput(input: unknown): CreateAccountInput {
  assertObject(input);
  return {
    name: parseName(input.name, true) as string,
    type: parseType(input.type),
    currency: parseCurrency(input.currency),
    openingBalance: parseMoneyField(input.openingBalance, '"openingBalance"'),
  };
}

/** Validates the `PATCH /api/v1/accounts/:id` body; all fields optional. */
export function parseUpdateAccountInput(input: unknown): UpdateAccountInput {
  assertObject(input);
  const result: { name?: string; openingBalance?: string } = {};
  const name = parseName(input.name, false);
  if (name !== undefined) {
    result.name = name;
  }
  if (input.openingBalance !== undefined) {
    result.openingBalance = parseMoneyField(input.openingBalance, '"openingBalance"');
  }
  return result;
}
