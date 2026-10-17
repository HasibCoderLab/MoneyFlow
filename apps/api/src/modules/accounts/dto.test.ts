import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { parseCreateAccountInput, parseUpdateAccountInput } from './dto';

describe('parseCreateAccountInput', () => {
  it('accepts a complete valid body', () => {
    expect(
      parseCreateAccountInput({
        name: '  Cash  ',
        type: 'CASH',
        currency: 'BDT',
        openingBalance: '5000.00',
      }),
    ).toEqual({ name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: '5000.00' });
  });

  it.each([
    ['non-object', 'nope'],
    ['array', []],
    ['missing name', { type: 'CASH', currency: 'BDT', openingBalance: '0' }],
    ['empty name', { name: '   ', type: 'CASH', currency: 'BDT', openingBalance: '0' }],
    [
      'over-long name',
      { name: 'x'.repeat(81), type: 'CASH', currency: 'BDT', openingBalance: '0' },
    ],
    ['control character', { name: 'Cash\x07', type: 'CASH', currency: 'BDT', openingBalance: '0' }],
    ['unknown type', { name: 'Cash', type: 'CRYPTO', currency: 'BDT', openingBalance: '0' }],
    ['lowercase type', { name: 'Cash', type: 'cash', currency: 'BDT', openingBalance: '0' }],
    ['missing currency', { name: 'Cash', type: 'CASH', openingBalance: '0' }],
    ['missing opening balance', { name: 'Cash', type: 'CASH', currency: 'BDT' }],
    [
      'non-string opening balance',
      { name: 'Cash', type: 'CASH', currency: 'BDT', openingBalance: 5 },
    ],
  ])('rejects %s', (_label, body) => {
    expect(() => parseCreateAccountInput(body)).toThrow(BadRequestException);
  });
});

describe('parseUpdateAccountInput', () => {
  it('accepts partial bodies and an empty body', () => {
    expect(parseUpdateAccountInput({ name: 'Wallet' })).toEqual({ name: 'Wallet' });
    expect(parseUpdateAccountInput({})).toEqual({});
  });

  it.each([
    ['empty name', { name: '' }],
    ['non-string opening balance', { openingBalance: 10 }],
  ])('rejects %s', (_label, body) => {
    expect(() => parseUpdateAccountInput(body)).toThrow(BadRequestException);
  });
});
