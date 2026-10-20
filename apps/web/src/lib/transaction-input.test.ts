import { describe, expect, it } from 'vitest';

import {
  isValidCalendarDate,
  isValidOccurredTime,
  isValidOpeningBalance,
  localDateFromInstant,
  localTimeFromInstant,
  todayInTimezone,
} from './transaction-input';

describe('local input conversion', () => {
  it('renders a UTC instant in the reporting timezone', () => {
    // 18:30Z is the next local day in Asia/Dhaka (UTC+6).
    expect(localDateFromInstant('2026-02-05T18:30:00.000Z', 'Asia/Dhaka')).toBe('2026-02-06');
    expect(localTimeFromInstant('2026-02-05T18:30:00.000Z', 'Asia/Dhaka')).toBe('00:30');
  });

  it('formats today as a YYYY-MM-DD local date in the reporting timezone', () => {
    expect(todayInTimezone('Asia/Dhaka')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('input grammar', () => {
  it('accepts only real calendar dates', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true);
    expect(isValidCalendarDate('2026-02-30')).toBe(false);
    expect(isValidCalendarDate('02/28/2026')).toBe(false);
  });

  it('accepts 24-hour times only', () => {
    expect(isValidOccurredTime('00:00')).toBe(true);
    expect(isValidOccurredTime('23:59')).toBe(true);
    expect(isValidOccurredTime('24:00')).toBe(false);
    expect(isValidOccurredTime('9:30')).toBe(false);
  });

  it('mirrors the signed opening-balance grammar and cap', () => {
    expect(isValidOpeningBalance('0')).toBe(true);
    expect(isValidOpeningBalance('-1500.50')).toBe(true);
    expect(isValidOpeningBalance('1500.505')).toBe(false);
    expect(isValidOpeningBalance('1,500')).toBe(false);
    expect(isValidOpeningBalance('1000000000')).toBe(true);
    expect(isValidOpeningBalance('1000000001')).toBe(false);
  });
});
