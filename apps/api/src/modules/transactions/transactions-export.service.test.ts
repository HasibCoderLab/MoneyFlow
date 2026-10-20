import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { RateLimiter } from '../../common/rate-limit';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { CSV_HEADER } from './export-csv';
import { TransactionsExportService } from './transactions-export.service';

/**
 * Streaming-export unit tests (IT-12, ADR-0011): user scoping, deterministic
 * keyset pagination, empty datasets, request auditing, and the per-user rate
 * limit. Real persisted-row fidelity and cross-user isolation are covered by
 * the PostgreSQL integration suite.
 */

const USER_ID = 'user-1';

function row(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    userId: USER_ID,
    type: 'EXPENSE',
    amountMinor: 1000n,
    currency: 'BDT',
    occurredAt: new Date(Date.UTC(2026, 9, 20, 12, 0, 0, index % 1000)),
    accountId: null,
    fromAccountId: null,
    toAccountId: null,
    categoryId: null,
    adjustmentSign: null,
    note: null,
    idempotencyKey: null,
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    account: { name: 'Cash' },
    fromAccount: null,
    toAccount: null,
    category: { name: 'Groceries' },
    ...overrides,
  };
}

function setup(findMany: ReturnType<typeof vi.fn>) {
  const prisma = { transaction: { findMany } } as unknown as PrismaService;
  const record = vi.fn().mockResolvedValue(undefined);
  const audit = { record } as unknown as AuditService;
  const limiter = new RateLimiter();
  const service = new TransactionsExportService(prisma, audit, limiter);
  return { service, record, limiter, findMany };
}

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  let text = '';
  for await (const chunk of stream) {
    text += String(chunk);
  }
  return text;
}

describe('TransactionsExportService', () => {
  it('returns a header-only CSV for an empty dataset and records one request', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const { service, record } = setup(findMany);

    const result = await service.createExport(USER_ID, {}, new Date('2026-10-20T00:00:00.000Z'));

    expect(result.filename).toBe('moneyflow-transactions-2026-10-20.csv');
    expect(await readAll(result.stream)).toBe(CSV_HEADER);
    expect(record).toHaveBeenCalledWith({
      userId: USER_ID,
      type: 'DATA_EXPORT_REQUESTED',
      resourceType: 'transactions_export',
      metadata: { format: 'csv' },
    });
  });

  it('scopes the query to the session user and the shared list filters', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const { service } = setup(findMany);

    await readAll(
      (
        await service.createExport(USER_ID, {
          type: 'EXPENSE',
          dateFrom: '2026-10-01',
          dateTo: '2026-10-31',
          timezone: 'Asia/Dhaka',
          limit: '9999',
          offset: '50',
        })
      ).stream,
    );

    const call = findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(call.where).toMatchObject({
      userId: USER_ID,
      type: 'EXPENSE',
      occurredAt: {
        gte: new Date('2026-09-30T18:00:00.000Z'),
        lt: new Date('2026-10-31T18:00:00.000Z'),
      },
    });
    // Export ignores pagination parameters and always takes its own chunks.
    expect(call.where).not.toHaveProperty('take');
  });

  it('reads in keyset chunks and joins them in occurredAt DESC, id DESC order', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => row(index));
    const last = firstPage[firstPage.length - 1] as ReturnType<typeof row>;
    const secondPage = [row(500)];
    const findMany = vi.fn().mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);
    const { service } = setup(findMany);

    const csv = await readAll((await service.createExport(USER_ID, {})).stream);

    expect(findMany).toHaveBeenCalledTimes(2);
    const secondWhere = findMany.mock.calls[1]?.[0] as { where: Record<string, unknown> };
    expect(secondWhere.where).toEqual({
      AND: [
        { userId: USER_ID },
        {
          OR: [
            { occurredAt: { lt: last.occurredAt } },
            { occurredAt: last.occurredAt, id: { lt: last.id } },
          ],
        },
      ],
    });
    expect(csv.split('\r\n').filter((line) => line.length > 0)).toHaveLength(502);
  });

  it('limits each user to five export requests per rolling hour', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const { service } = setup(findMany);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { stream } = await service.createExport(USER_ID, {});
      stream.destroy();
    }

    await expect(service.createExport(USER_ID, {})).rejects.toMatchObject({
      status: 429,
    });
    // Another user is unaffected.
    const other = await service.createExport('user-2', {});
    expect(other.filename).toMatch(/^moneyflow-transactions-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('rejects an invalid filter before recording an export request', async () => {
    const findMany = vi.fn();
    const { service, record } = setup(findMany);

    await expect(service.createExport(USER_ID, { dateFrom: '2026-13-01' })).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(record).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
});
