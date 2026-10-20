import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  addLocalMonths,
  assertLocalDate,
  bucketDayTotals,
  dayCount,
  MAX_SUMMARY_RANGE_DAYS,
  monthEndOf,
  monthStartOf,
  resolveSummaryPeriod,
  weekStartOf,
} from './summary-periods';

/**
 * Pure period/bucket rules for IT-8 (accounting-rules.md §6, §9; DR-11).
 * No database, no HTTP. Boundary fixtures use `Asia/Dhaka` (+06:00) and the
 * owner-confirmed Saturday week start; one DST fixture covers a zone that
 * changes offset.
 */

const DHAKA = 'Asia/Dhaka';

describe('assertLocalDate', () => {
  it('accepts real calendar dates and returns them unchanged', () => {
    expect(assertLocalDate('2026-10-01', 'dateFrom')).toBe('2026-10-01');
    expect(assertLocalDate('2028-02-29', 'dateTo')).toBe('2028-02-29');
  });

  it('rejects malformed, impossible, and non-string dates', () => {
    for (const value of ['2026-10-5', '20261017', '2026/10/17', '', ' 2026-10-17', 20261017]) {
      expect(() => assertLocalDate(value, 'dateFrom')).toThrow(BadRequestException);
    }
    for (const value of ['2026-02-30', '2026-13-01', '2026-04-31', '2026-00-10', '2027-02-29']) {
      expect(() => assertLocalDate(value, 'dateTo')).toThrow(BadRequestException);
    }
  });
});

describe('addLocalMonths', () => {
  it('rolls across year boundaries in both directions', () => {
    expect(addLocalMonths('2026-12', 1)).toBe('2027-01');
    expect(addLocalMonths('2026-01', -1)).toBe('2025-12');
    expect(addLocalMonths('2026-10', 14)).toBe('2027-12');
    expect(addLocalMonths('2026-10', -10)).toBe('2025-12');
  });

  it('rejects malformed month text', () => {
    expect(() => addLocalMonths('2026-1', 1)).toThrow(Error);
    expect(() => addLocalMonths('October', 1)).toThrow(Error);
  });
});

describe('dayCount / month boundaries', () => {
  it('counts days inclusively', () => {
    expect(dayCount('2026-10-01', '2026-10-01')).toBe(1);
    expect(dayCount('2026-10-01', '2026-10-31')).toBe(31);
    expect(dayCount('2028-02-01', '2028-03-01')).toBe(30); // leap February, inclusive
    expect(dayCount('2027-02-01', '2027-03-01')).toBe(29);
  });

  it('derives month start/end including leap years', () => {
    expect(monthStartOf('2026-10-17')).toBe('2026-10-01');
    expect(monthEndOf('2026-10-17')).toBe('2026-10-31');
    expect(monthEndOf('2026-12-05')).toBe('2026-12-31');
    expect(monthEndOf('2028-02-10')).toBe('2028-02-29');
    expect(monthEndOf('2027-02-10')).toBe('2027-02-28');
  });
});

describe('weekStartOf (Saturday start, DR-11)', () => {
  // 2026-10-17 is a Saturday.
  it.each([
    ['2026-10-17', '2026-10-17'], // Saturday → itself
    ['2026-10-18', '2026-10-17'], // Sunday
    ['2026-10-19', '2026-10-17'], // Monday
    ['2026-10-20', '2026-10-17'], // Tuesday
    ['2026-10-21', '2026-10-17'], // Wednesday
    ['2026-10-22', '2026-10-17'], // Thursday
    ['2026-10-23', '2026-10-17'], // Friday
    ['2026-10-24', '2026-10-24'], // next Saturday → new week
    ['2027-01-01', '2026-12-26'], // year boundary; Friday belongs to the previous Saturday's week
  ])('maps %s to week start %s', (day, expected) => {
    expect(weekStartOf(day, 'SATURDAY')).toBe(expected);
  });
});

describe('weekStartOf (user-selected week start)', () => {
  it('maps every day to the requested start day', () => {
    // 2026-10-20 is a Tuesday.
    expect(weekStartOf('2026-10-20', 'MONDAY')).toBe('2026-10-19');
    expect(weekStartOf('2026-10-20', 'SUNDAY')).toBe('2026-10-18');
    expect(weekStartOf('2026-10-20', 'TUESDAY')).toBe('2026-10-20');
    expect(weekStartOf('2026-10-20', 'FRIDAY')).toBe('2026-10-16');
    expect(weekStartOf('2026-10-20', 'SATURDAY')).toBe('2026-10-17');
  });

  it('uses Monday buckets in the report series when selected', () => {
    const buckets = bucketDayTotals(
      [
        { day: '2026-10-18', incomeMinor: 1n, expenseMinor: 0n }, // Sunday
        { day: '2026-10-19', incomeMinor: 2n, expenseMinor: 0n }, // Monday
      ],
      'weekly',
      { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      'MONDAY',
    );
    expect(buckets).toEqual([
      {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        incomeMinor: 1n,
        expenseMinor: 0n,
      },
      {
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        incomeMinor: 2n,
        expenseMinor: 0n,
      },
    ]);
  });
});

describe('resolveSummaryPeriod', () => {
  it('defaults to the current local month in the timezone', () => {
    // 10:00Z on 17 Oct 2026 is 16:00 in Dhaka (+06:00) — same calendar day.
    const period = resolveSummaryPeriod({}, new Date('2026-10-17T10:00:00.000Z'));
    expect(period).toMatchObject({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      timezone: DHAKA,
    });
    expect(period.fromInstant.toISOString()).toBe('2026-09-30T18:00:00.000Z');
    expect(period.toInstant.toISOString()).toBe('2026-10-31T18:00:00.000Z');
  });

  it('rolls the default month at local midnight, not UTC midnight', () => {
    // 20:00Z on 31 Oct 2026 is already 02:00 on 1 Nov in Dhaka.
    const period = resolveSummaryPeriod({}, new Date('2026-10-31T20:00:00.000Z'));
    expect(period.dateFrom).toBe('2026-11-01');
    expect(period.dateTo).toBe('2026-11-30');
  });

  it('accepts a custom range with an explicit timezone and builds half-open bounds', () => {
    // `Africa/Abidjan` is UTC±0 year-round and exists in the IANA set the
    // timezone validator accepts ('UTC' itself is not in Intl's list).
    const period = resolveSummaryPeriod({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      timezone: 'Africa/Abidjan',
    });
    expect(period.fromInstant.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(period.toInstant.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('allows exactly the maximum span and rejects one day more', () => {
    const max = resolveSummaryPeriod({
      dateFrom: '2026-01-01',
      dateTo: '2027-01-01', // 366 inclusive days
    });
    expect(dayCount(max.dateFrom, max.dateTo)).toBe(MAX_SUMMARY_RANGE_DAYS);
    expect(() => resolveSummaryPeriod({ dateFrom: '2026-01-01', dateTo: '2027-01-02' })).toThrow(
      BadRequestException,
    );
  });

  it('requires both range ends and a valid ordering', () => {
    expect(() => resolveSummaryPeriod({ dateFrom: '2026-10-01' })).toThrow(BadRequestException);
    expect(() => resolveSummaryPeriod({ dateTo: '2026-10-31' })).toThrow(BadRequestException);
    expect(() => resolveSummaryPeriod({ dateFrom: '2026-10-31', dateTo: '2026-10-01' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects impossible dates and unknown timezones', () => {
    expect(() => resolveSummaryPeriod({ dateFrom: '2026-02-30', dateTo: '2026-03-01' })).toThrow(
      BadRequestException,
    );
    expect(() => resolveSummaryPeriod({ timezone: 'Mars/Olympus' })).toThrow(BadRequestException);
  });

  it('resolves midnight boundaries through a DST transition correctly', () => {
    // America/New_York springs forward on 2026-03-08 (02:00 → 03:00 local).
    const period = resolveSummaryPeriod({
      dateFrom: '2026-03-08',
      dateTo: '2026-03-08',
      timezone: 'America/New_York',
    });
    expect(period.fromInstant.toISOString()).toBe('2026-03-08T05:00:00.000Z'); // EST −05:00
    expect(period.toInstant.toISOString()).toBe('2026-03-09T04:00:00.000Z'); // EDT −04:00
  });
});

describe('bucketDayTotals', () => {
  const OCTOBER: { dateFrom: string; dateTo: string } = {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
  };
  const day = (value: string, incomeMinor = 0n, expenseMinor = 0n) => ({
    day: value,
    incomeMinor,
    expenseMinor,
  });

  it('keeps daily buckets sparse and ascending', () => {
    const buckets = bucketDayTotals(
      [day('2026-10-05', 100n), day('2026-10-02', 0n, 250n)],
      'daily',
      OCTOBER,
    );
    expect(buckets).toEqual([
      { startDate: '2026-10-02', endDate: '2026-10-02', incomeMinor: 0n, expenseMinor: 250n },
      { startDate: '2026-10-05', endDate: '2026-10-05', incomeMinor: 100n, expenseMinor: 0n },
    ]);
  });

  it('merges days into Saturday-start weeks and keeps exact BigInt sums', () => {
    const buckets = bucketDayTotals(
      [
        day('2026-10-17', 9_007_199_254_740_993n), // Saturday
        day('2026-10-18', 1n), // Sunday, same week
        day('2026-10-23', 0n, 5n), // Friday, same week
        day('2026-10-24', 2n), // next Saturday → new week
      ],
      'weekly',
      OCTOBER,
    );
    expect(buckets).toEqual([
      {
        startDate: '2026-10-17',
        endDate: '2026-10-23',
        incomeMinor: 9_007_199_254_740_994n,
        expenseMinor: 5n,
      },
      { startDate: '2026-10-24', endDate: '2026-10-30', incomeMinor: 2n, expenseMinor: 0n },
    ]);
  });

  it('clips week edges to the requested period', () => {
    // 2 Oct 2026 is a Friday; its calendar week starts Sat 26 Sep, which is
    // before the period — the bucket must not claim September days.
    const buckets = bucketDayTotals([day('2026-10-02', 700n)], 'weekly', OCTOBER);
    expect(buckets).toEqual([
      { startDate: '2026-10-01', endDate: '2026-10-02', incomeMinor: 700n, expenseMinor: 0n },
    ]);
  });

  it('merges days into calendar months including leap February', () => {
    const buckets = bucketDayTotals(
      [day('2028-02-01', 10n), day('2028-02-29', 20n), day('2028-03-01', 30n)],
      'monthly',
      { dateFrom: '2028-02-01', dateTo: '2028-03-31' },
    );
    expect(buckets).toEqual([
      { startDate: '2028-02-01', endDate: '2028-02-29', incomeMinor: 30n, expenseMinor: 0n },
      { startDate: '2028-03-01', endDate: '2028-03-31', incomeMinor: 30n, expenseMinor: 0n },
    ]);
  });

  it('clips month edges to the requested period', () => {
    const buckets = bucketDayTotals([day('2028-02-29', 1n), day('2028-03-01', 2n)], 'monthly', {
      dateFrom: '2028-02-10',
      dateTo: '2028-03-05',
    });
    expect(buckets).toEqual([
      { startDate: '2028-02-10', endDate: '2028-02-29', incomeMinor: 1n, expenseMinor: 0n },
      { startDate: '2028-03-01', endDate: '2028-03-05', incomeMinor: 2n, expenseMinor: 0n },
    ]);
  });
});
