import type { CategorySpendSummary, RecentSummaryTransaction } from '@moneyflow/contracts';
import { describe, expect, it } from 'vitest';

import {
  categoryBarData,
  formatLocalDate,
  formatOccurredAt,
  formatPeriodLabel,
  formatRangeLabel,
  isWholeMonth,
  recentTransactionRows,
} from './summary-display';

/** Label + display-model tests for the wired dashboard/report widgets (IT-8). */

function recentRow(overrides: Partial<RecentSummaryTransaction>): RecentSummaryTransaction {
  return {
    id: 'tx-1',
    type: 'INCOME',
    amountMinor: '1800000',
    currency: 'BDT',
    occurredAt: '2026-02-05T06:00:00.000Z',
    adjustmentSign: null,
    note: null,
    categoryName: null,
    categoryColor: null,
    ...overrides,
  };
}

describe('formatLocalDate', () => {
  it('formats a local date without timezone drift', () => {
    expect(formatLocalDate('2026-02-05')).toBe('5 Feb 2026');
  });

  it('rejects malformed input loudly', () => {
    expect(() => formatLocalDate('not-a-date')).toThrow();
  });
});

describe('isWholeMonth', () => {
  it('accepts exact calendar months including leap February', () => {
    expect(isWholeMonth('2026-02-01', '2026-02-28')).toBe(true);
    expect(isWholeMonth('2028-02-01', '2028-02-29')).toBe(true);
    expect(isWholeMonth('2026-01-01', '2026-01-31')).toBe(true);
  });

  it('rejects partial or misaligned ranges', () => {
    expect(isWholeMonth('2026-02-01', '2026-02-27')).toBe(false);
    expect(isWholeMonth('2026-02-02', '2026-02-28')).toBe(false);
    expect(isWholeMonth('2026-01-01', '2026-02-28')).toBe(false);
  });
});

describe('formatRangeLabel', () => {
  it('collapses same-month ranges and keeps a single day un-ranged', () => {
    expect(formatRangeLabel('2026-02-01', '2026-02-06')).toBe('1\u20136 Feb 2026');
    expect(formatRangeLabel('2026-02-05', '2026-02-05')).toBe('5 Feb 2026');
  });

  it('spells both dates across months and years', () => {
    expect(formatRangeLabel('2025-12-28', '2026-01-03')).toBe('28 Dec 2025 \u2013 3 Jan 2026');
  });
});

describe('formatPeriodLabel', () => {
  it('uses the month name for whole months and a range otherwise', () => {
    expect(formatPeriodLabel({ dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toBe(
      'October 2026',
    );
    expect(formatPeriodLabel({ dateFrom: '2026-10-01', dateTo: '2026-10-15' })).toBe(
      '1\u201315 Oct 2026',
    );
  });
});

describe('IT-11 date preferences', () => {
  it('orders dates by DMY/MDY/YMD without changing the day', () => {
    const base = { locale: 'en' as const, numberFormat: 'LOCALE' as const };
    expect(formatLocalDate('2026-10-20', { ...base, dateFormat: 'DMY' })).toBe('20 Oct 2026');
    expect(formatLocalDate('2026-10-20', { ...base, dateFormat: 'MDY' })).toBe('Oct 20, 2026');
    expect(formatLocalDate('2026-10-20', { ...base, dateFormat: 'YMD' })).toBe('2026 Oct 20');
  });

  it('formats same-month range labels in each order', () => {
    const base = { locale: 'en' as const, numberFormat: 'LOCALE' as const };
    expect(formatRangeLabel('2026-10-01', '2026-10-06', { ...base, dateFormat: 'DMY' })).toBe(
      '1\u20136 Oct 2026',
    );
    expect(formatRangeLabel('2026-10-01', '2026-10-06', { ...base, dateFormat: 'MDY' })).toBe(
      'Oct 1\u20136, 2026',
    );
    expect(formatRangeLabel('2026-10-01', '2026-10-06', { ...base, dateFormat: 'YMD' })).toBe(
      '2026 Oct 1\u20136',
    );
  });

  it('uses Bangla month names and Bengali numerals for a Bangla locale', () => {
    expect(
      formatPeriodLabel(
        { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
        { locale: 'bn', dateFormat: 'DMY', numberFormat: 'LOCALE' },
      ),
    ).toBe('\u0985\u0995\u09cd\u099f\u09cb\u09ac\u09b0 \u09e8\u09e6\u09e8\u09ec');
  });
});

describe('formatOccurredAt', () => {
  it('renders the instant in the reporting timezone', () => {
    // 18:30Z is already the next local day in Asia/Dhaka (UTC+6).
    expect(formatOccurredAt('2026-02-05T18:30:00.000Z', 'Asia/Dhaka')).toBe('6 Feb 2026');
    expect(formatOccurredAt('2026-02-05T06:00:00.000Z', 'Asia/Dhaka')).toBe('5 Feb 2026');
  });
});

describe('recentTransactionRows', () => {
  it('maps every transaction type with the correct sign and note/category fallback', () => {
    const rows = recentTransactionRows(
      [
        recentRow({ id: 'i', note: 'October salary', categoryName: 'Salary' }),
        recentRow({
          id: 'e',
          type: 'EXPENSE',
          amountMinor: '32000',
          categoryName: 'Groceries',
          occurredAt: '2026-02-06T06:00:00.000Z',
        }),
        recentRow({
          id: 't',
          type: 'TRANSFER',
          amountMinor: '200000',
          occurredAt: '2026-02-07T06:00:00.000Z',
        }),
        recentRow({
          id: 'a',
          type: 'ADJUSTMENT',
          amountMinor: '50000',
          adjustmentSign: -1,
          occurredAt: '2026-02-08T06:00:00.000Z',
        }),
      ],
      'Asia/Dhaka',
    );

    expect(rows).toEqual([
      {
        id: 'i',
        direction: 'income',
        description: 'October salary',
        category: 'Salary',
        dateLabel: '5 Feb 2026',
        amountText: '+BDT 18,000',
      },
      {
        id: 'e',
        direction: 'expense',
        description: 'Groceries',
        category: 'Groceries',
        dateLabel: '6 Feb 2026',
        amountText: '\u2212BDT 320',
      },
      {
        id: 't',
        direction: 'transfer',
        description: null,
        category: null,
        dateLabel: '7 Feb 2026',
        amountText: 'BDT 2,000',
      },
      {
        id: 'a',
        direction: 'adjustment',
        description: null,
        category: null,
        dateLabel: '8 Feb 2026',
        amountText: '\u2212BDT 500',
      },
    ]);
  });

  it('ignores whitespace-only notes and keeps server ordering', () => {
    const rows = recentTransactionRows(
      [
        recentRow({ id: 'first', note: '   ', categoryName: 'Salary' }),
        recentRow({ id: 'second', type: 'INCOME' }),
      ],
      'Asia/Dhaka',
    );
    expect(rows.map((row) => [row.id, row.description])).toEqual([
      ['first', 'Salary'],
      ['second', null],
    ]);
  });

  it('returns an empty list for no activity', () => {
    expect(recentTransactionRows([], 'Asia/Dhaka')).toEqual([]);
  });
});

function spend(overrides: Partial<CategorySpendSummary>): CategorySpendSummary {
  return {
    categoryId: 'cat-1',
    name: 'Groceries',
    color: null,
    status: 'ACTIVE',
    expenseMinor: '320000',
    percentTimes10: '328',
    ...overrides,
  };
}

describe('categoryBarData', () => {
  it('maps API spending to donut data without recalculating server percentages', () => {
    const data = categoryBarData([
      spend({ categoryId: 'c1', name: 'Groceries', expenseMinor: '320000', percentTimes10: '328' }),
      spend({ categoryId: 'c2', name: 'Transport', expenseMinor: '100000', percentTimes10: '102' }),
    ]);

    expect(data).toEqual([
      {
        categoryId: 'c1',
        name: 'Groceries',
        amountText: 'BDT 3,200',
        percentText: '32.8%',
        sharePercent: 32.8,
      },
      {
        categoryId: 'c2',
        name: 'Transport',
        amountText: 'BDT 1,000',
        percentText: '10.2%',
        sharePercent: 10.2,
      },
    ]);
  });

  it('turns a null server percentage into a defensive dash, never a guess', () => {
    const [datum] = categoryBarData([spend({ percentTimes10: null })]);
    expect(datum?.percentText).toBe('\u2014');
    expect(datum?.sharePercent).toBe(0);
  });
});
