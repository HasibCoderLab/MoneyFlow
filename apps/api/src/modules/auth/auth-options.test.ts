import { describe, expect, it, vi } from 'vitest';

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  SESSION_LIFETIME_SECONDS,
  SESSION_REFRESH_SECONDS,
  createAuthOptions,
  type CreateAuthOptionsInput,
} from './auth-options';

/**
 * Configuration tests for the security-relevant Better Auth options
 * (ADR-0006, IT-3 acceptance): mount path, cookie policy, password policy,
 * session lifetime, trusted origins, rate limiting, and the conditional
 * Google provider. No database is involved — the adapter factory only
 * captures the client.
 */

const VALID_SECRET = 'unit-test-secret-that-is-long-enough-1234';

function optionsFor(env: NodeJS.ProcessEnv = {}) {
  const input: CreateAuthOptionsInput = {
    // The adapter factory only captures this value; construction never
    // queries it.
    prisma: {} as never,
    env: { BETTER_AUTH_SECRET: VALID_SECRET, ...env },
  };
  return createAuthOptions(input);
}

function googleOptions(env: NodeJS.ProcessEnv) {
  const social = optionsFor(env).socialProviders as
    { google?: { clientId?: string; clientSecret?: string } } | undefined;
  return social?.google;
}

describe('createAuthOptions', () => {
  it('mounts Better Auth under the versioned API path', () => {
    const options = optionsFor();
    expect(options.basePath).toBe('/api/v1/auth');
    expect(options.appName).toBe('MoneyFlow');
  });

  it('defaults baseURL to the local API origin outside production', () => {
    expect(optionsFor().baseURL).toBe('http://localhost:4000');
    expect(optionsFor({ PORT: '4100' }).baseURL).toBe('http://localhost:4100');
  });

  it('uses BETTER_AUTH_URL when configured', () => {
    expect(optionsFor({ BETTER_AUTH_URL: 'https://api.moneyflow.example' }).baseURL).toBe(
      'https://api.moneyflow.example',
    );
  });

  it('passes the secret through and lets the library default handle an unset or blank value', () => {
    expect(optionsFor().secret).toBe(VALID_SECRET);
    const noSecret = createAuthOptions({ prisma: {} as never, env: {} });
    expect(noSecret.secret).toBeUndefined();
    const blankSecret = createAuthOptions({ prisma: {} as never, env: { BETTER_AUTH_SECRET: '' } });
    expect(blankSecret.secret).toBeUndefined();
  });

  it('always sets HttpOnly + SameSite=Lax cookies, Secure only for https', () => {
    const local = optionsFor();
    expect(local.advanced?.defaultCookieAttributes).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(local.advanced?.useSecureCookies).toBe(false);

    const deployed = optionsFor({ BETTER_AUTH_URL: 'https://api.moneyflow.example' });
    expect(deployed.advanced?.useSecureCookies).toBe(true);
  });

  it('renames the credential table so it cannot collide with the financial Account model', () => {
    expect(optionsFor().account?.modelName).toBe('authAccount');
  });

  it('clones the default categories after user creation without failing sign-up on seeding errors', async () => {
    const prisma = {
      category: {
        findFirst: vi.fn().mockResolvedValue(null),
        createMany: vi.fn().mockResolvedValue({ count: 8 }),
      },
    };
    const options = createAuthOptions({
      prisma: prisma as never,
      env: { BETTER_AUTH_SECRET: VALID_SECRET },
    });
    const after = options.databaseHooks?.user?.create?.after;
    if (!after) {
      throw new Error('Expected a databaseHooks.user.create.after hook.');
    }

    await after({ id: 'user-1' } as never, null);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true },
    });
    expect(prisma.category.createMany).toHaveBeenCalledTimes(1);

    // A seeding failure must never fail sign-up; the lazy ensure on the
    // first categories read backfills instead.
    prisma.category.createMany.mockRejectedValue(new Error('database down'));
    await expect(after({ id: 'user-2' } as never, null)).resolves.toBeUndefined();
  });

  it('enables email/password with the reviewed length policy and Argon2id hooks', async () => {
    const options = optionsFor();
    const emailAndPassword = options.emailAndPassword;

    expect(emailAndPassword?.enabled).toBe(true);
    expect(emailAndPassword?.minPasswordLength).toBe(MIN_PASSWORD_LENGTH);
    expect(emailAndPassword?.maxPasswordLength).toBe(MAX_PASSWORD_LENGTH);
    // Email verification is a documented launch gate, not a silent default.
    expect(emailAndPassword?.requireEmailVerification).toBe(false);

    const hashHook = emailAndPassword?.password?.hash;
    const verifyHook = emailAndPassword?.password?.verify;
    if (!hashHook || !verifyHook) {
      throw new Error('Expected Argon2id hash/verify hooks to be configured.');
    }

    const hash = await hashHook('wired-to-argon2id-provider');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    await expect(verifyHook({ hash, password: 'wired-to-argon2id-provider' })).resolves.toBe(true);
  });

  it('configures 30-day sessions refreshed once per day', () => {
    const options = optionsFor();
    expect(options.session?.expiresIn).toBe(SESSION_LIFETIME_SECONDS);
    expect(options.session?.updateAge).toBe(SESSION_REFRESH_SECONDS);
    expect(SESSION_LIFETIME_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  it('enables rate limiting in every environment', () => {
    const options = optionsFor();
    expect(options.rateLimit?.enabled).toBe(true);
    expect(options.rateLimit?.storage).toBe('memory');
  });

  it('pins the Origin/CSRF gate on even where Better Auth would skip it (test env)', () => {
    // Better Auth flips `skipOriginCheck` on whenever `isTest()` — and
    // vitest sets NODE_ENV=test. The explicit `false` overrides that, so
    // the integration suite (and every other environment) gets the same
    // origin protection as production.
    expect(optionsFor().advanced?.disableOriginCheck).toBe(false);
  });

  it('trusts exactly the configured CORS origins', () => {
    expect(optionsFor().trustedOrigins).toEqual([]);
    expect(
      optionsFor({
        CORS_ORIGINS: ' http://localhost:3000 , https://app.moneyflow.example ,',
      }).trustedOrigins,
    ).toEqual(['http://localhost:3000', 'https://app.moneyflow.example']);
  });

  it('configures Google Sign-In only when both credentials exist', () => {
    expect(googleOptions({})).toBeUndefined();
    expect(googleOptions({ GOOGLE_CLIENT_ID: 'client-id' })).toBeUndefined();
    expect(googleOptions({ GOOGLE_CLIENT_SECRET: 'client-secret' })).toBeUndefined();
    expect(
      googleOptions({ GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret' }),
    ).toEqual({ clientId: 'client-id', clientSecret: 'client-secret' });
  });
});
