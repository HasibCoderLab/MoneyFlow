import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  TransactionListResponse,
  TransactionResponse,
  TransactionType,
} from '@moneyflow/contracts';

import { assertUuid, isUniqueViolationFor, mapMoneyError } from '../../common/http-errors';
import {
  parseAmountToMinor,
  parsePositiveAmountToMinor,
  toContractString,
} from '../../domain/money/amount';
import type {
  Account as PrismaAccount,
  Prisma,
  Transaction as PrismaTransaction,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseCreateTransactionInput,
  parseIdempotencyKey,
  parseUpdateTransactionInput,
  type ParsedTransactionInput,
  type ParsedUpdateInput,
} from './dto';
import { addLocalDays, resolveOccurrence, resolveTimezone, startOfLocalDay } from './occurrence';

/** Prisma delegates used here; the interactive-transaction client included. */
type DbClient = Pick<PrismaService, 'account' | 'transaction' | 'category'>;

const IDEMPOTENCY_CONFLICT_INDEX = 'transaction_userId_idempotencyKey_key';
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export interface CreateTransactionResult {
  readonly transaction: TransactionResponse;
  /** True when an `Idempotency-Key` replay returned the stored row. */
  readonly replayed: boolean;
}

/** Validated write shape; the service adds ownership + idempotency key. */
interface PreparedTransactionWrite {
  readonly type: TransactionType;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly occurredAt: Date;
  readonly accountId: string | null;
  readonly fromAccountId: string | null;
  readonly toAccountId: string | null;
  readonly categoryId: string | null;
  readonly adjustmentSign: number | null;
  readonly note: string | null;
}

/**
 * Transactions domain service (IT-4/IT-6/IT-7, requirements.md §5.4,
 * accounting-rules.md §2–§4, §11).
 *
 * - Every record touched is scoped to the session-derived `userId`; unknown
 *   or foreign ids answer 404 (single resources) or 400 (filter references)
 *   without distinguishing the cases.
 * - Direction always comes from `type` (and `direction` for adjustments);
 *   stored amounts stay positive; transfers are one row touching two
 *   accounts and never count as income/expense.
 * - `type` is immutable after creation; edits re-validate fully, including
 *   occurrence semantics and the archived-account rules (§3 rule 8, §11.3).
 * - Creates/updates/deletes run inside a database transaction (§4.1, §5.4).
 * - Deletes are hard deletes after the caller's confirmation (the UI
 *   confirms; the API deletes). `AuditEvent` rows land with IT-12 — there is
 *   no audit table yet, so deletion is recorded nowhere yet (known gap).
 */
@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  public async createTransaction(
    userId: string,
    body: unknown,
    idempotencyKeyHeader: string | undefined,
  ): Promise<CreateTransactionResult> {
    let input: ParsedTransactionInput;
    try {
      input = parseCreateTransactionInput(body);
    } catch (error) {
      throw mapMoneyError(error);
    }
    const idempotencyKey = parseIdempotencyKey(idempotencyKeyHeader);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        if (idempotencyKey !== null) {
          const existing = await tx.transaction.findFirst({
            where: { userId, idempotencyKey },
          });
          if (existing) {
            return { row: existing, replayed: true };
          }
        }
        const prepared = await this.prepareWrite(tx, userId, input);
        const created = await tx.transaction.create({
          data: { ...prepared, userId, idempotencyKey },
        });
        return { row: created, replayed: false };
      });
      return { transaction: toTransactionResponse(row.row), replayed: row.replayed };
    } catch (error) {
      if (idempotencyKey !== null && isUniqueViolationFor(error, IDEMPOTENCY_CONFLICT_INDEX)) {
        // Lost race with an identical in-flight create: return the winner.
        const existing = await this.prisma.transaction.findFirst({
          where: { userId, idempotencyKey },
        });
        if (existing) {
          return { transaction: toTransactionResponse(existing), replayed: true };
        }
      }
      throw error;
    }
  }

  public async listTransactions(
    userId: string,
    query: Record<string, unknown>,
  ): Promise<TransactionListResponse> {
    const filters = parseListQuery(query);
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

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: filters.offset,
        take: filters.limit + 1,
      }),
    ]);
    const items = rows.slice(0, filters.limit).map(toTransactionResponse);
    const nextOffset = rows.length > filters.limit ? filters.offset + filters.limit : null;
    return { items, nextOffset, total };
  }

  public async getTransaction(userId: string, rawId: string): Promise<TransactionResponse> {
    const id = assertUuid(rawId, 'Transaction');
    const row = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('Transaction not found.');
    }
    return toTransactionResponse(row);
  }

  public async updateTransaction(
    userId: string,
    rawId: string,
    body: unknown,
  ): Promise<TransactionResponse> {
    const id = assertUuid(rawId, 'Transaction');
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({ where: { id, userId } });
      if (!current) {
        throw new NotFoundException('Transaction not found.');
      }
      const currentType = current.type as TransactionType;
      let input: ParsedUpdateInput;
      try {
        input = parseUpdateTransactionInput(body, currentType);
      } catch (error) {
        throw mapMoneyError(error);
      }
      const prepared = await this.prepareWrite(
        tx,
        userId,
        { ...input, type: currentType },
        current,
      );
      return tx.transaction.update({ where: { id }, data: prepared });
    });
    return toTransactionResponse(row);
  }

  public async deleteTransaction(userId: string, rawId: string): Promise<void> {
    const id = assertUuid(rawId, 'Transaction');
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({ where: { id, userId } });
      if (!current) {
        throw new NotFoundException('Transaction not found.');
      }
      await tx.transaction.delete({ where: { id } });
    });
  }

  /**
   * Resolves and validates every reference for a write: accounts exist, are
   * owned, and satisfy the active/archived rules; categories exist, are
   * owned, and match the type; amounts parse against the account currency;
   * occurrence resolves in the request timezone.
   */
  private async prepareWrite(
    tx: DbClient,
    userId: string,
    input: ParsedTransactionInput,
    current?: PrismaTransaction,
  ): Promise<PreparedTransactionWrite> {
    const occurrence = resolveOccurrence({
      occurredDate: input.occurredDate,
      occurredTime: input.occurredTime,
      timezone: input.timezone,
    });
    const base = {
      amountMinor: 0n,
      currency: '',
      occurredAt: occurrence.occurredAt,
      accountId: null as string | null,
      fromAccountId: null as string | null,
      toAccountId: null as string | null,
      categoryId: null as string | null,
      adjustmentSign: null as number | null,
      note: input.note,
    };

    switch (input.type) {
      case 'INCOME':
      case 'EXPENSE': {
        const account = await this.requireAccount(tx, userId, input.accountId as string, {
          mustBeActive: current?.accountId !== input.accountId,
        });
        await this.requireCategory(tx, userId, input.categoryId as string, input.type);
        return {
          ...base,
          type: input.type,
          amountMinor: this.parseAmount(input.amount, account.currency),
          currency: account.currency,
          accountId: account.id,
          categoryId: input.categoryId as string,
        };
      }
      case 'TRANSFER': {
        const from = await this.requireAccount(tx, userId, input.fromAccountId as string, {
          mustBeActive: current?.fromAccountId !== input.fromAccountId,
        });
        const to = await this.requireAccount(tx, userId, input.toAccountId as string, {
          mustBeActive: current?.toAccountId !== input.toAccountId,
        });
        if (from.id === to.id) {
          throw new BadRequestException('Transfer source and destination accounts must differ.');
        }
        if (from.currency !== to.currency) {
          throw new BadRequestException('Transfer accounts must share the same currency.');
        }
        return {
          ...base,
          type: 'TRANSFER',
          amountMinor: this.parseAmount(input.amount, from.currency),
          currency: from.currency,
          fromAccountId: from.id,
          toAccountId: to.id,
        };
      }
      case 'ADJUSTMENT': {
        const account = await this.requireAccount(tx, userId, input.accountId as string, {
          mustBeActive: current?.accountId !== input.accountId,
        });
        return {
          ...base,
          type: 'ADJUSTMENT',
          amountMinor: this.parseAmount(input.amount, account.currency),
          currency: account.currency,
          accountId: account.id,
          adjustmentSign: input.direction === 'INCREASE' ? 1 : -1,
        };
      }
    }
  }

  private parseAmount(amount: string, currency: string): bigint {
    try {
      return parsePositiveAmountToMinor(amount, currency);
    } catch (error) {
      throw mapMoneyError(error);
    }
  }

  private async requireAccount(
    tx: DbClient,
    userId: string,
    accountId: string,
    options: { mustBeActive: boolean },
  ): Promise<PrismaAccount> {
    const id = assertUuid(accountId, 'Account');
    const account = await tx.account.findFirst({ where: { id, userId } });
    if (!account) {
      throw new BadRequestException('The referenced account does not exist.');
    }
    if (options.mustBeActive && account.status !== 'ACTIVE') {
      throw new BadRequestException('The referenced account is archived.');
    }
    return account;
  }

  private async requireCategory(
    tx: DbClient,
    userId: string,
    categoryId: string,
    expectedType: 'INCOME' | 'EXPENSE',
  ): Promise<void> {
    const id = assertUuid(categoryId, 'Category');
    const category = await tx.category.findFirst({ where: { id, userId } });
    if (!category) {
      throw new BadRequestException('The referenced category does not exist.');
    }
    if (category.type !== expectedType) {
      throw new BadRequestException('The category type must match the transaction type.');
    }
  }
}

interface ListFilters {
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly categoryId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly minAmount?: bigint;
  readonly maxAmount?: bigint;
  readonly limit: number;
  readonly offset: number;
}

const LIST_TRANSACTION_TYPES: readonly string[] = ['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT'];

function parseListQuery(query: Record<string, unknown>): ListFilters {
  const result: {
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
    from?: Date;
    to?: Date;
    minAmount?: bigint;
    maxAmount?: bigint;
    limit: number;
    offset: number;
  } = { limit: DEFAULT_LIST_LIMIT, offset: 0 };

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

  if (query.limit !== undefined) {
    result.limit = parseBoundedInt(query.limit, 'limit', 1, MAX_LIST_LIMIT);
  }
  if (query.offset !== undefined) {
    result.offset = parseBoundedInt(query.offset, 'offset', 0, Number.MAX_SAFE_INTEGER);
  }
  return result;
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

function toTransactionResponse(row: PrismaTransaction): TransactionResponse {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amountMinor: toContractString(row.amountMinor),
    currency: row.currency,
    occurredAt: row.occurredAt.toISOString(),
    accountId: row.accountId,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    categoryId: row.categoryId,
    adjustmentSign: row.adjustmentSign === 1 ? 1 : row.adjustmentSign === -1 ? -1 : null,
    note: row.note,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Exposed for unit tests of the resolved write shape. */
export const __testables = { parseListQuery };
