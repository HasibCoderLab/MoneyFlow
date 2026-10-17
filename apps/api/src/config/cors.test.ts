import { describe, expect, it } from 'vitest';

import { parseCorsOrigins } from './cors';

describe('parseCorsOrigins', () => {
  it('splits, trims, and drops empty entries', () => {
    expect(parseCorsOrigins(' http://localhost:3000 , https://app.example.com,  ')).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
    ]);
  });

  it('returns an empty list for unset or empty values', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
  });
});
