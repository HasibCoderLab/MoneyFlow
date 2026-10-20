import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  parseCreateContributionInput,
  parseCreateGoalInput,
  parseListGoalsQuery,
  parseUpdateGoalInput,
  assertDeadlineNotBeforeStart,
} from './dto';

/**
 * Goal DTO tests (IT-10, requirements.md §5.8/§8.6, ADR-0005): shapes,
 * enumerations, date rules, money grammar, and the explicit rejection of
 * unknown fields and status edits through `PATCH`.
 */

const VALID_CREATE = {
  name: '  Emergency fund  ',
  type: 'EMERGENCY_FUND',
  target: '30000.00',
  startDate: '2026-10-01',
  deadline: '2027-03-31',
  priority: 'HIGH',
};

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).message;
  }
  throw new Error('Expected the parser to throw.');
}

describe('parseCreateGoalInput', () => {
  it('trims the name, parses the target to minor units, and keeps plan fields', () => {
    expect(parseCreateGoalInput(VALID_CREATE)).toEqual({
      name: 'Emergency fund',
      type: 'EMERGENCY_FUND',
      targetMinor: 3_000_000n,
      startDate: '2026-10-01',
      deadline: '2027-03-31',
      priority: 'HIGH',
    });
  });

  it('defaults type to GENERAL, priority to MEDIUM, and deadline to null', () => {
    expect(
      parseCreateGoalInput({ name: 'Laptop', target: '48000', startDate: '2026-10-05' }),
    ).toEqual({
      name: 'Laptop',
      type: 'GENERAL',
      targetMinor: 4_800_000n,
      startDate: '2026-10-05',
      deadline: null,
      priority: 'MEDIUM',
    });
  });

  it('rejects a missing or blank name, and names longer than 80 characters', () => {
    expect(messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, name: undefined }))).toContain(
      '"name" is required',
    );
    expect(messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, name: '   ' }))).toContain(
      'must not be empty',
    );
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, name: 'x'.repeat(81) })),
    ).toContain('at most 80 characters');
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, name: `bad\u0000name` })),
    ).toContain('control characters');
  });

  it('accepts exactly 80 characters', () => {
    expect(parseCreateGoalInput({ ...VALID_CREATE, name: 'x'.repeat(80) }).name).toHaveLength(80);
  });

  it('rejects unknown goal types and priorities', () => {
    expect(messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, type: 'VACATION' }))).toContain(
      '"type" must be one of',
    );
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, priority: 'URGENT' })),
    ).toContain('"priority" must be one of');
  });

  it('rejects malformed, zero, negative, and over-cap targets', () => {
    for (const target of ['0', '0.00', '-500', '12.345', '1,000', 5000, '']) {
      expect(messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, target }))).toContain(
        '"target"',
      );
    }
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, target: '1000000000.01' })),
    ).toContain('exceeds the allowed maximum');
  });

  it('rejects impossible and malformed dates', () => {
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, startDate: '2026-02-30' })),
    ).toContain('"startDate" must be a real calendar date');
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, deadline: '31/03/2027' })),
    ).toContain('"deadline" must be a real calendar date');
    expect(
      messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, startDate: undefined })),
    ).toContain('"startDate" is required');
  });

  it('rejects a deadline before the start date but allows the same day', () => {
    expect(
      messageOf(() =>
        parseCreateGoalInput({ ...VALID_CREATE, startDate: '2026-10-10', deadline: '2026-10-09' }),
      ),
    ).toContain('must not be before "startDate"');
    expect(
      parseCreateGoalInput({ ...VALID_CREATE, startDate: '2026-10-10', deadline: '2026-10-10' })
        .deadline,
    ).toBe('2026-10-10');
  });

  it('rejects unknown fields instead of silently ignoring them', () => {
    expect(messageOf(() => parseCreateGoalInput({ ...VALID_CREATE, targetMinor: '3000000' }))).toBe(
      'Unknown field "targetMinor".',
    );
  });

  it('rejects a non-object body', () => {
    expect(messageOf(() => parseCreateGoalInput([]))).toBe('Request body must be a JSON object.');
  });
});

describe('parseUpdateGoalInput', () => {
  it('returns only the supplied fields and allows clearing the deadline', () => {
    expect(parseUpdateGoalInput({ name: 'New name', target: '1.50', deadline: null })).toEqual({
      name: 'New name',
      targetMinor: 150n,
      deadline: null,
    });
  });

  it('returns an empty patch for an empty object', () => {
    expect(parseUpdateGoalInput({})).toEqual({});
  });

  it('rejects status edits (lifecycle moves use their own endpoints)', () => {
    expect(messageOf(() => parseUpdateGoalInput({ status: 'PAUSED' }))).toContain(
      'STATUS_ENDPOINT_ONLY',
    );
  });

  it('rejects unknown fields', () => {
    expect(messageOf(() => parseUpdateGoalInput({ endedAt: '2026-10-01' }))).toBe(
      'Unknown field "endedAt".',
    );
  });
});

describe('assertDeadlineNotBeforeStart', () => {
  it('accepts null/undefined deadlines and dates on/after the start', () => {
    expect(() => assertDeadlineNotBeforeStart('2026-10-01', null)).not.toThrow();
    expect(() => assertDeadlineNotBeforeStart('2026-10-01', undefined)).not.toThrow();
    expect(() => assertDeadlineNotBeforeStart('2026-10-01', '2027-01-01')).not.toThrow();
  });

  it('rejects an earlier deadline', () => {
    expect(() => assertDeadlineNotBeforeStart('2026-10-01', '2026-09-30')).toThrow(
      BadRequestException,
    );
  });
});

describe('parseCreateContributionInput', () => {
  it('parses a positive amount, optional date, and optional note', () => {
    expect(
      parseCreateContributionInput({
        amount: '8000',
        occurredDate: '2026-10-19',
        note: '  salary leftover  ',
      }),
    ).toEqual({ amountMinor: 800_000n, occurredDate: '2026-10-19', note: 'salary leftover' });
  });

  it('defaults the date to undefined (the service resolves "now") and blank notes to null', () => {
    expect(parseCreateContributionInput({ amount: '1', note: '   ' })).toEqual({
      amountMinor: 100n,
      occurredDate: undefined,
      note: null,
    });
  });

  it('rejects zero, negative, decimal-overflow, and non-string amounts', () => {
    for (const amount of ['0', '-100', '0.001', '1.234', 100]) {
      expect(messageOf(() => parseCreateContributionInput({ amount }))).toContain('"amount"');
    }
  });

  it('rejects notes over 500 characters and control characters', () => {
    expect(
      messageOf(() => parseCreateContributionInput({ amount: '10', note: 'x'.repeat(501) })),
    ).toContain('at most 500');
    expect(
      messageOf(() => parseCreateContributionInput({ amount: '10', note: 'bad\u0007note' })),
    ).toContain('control characters');
  });

  it('rejects unknown fields and bad dates', () => {
    expect(
      messageOf(() => parseCreateContributionInput({ amount: '10', accountId: 'x' })),
    ).toContain('Unknown field "accountId"');
    expect(
      messageOf(() => parseCreateContributionInput({ amount: '10', occurredDate: '2026-13-01' })),
    ).toContain('"occurredDate" must be a real calendar date');
  });
});

describe('parseListGoalsQuery', () => {
  it('defaults to hiding archived goals and accepts explicit flags', () => {
    expect(parseListGoalsQuery({})).toEqual({ includeArchived: false });
    expect(parseListGoalsQuery({ includeArchived: 'true' })).toEqual({ includeArchived: true });
    expect(parseListGoalsQuery({ includeArchived: 'false' })).toEqual({ includeArchived: false });
  });

  it('rejects invalid flags and unknown query parameters', () => {
    expect(messageOf(() => parseListGoalsQuery({ includeArchived: 'yes' }))).toContain(
      'must be "true" or "false"',
    );
    expect(messageOf(() => parseListGoalsQuery({ status: 'ACTIVE' }))).toContain(
      'Unknown query parameter "status"',
    );
  });
});
