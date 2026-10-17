import { describe, expect, it } from 'vitest';

import { validateEnv } from './env';

const VALID_SECRET = 'a'.repeat(64);

describe('validateEnv', () => {
  it('accepts an empty environment and applies the default port', () => {
    expect(validateEnv({})).toEqual({ port: 4000 });
  });

  it('parses a valid PORT', () => {
    expect(validateEnv({ PORT: '8080' })).toEqual({ port: 8080 });
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => validateEnv({ PORT: 'not-a-port' })).toThrow(/PORT/);
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => validateEnv({ PORT: '0' })).toThrow(/PORT/);
    expect(() => validateEnv({ PORT: '70000' })).toThrow(/PORT/);
  });

  it('requires DATABASE_URL in production', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });

  it('allows a missing DATABASE_URL outside production', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).not.toThrow();
  });

  describe('BETTER_AUTH_SECRET', () => {
    it('rejects a secret shorter than 32 characters wherever it is set', () => {
      expect(() => validateEnv({ BETTER_AUTH_SECRET: 'too-short' })).toThrow(/BETTER_AUTH_SECRET/);
    });

    it('accepts a long-enough secret outside production', () => {
      expect(() => validateEnv({ BETTER_AUTH_SECRET: VALID_SECRET })).not.toThrow();
    });

    it('treats a blank value as unset outside production but rejects it in production', () => {
      expect(() => validateEnv({ BETTER_AUTH_SECRET: '' })).not.toThrow();
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://ci-placeholder/db',
          BETTER_AUTH_URL: 'https://api.moneyflow.example',
          BETTER_AUTH_SECRET: '   ',
        }),
      ).toThrow(/BETTER_AUTH_SECRET/);
    });

    it('requires a secret in production', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://ci-placeholder/db',
          BETTER_AUTH_URL: 'https://api.moneyflow.example',
        }),
      ).toThrow(/BETTER_AUTH_SECRET/);
    });
  });

  describe('BETTER_AUTH_URL', () => {
    it('rejects malformed or non-http(s) URLs', () => {
      expect(() => validateEnv({ BETTER_AUTH_URL: 'not-a-url' })).toThrow(/BETTER_AUTH_URL/);
      expect(() => validateEnv({ BETTER_AUTH_URL: 'ftp://api.example.com' })).toThrow(
        /BETTER_AUTH_URL/,
      );
    });

    it('requires an https URL in production so cookies stay Secure', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://ci-placeholder/db',
          BETTER_AUTH_SECRET: VALID_SECRET,
          BETTER_AUTH_URL: 'http://api.moneyflow.example',
        }),
      ).toThrow(/https/);
    });

    it('requires BETTER_AUTH_URL in production', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://ci-placeholder/db',
          BETTER_AUTH_SECRET: VALID_SECRET,
        }),
      ).toThrow(/BETTER_AUTH_URL/);
    });

    it('accepts a fully configured production environment', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://ci-placeholder/db',
          BETTER_AUTH_SECRET: VALID_SECRET,
          BETTER_AUTH_URL: 'https://api.moneyflow.example',
        }),
      ).not.toThrow();
    });
  });

  describe('Google Sign-In credentials', () => {
    it('rejects a half-configured provider pair', () => {
      expect(() => validateEnv({ GOOGLE_CLIENT_ID: 'client-id' })).toThrow(/GOOGLE_CLIENT_ID/);
      expect(() => validateEnv({ GOOGLE_CLIENT_SECRET: 'client-secret' })).toThrow(
        /GOOGLE_CLIENT_ID/,
      );
    });

    it('accepts a complete provider pair', () => {
      expect(() =>
        validateEnv({ GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret' }),
      ).not.toThrow();
    });
  });

  describe('CORS_ORIGINS', () => {
    it('rejects a whitespace-only value', () => {
      expect(() => validateEnv({ CORS_ORIGINS: '   ' })).toThrow(/CORS_ORIGINS/);
    });

    it('rejects wildcard entries that would weaken the auth origin check', () => {
      expect(() => validateEnv({ CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
      expect(() =>
        validateEnv({ CORS_ORIGINS: 'https://app.example.com,https://*.example.com' }),
      ).toThrow(/CORS_ORIGINS/);
    });

    it('accepts exact origins and the empty (disabled) value', () => {
      expect(() => validateEnv({ CORS_ORIGINS: '' })).not.toThrow();
      expect(() =>
        validateEnv({ CORS_ORIGINS: 'http://localhost:3000, https://app.example.com' }),
      ).not.toThrow();
    });
  });
});
