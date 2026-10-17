import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { Prisma } from '../generated/prisma/client';
import { isUniqueViolationFor, mapMoneyError } from './http-errors';
import { MoneyDomainError } from '../domain/money/errors';

/**
 * Error-mapping tests, including the Prisma 7 driver-adapter violation
 * shape (`meta.driverAdapterError.cause.constraint`, no `meta.target`) —
 * matching on `target` alone misses real PostgreSQL violations (IT-4).
 */

function knownError(meta: unknown) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: meta as never,
  });
}

describe('isUniqueViolationFor', () => {
  it('matches the classic target shapes', () => {
    expect(
      isUniqueViolationFor(
        knownError({ target: 'account_userId_name_lower_key' }),
        'account_userId_name_lower_key',
      ),
    ).toBe(true);
    expect(
      isUniqueViolationFor(knownError({ target: ['userId'] }), 'account_userId_name_lower_key'),
    ).toBe(false);
    expect(
      isUniqueViolationFor(knownError({ target: 'other_index' }), 'account_userId_name_lower_key'),
    ).toBe(false);
  });

  it('matches the driver-adapter constraint shape', () => {
    const error = knownError({
      driverAdapterError: {
        name: 'DriverAdapterError',
        cause: {
          originalCode: '23505',
          kind: 'UniqueConstraintViolation',
          constraint: { index: 'account_userId_name_lower_key', table: 'account' },
        },
      },
      modelName: 'Account',
    });
    expect(isUniqueViolationFor(error, 'account_userId_name_lower_key')).toBe(true);
    expect(isUniqueViolationFor(error, 'some_other_index')).toBe(false);
  });

  it('rejects other codes and non-Prisma errors', () => {
    const other = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    expect(isUniqueViolationFor(other, 'account_userId_name_lower_key')).toBe(false);
    expect(isUniqueViolationFor(new Error('boom'), 'account_userId_name_lower_key')).toBe(false);
  });
});

describe('mapMoneyError', () => {
  it('converts money-domain failures to 400s and rethrows the rest', () => {
    const converted = mapMoneyError(
      new MoneyDomainError('AMOUNT_NOT_POSITIVE', 'Amount must be greater than zero.'),
    );
    expect(converted).toBeInstanceOf(BadRequestException);
    expect((converted as BadRequestException).getStatus()).toBe(400);
    const foreign = new Error('unrelated');
    expect(() => mapMoneyError(foreign)).toThrow(foreign);
  });
});
