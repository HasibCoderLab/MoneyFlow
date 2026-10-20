import { describe, expect, it } from 'vitest';

import {
  CSV_HEADER,
  csvCell,
  exportFilename,
  exportRow,
  formatAmountForExport,
  formatMinorUnits,
  neutralizeCsvFormula,
} from './export-csv';

/**
 * CSV encoding and spreadsheet-formula safety (IT-12, ADR-0011). These tests
 * pin the exact file format the browser downloads: BOM, RFC 4180 quoting,
 * CRLF rows, exact decimal money, UTC timestamps, and neutralization of
 * formula-triggering text without touching the underlying amount.
 */

describe('CSV header and record format', () => {
  it('starts with a UTF-8 BOM and the documented columns', () => {
    expect(CSV_HEADER.startsWith('\uFEFF')).toBe(true);
    expect(CSV_HEADER.slice(1)).toBe(
      [
        '"occurred_at_utc"',
        '"type"',
        '"amount"',
        '"currency"',
        '"account"',
        '"from_account"',
        '"to_account"',
        '"category"',
        '"adjustment_direction"',
        '"note"',
      ].join(',') + '\r\n',
    );
  });

  it('quotes every cell and doubles embedded quotes', () => {
    expect(csvCell('Groceries, "weekly"')).toBe('"Groceries, ""weekly"""');
    expect(csvCell('line one\r\nline two')).toBe('"line one\r\nline two"');
    expect(csvCell('বাজার')).toBe('"বাজার"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});

describe('formula-injection neutralization', () => {
  it.each(['=1+1', '+SUM(A1)', '-2+3', '@SUM(A1)'])(
    'prefixes a leading apostrophe for %p',
    (value) => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
    },
  );

  it.each([' =1+1', '   +SUM(A1)', '\t@SUM(A1)', '\r-2+3', '\n=1+1'])(
    'covers leading whitespace/control variants: %p',
    (value) => {
      expect(neutralizeCsvFormula(value).startsWith("'")).toBe(true);
    },
  );

  it.each(['\u0000starts-with-nul', '\u001Fcontrol', '\u007Fdelete'])(
    'prefixes any cell beginning with a control character: %p',
    (value) => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
    },
  );

  it('leaves ordinary text, non-ASCII text, and internal formula characters untouched', () => {
    expect(neutralizeCsvFormula('Groceries')).toBe('Groceries');
    expect(neutralizeCsvFormula('বাজার')).toBe('বাজার');
    expect(neutralizeCsvFormula('total = 3')).toBe('total = 3');
    expect(neutralizeCsvFormula('')).toBe('');
  });

  it('neutralizes negative text but never changes exact stored amounts', () => {
    expect(csvCell('-12.34')).toBe(`"'-12.34"`);
    expect(formatMinorUnits(-1234n, 2)).toBe('-12.34');
  });
});

describe('exact money and timestamps', () => {
  it('formats minor units with the currency exponent and no floating point', () => {
    expect(formatMinorUnits(0n, 2)).toBe('0.00');
    expect(formatMinorUnits(1n, 2)).toBe('0.01');
    expect(formatMinorUnits(123456789012345678n, 2)).toBe('1234567890123456.78');
    expect(formatMinorUnits(-1n, 2)).toBe('-0.01');
    expect(formatMinorUnits(42n, 0)).toBe('42');
    expect(formatAmountForExport(350000n, 'BDT')).toBe('3500.00');
  });

  it('maps a persisted row with UTC ISO timestamps and adjustment direction', () => {
    const row = exportRow({
      occurredAt: new Date('2026-10-20T18:30:45.123Z'),
      type: 'ADJUSTMENT',
      amountMinor: 5000n,
      currency: 'BDT',
      accountName: 'Cash',
      fromAccountName: null,
      toAccountName: null,
      categoryName: null,
      adjustmentSign: -1,
      note: 'Cash count',
    });

    expect(row).toBe(
      '"2026-10-20T18:30:45.123Z","ADJUSTMENT","50.00","BDT","Cash","","","","DECREASE","Cash count"\r\n',
    );
  });

  it('renders transfers as one row with both account names and no category', () => {
    const row = exportRow({
      occurredAt: new Date('2026-10-20T06:00:00.000Z'),
      type: 'TRANSFER',
      amountMinor: 200000n,
      currency: 'BDT',
      accountName: null,
      fromAccountName: 'Cash',
      toAccountName: 'Bank',
      categoryName: null,
      adjustmentSign: null,
      note: null,
    });

    expect(row).toContain('"TRANSFER","2000.00","BDT","","Cash","Bank","",""');
    expect(row).not.toContain('transaction id');
  });

  it('uses the UTC calendar date in the filename', () => {
    expect(exportFilename(new Date('2026-10-20T23:59:59.999Z'))).toBe(
      'moneyflow-transactions-2026-10-20.csv',
    );
    expect(exportFilename(new Date('2026-10-21T00:00:00.000Z'))).toBe(
      'moneyflow-transactions-2026-10-21.csv',
    );
  });
});
