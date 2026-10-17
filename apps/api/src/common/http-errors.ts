import { BadRequestException, NotFoundException } from '@nestjs/common';

import { MoneyDomainError } from '../domain/money/errors';
import { Prisma } from '../generated/prisma/client';

/**
 * Shared HTTP error mapping for the financial modules (IT-4+).
 *
 * - Every `MoneyDomainError` code is a client-input problem (bad format,
 *   over-cap amount, non-positive amount, unsupported currency, same-account
 *   transfer, bad type), so all of them map to 400. Anything else is
 *   rethrown untouched so unexpected failures still become safe 500s via
 *   `ApiExceptionFilter` — never a misleading 4xx.
 * - Prisma unique violations (P2002) are the last line of defence behind
 *   service-level checks (e.g. the case-insensitive account-name index);
 *   races map to 409, never 500.
 * - Malformed ids are treated as "not found" (404), never 500, and never
 *   reveal whether another user's record exists.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Throws `NotFoundException` unless `value` is a UUID string. */
export function assertUuid(value: unknown, resource: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new NotFoundException(`${resource} not found.`);
  }
  return value;
}

/**
 * Converts a caught error into the HTTP error for the caller: money-domain
 * failures become 400 with the domain's safe message, everything else is
 * rethrown unchanged.
 */
export function mapMoneyError(error: unknown): unknown {
  if (error instanceof MoneyDomainError) {
    return new BadRequestException(error.message);
  }
  throw error;
}

/** True when `error` is the named Prisma unique-constraint violation. */
export function isUniqueViolationFor(error: unknown, indexName: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const meta = (error as { meta?: unknown }).meta as Record<string, unknown> | undefined;
  // Classic shape: the constraint name (or field list) in `meta.target`.
  const target = meta?.['target'];
  if (typeof target === 'string' && target === indexName) {
    return true;
  }
  if (Array.isArray(target) && target.includes(indexName)) {
    return true;
  }
  // Driver-adapter shape (Prisma 7 + `@prisma/adapter-pg`): the constraint
  // travels inside `meta.driverAdapterError.cause.constraint`, and there is
  // no `target` at all — matching on `target` alone misses every real
  // violation (found via a live PostgreSQL 16 probe, IT-4).
  const cause = (meta?.['driverAdapterError'] as Record<string, unknown> | undefined)?.['cause'] as
    Record<string, unknown> | undefined;
  const constraint = cause?.['constraint'] as Record<string, unknown> | undefined;
  if (constraint && typeof constraint['index'] === 'string' && constraint['index'] === indexName) {
    return true;
  }
  // Last resort: the rendered message names the constraint in backticks
  // ("Unique constraint failed on the constraint: `...`").
  return error.message.includes(`\`${indexName}\``);
}
