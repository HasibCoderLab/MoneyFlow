import { Injectable } from '@nestjs/common';

import type { AuditEventType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Minimal audit event writer (IT-12, ADR-0011).
 *
 * Callers must pass the session-derived user id. Destructive database
 * operations call `recordInTransaction` with the same transaction client as
 * the delete so the event and the operation commit or roll back together.
 *
 * Metadata is deliberately free of amounts, notes, tokens, passwords, and
 * request bodies. There is no public read surface in IT-12.
 */
export interface AuditEventInput {
  readonly userId?: string | null;
  readonly type: AuditEventType;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Writes an event on the shared client (non-transactional callers). */
  public async record(event: AuditEventInput): Promise<void> {
    await this.prisma.auditEvent.create({ data: toAuditData(event) });
  }

  /** Writes an event inside the caller's existing database transaction. */
  public async recordInTransaction(
    tx: Prisma.TransactionClient,
    event: AuditEventInput,
  ): Promise<void> {
    await tx.auditEvent.create({ data: toAuditData(event) });
  }
}

function toAuditData(event: AuditEventInput): Prisma.AuditEventUncheckedCreateInput {
  return {
    userId: event.userId ?? null,
    type: event.type,
    resourceType: event.resourceType ?? null,
    resourceId: event.resourceId ?? null,
    ...(event.metadata === undefined ? {} : { metadata: event.metadata }),
  };
}
