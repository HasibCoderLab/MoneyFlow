import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Placeholder connection used ONLY to construct the Prisma client when
 * `DATABASE_URL` is not configured (local development without a database,
 * unit tests). It points at an unlistenable local port, so an accidental
 * query fails immediately and loudly instead of silently reaching another
 * database. Health readiness reports `not_configured` before any query is
 * attempted (docs/architecture/database-and-testing.md).
 */
export const UNCONFIGURED_DATABASE_URL =
  'postgresql://unconfigured:unconfigured@127.0.0.1:1/moneyflow_unconfigured';

/**
 * Builds the `PrismaClient` constructor options for a connection string:
 * the `@prisma/adapter-pg` driver adapter (ADR-0007) with deliberate pool
 * settings — tolerate Neon scale-to-zero cold starts and keep a modest
 * per-instance pool (docs/architecture/database-and-testing.md).
 */
export function buildPrismaClientOptions(connectionString: string | undefined): {
  adapter: PrismaPg;
} {
  return {
    adapter: new PrismaPg({
      connectionString: connectionString ?? UNCONFIGURED_DATABASE_URL,
      connectionTimeoutMillis: 15_000,
      max: 10,
    }),
  };
}
