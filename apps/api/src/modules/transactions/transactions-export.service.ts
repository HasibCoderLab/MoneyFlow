import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Readable } from 'node:stream';

import { RateLimiter } from '../../common/rate-limit';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CSV_HEADER, exportFilename, exportRow } from './export-csv';
import {
  buildTransactionWhere,
  parseTransactionFilters,
  type TransactionFilters,
} from './transaction-filters';

const EXPORT_CHUNK_SIZE = 500;
const EXPORT_LIMIT = 5;
const EXPORT_WINDOW_MS = 60 * 60 * 1000;

const EXPORT_INCLUDE = {
  account: { select: { name: true } },
  fromAccount: { select: { name: true } },
  toAccount: { select: { name: true } },
  category: { select: { name: true } },
} as const;

type ExportTransaction = Prisma.TransactionGetPayload<{ include: typeof EXPORT_INCLUDE }>;

export interface TransactionExport {
  readonly stream: Readable;
  readonly filename: string;
}

/**
 * Streaming CSV export for the authenticated user's transactions (IT-12,
 * ADR-0011). The database is read in keyset-paginated chunks of 500 rows;
 * the response is never buffered as one unbounded array.
 */
@Injectable()
export class TransactionsExportService {
  private readonly logger = new Logger(TransactionsExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public async createExport(
    userId: string,
    query: Record<string, unknown>,
    now = new Date(),
  ): Promise<TransactionExport> {
    const filters = parseTransactionFilters(query);

    if (!this.rateLimiter.consume(`transaction-export:${userId}`, EXPORT_LIMIT, EXPORT_WINDOW_MS)) {
      throw new HttpException('Too many export requests. Try again later.', 429);
    }

    // Record the authorized request before any bytes are streamed. This is
    // deliberately not a "completed" event: delivery can still fail.
    await this.audit.record({
      userId,
      type: 'DATA_EXPORT_REQUESTED',
      resourceType: 'transactions_export',
      metadata: { format: 'csv' },
    });

    const stream = Readable.from(this.generate(userId, filters), { objectMode: false });
    stream.once('error', () => {
      void this.recordFailure(userId);
    });

    return { stream, filename: exportFilename(now) };
  }

  private async *generate(
    userId: string,
    filters: TransactionFilters,
  ): AsyncGenerator<string, void, unknown> {
    yield CSV_HEADER;

    let cursor: { occurredAt: Date; id: string } | null = null;
    for (;;) {
      const rows = await this.prisma.transaction.findMany({
        where: exportWhere(userId, filters, cursor),
        include: EXPORT_INCLUDE,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: EXPORT_CHUNK_SIZE,
      });
      if (rows.length === 0) {
        return;
      }

      for (const row of rows) {
        yield exportRow({
          occurredAt: row.occurredAt,
          type: row.type,
          amountMinor: row.amountMinor,
          currency: row.currency,
          accountName: row.account?.name ?? null,
          fromAccountName: row.fromAccount?.name ?? null,
          toAccountName: row.toAccount?.name ?? null,
          categoryName: row.category?.name ?? null,
          adjustmentSign: row.adjustmentSign,
          note: row.note,
        });
      }

      const last = rows[rows.length - 1] as ExportTransaction;
      cursor = { occurredAt: last.occurredAt, id: last.id };
      if (rows.length < EXPORT_CHUNK_SIZE) {
        return;
      }
    }
  }

  private async recordFailure(userId: string): Promise<void> {
    try {
      await this.audit.record({
        userId,
        type: 'DATA_EXPORT_FAILED',
        resourceType: 'transactions_export',
        metadata: { format: 'csv' },
      });
    } catch {
      // Never log financial content or the underlying database error.
      this.logger.error('Could not record the export failure audit event.');
    }
  }
}

/**
 * Keyset cursor over `(occurredAt DESC, id DESC)`. The base filter is kept in
 * an AND clause so its optional account OR clause cannot be confused with the
 * cursor OR clause.
 */
function exportWhere(
  userId: string,
  filters: TransactionFilters,
  cursor: { occurredAt: Date; id: string } | null,
): Prisma.TransactionWhereInput {
  const base = buildTransactionWhere(userId, filters);
  if (!cursor) {
    return base;
  }
  return {
    AND: [
      base,
      {
        OR: [
          { occurredAt: { lt: cursor.occurredAt } },
          { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
        ],
      },
    ],
  };
}
