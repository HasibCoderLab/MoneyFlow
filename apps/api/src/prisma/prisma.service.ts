import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { DatabaseStatus } from '@moneyflow/contracts';

import { PrismaClient } from '../generated/prisma/client';
import { buildPrismaClientOptions } from './prisma-client-options';

/**
 * Owns the single Prisma client of the process — no per-request clients
 * (docs/architecture/database-and-testing.md).
 *
 * - Constructed with the `@prisma/adapter-pg` driver adapter (ADR-0007).
 * - Never connects eagerly: unit tests and a local API run without a
 *   database must stay unaffected. Reachability is reported by
 *   `checkDatabase()` through the health endpoint (graceful degradation).
 * - When `DATABASE_URL` is missing (allowed outside production; production
 *   fails fast in `validateEnv`), the client is constructed against the
 *   unlistenable placeholder URL and reports `not_configured`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly configured: boolean;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    super(buildPrismaClientOptions(connectionString));
    this.configured = Boolean(connectionString);
  }

  public onModuleInit(): void {
    if (!this.configured) {
      this.logger.warn(
        'DATABASE_URL is not set: database-backed endpoints are unavailable (health reports "not_configured").',
      );
    }
  }

  /**
   * Readiness ping; never throws and never exposes connection details
   * (no error text in the response or logs — status is the signal).
   */
  public async checkDatabase(): Promise<DatabaseStatus> {
    if (!this.configured) {
      return 'not_configured';
    }
    try {
      await this.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.configured) {
      await this.$disconnect();
    }
  }
}
