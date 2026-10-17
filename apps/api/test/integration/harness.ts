import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';

import type { Prisma } from '../../src/generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { assertLocalDatabaseUrl } from '../support/local-database';

/**
 * Shared integration-test harness (docs/architecture/database-and-testing.md).
 *
 * Real PostgreSQL only — required database behavior is never mocked
 * (ADR-0007 acceptance notes). The database URL is guarded: anything that
 * is not localhost/127.0.0.1 is refused before a query runs.
 */

export function getTestDatabaseUrl(): string {
  if (!process.env.TEST_DATABASE_URL) {
    // Same loading order as prisma.config.ts: the repo-root .env template.
    loadEnv({ path: path.resolve(process.cwd(), '../../.env') });
  }
  return assertLocalDatabaseUrl(process.env.TEST_DATABASE_URL);
}

export function createTestPrismaClient(): PrismaService {
  // PrismaService reads DATABASE_URL exactly like the app does; point it at
  // the guarded test database instead of reaching into client internals.
  process.env.DATABASE_URL = getTestDatabaseUrl();
  return new PrismaService();
}

/** Empties every IT-2 table so each suite starts from a known state. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  // Constant statement — no user input is interpolated.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "transaction", "category", "account", "verification", "authAccount", "session", "user" RESTART IDENTITY CASCADE',
  );
}

let emailCounter = 0;

/** Deterministic synthetic identity — never real personal data (§12.4). */
export function uniqueEmail(prefix = 'user'): string {
  emailCounter += 1;
  return `${prefix}-${emailCounter}-${randomUUID()}@example.test`;
}

export async function createUser(
  prisma: PrismaService,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  return prisma.user.create({
    data: {
      // Better Auth generates its own ids; tests mirror that contract.
      id: randomUUID(),
      name: 'Test User',
      email: uniqueEmail(),
      ...overrides,
    },
  });
}

export async function createAccount(
  prisma: PrismaService,
  userId: string,
  overrides: Partial<Prisma.AccountUncheckedCreateInput> = {},
) {
  return prisma.account.create({
    data: {
      userId,
      name: `Account ${randomUUID().slice(0, 8)}`,
      type: 'CASH',
      currency: 'BDT',
      openingBalanceMinor: 0n,
      ...overrides,
    },
  });
}

export async function createCategory(
  prisma: PrismaService,
  userId: string,
  overrides: Partial<Prisma.CategoryUncheckedCreateInput> = {},
) {
  return prisma.category.create({
    data: {
      userId,
      name: `Category ${randomUUID().slice(0, 8)}`,
      nameKey: `category-${randomUUID()}`,
      type: 'EXPENSE',
      ...overrides,
    },
  });
}
