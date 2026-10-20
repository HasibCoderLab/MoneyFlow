import { BadRequestException } from '@nestjs/common';
import type { TransactionType } from '@moneyflow/contracts';

import { assertUuid, mapMoneyError } from '../../common/http-errors';
import { parseAmountToMinor } from '../../domain/money/amount';
import type { Prisma } from '../../generated/prisma/client';
import { addLocalDays, resolveTimezone, startOfLocalDay } from './occurrence';

/**
 * Shared filter grammar for `GET /transactions` and `GET /transactions/export`.
 * Keeping one parser means the export can never silently disagree with the
 * list about dates, timezones, or amount ranges.
 */

const LIST_TRANSACTION_TYPES: readonly string[] = ['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT'];

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 100;

export interface TransactionFilters {
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly categoryId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly minAmount?: bigint;
  readonly maxAmount?: bigint;
}

export interface TransactionListQuery extends TransactionFilters {
  readonly limit: number;
  readonly offset: number;
}

/** Parses the filters shared by the list and CSV export endpoints. */
export function parseTransactionFilters(query: Record<string, unknown>): TransactionFilters {
  const result: {
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
    from?: Date;
    to?: Date;
    minAmount?: bigint;
    maxAmount?: bigint;
  } = {};

  if (query.type !== undefined) {
    if (typeof query.type !== 'string' || !LIST_TRANSACTION_TYPES.includes(query.type)) {
      throw new BadRequestException(
        '"type" must be one of: INCOME, EXPENSE, TRANSFER, ADJUSTMENT.',
      );
    }
    result.type = query.type as TransactionType;
  }
  if (query.accountId !== undefined) {
    result.accountId = parseUuidFilter(query.accountId, 'accountId');
  }
  if (query.categoryId !== undefined) {
    result.categoryId = parseUuidFilter(query.categoryId, 'categoryId');
  }

  const timezone = query.timezone === undefined ? 'Asia/Dhaka' : resolveTimezone(query.timezone);
  if (query.dateFrom !== undefined || query.dateTo !== undefined) {
    const fromText = parseDateFilter(query.dateFrom, 'dateFrom');
    const toText = parseDateFilter(query.dateTo, 'dateTo');
    if (fromText && toText && fromText > toText) {
      throw new BadRequestException('"dateFrom" must not be after "dateTo".');
    }
    if (fromText) {
      result.from = startOfLocalDay(timezone, fromText);
    }
    if (toText) {
      result.to = startOfLocalDay(timezone, addLocalDays(toText, 1));
    }
  } else if (query.timezone !== undefined) {
    // Timezone alone changes nothing; validated above for explicitness.
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    try {
      if (query.minAmount !== undefined) {
        result.minAmount = parseAmountToMinor(query.minAmount);
      }
      if (query.maxAmount !== undefined) {
        result.maxAmount = parseAmountToMinor(query.maxAmount);
      }
    } catch (error) {
      throw mapMoneyError(error);
    }
    if (
      result.minAmount !== undefined &&
      result.maxAmount !== undefined &&
      result.minAmount > result.maxAmount
    ) {
      throw new BadRequestException('"minAmount" must not exceed "maxAmount".');
    }
  }

  return result;
}

/** Parses filters plus the list endpoint's offset pagination. */
export function parseListQuery(query: Record<string, unknown>): TransactionListQuery {
  const limit =
    query.limit === undefined
      ? DEFAULT_LIST_LIMIT
      : parseBoundedInt(query.limit, 'limit', 1, MAX_LIST_LIMIT);
  const offset =
    query.offset === undefined
      ? 0
      : parseBoundedInt(query.offset, 'offset', 0, Number.MAX_SAFE_INTEGER);

  return { ...parseTransactionFilters(query), limit, offset };
}

/** Builds the user-scoped Prisma filter shared by list and export. */
export function buildTransactionWhere(
  userId: string,
  filters: TransactionFilters,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (filters.type !== undefined) {
    where.type = filters.type;
  }
  if (filters.categoryId !== undefined) {
    where.categoryId = filters.categoryId;
  }
  if (filters.accountId !== undefined) {
    const accountId = filters.accountId;
    where.OR = [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }];
  }
  if (filters.from !== undefined || filters.to !== undefined) {
    where.occurredAt = {
      ...(filters.from !== undefined ? { gte: filters.from } : {}),
      ...(filters.to !== undefined ? { lt: filters.to } : {}),
    };
  }
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amountMinor = {
      ...(filters.minAmount !== undefined ? { gte: filters.minAmount } : {}),
      ...(filters.maxAmount !== undefined ? { lte: filters.maxAmount } : {}),
    };
  }
  return where;
}

function parseUuidFilter(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`"${field}" must be a valid UUID.`);
  }
  try {
    return assertUuid(value, field);
  } catch {
    throw new BadRequestException(`"${field}" must be a valid UUID.`);
  }
}

function parseDateFilter(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`"${field}" must use the YYYY-MM-DD format.`);
  }
  try {
    startOfLocalDay('Asia/Dhaka', value);
  } catch {
    throw new BadRequestException(`"${field}" must be a real calendar date (YYYY-MM-DD).`);
  }
  return value;
}

function parseBoundedInt(value: unknown, field: string, min: number, max: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || (parsed as number) < min || (parsed as number) > max) {
    throw new BadRequestException(`"${field}" must be an integer from ${min} to ${max}.`);
  }
  return parsed as number;
}
