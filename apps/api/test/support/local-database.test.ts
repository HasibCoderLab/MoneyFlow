import { describe, expect, it } from 'vitest';

import { assertLocalDatabaseUrl, isLocalDatabaseUrl } from './local-database';

describe('local test-database guard', () => {
  it('accepts localhost and loopback IPv4/IPv6 hosts', () => {
    expect(isLocalDatabaseUrl('postgresql://u:p@localhost:5432/moneyflow_test')).toBe(true);
    expect(isLocalDatabaseUrl('postgresql://u:p@127.0.0.1:5432/moneyflow_test')).toBe(true);
    expect(isLocalDatabaseUrl('postgres://u:p@[::1]:5432/moneyflow_test')).toBe(true);
  });

  it('rejects remote hosts (Neon, staging, any other host)', () => {
    expect(
      isLocalDatabaseUrl('postgresql://u:p@ep-cool-thing-1234.us-east-2.aws.neon.tech/moneyflow'),
    ).toBe(false);
    expect(isLocalDatabaseUrl('postgresql://u:p@db.example.com:5432/moneyflow')).toBe(false);
  });

  it('rejects non-postgres schemes and malformed URLs', () => {
    expect(isLocalDatabaseUrl('mysql://u:p@localhost:3306/moneyflow')).toBe(false);
    expect(isLocalDatabaseUrl('not a url')).toBe(false);
    expect(isLocalDatabaseUrl('postgresql:///moneyflow_test')).toBe(false);
  });

  it('refuses a missing value with a clear message', () => {
    expect(() => assertLocalDatabaseUrl(undefined)).toThrow(/TEST_DATABASE_URL is not set/);
    expect(() => assertLocalDatabaseUrl('')).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it('refuses a non-local value without echoing the URL', () => {
    const remote = 'postgresql://u:secret@db.example.com:5432/moneyflow';
    expect(() => assertLocalDatabaseUrl(remote)).toThrow(/non-local host/);
    try {
      assertLocalDatabaseUrl(remote);
    } catch (error) {
      expect(String(error)).not.toContain('secret');
    }
  });
});
