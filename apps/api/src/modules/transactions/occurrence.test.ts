import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  addLocalDays,
  resolveOccurrence,
  startOfLocalDay,
  type OccurrenceInput,
} from './occurrence';

/**
 * Occurrence resolution tests (accounting-rules.md §3 rule 3, §11.5):
 * canonical noon anchoring, local-date vs instant validation, the +5 minute
 * clock-skew boundary, DST gap/ambiguity fixtures, and the malformed-input
 * matrix. Fixed reference instants keep every case deterministic.
 */

const NOW = new Date('2026-10-16T10:00:00.000Z'); // 16:00 in Asia/Dhaka

describe('resolveOccurrence', () => {
  it('anchors date-only entries at local noon', () => {
    const resolved = resolveOccurrence({ occurredDate: '2026-10-10' }, NOW);
    expect(resolved.occurredAt.toISOString()).toBe('2026-10-10T06:00:00.000Z');
    expect(resolved.timezone).toBe('Asia/Dhaka');
  });

  it('accepts a date-only entry for today even when noon is still ahead', () => {
    // Noon Dhaka (06:00Z) is before NOW here, but the rule is date-granular:
    // use a morning instant where local noon lies in the future.
    const morning = new Date('2026-10-16T02:00:00.000Z'); // 08:00 Dhaka
    const resolved = resolveOccurrence({ occurredDate: '2026-10-16' }, morning);
    expect(resolved.occurredAt.toISOString()).toBe('2026-10-16T06:00:00.000Z');
  });

  it('rejects a date-only entry for tomorrow', () => {
    expect(() => resolveOccurrence({ occurredDate: '2026-10-17' }, NOW)).toThrow(
      BadRequestException,
    );
  });

  it('accepts a time-bearing entry within the skew tolerance', () => {
    // 16:04 Dhaka = 10:04Z = NOW + 4 minutes.
    const resolved = resolveOccurrence({ occurredDate: '2026-10-16', occurredTime: '16:04' }, NOW);
    expect(resolved.occurredAt.toISOString()).toBe('2026-10-16T10:04:00.000Z');
  });

  it('rejects a time-bearing entry past the skew tolerance', () => {
    // 16:06 Dhaka = 10:06Z = NOW + 6 minutes.
    expect(() =>
      resolveOccurrence({ occurredDate: '2026-10-16', occurredTime: '16:06' }, NOW),
    ).toThrow(BadRequestException);
  });

  it('rejects instants before the 1970 sanity floor', () => {
    expect(() => resolveOccurrence({ occurredDate: '1969-12-31' }, NOW)).toThrow(
      BadRequestException,
    );
  });

  it('shifts spring-forward gaps forward by the gap', () => {
    // America/New_York springs forward on 2026-03-08: 02:30 never exists.
    const resolved = resolveOccurrence(
      { occurredDate: '2026-03-08', occurredTime: '02:30', timezone: 'America/New_York' },
      NOW,
    );
    expect(resolved.occurredAt.toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });

  it('uses the earlier offset for ambiguous fall-back times', () => {
    // 2026-11-01 01:30 happens twice; the earlier (EDT) occurrence wins.
    // `now` sits after November so the past entry passes future validation.
    const november = new Date('2026-11-10T00:00:00.000Z');
    const resolved = resolveOccurrence(
      { occurredDate: '2026-11-01', occurredTime: '01:30', timezone: 'America/New_York' },
      november,
    );
    expect(resolved.occurredAt.toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it.each([
    ['missing date', {}, /occurredDate/],
    ['non-string date', { occurredDate: 20261010 }, /occurredDate/],
    ['wrong separator', { occurredDate: '2026/10/10' }, /YYYY-MM-DD/],
    ['month 13', { occurredDate: '2026-13-01' }, /real calendar date/],
    ['February 30th', { occurredDate: '2026-02-30' }, /real calendar date/],
    ['non-leap February 29th', { occurredDate: '2025-02-29' }, /real calendar date/],
    ['non-string time', { occurredDate: '2026-10-10', occurredTime: 1200 }, /occurredTime/],
    ['wrong time format', { occurredDate: '2026-10-10', occurredTime: '12' }, /HH:mm/],
    ['hour 24', { occurredDate: '2026-10-10', occurredTime: '24:00' }, /real time/],
    ['minute 60', { occurredDate: '2026-10-10', occurredTime: '12:60' }, /real time/],
    ['unknown timezone', { occurredDate: '2026-10-10', timezone: 'Mars/Olympus' }, /timezone/],
    ['non-string timezone', { occurredDate: '2026-10-10', timezone: 6 }, /timezone/],
  ] as Array<[string, OccurrenceInput, RegExp]>)(
    'rejects malformed input: %s',
    (_label, input, pattern) => {
      expect(() => resolveOccurrence(input, NOW)).toThrowError(pattern);
    },
  );

  it('accepts a leap day and resolves midnight crossings', () => {
    const leap = resolveOccurrence({ occurredDate: '2024-02-29' }, NOW);
    expect(leap.occurredAt.toISOString()).toBe('2024-02-29T06:00:00.000Z');
    const midnight = resolveOccurrence({ occurredDate: '2026-10-10', occurredTime: '00:00' }, NOW);
    expect(midnight.occurredAt.toISOString()).toBe('2026-10-09T18:00:00.000Z');
  });
});

describe('local day helpers', () => {
  it('resolves the start of a local day', () => {
    expect(startOfLocalDay('Asia/Dhaka', '2026-10-10').toISOString()).toBe(
      '2026-10-09T18:00:00.000Z',
    );
  });

  it('adds calendar days across a month boundary', () => {
    expect(addLocalDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});
