import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { DEFAULT_RECENT_LIMIT, parseSummaryQuery } from './dto';

/**
 * Query parsing for the IT-8 summary endpoints: structural validation only;
 * period semantics are covered by `summary-periods.test.ts`.
 */

const NOW = new Date('2026-10-17T10:00:00.000Z');

describe('parseSummaryQuery', () => {
  it('applies defaults: current month, limit 5, daily granularity', () => {
    const parsed = parseSummaryQuery({}, NOW);
    expect(parsed.period.dateFrom).toBe('2026-10-01');
    expect(parsed.period.dateTo).toBe('2026-10-31');
    expect(parsed.recentLimit).toBe(DEFAULT_RECENT_LIMIT);
    expect(parsed.granularity).toBe('daily');
  });

  it('accepts bounded recentLimit values as strings and numbers', () => {
    expect(parseSummaryQuery({ recentLimit: '20' }, NOW).recentLimit).toBe(20);
    expect(parseSummaryQuery({ recentLimit: 1 }, NOW).recentLimit).toBe(1);
  });

  it('rejects out-of-range or non-integer recentLimit values', () => {
    for (const value of [0, 21, '0', '21', 'ten', 1.5, -3]) {
      expect(() => parseSummaryQuery({ recentLimit: value }, NOW)).toThrow(BadRequestException);
    }
  });

  it('accepts every supported granularity and rejects others', () => {
    expect(parseSummaryQuery({ granularity: 'weekly' }, NOW).granularity).toBe('weekly');
    expect(parseSummaryQuery({ granularity: 'monthly' }, NOW).granularity).toBe('monthly');
    for (const value of ['yearly', 'WEEKLY', '', 7]) {
      expect(() => parseSummaryQuery({ granularity: value }, NOW)).toThrow(BadRequestException);
    }
  });

  it('forwards explicit period input to the period resolver', () => {
    const parsed = parseSummaryQuery(
      { dateFrom: '2026-01-01', dateTo: '2026-01-31', timezone: 'Africa/Abidjan' },
      NOW,
    );
    expect(parsed.period.timezone).toBe('Africa/Abidjan');
    expect(parsed.period.fromInstant.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
